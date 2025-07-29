const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const FinanceBot = require('./bot/FinanceBot');
const Database = require('./database/Database');
const AIService = require('./services/AIService');
const BackupService = require('./services/BackupService');
const ScheduledBackupService = require('./services/ScheduledBackupService');

// Load environment variables
dotenv.config();

class WhatsAppFinanceServer {
    constructor() {
        this.configPath = path.join(__dirname, '..', 'config.json');
        this.loadConfig();
        this.setupWhatsAppClient();
        this.setupAPIServer();
        this.database = new Database();
        this.aiService = new AIService();
        this.backupService = new BackupService(this.database);
        this.scheduledBackupService = new ScheduledBackupService(this.backupService, this.client);
        this.financeBot = new FinanceBot(this.database, this.aiService, this.backupService, this.scheduledBackupService);
    }

    loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                this.config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
                if (!this.config.allowedGroups) {
                    this.config.allowedGroups = [];
                }
            } else {
                this.config = {
                    allowedGroupId: null,
                    botName: "FinanceBot",
                    autoProcessAllGroups: false,
                    logLevel: "info",
                    allowedGroups: []
                };
                this.saveConfig();
            }
        } catch (error) {
            console.error('Error loading config:', error);
            this.config = {
                allowedGroupId: null,
                botName: "FinanceBot",
                autoProcessAllGroups: false,
                logLevel: "info",
                allowedGroups: []
            };
        }
    }

    saveConfig() {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
        } catch (error) {
            console.error('Error saving config:', error);
        }
    }

    setupWhatsAppClient() {
        // Render-specific Chrome configuration
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
            '--disable-ipc-flooding-protection'
        ];

        this.client = new Client({
            authStrategy: new LocalAuth({
                clientId: 'wa-finance-bot-render',
                dataPath: './.wwebjs_auth'
            }),
            puppeteer: {
                headless: true,
                args: puppeteerArgs,
                // Render-specific Chrome path
                executablePath: process.env.GOOGLE_CHROME_BIN || '/usr/bin/google-chrome-stable'
            },
            selfMessage: true
        });
        
        this.setupWhatsAppEventHandlers();
    }

    setupAPIServer() {
        this.app = express();
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static('public'));
        
        this.setupAPIRoutes();
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

        // Self message handling
        this.client.on('message_create', async (message) => {
            try {
                if (message.fromMe) {
                    console.log("📱📱 Pesan dari diri sendiri terdeteksi!");
                    await this.handleWhatsAppMessage(message);
                }
            } catch (error) {
                console.error('Error handling self message:', error);
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
    }

    setupAPIRoutes() {
        // Health check for Render
        this.app.get('/api/health', (req, res) => {
            res.json({ 
                status: 'OK', 
                timestamp: new Date().toISOString(),
                whatsapp: this.client.isConnected ? 'connected' : 'disconnected',
                platform: 'Render',
                environment: process.env.NODE_ENV || 'production'
            });
        });

        // Root endpoint
        this.app.get('/', (req, res) => {
            res.json({
                message: 'WA Finance Bot API',
                version: '1.0.0',
                platform: 'Render',
                whatsapp: this.client.isConnected ? 'connected' : 'disconnected',
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
                }
            });
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
    }

    async handleWhatsAppMessage(message) {
        console.log("=========== handleWhatsAppMessage ===========", message.from);
        console.log("📱 Message details:", {
            from: message.from,
            fromMe: message.fromMe,
            author: message.author,
            body: message.body
        });

        // Handle group messages (from other people)
        if (message.from.endsWith('@g.us') && !message.fromMe) {
            console.log(`📨 Pesan dari group: ${message.body}`);
            console.log(`👤 Pengirim: ${message.author || 'Unknown'}`);
            console.log(`🏷️ Group ID: ${message.from}`);
            
            // Check if this group is registered/allowed
            const isGroupAllowed = this.isGroupAllowed(message.from);
            if (!isGroupAllowed) {
                console.log(`⚠️ Group ${message.from} tidak terdaftar, diabaikan`);
                return;
            }
            
            console.log(`✅ Group ${message.from} terdaftar, memproses pesan...`);
            
            // Get contact name
            let contactName = message.author;
            try {
                if (message._data && message._data.notifyName) {
                    contactName = message._data.notifyName;
                } else {
                    const contact = await message.getContact();
                    if (contact && contact.pushname) {
                        contactName = contact.pushname;
                    } else if (contact && contact.name) {
                        contactName = contact.name;
                    } else {
                        contactName = message.author.split('@')[0];
                    }
                }
            } catch (error) {
                console.log('⚠️ Tidak bisa mendapatkan nama kontak, menggunakan formatted author');
                contactName = message.author.split('@')[0];
            }
            
            // Process the message with AI
            const result = await this.financeBot.processMessage(message.body, message.author, contactName);
            
            if (result) {
                // Send response back to group
                await message.reply(result);
                console.log(`✅ Response terkirim: ${result}`);
            }
        }
        
        // Ignore all other messages
        else {
            console.log(`🚫 Pesan diabaikan: ${message.body}`);
            console.log(`📱 Jenis: ${message.fromMe ? 'Self' : 'Other'} - ${message.from.endsWith('@g.us') ? 'Group' : 'Private'}`);
        }
    }

    isGroupAllowed(groupId) {
        if (this.config.autoProcessAllGroups) {
            return true;
        }
        
        if (this.config.allowedGroups && this.config.allowedGroups.includes(groupId)) {
            return true;
        }
        
        if (this.config.allowedGroupId && groupId === this.config.allowedGroupId) {
            return true;
        }
        
        return false;
    }

    async start() {
        try {
            // Initialize database
            await this.database.init();
            console.log('✅ Database berhasil diinisialisasi');
            
            // Start WhatsApp client
            await this.client.initialize();
            console.log('🚀 WhatsApp Bot sedang memulai di Render...');
            
            // Start API server
            const port = process.env.PORT || 3000;
            this.app.listen(port, () => {
                console.log(`🚀 API Server running on port ${port}`);
                console.log(`📊 Dashboard available at http://localhost:${port}`);
                console.log(`🔗 API available at http://localhost:${port}/api`);
            });
            
        } catch (error) {
            console.error('❌ Error starting server:', error);
            process.exit(1);
        }
    }
}

// Start the server
const server = new WhatsAppFinanceServer();
server.start(); 