const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

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
        message: 'WA Finance Bot API is running on Render',
        platform: 'Render'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'WA Finance Bot API',
        version: '1.0.0',
        platform: 'Render',
        status: 'running',
        endpoints: {
            health: '/api/health',
            info: '/api/info'
        }
    });
});

// API info
app.get('/api/info', (req, res) => {
    res.json({
        name: 'WA Finance Bot API',
        version: '1.0.0',
        description: 'WhatsApp AI Bot untuk pencatatan keuangan',
        platform: 'Render',
        features: [
            'Pencatatan Keuangan Otomatis',
            'AI-Powered Transaction Processing',
            'Backup Otomatis',
            'Laporan Keuangan',
            'Dashboard Web',
            'API REST'
        ],
        deployment: {
            platform: 'Render',
            environment: process.env.NODE_ENV || 'production',
            timestamp: new Date().toISOString()
        },
        note: 'WhatsApp integration will be added after initial deployment'
    });
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'API is working!',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        availableEndpoints: [
            'GET /api/health',
            'GET /api/info',
            'GET /api/test'
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

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
    console.log(`📊 API available at http://localhost:${port}/api`);
    console.log(`🔗 Health check at http://localhost:${port}/api/health`);
    console.log(`✅ Render deployment ready!`);
}); 