const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production',
        message: 'WA Finance Bot API is running on Vercel'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'WA Finance Bot API',
        version: '1.0.0',
        platform: 'Vercel',
        endpoints: {
            health: '/api/health',
            info: '/api/info',
            transactions: '/api/transactions',
            summary: '/api/summary'
        }
    });
});

// API info
app.get('/api/info', (req, res) => {
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
            environment: process.env.NODE_ENV || 'production',
            timestamp: new Date().toISOString()
        },
        note: 'WhatsApp integration requires local deployment due to browser requirements'
    });
});

// Mock transactions endpoint
app.get('/api/transactions', (req, res) => {
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
        },
        {
            id: 3,
            type: 'expense',
            amount: 15000,
            description: 'Bensin',
            category: 'Transport',
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
app.get('/api/summary', (req, res) => {
    res.json({
        success: true,
        data: {
            totalIncome: 500000,
            totalExpense: 40000,
            balance: 460000,
            transactionCount: 3,
            message: 'Demo data - WhatsApp integration requires local deployment'
        }
    });
});

// 404 handler
app.use('*', (req, res) => {
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
app.use((err, req, res, next) => {
    console.error('API Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: 'Something went wrong'
    });
});

module.exports = app; 