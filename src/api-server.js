const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

class APIServer {
    constructor() {
        this.app = express();
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
            res.json({ 
                status: 'OK', 
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || 'development',
                message: 'WA Finance Bot API is running'
            });
        });

        // Root endpoint
        this.app.get('/', (req, res) => {
            res.json({
                message: 'WA Finance Bot API',
                version: '1.0.0',
                endpoints: {
                    health: '/api/health',
                    info: '/api/info'
                }
            });
        });

        // API info
        this.app.get('/api/info', (req, res) => {
            res.json({
                name: 'WA Finance Bot API',
                version: '1.0.0',
                description: 'WhatsApp AI Bot untuk pencatatan keuangan',
                features: [
                    'Pencatatan Keuangan Otomatis',
                    'AI-Powered Transaction Processing',
                    'Backup Otomatis',
                    'Laporan Keuangan',
                    'Dashboard Web',
                    'API REST'
                ],
                deployment: {
                    platform: 'Vercel',
                    environment: process.env.NODE_ENV || 'development',
                    timestamp: new Date().toISOString()
                }
            });
        });

        // Mock transactions endpoint (for demo)
        this.app.get('/api/transactions', (req, res) => {
            const mockTransactions = [
                {
                    id: 1,
                    type: 'income',
                    amount: 500000,
                    description: 'Gaji Bulanan',
                    category: 'Gaji',
                    author: 'Demo User',
                    timestamp: new Date().toISOString()
                },
                {
                    id: 2,
                    type: 'expense',
                    amount: 25000,
                    description: 'Makan Siang',
                    category: 'Makanan',
                    author: 'Demo User',
                    timestamp: new Date().toISOString()
                }
            ];
            
            res.json({
                success: true,
                data: mockTransactions,
                message: 'Demo data - WhatsApp integration requires local deployment'
            });
        });

        // Mock summary endpoint
        this.app.get('/api/summary', (req, res) => {
            res.json({
                success: true,
                data: {
                    totalIncome: 500000,
                    totalExpense: 25000,
                    balance: 475000,
                    transactionCount: 2,
                    message: 'Demo data - WhatsApp integration requires local deployment'
                }
            });
        });

        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                error: 'Endpoint not found',
                availableEndpoints: [
                    'GET /api/health',
                    'GET /api/info',
                    'GET /api/transactions',
                    'GET /api/summary'
                ]
            });
        });

        // Error handler
        this.app.use((err, req, res, next) => {
            console.error('API Error:', err);
            res.status(500).json({
                error: 'Internal server error',
                message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
            });
        });
    }

    start() {
        const port = process.env.PORT || 3000;
        this.app.listen(port, () => {
            console.log(`🚀 API Server running on port ${port}`);
            console.log(`📊 API available at http://localhost:${port}/api`);
            console.log(`🔗 Health check at http://localhost:${port}/api/health`);
        });
    }
}

// Export for Vercel
module.exports = APIServer;

// Start server if running directly
if (require.main === module) {
    const server = new APIServer();
    server.start();
} 