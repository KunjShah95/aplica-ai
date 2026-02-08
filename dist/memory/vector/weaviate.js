import weaviate, { ApiKey } from 'weaviate-ts-client';
import { v4 as uuidv4 } from 'uuid';
export class WeaviateVectorStore {
    client;
    className;
    constructor(config) {
        this.client = weaviate.client({
            scheme: config.scheme || 'http',
            host: config.host,
            apiKey: config.apiKey ? new ApiKey(config.apiKey) : undefined,
        });
        this.className = config.className || 'AlpiciaDocument';
    }
    async initialize() {
        try {
            const schema = await this.getClassSchema();
            if (!schema) {
                console.log(`Creating Weaviate class '${this.className}'...`);
                await this.createClass();
            }
            else {
                console.log(`Weaviate class '${this.className}' exists`);
            }
        }
        catch (error) {
            console.error('Failed to initialize Weaviate:', error);
            throw error;
        }
    }
    async add(documents) {
        const ids = [];
        try {
            for (const doc of documents) {
                const id = doc.id || uuidv4();
                ids.push(id);
                await this.client.data
                    .creator()
                    .withClassName(this.className)
                    .withId(id)
                    .withProperties({
                    content: doc.content,
                    metadata: doc.metadata ? JSON.stringify(doc.metadata) : {},
                    ...(doc.embedding && { vector: doc.embedding }),
                })
                    .do();
            }
            return ids;
        }
        catch (error) {
            console.error('Weaviate add error:', error);
            throw error;
        }
    }
    async search(query, options) {
        const limit = options?.limit || 10;
        try {
            let searchBuilder;
            if (typeof query === 'string') {
                searchBuilder = this.client.graphql
                    .get()
                    .withClassName(this.className)
                    .withNearText({
                    concepts: [query],
                });
            }
            else {
                searchBuilder = this.client.graphql.get().withClassName(this.className).withNearVector({
                    vector: query,
                });
            }
            if (options?.where) {
                searchBuilder = searchBuilder.withWhere(options.where);
            }
            if (options?.offset) {
                searchBuilder = searchBuilder.withOffset(options.offset);
            }
            searchBuilder = searchBuilder.withLimit(limit);
            if (options?.includeVector !== false) {
                searchBuilder = searchBuilder.withFields('_additional { id certainty distance vector } content metadata');
            }
            else {
                searchBuilder = searchBuilder.withFields('_additional { id certainty distance } content metadata');
            }
            const result = await searchBuilder.do();
            const resultData = result?.data;
            const data = resultData?.Get?.[this.className] || [];
            return data.map((item) => {
                const typedItem = item;
                const additional = typedItem._additional;
                return {
                    id: additional?.id || '',
                    score: additional?.certainty || additional?.distance || 0,
                    content: typedItem.content || '',
                    metadata: typedItem.metadata ? JSON.parse(typedItem.metadata) : {},
                };
            });
        }
        catch (error) {
            console.error('Weaviate search error:', error);
            throw error;
        }
    }
    async query(vector, nearText, where, limit) {
        const queryText = vector ? undefined : nearText?.concepts.join(' ');
        return this.search(queryText || vector, {
            limit,
            where,
        });
    }
    async delete(ids) {
        try {
            for (const id of ids) {
                await this.client.data.deleter().withClassName(this.className).withId(id).do();
            }
        }
        catch (error) {
            console.error('Weaviate delete error:', error);
            throw error;
        }
    }
    async getClassSchema() {
        try {
            const schema = await this.client.schema.getter().do();
            const classObj = schema.classes?.find((c) => c.class === this.className);
            return classObj || null;
        }
        catch (error) {
            console.error('Weaviate get schema error:', error);
            return null;
        }
    }
    async createClass() {
        const classObj = {
            class: this.className,
            description: 'Document embeddings for Alpicia AI',
            vectorizer: 'text2vec-transformers',
            moduleConfig: {
                'text2vec-transformers': {
                    vectorizeClassName: false,
                },
            },
            properties: [
                {
                    name: 'content',
                    dataType: ['text'],
                    description: 'Document content',
                },
                {
                    name: 'metadata',
                    dataType: ['text'],
                    description: 'JSON metadata',
                },
            ],
        };
        try {
            await this.client.schema.classCreator().withClass(classObj).do();
        }
        catch (error) {
            if (!error.message?.includes('already exists')) {
                throw error;
            }
        }
    }
    async batchAdd(documents) {
        const ids = [];
        try {
            let batcher = this.client.batch.objectsBatcher();
            for (const doc of documents) {
                const id = doc.id || uuidv4();
                ids.push(id);
                batcher = batcher.withObject({
                    class: this.className,
                    id,
                    properties: {
                        content: doc.content,
                        metadata: doc.metadata ? JSON.stringify(doc.metadata) : {},
                    },
                    vector: doc.embedding,
                });
            }
            await batcher.do();
            return ids;
        }
        catch (error) {
            console.error('Weaviate batch add error:', error);
            throw error;
        }
    }
    async fetchById(id) {
        try {
            const result = await this.client.graphql
                .get()
                .withClassName(this.className)
                .withWhere({
                path: ['id'],
                operator: 'Equal',
                valueString: id,
            })
                .withFields('_additional { id } content metadata')
                .do();
            const items = result.data?.Get?.[this.className];
            if (!items || items.length === 0)
                return null;
            const item = items[0];
            return {
                id: item._additional?.id || '',
                score: 1,
                content: item.content || '',
                metadata: item.metadata ? JSON.parse(item.metadata) : {},
            };
        }
        catch (error) {
            console.error('Weaviate fetch by ID error:', error);
            throw error;
        }
    }
    async update(id, content, metadata) {
        try {
            await this.client.data
                .updater()
                .withClassName(this.className)
                .withId(id)
                .withProperties({
                content,
                metadata: metadata ? JSON.stringify(metadata) : {},
            })
                .do();
        }
        catch (error) {
            console.error('Weaviate update error:', error);
            throw error;
        }
    }
    async getStats() {
        try {
            const result = await this.client.graphql
                .aggregate()
                .withClassName(this.className)
                .withFields('meta { count }')
                .do();
            return {
                totalCount: result.data?.Aggregate?.[this.className]?.[0]?.meta?.count || 0,
            };
        }
        catch (error) {
            console.error('Weaviate stats error:', error);
            throw error;
        }
    }
    async createBackup(backupId) {
        try {
            await this.client.backup
                .creator()
                .withBackend('filesystem')
                .withBackupId(backupId)
                .withIncludeClassNames(this.className)
                .do();
        }
        catch (error) {
            console.error('Weaviate backup error:', error);
            throw error;
        }
    }
}
//# sourceMappingURL=weaviate.js.map