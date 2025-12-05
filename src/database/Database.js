const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        this.dbPath = process.env.DATABASE_PATH || './data/finance.db';
        this.db = null;
    }

    async init() {
        // Ensure data directory exists
        const dataDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        const SQL = await initSqlJs();

        // Load existing database or create new one
        if (fs.existsSync(this.dbPath)) {
            const fileBuffer = fs.readFileSync(this.dbPath);
            this.db = new SQL.Database(fileBuffer);
            console.log('✅ Database loaded from file');
        } else {
            this.db = new SQL.Database();
            console.log('✅ New database created');
        }

        await this.createTables();
        this.saveToFile(); // Save initial state
    }

    saveToFile() {
        try {
            const data = this.db.export();
            const buffer = Buffer.from(data);
            fs.writeFileSync(this.dbPath, buffer);
        } catch (error) {
            console.error('Error saving database to file:', error);
        }
    }

    async createTables() {
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                amount REAL NOT NULL,
                description TEXT,
                category TEXT,
                author TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                original_message TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        this.db.run(createTableSQL);
        console.log('✅ Database tables created successfully');
    }

    async saveTransaction(transaction) {
        const sql = `
            INSERT INTO transactions (type, amount, description, category, author, original_message, timestamp, created_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `;

        this.db.run(sql, [
            transaction.type,
            transaction.amount,
            transaction.description,
            transaction.category,
            transaction.author,
            transaction.original_message
        ]);

        this.saveToFile();

        // Get the last inserted ID
        const result = this.db.exec("SELECT last_insert_rowid() as id");
        const lastId = result[0]?.values[0]?.[0];

        return this.getTransaction(lastId);
    }

    async getTransactions(limit = 100) {
        const sql = `
            SELECT * FROM transactions
            ORDER BY timestamp DESC
            LIMIT ?
        `;

        const stmt = this.db.prepare(sql);
        stmt.bind([limit]);

        const rows = [];
        while (stmt.step()) {
            rows.push(this.rowToObject(stmt.getAsObject()));
        }
        stmt.free();

        return rows;
    }

    async getTransaction(id) {
        const sql = 'SELECT * FROM transactions WHERE id = ?';
        const stmt = this.db.prepare(sql);
        stmt.bind([id]);

        let row = null;
        if (stmt.step()) {
            row = this.rowToObject(stmt.getAsObject());
        }
        stmt.free();

        return row;
    }

    async getTransactionsByType(type, limit = 50) {
        const sql = `
            SELECT * FROM transactions
            WHERE type = ?
            ORDER BY timestamp DESC
            LIMIT ?
        `;

        const stmt = this.db.prepare(sql);
        stmt.bind([type, limit]);

        const rows = [];
        while (stmt.step()) {
            rows.push(this.rowToObject(stmt.getAsObject()));
        }
        stmt.free();

        return rows;
    }

    async getTransactionsByDateRange(startDate, endDate) {
        const sql = `
            SELECT * FROM transactions
            WHERE timestamp BETWEEN ? AND ?
            ORDER BY timestamp DESC
        `;

        const stmt = this.db.prepare(sql);
        stmt.bind([startDate, endDate]);

        const rows = [];
        while (stmt.step()) {
            rows.push(this.rowToObject(stmt.getAsObject()));
        }
        stmt.free();

        return rows;
    }

    async getSummary() {
        const sql = `
            SELECT
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense,
                COUNT(*) as total_transactions
            FROM transactions
        `;

        const result = this.db.exec(sql);

        if (result.length === 0 || result[0].values.length === 0) {
            return {
                totalIncome: 0,
                totalExpense: 0,
                totalTransactions: 0,
                balance: 0
            };
        }

        const row = result[0].values[0];
        return {
            totalIncome: row[0] || 0,
            totalExpense: row[1] || 0,
            totalTransactions: row[2] || 0,
            balance: (row[0] || 0) - (row[1] || 0)
        };
    }

    async deleteTransaction(id) {
        const sql = 'DELETE FROM transactions WHERE id = ?';
        this.db.run(sql, [id]);
        this.saveToFile();

        const changes = this.db.getRowsModified();
        return changes > 0;
    }

    async loadConfig() {
        try {
            const configPath = path.join(__dirname, '..', '..', 'config.json');
            if (fs.existsSync(configPath)) {
                return JSON.parse(fs.readFileSync(configPath, 'utf8'));
            } else {
                return {
                    allowedGroups: [],
                    autoProcessAllGroups: false,
                    botName: "FinanceBot",
                    logLevel: "info"
                };
            }
        } catch (error) {
            console.error('Error loading config:', error);
            return {
                allowedGroups: [],
                autoProcessAllGroups: false,
                botName: "FinanceBot",
                logLevel: "info"
            };
        }
    }

    async saveConfig(config) {
        try {
            const configPath = path.join(__dirname, '..', '..', 'config.json');
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving config:', error);
            return false;
        }
    }

    async clearAllData() {
        const sql = 'DELETE FROM transactions';
        this.db.run(sql);
        this.saveToFile();
        console.log('✅ All transactions cleared');
        return true;
    }

    rowToObject(row) {
        return {
            id: row.id,
            type: row.type,
            amount: row.amount,
            description: row.description,
            category: row.category,
            author: row.author,
            timestamp: row.timestamp,
            original_message: row.original_message,
            created_at: row.created_at
        };
    }

    close() {
        if (this.db) {
            this.saveToFile();
            this.db.close();
            console.log('✅ Database closed successfully');
        }
    }
}

module.exports = Database;
