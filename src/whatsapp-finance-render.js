const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const qrcodeImage = require('qrcode');
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const Database = require('./database/Database');
const FinanceBot = require('./bot/FinanceBot');
const AIService = require('./services/AIService');
const BackupService = require('./services/BackupService');
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
        this.currentQRCode = null;
        this.qrGeneratedAt = null;
        this.loadGroupConfig();
        
        // Check environment variables
        this.checkEnvironment();
    }

    checkEnvironment() {
        console.log('🔧 Environment Check:');
        console.log(`  - OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'Set' : 'Not set'}`);
        console.log(`  - AUTH_PATH: ${process.env.AUTH_PATH || './.wwebjs_auth'}`);
        console.log(`  - CLIENT_ID: ${process.env.CLIENT_ID || 'wa-finance-render'}`);
        console.log(`  - PORT: ${process.env.PORT || 3000}`);
        
        if (!process.env.OPENAI_API_KEY) {
            console.log('⚠️ OpenAI API key tidak ditemukan, AI features akan menggunakan pattern matching');
        }
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

        // Konfigurasi path untuk session persistence
        const authPath = process.env.AUTH_PATH || './.wwebjs_auth';
        const clientId = process.env.CLIENT_ID || 'wa-finance-render';
        
        console.log(`🔐 Auth Path: ${authPath}`);
        console.log(`🆔 Client ID: ${clientId}`);
        
        this.client = new Client({
            authStrategy: new LocalAuth({
                clientId: clientId,
                dataPath: authPath,
                // Tambahan konfigurasi untuk memastikan session tersimpan
                backupSyncIntervalMs: 300000, // 5 menit
                disableInlinedChunksInDataURL: true
            }),
            puppeteer: {
                headless: true,
                args: puppeteerArgs,
                executablePath: undefined,
                defaultViewport: { width: 640, height: 480 },
                ignoreHTTPSErrors: true,
                timeout: 30000
            },
            // Enable self message detection
            selfMessage: true,
            // Tambahan konfigurasi untuk session persistence
            takeoverOnConflict: true,
            takeoverTimeoutMs: 10000
        });
        
        this.setupWhatsAppEventHandlers();
    }

    setupFinanceBot() {
        this.backupService = new BackupService(this.db);
        this.financeBot = new FinanceBot(this.db, this.aiService, this.backupService, null);
    }

    async safeSendMessage(chatId, text) {
        if (!chatId || !text) {
            console.log('⚠️ Invalid chatId or text for sending message');
            return false;
        }

        try {
            // Method 1: Direct send
            await this.client.sendMessage(chatId, text);
            console.log('✅ Message sent successfully to:', chatId);
            return true;
        } catch (error) {
            console.log('Method 1 failed:', error.message);
        }

        try {
            // Method 2: Get chat and send
            const chats = await this.client.getChats();
            const chat = chats.find(c => c.id._serialized === chatId);
            if (chat) {
                await chat.sendMessage(text);
                console.log('✅ Message sent via chat object to:', chatId);
                return true;
            }
        } catch (error) {
            console.log('Method 2 failed:', error.message);
        }

        console.error('❌ All send methods failed for chat:', chatId);
        return false;
    }



    setupWhatsAppEventHandlers() {
        this.client.on('qr', async (qr) => {
            console.log('QR Code untuk login WhatsApp:');
            qrcode.generate(qr, { small: true });
            
            // Generate QR code image untuk web
            try {
                this.currentQRCode = await qrcodeImage.toDataURL(qr);
                this.qrGeneratedAt = new Date();
                console.log('✅ QR Code tersedia di: /api/qr');
                console.log('📱 Scan QR code di browser atau WhatsApp');
            } catch (error) {
                console.error('Error generating QR image:', error);
            }
            
            this.connectionStatus = 'qr_ready';
        });

        this.client.on('ready', () => {
            console.log('✅ WhatsApp Finance Bot siap di Render!');
            this.connectionStatus = 'connected';
            this.reconnectAttempts = 0;
            this.currentQRCode = null; // Clear QR code after successful login
        });

        this.client.on('authenticated', () => {
            console.log('🔐 WhatsApp berhasil terautentikasi!');
            this.connectionStatus = 'authenticated';
            this.currentQRCode = null; // Clear QR code after authentication
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
                
                // Get contact name
                let contactName = message.author || 'Unknown';
                try {
                    if (message._data && message._data.notifyName) {
                        contactName = message._data.notifyName;
                    } else if (message.author) {
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
                    console.log('⚠️ Tidak bisa mendapatkan nama kontak, menggunakan author');
                    contactName = message.author ? message.author.split('@')[0] : 'Unknown';
                }
                
                const result = await this.financeBot.processMessage(message.body, message.author, contactName);
                if (result) {
                    await this.safeSendMessage(message.from, result);
                }
            } catch (error) {
                console.error('Message error:', error.message);
            }
        });

        this.client.on('message_create', async (message) => {
            try {
                if (message.fromMe) {
                    // Get contact name for self messages
                    let contactName = message.author || 'Unknown';
                    try {
                        if (message._data && message._data.notifyName) {
                            contactName = message._data.notifyName;
                        } else if (message.author) {
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
                        console.log('⚠️ Tidak bisa mendapatkan nama kontak untuk self message, menggunakan author');
                        contactName = message.author ? message.author.split('@')[0] : 'Unknown';
                    }
                    
                    const result = await this.financeBot.processMessage(message.body, message.author, contactName);
                    if (result) {
                        await this.safeSendMessage(message.from, result);
                    }
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
            const fs = require('fs');
            const path = require('path');
            
            // Check session files
            const authPath = process.env.AUTH_PATH || './.wwebjs_auth';
            const clientId = process.env.CLIENT_ID || 'wa-finance-render';
            const sessionPath = path.join(authPath, `session-${clientId}`);
            
            let sessionExists = false;
            let sessionInfo = null;
            
            try {
                if (fs.existsSync(sessionPath)) {
                    sessionExists = true;
                    const stats = fs.statSync(sessionPath);
                    sessionInfo = {
                        exists: true,
                        lastModified: stats.mtime,
                        size: stats.size,
                        path: sessionPath
                    };
                }
            } catch (error) {
                console.error('Error checking session:', error);
            }
            
            res.json({ 
                status: 'OK', 
                timestamp: new Date().toISOString(),
                whatsapp: this.connectionStatus,
                connected: this.client.isConnected,
                authenticated: this.client.authStrategy.isAuthenticated,
                memory: `${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB`,
                reconnectAttempts: this.reconnectAttempts,
                session: {
                    exists: sessionExists,
                    info: sessionInfo,
                    authPath: authPath,
                    clientId: clientId
                }
            });
        });

        // QR Code endpoint untuk login
        this.app.get('/api/qr', (req, res) => {
            if (this.currentQRCode) {
                res.json({
                    qrCode: this.currentQRCode,
                    generatedAt: this.qrGeneratedAt,
                    status: 'qr_ready',
                    message: 'Scan QR code ini dengan WhatsApp di HP Anda'
                });
            } else {
                res.json({
                    status: this.connectionStatus,
                    message: this.connectionStatus === 'connected' ? 
                        'WhatsApp sudah terhubung' : 
                        'Menunggu QR code...'
                });
            }
        });

        // QR Code HTML page
        this.app.get('/qr', (req, res) => {
            res.sendFile(path.join(__dirname, '..', 'public', 'qr-login.html'));
        });
        
        this.app.get('/login', (req, res) => {
            const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>WhatsApp QR Code</title>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        text-align: center; 
                        padding: 20px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        min-height: 100vh;
                        margin: 0;
                    }
                    .container {
                        max-width: 500px;
                        margin: 0 auto;
                        background: rgba(255,255,255,0.1);
                        padding: 30px;
                        border-radius: 15px;
                        backdrop-filter: blur(10px);
                    }
                    .qr-container {
                        margin: 20px 0;
                        padding: 20px;
                        background: white;
                        border-radius: 10px;
                        display: inline-block;
                    }
                    .status {
                        margin: 20px 0;
                        padding: 10px;
                        border-radius: 5px;
                        font-weight: bold;
                    }
                    .connected { background: #4CAF50; }
                    .qr_ready { background: #FF9800; }
                    .disconnected { background: #f44336; }
                    .instructions {
                        background: rgba(255,255,255,0.2);
                        padding: 15px;
                        border-radius: 10px;
                        margin: 20px 0;
                        text-align: left;
                    }
                    .refresh-btn {
                        background: #4CAF50;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 16px;
                        margin: 10px;
                    }
                    .refresh-btn:hover { background: #45a049; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>📱 WhatsApp QR Code Login</h1>
                    <div id="status" class="status disconnected">Menunggu QR Code...</div>
                    
                    <div id="qr-container" class="qr-container" style="display: none;">
                        <h3>Scan QR Code ini dengan WhatsApp</h3>
                        <img id="qr-image" src="" alt="QR Code" style="max-width: 300px;">
                        <p><small>Generated: <span id="qr-time"></span></small></p>
                    </div>
                    
                    <div class="instructions">
                        <h3>📋 Cara Login:</h3>
                        <ol>
                            <li>Buka WhatsApp di HP Anda</li>
                            <li>Pilih Menu → WhatsApp Web</li>
                            <li>Scan QR Code yang muncul di atas</li>
                            <li>Tunggu hingga status berubah menjadi "Connected"</li>
                        </ol>
                    </div>
                    
                    <button class="refresh-btn" onclick="checkStatus()">🔄 Refresh Status</button>
                    <button class="refresh-btn" onclick="location.reload()">🔄 Reload Page</button>
                </div>
                
                <script>
                    function checkStatus() {
                        fetch('/api/qr')
                            .then(response => response.json())
                            .then(data => {
                                const statusDiv = document.getElementById('status');
                                const qrContainer = document.getElementById('qr-container');
                                const qrImage = document.getElementById('qr-image');
                                const qrTime = document.getElementById('qr-time');
                                
                                statusDiv.className = 'status ' + data.status;
                                
                                if (data.qrCode) {
                                    statusDiv.textContent = 'QR Code Tersedia - Scan dengan WhatsApp';
                                    qrImage.src = data.qrCode;
                                    qrTime.textContent = new Date(data.generatedAt).toLocaleString('id-ID');
                                    qrContainer.style.display = 'block';
                                } else if (data.status === 'connected') {
                                    statusDiv.textContent = '✅ WhatsApp Terhubung!';
                                    qrContainer.style.display = 'none';
                                } else {
                                    statusDiv.textContent = 'Menunggu QR Code...';
                                    qrContainer.style.display = 'none';
                                }
                            })
                            .catch(error => {
                                console.error('Error:', error);
                                document.getElementById('status').textContent = 'Error checking status';
                            });
                    }
                    
                    // Check status every 5 seconds
                    setInterval(checkStatus, 5000);
                    
                    // Initial check
                    checkStatus();
                </script>
            </body>
            </html>
            `;
            res.send(html);
        });

        this.app.get('/', (req, res) => {
            res.json({
                message: 'WA Finance Bot API',
                version: '1.0.0',
                whatsapp: this.connectionStatus,
                connected: this.client.isConnected,
                authenticated: this.client.authStrategy.isAuthenticated,
                memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100} MB`,
                reconnectAttempts: this.reconnectAttempts,
                qrUrl: '/qr',
                qrApi: '/api/qr',
                sessionInfo: {
                    authPath: process.env.AUTH_PATH || './.wwebjs_auth',
                    clientId: process.env.CLIENT_ID || 'wa-finance-render'
                }
            });
        });

        // Session management endpoints
        this.app.get('/api/session/status', (req, res) => {
            const fs = require('fs');
            const path = require('path');
            
            const authPath = process.env.AUTH_PATH || './.wwebjs_auth';
            const clientId = process.env.CLIENT_ID || 'wa-finance-render';
            const sessionPath = path.join(authPath, `session-${clientId}`);
            
            try {
                if (fs.existsSync(sessionPath)) {
                    const stats = fs.statSync(sessionPath);
                    res.json({
                        exists: true,
                        lastModified: stats.mtime,
                        size: stats.size,
                        path: sessionPath,
                        message: 'Session tersimpan dan siap digunakan'
                    });
                } else {
                    res.json({
                        exists: false,
                        message: 'Session belum tersimpan - perlu scan QR code'
                    });
                }
            } catch (error) {
                res.status(500).json({
                    error: 'Error checking session',
                    message: error.message
                });
            }
        });

        this.app.delete('/api/session/clear', (req, res) => {
            const fs = require('fs');
            const path = require('path');
            
            const authPath = process.env.AUTH_PATH || './.wwebjs_auth';
            const clientId = process.env.CLIENT_ID || 'wa-finance-render';
            const sessionPath = path.join(authPath, `session-${clientId}`);
            
            try {
                if (fs.existsSync(sessionPath)) {
                    fs.rmSync(sessionPath, { recursive: true, force: true });
                    res.json({
                        success: true,
                        message: 'Session berhasil dihapus'
                    });
                } else {
                    res.json({
                        success: false,
                        message: 'Session tidak ditemukan'
                    });
                }
            } catch (error) {
                res.status(500).json({
                    error: 'Error clearing session',
                    message: error.message
                });
            }
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