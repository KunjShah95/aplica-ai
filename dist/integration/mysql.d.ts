import { PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
export interface MySQLConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    waitForConnections?: boolean;
    connectionLimit?: number;
    queueLimit?: number;
    enableKeepAlive?: boolean;
    keepAliveInitialDelay?: number;
}
export declare class MySQLDatabase {
    private pool;
    private config;
    constructor(config: MySQLConfig);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    query<T extends RowDataPacket[]>(sql: string, params?: any[]): Promise<T>;
    execute(sql: string, params?: any[]): Promise<ResultSetHeader>;
    getConnection(): Promise<PoolConnection>;
    transaction<T>(callback: (connection: PoolConnection) => Promise<T>): Promise<T>;
    createTable(tableName: string, columns: Record<string, string>, options?: {
        engine?: string;
        charset?: string;
        primaryKey?: string[];
    }): Promise<void>;
    dropTable(tableName: string): Promise<void>;
    tableExists(tableName: string): Promise<boolean>;
    listTables(): Promise<string[]>;
    showCreateTable(tableName: string): Promise<string>;
    describeTable(tableName: string): Promise<RowDataPacket[]>;
    showIndexes(tableName: string): Promise<RowDataPacket[]>;
    createIndex(tableName: string, indexName: string, columns: string[], unique?: boolean): Promise<void>;
    dropIndex(tableName: string, indexName: string): Promise<void>;
    ping(): Promise<boolean>;
}
export declare class MySQLRepository<T extends Record<string, any>> {
    private db;
    private tableName;
    constructor(db: MySQLDatabase, tableName: string);
    findOne(where: Partial<T>, columns?: (keyof T)[]): Promise<T | null>;
    findById(id: number | string, columns?: (keyof T)[]): Promise<T | null>;
    findMany(options: {
        where?: Partial<T>;
        columns?: (keyof T)[];
        orderBy?: [keyof T, 'ASC' | 'DESC'][];
        limit?: number;
        offset?: number;
    }): Promise<T[]>;
    insert(data: T): Promise<number>;
    insertMany(data: T[]): Promise<number[]>;
    update(where: Partial<T>, data: Partial<T>): Promise<number>;
    updateById(id: number | string, data: Partial<T>): Promise<boolean>;
    delete(where: Partial<T>): Promise<number>;
    deleteById(id: number | string): Promise<boolean>;
    count(where?: Partial<T>): Promise<number>;
    exists(where: Partial<T>): Promise<boolean>;
    aggregate(column: keyof T, operation: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX', where?: Partial<T>): Promise<number>;
}
export declare function createMySQLService(config: MySQLConfig): MySQLDatabase;
//# sourceMappingURL=mysql.d.ts.map