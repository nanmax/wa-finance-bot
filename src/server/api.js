const express = require('express');
const cors = require('cors');
const Database = require('../database/Database');

class APIServer {
    constructor() {
        this.app = express();
        this.database = new Database();
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static('public'));
    }

    setupRoutes() {
        // Health check
        this.app.get('/api/health', (req, res) => {
            res.json({ status: 'OK', timestamp: new Date().toISOString() });
        });

        // Get all transactions
        this.app.get('/api/transactions', async (req, res) => {
            try {
                const limit = parseInt(req.query.limit) || 100;
                const transactions = await this.database.getTransactions(limit);
                res.json(transactions);
            } catch (error) {
                console.error('Error getting transactions:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Get transaction by ID
        this.app.get('/api/transactions/:id', async (req, res) => {
            try {
                const id = parseInt(req.params.id);
                const transaction = await this.database.getTransaction(id);
                
                if (!transaction) {
                    return res.status(404).json({ error: 'Transaction not found' });
                }
                
                res.json(transaction);
            } catch (error) {
                console.error('Error getting transaction:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Get transactions by type
        this.app.get('/api/transactions/type/:type', async (req, res) => {
            try {
                const type = req.params.type;
                const limit = parseInt(req.query.limit) || 50;
                
                if (!['income', 'expense'].includes(type)) {
                    return res.status(400).json({ error: 'Invalid type. Must be income or expense' });
                }
                
                const transactions = await this.database.getTransactionsByType(type, limit);
                res.json(transactions);
            } catch (error) {
                console.error('Error getting transactions by type:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Get financial summary
        this.app.get('/api/summary', async (req, res) => {
            try {
                const summary = await this.database.getSummary();
                res.json(summary);
            } catch (error) {
                console.error('Error getting summary:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Get transactions by date range
        this.app.get('/api/transactions/date-range', async (req, res) => {
            try {
                const { startDate, endDate } = req.query;
                
                if (!startDate || !endDate) {
                    return res.status(400).json({ error: 'startDate and endDate are required' });
                }
                
                const transactions = await this.database.getTransactionsByDateRange(startDate, endDate);
                res.json(transactions);
            } catch (error) {
                console.error('Error getting transactions by date range:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Delete transaction
        this.app.delete('/api/transactions/:id', async (req, res) => {
            try {
                const id = parseInt(req.params.id);
                const deleted = await this.database.deleteTransaction(id);
                
                if (!deleted) {
                    return res.status(404).json({ error: 'Transaction not found' });
                }
                
                res.json({ message: 'Transaction deleted successfully' });
            } catch (error) {
                console.error('Error deleting transaction:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Manual transaction entry
        this.app.post('/api/transactions', async (req, res) => {
            try {
                const { type, amount, description, category, author } = req.body;
                
                if (!type || !amount || !description || !category) {
                    return res.status(400).json({ 
                        error: 'type, amount, description, and category are required' 
                    });
                }
                
                if (!['income', 'expense'].includes(type)) {
                    return res.status(400).json({ error: 'type must be income or expense' });
                }
                
                const transaction = await this.database.saveTransaction({
                    type,
                    amount: parseFloat(amount),
                    description,
                    category,
                    author: author || 'Manual Entry',
                    original_message: `Manual entry: ${description}`
                });
                
                res.status(201).json(transaction);
            } catch (error) {
                console.error('Error creating transaction:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
    }

    async start() {
        try {
            await this.database.init();
            console.log('✅ Database initialized for API server');
            
            const port = process.env.PORT || 3000;
            this.app.listen(port, () => {
                console.log(`🚀 API Server running on port ${port}`);
                console.log(`📊 Dashboard available at http://localhost:${port}`);
            });
        } catch (error) {
            console.error('❌ Error starting API server:', error);
            process.exit(1);
        }
    }
}

module.exports = APIServer; 