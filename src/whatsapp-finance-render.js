const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const Database = require('./database/Database');
const FinanceBot = require('./bot/FinanceBot');
const AIService = require('./services/AIService');
const fs = require('fs');
const path = require('path');

dotenv.config();

class WhatsAppFinanceRenderServer {
    constructor() {
        this.setupAPIServer();
        this.setupDatabase();
        this.setupAIService();
        this.setupWhatsAppClient();
        this.setupFinanceBot();
        this.connectionStatus = 'disconnected';
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.groupConfigPath = './group-config.json';
        this.loadGroupConfig();
    }

    loadGroupConfig() {
        try {
            if (fs.existsSync(this.groupConfigPath)) {
                this.groupConfig = JSON.parse(fs.readFileSync(this.groupConfigPath, 'utf8'));
            } else {
                this.groupConfig = {
                    groups: [],
                    defaultGroup: process.env.WHATSAPP_GROUP_ID || ''
                };
                this.saveGroupConfig();
            }
        } catch (error) {
            console.error('Error loading group config:', error);
            this.groupConfig = {
                groups: [],
                defaultGroup: process.env.WHATSAPP_GROUP_ID || ''
            };
        }
    }

    saveGroupConfig() {
        try {
            fs.writeFileSync(this.groupConfigPath, JSON.stringify(this.groupConfig, null, 2));
        } catch (error) {
            console.error('Error saving group config:', error);
        }
    }

    setupAPIServer() {
        this.app = express();
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static('public'));
        
        this.setupAPIRoutes();
    }

    setupDatabase() {
        this.db = new Database();
        this.db.init();
    }

    setupAIService() {
        this.aiService = new AIService();
    }

    setupWhatsAppClient() {
        const puppeteerArgs = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--memory-pressure-off',
            '--max_old_space_size=256',
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
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--single-process',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
        ];

        const authPath = process.env.AUTH_PATH || './.wwebjs_auth';
        
        this.client = new Client({
            authStrategy: new LocalAuth({
                clientId: 'wa-finance-render',
                dataPath: authPath
            }),
            puppeteer: {
                headless: true,
                args: puppeteerArgs,
                executablePath: undefined,
                defaultViewport: { width: 640, height: 480 },
                ignoreHTTPSErrors: true,
                timeout: 30000
            },
            selfMessage: true
        });
        
        this.setupWhatsAppEventHandlers();
    }

    setupFinanceBot() {
        this.financeBot = new FinanceBot(this.client, this.db, this.aiService);
    }

    setupWhatsAppEventHandlers() {
        this.client.on('qr', (qr) => {
            console.log('QR Code untuk login WhatsApp:');
            qrcode.generate(qr, { small: true });
            this.connectionStatus = 'qr_ready';
        });

        this.client.on('ready', () => {
            console.log('✅ WhatsApp Finance Bot siap di Render!');
            this.connectionStatus = 'connected';
            this.reconnectAttempts = 0;
        });

        this.client.on('authenticated', () => {
            console.log('🔐 WhatsApp berhasil terautentikasi!');
            this.connectionStatus = 'authenticated';
        });

        this.client.on('auth_failure', (msg) => {
            console.error('❌ Autentikasi WhatsApp gagal:', msg);
            this.connectionStatus = 'auth_failed';
        });

        this.client.on('disconnected', (reason) => {
            console.log('❌ WhatsApp terputus:', reason);
            this.connectionStatus = 'disconnected';
            this.attemptReconnect();
        });

        this.client.on('message', async (message) => {
            try {
                // Log group info untuk debugging
                if (message.from.endsWith('@g.us')) {
                    console.log(`📱 Group Message - ID: ${message.from}, Name: ${message._data.notifyName || 'Unknown'}, Sender: ${message.author || 'Unknown'}`);
                }
                await this.financeBot.handleMessage(message);
            } catch (error) {
                console.error('Message error:', error.message);
            }
        });

        this.client.on('message_create', async (message) => {
            try {
                if (message.fromMe) {
                    await this.financeBot.handleMessage(message);
                }
            } catch (error) {
                console.error('Self message error:', error.message);
            }
        });

        this.client.on('error', (error) => {
            console.error('Client error:', error.message);
            this.connectionStatus = 'error';
        });
    }

    async attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 Mencoba reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
            
            setTimeout(async () => {
                try {
                    await this.client.initialize();
                } catch (error) {
                    console.error('Reconnect failed:', error.message);
                    this.attemptReconnect();
                }
            }, 5000);
        } else {
            console.error('❌ Max reconnect attempts reached');
        }
    }

    setupAPIRoutes() {
        this.app.get('/api/health', (req, res) => {
            const used = process.memoryUsage();
            res.json({ 
                status: 'OK', 
                timestamp: new Date().toISOString(),
                whatsapp: this.connectionStatus,
                connected: this.client.isConnected,
                authenticated: this.client.authStrategy.isAuthenticated,
                memory: `${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB`,
                reconnectAttempts: this.reconnectAttempts
            });
        });

        this.app.get('/', (req, res) => {
            res.json({
                message: 'WA Finance Bot API',
                version: '1.0.0',
                whatsapp: this.connectionStatus,
                connected: this.client.isConnected,
                authenticated: this.client.authStrategy.isAuthenticated,
                memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100} MB`,
                reconnectAttempts: this.reconnectAttempts
            });
        });

        // Group management endpoints
        this.app.get('/api/groups', (req, res) => {
            res.json({
                groups: this.groupConfig.groups,
                defaultGroup: this.groupConfig.defaultGroup,
                totalGroups: this.groupConfig.groups.length
            });
        });

        this.app.post('/api/groups', (req, res) => {
            try {
                const { groupId, groupName, isDefault } = req.body;
                
                if (!groupId) {
                    return res.status(400).json({ error: 'Group ID is required' });
                }

                // Check if group already exists
                const existingGroup = this.groupConfig.groups.find(g => g.id === groupId);
                if (existingGroup) {
                    return res.status(400).json({ error: 'Group ID already exists' });
                }

                const newGroup = {
                    id: groupId,
                    name: groupName || 'Unknown Group',
                    addedAt: new Date().toISOString(),
                    isDefault: isDefault || false
                };

                this.groupConfig.groups.push(newGroup);

                // Set as default if specified
                if (isDefault) {
                    this.groupConfig.defaultGroup = groupId;
                }

                this.saveGroupConfig();
                res.json({ success: true, group: newGroup, message: 'Group added successfully' });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.delete('/api/groups/:groupId', (req, res) => {
            try {
                const { groupId } = req.params;
                const groupIndex = this.groupConfig.groups.findIndex(g => g.id === groupId);
                
                if (groupIndex === -1) {
                    return res.status(404).json({ error: 'Group not found' });
                }

                const removedGroup = this.groupConfig.groups.splice(groupIndex, 1)[0];

                // If this was the default group, clear default
                if (this.groupConfig.defaultGroup === groupId) {
                    this.groupConfig.defaultGroup = '';
                }

                this.saveGroupConfig();
                res.json({ success: true, removedGroup, message: 'Group removed successfully' });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.put('/api/groups/:groupId/default', (req, res) => {
            try {
                const { groupId } = req.params;
                const group = this.groupConfig.groups.find(g => g.id === groupId);
                
                if (!group) {
                    return res.status(404).json({ error: 'Group not found' });
                }

                this.groupConfig.defaultGroup = groupId;
                this.saveGroupConfig();
                res.json({ success: true, defaultGroup: groupId, message: 'Default group updated' });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/api/status', (req, res) => {
            res.json({
                whatsapp: {
                    status: this.connectionStatus,
                    connected: this.client.isConnected,
                    authenticated: this.client.authStrategy.isAuthenticated,
                    reconnectAttempts: this.reconnectAttempts
                },
                groups: {
                    total: this.groupConfig.groups.length,
                    default: this.groupConfig.defaultGroup
                },
                memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100} MB`,
                uptime: `${Math.round(process.uptime())} seconds`
            });
        });

        this.app.get('/api/reconnect', async (req, res) => {
            try {
                console.log('Manual reconnect requested');
                this.reconnectAttempts = 0;
                await this.client.initialize();
                res.json({ success: true, message: 'Reconnect initiated' });
            } catch (error) {
                res.json({ success: false, error: error.message });
            }
        });

        // Group manager interface
        this.app.get('/groups', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/group-manager.html'));
        });

        this.app.use('*', (req, res) => {
            res.status(404).json({ error: 'Not found' });
        });
    }

    async start() {
        try {
            console.log('🚀 Starting WhatsApp Finance Render Server...');
            
            const port = process.env.PORT || 3000;
            this.app.listen(port, () => {
                console.log(`🚀 Server running on port ${port}`);
                console.log(`📊 Group management: http://localhost:${port}/api/groups`);
            });
            
            await this.client.initialize();
            console.log('WhatsApp initialized');
            
            // Periodic connection check
            setInterval(() => {
                if (!this.client.isConnected && this.connectionStatus === 'connected') {
                    console.log('Connection lost, attempting reconnect...');
                    this.connectionStatus = 'disconnected';
                    this.attemptReconnect();
                }
            }, 30000); // Check every 30 seconds
            
        } catch (error) {
            console.error('Start error:', error.message);
            process.exit(1);
        }
    }
}

const server = new WhatsAppFinanceRenderServer();
server.start(); 