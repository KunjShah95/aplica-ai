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
    parent: {
        type: string;
        id: string;
    };
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
export declare class NotionTool {
    private client;
    private defaultPageId;
    constructor(config: NotionConfig);
    setDefaultPage(pageId: string): void;
    search(query: string, options?: {
        filter?: {
            property: 'object';
            value: 'page' | 'data_source';
        };
        sort?: {
            direction: 'ascending' | 'descending';
            timestamp: 'last_edited_time';
        };
        pageSize?: number;
        startCursor?: string;
    }): Promise<SearchResult>;
    getPage(pageId: string): Promise<Page | null>;
    createPage(options: {
        parent: {
            pageId?: string;
            databaseId?: string;
        };
        title?: string;
        icon?: string;
        cover?: string;
        properties?: Record<string, any>;
        children?: any[];
    }): Promise<Page | null>;
    updatePage(pageId: string, options: {
        title?: string;
        icon?: string;
        cover?: string;
        archived?: boolean;
        properties?: Record<string, any>;
    }): Promise<Page | null>;
    getPageContent(pageId: string, options?: {
        pageSize?: number;
        startCursor?: string;
    }): Promise<{
        blocks: Block[];
        hasMore: boolean;
        nextCursor?: string;
    }>;
    appendBlockChildren(blockId: string, children: any[]): Promise<{
        success: boolean;
        added: number;
    }>;
    updateBlock(blockId: string, content: Record<string, any>): Promise<boolean>;
    deleteBlock(blockId: string): Promise<boolean>;
    getDatabase(databaseId: string): Promise<Database | null>;
    queryDatabase(databaseId: string, options?: {
        filter?: any;
        sorts?: any[];
        pageSize?: number;
        startCursor?: string;
    }): Promise<{
        results: Page[];
        hasMore: boolean;
        nextCursor?: string;
    }>;
    createDatabase(options: {
        parentPageId: string;
        title: string;
        properties: Record<string, {
            type: string;
            options?: any[];
        }>;
    }): Promise<Database | null>;
    addPageToDatabase(databaseId: string, properties: Record<string, any>): Promise<Page | null>;
    createTextBlock(text: string, options?: {
        paragraph?: boolean;
        color?: string;
    }): Promise<any>;
    createHeadingBlock(text: string, level: 1 | 2 | 3): Promise<any>;
    createBulletedListItem(text: string): Promise<any>;
    createNumberedListItem(text: string): Promise<any>;
    createCodeBlock(code: string, language: string): Promise<any>;
    createQuoteBlock(text: string): Promise<any>;
    createDividerBlock(): Promise<any>;
    createCalloutBlock(text: string, icon?: string): Promise<any>;
    createToggleBlock(text: string): Promise<any>;
    private extractTitle;
    private extractBlockContent;
    private buildProperties;
}
//# sourceMappingURL=notion.d.ts.map