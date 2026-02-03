import mysql, { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

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

export class MySQLDatabase {
  private pool: Pool | null = null;
  private config: MySQLConfig;

  constructor(config: MySQLConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    this.pool = mysql.createPool({
      host: this.config.host,
      port: this.config.port,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      waitForConnections: this.config.waitForConnections ?? true,
      connectionLimit: this.config.connectionLimit || 10,
      queueLimit: this.config.queueLimit || 0,
      enableKeepAlive: this.config.enableKeepAlive ?? true,
      keepAliveInitialDelay: this.config.keepAliveInitialDelay || 10000,
    });

    const connection = await this.pool.getConnection();
    connection.release();
    console.log('MySQL connected successfully');
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  async query<T extends RowDataPacket[]>(sql: string, params?: any[]): Promise<T> {
    if (!this.pool) throw new Error('Database not connected');
    const [rows] = await this.pool.query<T>(sql, params);
    return rows;
  }

  async execute(sql: string, params?: any[]): Promise<ResultSetHeader> {
    if (!this.pool) throw new Error('Database not connected');
    const [result] = await this.pool.execute<ResultSetHeader>(sql, params);
    return result;
  }

  async getConnection(): Promise<PoolConnection> {
    if (!this.pool) throw new Error('Database not connected');
    return this.pool.getConnection();
  }

  async transaction<T>(callback: (connection: PoolConnection) => Promise<T>): Promise<T> {
    const connection = await this.getConnection();
    await connection.beginTransaction();

    try {
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async createTable(
    tableName: string,
    columns: Record<string, string>,
    options?: { engine?: string; charset?: string; primaryKey?: string[] }
  ): Promise<void> {
    const cols = Object.entries(columns)
      .map(([name, type]) => `  ${name} ${type}`)
      .join(',\n');

    const primaryKey = options?.primaryKey?.length
      ? `,\n  PRIMARY KEY (${options.primaryKey.join(', ')})`
      : '';

    const engine = options?.engine || 'InnoDB';
    const charset = options?.charset || 'utf8mb4';

    const sql = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        ${cols}${primaryKey}
      ) ENGINE=${engine} DEFAULT CHARSET=${charset}
    `.trim();

    await this.execute(sql);
  }

  async dropTable(tableName: string): Promise<void> {
    await this.execute(`DROP TABLE IF EXISTS ${tableName}`);
  }

  async tableExists(tableName: string): Promise<boolean> {
    const rows = await this.query<RowDataPacket[]>(`SHOW TABLES LIKE ?`, [tableName]);
    return rows.length > 0;
  }

  async listTables(): Promise<string[]> {
    const rows = await this.query<RowDataPacket[]>('SHOW TABLES');
    return rows.map((row) => Object.values(row)[0] as string);
  }

  async showCreateTable(tableName: string): Promise<string> {
    const [rows] = await this.pool!.query<RowDataPacket[]>(`SHOW CREATE TABLE ${tableName}`);
    return (rows[0] as any)['Create Table'] || (rows[0] as any)['Create View'];
  }

  async describeTable(tableName: string): Promise<RowDataPacket[]> {
    return this.query<RowDataPacket[]>(`DESCRIBE ${tableName}`);
  }

  async showIndexes(tableName: string): Promise<RowDataPacket[]> {
    return this.query<RowDataPacket[]>(`SHOW INDEX FROM ${tableName}`);
  }

  async createIndex(
    tableName: string,
    indexName: string,
    columns: string[],
    unique: boolean = false
  ): Promise<void> {
    const indexType = unique ? 'UNIQUE INDEX' : 'INDEX';
    const cols = columns.join(', ');
    await this.execute(`CREATE ${indexType} ${indexName} ON ${tableName} (${cols})`);
  }

  async dropIndex(tableName: string, indexName: string): Promise<void> {
    await this.execute(`DROP INDEX ${indexName} ON ${tableName}`);
  }

  async ping(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}

export class MySQLRepository<T extends Record<string, any>> {
  private db: MySQLDatabase;
  private tableName: string;

  constructor(db: MySQLDatabase, tableName: string) {
    this.db = db;
    this.tableName = tableName;
  }

  async findOne(where: Partial<T>, columns?: (keyof T)[]): Promise<T | null> {
    const cols = columns?.join(', ') || '*';
    const conditions = Object.keys(where)
      .map((key) => `${key} = ?`)
      .join(' AND ');
    const values = Object.values(where);

    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT ${cols} FROM ${this.tableName} WHERE ${conditions} LIMIT 1`,
      values
    );

    return rows.length > 0 ? (rows[0] as T) : null;
  }

  async findById(id: number | string, columns?: (keyof T)[]): Promise<T | null> {
    const cols = columns?.join(', ') || '*';
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT ${cols} FROM ${this.tableName} WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows.length > 0 ? (rows[0] as T) : null;
  }

  async findMany(options: {
    where?: Partial<T>;
    columns?: (keyof T)[];
    orderBy?: [keyof T, 'ASC' | 'DESC'][];
    limit?: number;
    offset?: number;
  }): Promise<T[]> {
    const cols = options.columns?.join(', ') || '*';
    let sql = `SELECT ${cols} FROM ${this.tableName}`;
    const values: any[] = [];

    if (options.where) {
      const conditions = Object.keys(options.where)
        .map((key) => `${key} = ?`)
        .join(' AND ');
      sql += ` WHERE ${conditions}`;
      values.push(...Object.values(options.where));
    }

    if (options.orderBy?.length) {
      const orderClauses = options.orderBy.map(([col, dir]) => `${String(col)} ${dir}`).join(', ');
      sql += ` ORDER BY ${orderClauses}`;
    }

    if (options.limit) {
      sql += ` LIMIT ?`;
      values.push(options.limit);

      if (options.offset) {
        sql += ` OFFSET ?`;
        values.push(options.offset);
      }
    }

    return this.db.query<RowDataPacket[]>(sql, values) as Promise<T[]>;
  }

  async insert(data: T): Promise<number> {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data)
      .map(() => '?')
      .join(', ');
    const values = Object.values(data);

    const result = await this.db.execute(
      `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`,
      values
    );

    return result.insertId;
  }

  async insertMany(data: T[]): Promise<number[]> {
    if (data.length === 0) return [];

    const columns = Object.keys(data[0]).join(', ');
    const placeholders = Object.keys(data[0])
      .map(() => '?')
      .join(', ');
    const sql = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`;

    const ids: number[] = [];

    for (const row of data) {
      const result = await this.db.execute(sql, Object.values(row));
      ids.push(result.insertId);
    }

    return ids;
  }

  async update(where: Partial<T>, data: Partial<T>): Promise<number> {
    const setClause = Object.keys(data)
      .map((key) => `${key} = ?`)
      .join(', ');
    const whereClause = Object.keys(where)
      .map((key) => `${key} = ?`)
      .join(' AND ');
    const values = [...Object.values(data), ...Object.values(where)];

    const result = await this.db.execute(
      `UPDATE ${this.tableName} SET ${setClause} WHERE ${whereClause}`,
      values
    );

    return result.affectedRows;
  }

  async updateById(id: number | string, data: Partial<T>): Promise<boolean> {
    const setClause = Object.keys(data)
      .map((key) => `${key} = ?`)
      .join(', ');
    const result = await this.db.execute(`UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`, [
      ...Object.values(data),
      id,
    ]);
    return result.affectedRows > 0;
  }

  async delete(where: Partial<T>): Promise<number> {
    const conditions = Object.keys(where)
      .map((key) => `${key} = ?`)
      .join(' AND ');
    const result = await this.db.execute(
      `DELETE FROM ${this.tableName} WHERE ${conditions}`,
      Object.values(where)
    );
    return result.affectedRows;
  }

  async deleteById(id: number | string): Promise<boolean> {
    const result = await this.db.execute(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  }

  async count(where?: Partial<T>): Promise<number> {
    if (where) {
      const conditions = Object.keys(where)
        .map((key) => `${key} = ?`)
        .join(' AND ');
      const rows = await this.db.query<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM ${this.tableName} WHERE ${conditions}`,
        Object.values(where)
      );
      return rows[0].count as number;
    }

    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM ${this.tableName}`
    );
    return rows[0].count as number;
  }

  async exists(where: Partial<T>): Promise<boolean> {
    const conditions = Object.keys(where)
      .map((key) => `${key} = ?`)
      .join(' AND ');
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT 1 FROM ${this.tableName} WHERE ${conditions} LIMIT 1`,
      Object.values(where)
    );
    return rows.length > 0;
  }

  async aggregate(
    column: keyof T,
    operation: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX',
    where?: Partial<T>
  ): Promise<number> {
    let sql = `SELECT ${operation}(${String(column)}) as result FROM ${this.tableName}`;
    const values: any[] = [];

    if (where) {
      const conditions = Object.keys(where)
        .map((key) => `${key} = ?`)
        .join(' AND ');
      sql += ` WHERE ${conditions}`;
      values.push(...Object.values(where));
    }

    const rows = await this.db.query<RowDataPacket[]>(sql, values);
    return Number(rows[0].result) || 0;
  }
}

export function createMySQLService(config: MySQLConfig): MySQLDatabase {
  return new MySQLDatabase(config);
}
