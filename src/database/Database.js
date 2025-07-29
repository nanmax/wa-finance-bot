const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        this.dbPath = process.env.DATABASE_PATH || './data/finance.db';
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            // Ensure data directory exists
            const dataDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Error opening database:', err);
                    reject(err);
                    return;
                }
                
                this.createTables()
                    .then(() => resolve())
                    .catch(reject);
            });
        });
    }

    async createTables() {
        return new Promise((resolve, reject) => {
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

            this.db.run(createTableSQL, (err) => {
                if (err) {
                    console.error('Error creating table:', err);
                    reject(err);
                    return;
                }
                console.log('✅ Database tables created successfully');
                resolve();
            });
        });
    }

    async saveTransaction(transaction) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO transactions (type, amount, description, category, author, original_message)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            const params = [
                transaction.type,
                transaction.amount,
                transaction.description,
                transaction.category,
                transaction.author,
                transaction.original_message
            ];

            this.db.run(sql, params, function(err) {
                if (err) {
                    console.error('Error saving transaction:', err);
                    reject(err);
                    return;
                }
                
                // Get the inserted record
                this.getTransaction(this.lastID).then(resolve).catch(reject);
            }.bind(this));
        });
    }

    async getTransactions(limit = 100) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM transactions 
                ORDER BY timestamp DESC 
                LIMIT ?
            `;

            this.db.all(sql, [limit], (err, rows) => {
                if (err) {
                    console.error('Error getting transactions:', err);
                    reject(err);
                    return;
                }
                resolve(rows);
            });
        });
    }

    async getTransaction(id) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM transactions WHERE id = ?';
            
            this.db.get(sql, [id], (err, row) => {
                if (err) {
                    console.error('Error getting transaction:', err);
                    reject(err);
                    return;
                }
                resolve(row);
            });
        });
    }

    async getTransactionsByType(type, limit = 50) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM transactions 
                WHERE type = ? 
                ORDER BY timestamp DESC 
                LIMIT ?
            `;

            this.db.all(sql, [type, limit], (err, rows) => {
                if (err) {
                    console.error('Error getting transactions by type:', err);
                    reject(err);
                    return;
                }
                resolve(rows);
            });
        });
    }

    async getTransactionsByDateRange(startDate, endDate) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM transactions 
                WHERE timestamp BETWEEN ? AND ?
                ORDER BY timestamp DESC
            `;

            this.db.all(sql, [startDate, endDate], (err, rows) => {
                if (err) {
                    console.error('Error getting transactions by date range:', err);
                    reject(err);
                    return;
                }
                resolve(rows);
            });
        });
    }

    async getSummary() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
                    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense,
                    COUNT(*) as total_transactions
                FROM transactions
            `;

            this.db.get(sql, (err, row) => {
                if (err) {
                    console.error('Error getting summary:', err);
                    reject(err);
                    return;
                }
                
                const summary = {
                    totalIncome: row.total_income || 0,
                    totalExpense: row.total_expense || 0,
                    totalTransactions: row.total_transactions || 0,
                    balance: (row.total_income || 0) - (row.total_expense || 0)
                };
                
                resolve(summary);
            });
        });
    }

    async deleteTransaction(id) {
        return new Promise((resolve, reject) => {
            const sql = 'DELETE FROM transactions WHERE id = ?';
            
            this.db.run(sql, [id], function(err) {
                if (err) {
                    console.error('Error deleting transaction:', err);
                    reject(err);
                    return;
                }
                resolve(this.changes > 0);
            });
        });
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
        return new Promise((resolve, reject) => {
            const sql = 'DELETE FROM transactions';
            
            this.db.run(sql, (err) => {
                if (err) {
                    console.error('Error clearing all data:', err);
                    reject(err);
                    return;
                }
                console.log('✅ All transactions cleared');
                resolve(true);
            });
        });
    }

    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                } else {
                    console.log('✅ Database closed successfully');
                }
            });
        }
    }
}

module.exports = Database; 