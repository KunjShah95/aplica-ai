import mysql from 'mysql2/promise';
export class MySQLDatabase {
    pool = null;
    config;
    constructor(config) {
        this.config = config;
    }
    async connect() {
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
    async disconnect() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
        }
    }
    async query(sql, params) {
        if (!this.pool)
            throw new Error('Database not connected');
        const [rows] = await this.pool.query(sql, params);
        return rows;
    }
    async execute(sql, params) {
        if (!this.pool)
            throw new Error('Database not connected');
        const [result] = await this.pool.execute(sql, params);
        return result;
    }
    async getConnection() {
        if (!this.pool)
            throw new Error('Database not connected');
        return this.pool.getConnection();
    }
    async transaction(callback) {
        const connection = await this.getConnection();
        await connection.beginTransaction();
        try {
            const result = await callback(connection);
            await connection.commit();
            return result;
        }
        catch (error) {
            await connection.rollback();
            throw error;
        }
        finally {
            connection.release();
        }
    }
    async createTable(tableName, columns, options) {
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
    async dropTable(tableName) {
        await this.execute(`DROP TABLE IF EXISTS ${tableName}`);
    }
    async tableExists(tableName) {
        const rows = await this.query(`SHOW TABLES LIKE ?`, [tableName]);
        return rows.length > 0;
    }
    async listTables() {
        const rows = await this.query('SHOW TABLES');
        return rows.map((row) => Object.values(row)[0]);
    }
    async showCreateTable(tableName) {
        const [rows] = await this.pool.query(`SHOW CREATE TABLE ${tableName}`);
        return rows[0]['Create Table'] || rows[0]['Create View'];
    }
    async describeTable(tableName) {
        return this.query(`DESCRIBE ${tableName}`);
    }
    async showIndexes(tableName) {
        return this.query(`SHOW INDEX FROM ${tableName}`);
    }
    async createIndex(tableName, indexName, columns, unique = false) {
        const indexType = unique ? 'UNIQUE INDEX' : 'INDEX';
        const cols = columns.join(', ');
        await this.execute(`CREATE ${indexType} ${indexName} ON ${tableName} (${cols})`);
    }
    async dropIndex(tableName, indexName) {
        await this.execute(`DROP INDEX ${indexName} ON ${tableName}`);
    }
    async ping() {
        try {
            await this.query('SELECT 1');
            return true;
        }
        catch {
            return false;
        }
    }
}
export class MySQLRepository {
    db;
    tableName;
    constructor(db, tableName) {
        this.db = db;
        this.tableName = tableName;
    }
    async findOne(where, columns) {
        const cols = columns?.join(', ') || '*';
        const conditions = Object.keys(where)
            .map((key) => `${key} = ?`)
            .join(' AND ');
        const values = Object.values(where);
        const rows = await this.db.query(`SELECT ${cols} FROM ${this.tableName} WHERE ${conditions} LIMIT 1`, values);
        return rows.length > 0 ? rows[0] : null;
    }
    async findById(id, columns) {
        const cols = columns?.join(', ') || '*';
        const rows = await this.db.query(`SELECT ${cols} FROM ${this.tableName} WHERE id = ? LIMIT 1`, [id]);
        return rows.length > 0 ? rows[0] : null;
    }
    async findMany(options) {
        const cols = options.columns?.join(', ') || '*';
        let sql = `SELECT ${cols} FROM ${this.tableName}`;
        const values = [];
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
        return this.db.query(sql, values);
    }
    async insert(data) {
        const columns = Object.keys(data).join(', ');
        const placeholders = Object.keys(data)
            .map(() => '?')
            .join(', ');
        const values = Object.values(data);
        const result = await this.db.execute(`INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`, values);
        return result.insertId;
    }
    async insertMany(data) {
        if (data.length === 0)
            return [];
        const columns = Object.keys(data[0]).join(', ');
        const placeholders = Object.keys(data[0])
            .map(() => '?')
            .join(', ');
        const sql = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`;
        const ids = [];
        for (const row of data) {
            const result = await this.db.execute(sql, Object.values(row));
            ids.push(result.insertId);
        }
        return ids;
    }
    async update(where, data) {
        const setClause = Object.keys(data)
            .map((key) => `${key} = ?`)
            .join(', ');
        const whereClause = Object.keys(where)
            .map((key) => `${key} = ?`)
            .join(' AND ');
        const values = [...Object.values(data), ...Object.values(where)];
        const result = await this.db.execute(`UPDATE ${this.tableName} SET ${setClause} WHERE ${whereClause}`, values);
        return result.affectedRows;
    }
    async updateById(id, data) {
        const setClause = Object.keys(data)
            .map((key) => `${key} = ?`)
            .join(', ');
        const result = await this.db.execute(`UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`, [
            ...Object.values(data),
            id,
        ]);
        return result.affectedRows > 0;
    }
    async delete(where) {
        const conditions = Object.keys(where)
            .map((key) => `${key} = ?`)
            .join(' AND ');
        const result = await this.db.execute(`DELETE FROM ${this.tableName} WHERE ${conditions}`, Object.values(where));
        return result.affectedRows;
    }
    async deleteById(id) {
        const result = await this.db.execute(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
        return result.affectedRows > 0;
    }
    async count(where) {
        if (where) {
            const conditions = Object.keys(where)
                .map((key) => `${key} = ?`)
                .join(' AND ');
            const rows = await this.db.query(`SELECT COUNT(*) as count FROM ${this.tableName} WHERE ${conditions}`, Object.values(where));
            return rows[0].count;
        }
        const rows = await this.db.query(`SELECT COUNT(*) as count FROM ${this.tableName}`);
        return rows[0].count;
    }
    async exists(where) {
        const conditions = Object.keys(where)
            .map((key) => `${key} = ?`)
            .join(' AND ');
        const rows = await this.db.query(`SELECT 1 FROM ${this.tableName} WHERE ${conditions} LIMIT 1`, Object.values(where));
        return rows.length > 0;
    }
    async aggregate(column, operation, where) {
        let sql = `SELECT ${operation}(${String(column)}) as result FROM ${this.tableName}`;
        const values = [];
        if (where) {
            const conditions = Object.keys(where)
                .map((key) => `${key} = ?`)
                .join(' AND ');
            sql += ` WHERE ${conditions}`;
            values.push(...Object.values(where));
        }
        const rows = await this.db.query(sql, values);
        return Number(rows[0].result) || 0;
    }
}
export function createMySQLService(config) {
    return new MySQLDatabase(config);
}
//# sourceMappingURL=mysql.js.map