import { Client } from '@notionhq/client';

export interface NotionConfig {
  apiKey: string;
}

export interface Page {
  id: string;
  url: string;
  title: string;
  icon?: string;
  cover?: string;
  createdTime: string;
  lastEditedTime: string;
  createdBy: string;
  lastEditedBy: string;
  parent: { type: string; id: string };
  archived: boolean;
}

export interface Database {
  id: string;
  url: string;
  title: string;
  description?: string;
  icon?: string;
  cover?: string;
  properties: Record<string, DatabaseProperty>;
  createdTime: string;
  lastEditedTime: string;
}

export interface DatabaseProperty {
  id: string;
  name: string;
  type: string;
  options?: any[];
}

export interface PageContent {
  page: Page;
  blocks: Block[];
}

export interface Block {
  id: string;
  type: string;
  hasChildren: boolean;
  content: Record<string, any>;
  createdTime?: string;
  lastEditedTime?: string;
}

export interface SearchResult {
  object: 'list';
  results: (Page | Database)[];
  hasMore: boolean;
  nextCursor?: string;
}

export class NotionTool {
  private client: Client;
  private defaultPageId: string = '';

  constructor(config: NotionConfig) {
    this.client = new Client({ auth: config.apiKey });
  }

  setDefaultPage(pageId: string): void {
    this.defaultPageId = pageId;
  }

  async search(
    query: string,
    options?: {
      filter?: { property: 'object'; value: 'page' | 'data_source' };
      sort?: { direction: 'ascending' | 'descending'; timestamp: 'last_edited_time' };
      pageSize?: number;
      startCursor?: string;
    }
  ): Promise<SearchResult> {
    try {
      const response = (await this.client.search({
        query,
        filter: options?.filter,
        sort: options?.sort,
        page_size: options?.pageSize || 100,
        start_cursor: options?.startCursor,
      })) as any;

      return {
        object: 'list',
        results: response.results,
        hasMore: response.has_more,
        nextCursor: response.next_cursor || undefined,
      };
    } catch (error) {
      console.error('Notion search failed:', error);
      return { object: 'list', results: [], hasMore: false };
    }
  }

  async getPage(pageId: string): Promise<Page | null> {
    try {
      const page = (await this.client.pages.retrieve({ page_id: pageId })) as any;

      return {
        id: page.id,
        url: `https://notion.so/${pageId.replace(/-/g, '')}`,
        title: this.extractTitle(page),
        icon: page.icon?.emoji || page.external?.url || page.file?.url,
        cover: page.cover?.external?.url || page.cover?.file?.url,
        createdTime: page.created_time || '',
        lastEditedTime: page.last_edited_time || '',
        createdBy: page.created_by?.id || '',
        lastEditedBy: page.last_edited_by?.id || '',
        parent: {
          type: page.parent?.type || 'unknown',
          id: page.parent?.id || '',
        },
        archived: page.archived || false,
      };
    } catch (error) {
      console.error('Failed to get page:', error);
      return null;
    }
  }

  async createPage(options: {
    parent: { pageId?: string; databaseId?: string };
    title?: string;
    icon?: string;
    cover?: string;
    properties?: Record<string, any>;
    children?: any[];
  }): Promise<Page | null> {
    try {
      const parent = options.parent.pageId
        ? { page_id: options.parent.pageId }
        : { database_id: options.parent.databaseId! };

      const page = await this.client.pages.create({
        ...parent,
        icon: options.icon ? { emoji: options.icon } : undefined,
        cover: options.cover ? { external: { url: options.cover } } : undefined,
        properties: this.buildProperties(options.title, options.properties),
        children: options.children,
      } as any);

      const createdPage = page as any;
      return {
        id: createdPage.id,
        url: `https://notion.so/${createdPage.id.replace(/-/g, '')}`,
        title: this.extractTitle(createdPage),
        createdTime: createdPage.created_time || '',
        lastEditedTime: createdPage.last_edited_time || '',
        createdBy: '',
        lastEditedBy: '',
        parent: { type: 'page', id: createdPage.id },
        archived: createdPage.archived || false,
      };
    } catch (error) {
      console.error('Failed to create page:', error);
      return null;
    }
  }

  async updatePage(
    pageId: string,
    options: {
      title?: string;
      icon?: string;
      cover?: string;
      archived?: boolean;
      properties?: Record<string, any>;
    }
  ): Promise<Page | null> {
    try {
      const updates: any = {};
      if (options.icon) updates.icon = { emoji: options.icon };
      if (options.cover) updates.cover = { external: { url: options.cover } };
      if (typeof options.archived === 'boolean') updates.archived = options.archived;
      if (options.title || options.properties) {
        updates.properties = this.buildProperties(options.title, options.properties);
      }

      const page = (await this.client.pages.update({
        page_id: pageId,
        ...updates,
      })) as any;

      return {
        id: page.id,
        url: `https://notion.so/${page.id.replace(/-/g, '')}`,
        title: this.extractTitle(page),
        createdTime: page.created_time || '',
        lastEditedTime: page.last_edited_time || '',
        createdBy: '',
        lastEditedBy: '',
        parent: { type: 'page', id: page.id },
        archived: page.archived || false,
      };
    } catch (error) {
      console.error('Failed to update page:', error);
      return null;
    }
  }

  async getPageContent(
    pageId: string,
    options?: {
      pageSize?: number;
      startCursor?: string;
    }
  ): Promise<{ blocks: Block[]; hasMore: boolean; nextCursor?: string }> {
    try {
      const response = await this.client.blocks.children.list({
        block_id: pageId,
        page_size: options?.pageSize || 100,
        start_cursor: options?.startCursor,
      });

      const blocks: Block[] = response.results.map((block: any) => ({
        id: block.id,
        type: block.type,
        hasChildren: block.has_children,
        content: this.extractBlockContent(block),
        createdTime: block.created_time,
        lastEditedTime: block.last_edited_time,
      }));

      return {
        blocks,
        hasMore: response.has_more,
        nextCursor: response.next_cursor || undefined,
      };
    } catch (error) {
      console.error('Failed to get page content:', error);
      return { blocks: [], hasMore: false };
    }
  }

  async appendBlockChildren(
    blockId: string,
    children: any[]
  ): Promise<{ success: boolean; added: number }> {
    try {
      const response = await this.client.blocks.children.append({
        block_id: blockId,
        children,
      } as any);

      return {
        success: true,
        added: response.results?.length || 0,
      };
    } catch (error) {
      console.error('Failed to append block children:', error);
      return { success: false, added: 0 };
    }
  }

  async updateBlock(blockId: string, content: Record<string, any>): Promise<boolean> {
    try {
      await this.client.blocks.update({
        block_id: blockId,
        ...content,
      });
      return true;
    } catch (error) {
      console.error('Failed to update block:', error);
      return false;
    }
  }

  async deleteBlock(blockId: string): Promise<boolean> {
    try {
      await this.client.blocks.delete({
        block_id: blockId,
      });
      return true;
    } catch (error) {
      console.error('Failed to delete block:', error);
      return false;
    }
  }

  async getDatabase(databaseId: string): Promise<Database | null> {
    try {
      const database = (await this.client.databases.retrieve({
        database_id: databaseId,
      })) as any;

      const properties: Record<string, DatabaseProperty> = {};
      for (const [key, prop] of Object.entries(database.properties)) {
        const property = prop as any;
        properties[key] = {
          id: property.id,
          name: property.name,
          type: property.type,
          options: property[property.type]?.options,
        };
      }

      return {
        id: database.id,
        url: `https://notion.so/${databaseId.replace(/-/g, '')}`,
        title: database.title?.[0]?.plain_text || 'Untitled',
        description: database.description?.[0]?.plain_text,
        icon: database.icon?.emoji,
        cover: database.cover?.external?.url || database.cover?.file?.url,
        properties,
        createdTime: database.created_time,
        lastEditedTime: database.last_edited_time,
      };
    } catch (error) {
      console.error('Failed to get database:', error);
      return null;
    }
  }

  async queryDatabase(
    databaseId: string,
    options?: {
      filter?: any;
      sorts?: any[];
      pageSize?: number;
      startCursor?: string;
    }
  ): Promise<{ results: Page[]; hasMore: boolean; nextCursor?: string }> {
    try {
      const response = await (this.client as any).databases.query({
        database_id: databaseId,
        filter: options?.filter,
        sorts: options?.sorts,
        page_size: options?.pageSize || 100,
        start_cursor: options?.startCursor,
      });

      const results: Page[] = response.results.map((page: any) => ({
        id: page.id,
        url: `https://notion.so/${page.id.replace(/-/g, '')}`,
        title: this.extractTitle(page),
        createdTime: page.created_time || '',
        lastEditedTime: page.last_edited_time || '',
        createdBy: '',
        lastEditedBy: '',
        parent: { type: 'database', id: databaseId },
        archived: page.archived || false,
      }));

      return {
        results,
        hasMore: response.has_more,
        nextCursor: response.next_cursor || undefined,
      };
    } catch (error) {
      console.error('Failed to query database:', error);
      return { results: [], hasMore: false };
    }
  }

  async createDatabase(options: {
    parentPageId: string;
    title: string;
    properties: Record<string, { type: string; options?: any[] }>;
  }): Promise<Database | null> {
    try {
      const database = (await (this.client as any).databases.create({
        parent: { type: 'page_id', page_id: options.parentPageId },
        title: [{ text: { content: options.title } }],
        properties: options.properties,
      })) as any;

      return {
        id: database.id,
        url: `https://notion.so/${database.id.replace(/-/g, '')}`,
        title: options.title,
        properties: {},
        createdTime: database.created_time || '',
        lastEditedTime: database.last_edited_time || '',
      };
    } catch (error) {
      console.error('Failed to create database:', error);
      return null;
    }
  }

  async addPageToDatabase(
    databaseId: string,
    properties: Record<string, any>
  ): Promise<Page | null> {
    return this.createPage({
      parent: { databaseId },
      properties,
    });
  }

  async createTextBlock(
    text: string,
    options?: { paragraph?: boolean; color?: string }
  ): Promise<any> {
    return {
      object: 'block',
      type: options?.paragraph ? 'paragraph' : 'rich_text',
      [options?.paragraph ? 'paragraph' : 'rich_text']: {
        rich_text: [{ type: 'text', text: { content: text } }],
        color: options?.color || 'default',
      },
    };
  }

  async createHeadingBlock(text: string, level: 1 | 2 | 3): Promise<any> {
    const headingType = `heading_${level}`;
    return {
      object: 'block',
      type: headingType,
      [headingType]: {
        rich_text: [{ type: 'text', text: { content: text } }],
      },
    };
  }

  async createBulletedListItem(text: string): Promise<any> {
    return {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ type: 'text', text: { content: text } }],
      },
    };
  }

  async createNumberedListItem(text: string): Promise<any> {
    return {
      object: 'block',
      type: 'numbered_list_item',
      numbered_list_item: {
        rich_text: [{ type: 'text', text: { content: text } }],
      },
    };
  }

  async createCodeBlock(code: string, language: string): Promise<any> {
    return {
      object: 'block',
      type: 'code',
      code: {
        rich_text: [{ type: 'text', text: { content: code } }],
        language,
      },
    };
  }

  async createQuoteBlock(text: string): Promise<any> {
    return {
      object: 'block',
      type: 'quote',
      quote: {
        rich_text: [{ type: 'text', text: { content: text } }],
      },
    };
  }

  async createDividerBlock(): Promise<any> {
    return {
      object: 'block',
      type: 'divider',
      divider: {},
    };
  }

  async createCalloutBlock(text: string, icon?: string): Promise<any> {
    return {
      object: 'block',
      type: 'callout',
      callout: {
        rich_text: [{ type: 'text', text: { content: text } }],
        icon: icon ? { emoji: icon } : undefined,
      },
    };
  }

  async createToggleBlock(text: string): Promise<any> {
    return {
      object: 'block',
      type: 'toggle',
      toggle: {
        rich_text: [{ type: 'text', text: { content: text } }],
      },
    };
  }

  private extractTitle(page: any): string {
    if (page.properties) {
      for (const [key, prop] of Object.entries(page.properties)) {
        const property = prop as any;
        if (property.type === 'title' && property.title?.length > 0) {
          return property.title[0]?.plain_text || 'Untitled';
        }
      }
    }
    if (page.title?.length > 0) {
      return page.title[0]?.plain_text || 'Untitled';
    }
    return 'Untitled';
  }

  private extractBlockContent(block: any): Record<string, any> {
    const type = block.type;
    if (block[type]) {
      return block[type];
    }
    return {};
  }

  private buildProperties(title?: string, properties?: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};

    if (title) {
      result.title = [
        {
          type: 'text',
          text: { content: title },
        },
      ];
    }

    if (properties) {
      for (const [key, value] of Object.entries(properties)) {
        result[key] = value;
      }
    }

    return result;
  }
}
