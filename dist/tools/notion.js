import { Client } from '@notionhq/client';
export class NotionTool {
    client;
    defaultPageId = '';
    constructor(config) {
        this.client = new Client({ auth: config.apiKey });
    }
    setDefaultPage(pageId) {
        this.defaultPageId = pageId;
    }
    async search(query, options) {
        try {
            const response = (await this.client.search({
                query,
                filter: options?.filter,
                sort: options?.sort,
                page_size: options?.pageSize || 100,
                start_cursor: options?.startCursor,
            }));
            return {
                object: 'list',
                results: response.results,
                hasMore: response.has_more,
                nextCursor: response.next_cursor || undefined,
            };
        }
        catch (error) {
            console.error('Notion search failed:', error);
            return { object: 'list', results: [], hasMore: false };
        }
    }
    async getPage(pageId) {
        try {
            const page = (await this.client.pages.retrieve({ page_id: pageId }));
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
        }
        catch (error) {
            console.error('Failed to get page:', error);
            return null;
        }
    }
    async createPage(options) {
        try {
            const parent = options.parent.pageId
                ? { page_id: options.parent.pageId }
                : { database_id: options.parent.databaseId };
            const page = await this.client.pages.create({
                ...parent,
                icon: options.icon ? { emoji: options.icon } : undefined,
                cover: options.cover ? { external: { url: options.cover } } : undefined,
                properties: this.buildProperties(options.title, options.properties),
                children: options.children,
            });
            const createdPage = page;
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
        }
        catch (error) {
            console.error('Failed to create page:', error);
            return null;
        }
    }
    async updatePage(pageId, options) {
        try {
            const updates = {};
            if (options.icon)
                updates.icon = { emoji: options.icon };
            if (options.cover)
                updates.cover = { external: { url: options.cover } };
            if (typeof options.archived === 'boolean')
                updates.archived = options.archived;
            if (options.title || options.properties) {
                updates.properties = this.buildProperties(options.title, options.properties);
            }
            const page = (await this.client.pages.update({
                page_id: pageId,
                ...updates,
            }));
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
        }
        catch (error) {
            console.error('Failed to update page:', error);
            return null;
        }
    }
    async getPageContent(pageId, options) {
        try {
            const response = await this.client.blocks.children.list({
                block_id: pageId,
                page_size: options?.pageSize || 100,
                start_cursor: options?.startCursor,
            });
            const blocks = response.results.map((block) => ({
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
        }
        catch (error) {
            console.error('Failed to get page content:', error);
            return { blocks: [], hasMore: false };
        }
    }
    async appendBlockChildren(blockId, children) {
        try {
            const response = await this.client.blocks.children.append({
                block_id: blockId,
                children,
            });
            return {
                success: true,
                added: response.results?.length || 0,
            };
        }
        catch (error) {
            console.error('Failed to append block children:', error);
            return { success: false, added: 0 };
        }
    }
    async updateBlock(blockId, content) {
        try {
            await this.client.blocks.update({
                block_id: blockId,
                ...content,
            });
            return true;
        }
        catch (error) {
            console.error('Failed to update block:', error);
            return false;
        }
    }
    async deleteBlock(blockId) {
        try {
            await this.client.blocks.delete({
                block_id: blockId,
            });
            return true;
        }
        catch (error) {
            console.error('Failed to delete block:', error);
            return false;
        }
    }
    async getDatabase(databaseId) {
        try {
            const database = (await this.client.databases.retrieve({
                database_id: databaseId,
            }));
            const properties = {};
            for (const [key, prop] of Object.entries(database.properties)) {
                const property = prop;
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
        }
        catch (error) {
            console.error('Failed to get database:', error);
            return null;
        }
    }
    async queryDatabase(databaseId, options) {
        try {
            const response = await this.client.databases.query({
                database_id: databaseId,
                filter: options?.filter,
                sorts: options?.sorts,
                page_size: options?.pageSize || 100,
                start_cursor: options?.startCursor,
            });
            const results = response.results.map((page) => ({
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
        }
        catch (error) {
            console.error('Failed to query database:', error);
            return { results: [], hasMore: false };
        }
    }
    async createDatabase(options) {
        try {
            const database = (await this.client.databases.create({
                parent: { type: 'page_id', page_id: options.parentPageId },
                title: [{ text: { content: options.title } }],
                properties: options.properties,
            }));
            return {
                id: database.id,
                url: `https://notion.so/${database.id.replace(/-/g, '')}`,
                title: options.title,
                properties: {},
                createdTime: database.created_time || '',
                lastEditedTime: database.last_edited_time || '',
            };
        }
        catch (error) {
            console.error('Failed to create database:', error);
            return null;
        }
    }
    async addPageToDatabase(databaseId, properties) {
        return this.createPage({
            parent: { databaseId },
            properties,
        });
    }
    async createTextBlock(text, options) {
        return {
            object: 'block',
            type: options?.paragraph ? 'paragraph' : 'rich_text',
            [options?.paragraph ? 'paragraph' : 'rich_text']: {
                rich_text: [{ type: 'text', text: { content: text } }],
                color: options?.color || 'default',
            },
        };
    }
    async createHeadingBlock(text, level) {
        const headingType = `heading_${level}`;
        return {
            object: 'block',
            type: headingType,
            [headingType]: {
                rich_text: [{ type: 'text', text: { content: text } }],
            },
        };
    }
    async createBulletedListItem(text) {
        return {
            object: 'block',
            type: 'bulleted_list_item',
            bulleted_list_item: {
                rich_text: [{ type: 'text', text: { content: text } }],
            },
        };
    }
    async createNumberedListItem(text) {
        return {
            object: 'block',
            type: 'numbered_list_item',
            numbered_list_item: {
                rich_text: [{ type: 'text', text: { content: text } }],
            },
        };
    }
    async createCodeBlock(code, language) {
        return {
            object: 'block',
            type: 'code',
            code: {
                rich_text: [{ type: 'text', text: { content: code } }],
                language,
            },
        };
    }
    async createQuoteBlock(text) {
        return {
            object: 'block',
            type: 'quote',
            quote: {
                rich_text: [{ type: 'text', text: { content: text } }],
            },
        };
    }
    async createDividerBlock() {
        return {
            object: 'block',
            type: 'divider',
            divider: {},
        };
    }
    async createCalloutBlock(text, icon) {
        return {
            object: 'block',
            type: 'callout',
            callout: {
                rich_text: [{ type: 'text', text: { content: text } }],
                icon: icon ? { emoji: icon } : undefined,
            },
        };
    }
    async createToggleBlock(text) {
        return {
            object: 'block',
            type: 'toggle',
            toggle: {
                rich_text: [{ type: 'text', text: { content: text } }],
            },
        };
    }
    extractTitle(page) {
        if (page.properties) {
            for (const [key, prop] of Object.entries(page.properties)) {
                const property = prop;
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
    extractBlockContent(block) {
        const type = block.type;
        if (block[type]) {
            return block[type];
        }
        return {};
    }
    buildProperties(title, properties) {
        const result = {};
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
//# sourceMappingURL=notion.js.map