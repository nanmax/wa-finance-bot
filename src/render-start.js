const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Memory monitoring
const used = process.memoryUsage();
console.log('Memory usage:');
console.log(`  RSS: ${Math.round(used.rss / 1024 / 1024 * 100) / 100} MB`);
console.log(`  Heap Total: ${Math.round(used.heapTotal / 1024 / 1024 * 100) / 100} MB`);
console.log(`  Heap Used: ${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB`);

// Health check
app.get('/api/health', (req, res) => {
    const used = process.memoryUsage();
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production',
        message: 'WA Finance Bot API is running on Render',
        platform: 'Render',
        memory: {
            rss: `${Math.round(used.rss / 1024 / 1024 * 100) / 100} MB`,
            heapTotal: `${Math.round(used.heapTotal / 1024 / 1024 * 100) / 100} MB`,
            heapUsed: `${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB`
        }
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'WA Finance Bot API',
        version: '1.0.0',
        platform: 'Render',
        status: 'running',
        memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100} MB`,
        endpoints: {
            health: '/api/health',
            info: '/api/info',
            test: '/api/test'
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
        note: 'WhatsApp integration will be added after initial deployment',
        memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100} MB`
    });
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'API is working!',
        timestamp: new Date().toISOString(),
        memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100} MB`
    });
});

// Memory check endpoint
app.get('/api/memory', (req, res) => {
    const used = process.memoryUsage();
    res.json({
        memory: {
            rss: `${Math.round(used.rss / 1024 / 1024 * 100) / 100} MB`,
            heapTotal: `${Math.round(used.heapTotal / 1024 / 1024 * 100) / 100} MB`,
            heapUsed: `${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB`,
            external: `${Math.round(used.external / 1024 / 1024 * 100) / 100} MB`
        },
        uptime: `${Math.round(process.uptime())} seconds`
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        availableEndpoints: [
            'GET /api/health',
            'GET /api/info',
            'GET /api/test',
            'GET /api/memory'
        ]
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('API Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: 'Something went wrong',
        memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100} MB`
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

// Uncaught exception handler
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start server
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
    console.log(`📊 API available at http://localhost:${port}/api`);
    console.log(`🔗 Health check at http://localhost:${port}/api/health`);
    console.log(`✅ Render deployment ready!`);
    console.log(`💾 Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100} MB`);
});

// Server error handling
server.on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
}); 