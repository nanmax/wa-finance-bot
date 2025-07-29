const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config();

class WhatsAppLiteServer {
    constructor() {
        this.setupAPIServer();
        this.setupWhatsAppClient();
    }

    setupAPIServer() {
        this.app = express();
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static('public'));
        
        this.setupAPIRoutes();
    }

    setupWhatsAppClient() {
        // Memory-optimized Chrome configuration
        const puppeteerArgs = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
            '--memory-pressure-off',
            '--max_old_space_size=512',
            '--disable-extensions',
            '--disable-plugins',
            '--disable-images',
            '--disable-javascript',
            '--disable-default-apps',
            '--disable-sync',
            '--disable-translate',
            '--hide-scrollbars',
            '--mute-audio',
            '--no-default-browser-check',
            '--no-experiments',
            '--no-pings',
            '--disable-logging',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
        ];

        this.client = new Client({
            authStrategy: new LocalAuth({
                clientId: 'wa-finance-bot-lite',
                dataPath: './.wwebjs_auth'
            }),
            puppeteer: {
                headless: true,
                args: puppeteerArgs,
                executablePath: process.env.GOOGLE_CHROME_BIN || '/usr/bin/google-chrome-stable',
                // Memory optimization
                defaultViewport: { width: 800, height: 600 },
                ignoreHTTPSErrors: true,
                timeout: 30000
            },
            selfMessage: true
        });
        
        this.setupWhatsAppEventHandlers();
    }

    setupWhatsAppEventHandlers() {
        // Loading screen
        this.client.on('loading_screen', (percent, message) => {
            console.log(`🔄 Loading WhatsApp: ${percent}% - ${message}`);
        });

        // QR Code generation
        this.client.on('qr', (qr) => {
            console.log('📱 QR Code untuk login WhatsApp:');
            console.log('💡 Scan QR code ini dengan WhatsApp di HP Anda');
            qrcode.generate(qr, { small: true });
        });

        // Client ready
        this.client.on('ready', () => {
            console.log('✅ WhatsApp Finance Bot siap di Render!');
            console.log('🔗 Session tersimpan di: ./.wwebjs_auth/');
            console.log('📊 Bot akan memantau pesan di group WhatsApp...');
            console.log(`💾 Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100} MB`);
        });

        // Authenticated
        this.client.on('authenticated', () => {
            console.log('🔐 WhatsApp berhasil terautentikasi!');
            console.log('💾 Session akan tersimpan untuk penggunaan selanjutnya');
        });

        // Message handling
        this.client.on('message', async (message) => {
            try {
                await this.handleWhatsAppMessage(message);
            } catch (error) {
                console.error('Error handling message:', error);
            }
        });

        // Authentication failure
        this.client.on('auth_failure', (msg) => {
            console.error('❌ Autentikasi WhatsApp gagal:', msg);
            console.log('💡 Coba hapus folder .wwebjs_auth/ dan scan QR code lagi');
        });

        // Disconnected
        this.client.on('disconnected', (reason) => {
            console.log('❌ WhatsApp terputus:', reason);
            console.log('🔄 Mencoba menghubungkan kembali...');
        });

        // Error handling
        this.client.on('error', (error) => {
            console.error('WhatsApp client error:', error);
        });
    }

    setupAPIRoutes() {
        // Health check
        this.app.get('/api/health', (req, res) => {
            const used = process.memoryUsage();
            res.json({ 
                status: 'OK', 
                timestamp: new Date().toISOString(),
                whatsapp: this.client.isConnected ? 'connected' : 'disconnected',
                platform: 'Render',
                environment: process.env.NODE_ENV || 'production',
                memory: {
                    rss: `${Math.round(used.rss / 1024 / 1024 * 100) / 100} MB`,
                    heapTotal: `${Math.round(used.heapTotal / 1024 / 1024 * 100) / 100} MB`,
                    heapUsed: `${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB`
                }
            });
        });

        // Root endpoint
        this.app.get('/', (req, res) => {
            res.json({
                message: 'WA Finance Bot API',
                version: '1.0.0',
                platform: 'Render',
                whatsapp: this.client.isConnected ? 'connected' : 'disconnected',
                memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100} MB`,
                endpoints: {
                    health: '/api/health',
                    info: '/api/info',
                    status: '/api/status'
                }
            });
        });

        // API info
        this.app.get('/api/info', (req, res) => {
            res.json({
                name: 'WA Finance Bot API',
                version: '1.0.0',
                description: 'WhatsApp AI Bot untuk pencatatan keuangan',
                platform: 'Render',
                whatsapp: this.client.isConnected ? 'connected' : 'disconnected',
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
                memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100} MB`
            });
        });

        // WhatsApp status
        this.app.get('/api/status', (req, res) => {
            res.json({
                whatsapp: {
                    connected: this.client.isConnected,
                    authenticated: this.client.authStrategy.isAuthenticated,
                    state: this.client.state
                },
                memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100} MB`,
                uptime: `${Math.round(process.uptime())} seconds`
            });
        });

        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                error: 'Endpoint not found',
                availableEndpoints: [
                    'GET /api/health',
                    'GET /api/info',
                    'GET /api/status'
                ]
            });
        });
    }

    async handleWhatsAppMessage(message) {
        console.log("📱 Message received:", message.body);
        
        // Simple echo for testing
        if (message.body.toLowerCase() === 'ping') {
            await message.reply('Pong! Bot is working! 🚀');
        }
        
        // Handle group messages
        if (message.from.endsWith('@g.us') && !message.fromMe) {
            console.log(`📨 Group message: ${message.body}`);
            await message.reply('Bot received your message! 📝');
        }
    }

    async start() {
        try {
            console.log('🚀 Starting WhatsApp Lite Server...');
            console.log(`💾 Initial memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100} MB`);
            
            // Start API server first
            const port = process.env.PORT || 3000;
            this.app.listen(port, () => {
                console.log(`🚀 API Server running on port ${port}`);
                console.log(`📊 API available at http://localhost:${port}/api`);
                console.log(`🔗 Health check at http://localhost:${port}/api/health`);
            });
            
            // Start WhatsApp client
            await this.client.initialize();
            console.log('✅ WhatsApp client initialized');
            
        } catch (error) {
            console.error('❌ Error starting server:', error);
            process.exit(1);
        }
    }
}

// Start the server
const server = new WhatsAppLiteServer();
server.start(); 