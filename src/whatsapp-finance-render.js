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
        
        // Konfigurasi khusus untuk Render
        this.isRenderEnvironment = process.env.RENDER || process.env.NODE_ENV === 'production';
        if (this.isRenderEnvironment) {
            console.log('🚀 Render environment detected, applying special configurations');
            this.maxReconnectAttempts = 10; // Lebih banyak percobaan di Render
            
            // Konfigurasi khusus untuk plan free
            if (process.env.RENDER_PLAN === 'free' || !process.env.RENDER_PLAN) {
                console.log('💰 Free plan detected, applying memory optimizations');
                this.maxReconnectAttempts = 5; // Kurangi percobaan untuk menghemat resource
            }
        }
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
            '--max_old_space_size=128',
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
            '--disable-renderer-backgrounding',
            // Optimasi untuk plan free
            '--disable-background-networking',
            '--safebrowsing-disable-auto-update',
            '--disable-client-side-phishing-detection',
            '--disable-component-update',
            '--disable-domain-reliability',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
            '--disable-hang-monitor',
            '--disable-prompt-on-repost',
            '--disable-field-trial-config',
            '--disable-back-forward-cache',
            '--disable-http2',
            '--disable-gpu-sandbox',
            '--disable-software-rasterizer'
        ];

        // Konfigurasi path untuk session persistence
        const authPath = process.env.AUTH_PATH || './.wwebjs_auth';
        const clientId = process.env.CLIENT_ID || 'wa-finance-render';
        
        console.log(`🔐 Auth Path: ${authPath}`);
        console.log(`🆔 Client ID: ${clientId}`);
        
        // Clean up session if there are issues
        this.cleanupSession(authPath, clientId);
        
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

    cleanupSession(authPath, clientId) {
        try {
            const fs = require('fs');
            const path = require('path');
            
            // Check if session directory exists
            const sessionPath = path.join(authPath, `session-${clientId}`);
            if (fs.existsSync(sessionPath)) {
                console.log('🧹 Cleaning up existing session...');
                
                // Try to remove problematic files
                const problematicFiles = [
                    'Default/Cookies-journal',
                    'Default/Cookies',
                    'Default/Web Data-journal',
                    'Default/Web Data'
                ];
                
                problematicFiles.forEach(file => {
                    const filePath = path.join(sessionPath, file);
                    if (fs.existsSync(filePath)) {
                        try {
                            fs.unlinkSync(filePath);
                            console.log(`✅ Cleaned: ${file}`);
                        } catch (error) {
                            console.log(`⚠️ Could not clean ${file}: ${error.message}`);
                        }
                    }
                });
            }
        } catch (error) {
            console.log('⚠️ Session cleanup error:', error.message);
        }
    }

    setupFinanceBot() {
        this.backupService = new BackupService(this.db);
        this.financeBot = new FinanceBot(this.db, this.aiService, this.backupService, null);
    }

    async safeSendMessage(message, text) {
        if (!message || !text) {
            console.log('⚠️ Invalid message or text for sending reply');
            return false;
        }

        // Skip sending if message is from undefined
        if (!message.from) {
            console.log('⚠️ No chat ID found, skipping reply');
            return false;
        }

        // Check if client is connected
        if (!this.client || !this.client.isConnected) {
            console.log('⚠️ Client not connected, skipping reply');
            return false;
        }

        try {
            // Simple direct send without reply - most reliable
            await this.client.sendMessage(message.from, text);
            console.log('✅ Message sent successfully to:', message.from);
            return true;
        } catch (error) {
            console.error('❌ Failed to send message:', error.message);
            return false;
        }
    }



    setupWhatsAppEventHandlers() {
        // Loading screen
        this.client.on('loading_screen', (percent, message) => {
            console.log(`🔄 Loading WhatsApp: ${percent}% - ${message}`);
        });

        // QR Code generation
        this.client.on('qr', async (qr) => {
            console.log('📱 QR Code untuk login WhatsApp:');
            qrcode.generate(qr, { small: true });
            try {
                this.currentQRCode = await qrcodeImage.toDataURL(qr);
                this.qrGeneratedAt = new Date();
                console.log('✅ QR Code tersedia di: /api/qr');
            } catch (error) {
                console.error('Error generating QR image:', error);
            }
            this.connectionStatus = 'qr_ready';
        });

        // Client ready
        this.client.on('ready', () => {
            console.log('✅ WhatsApp Finance Bot siap di Render!');
            this.connectionStatus = 'connected';
            this.reconnectAttempts = 0;
            this.currentQRCode = null; // Clear QR code after successful login
        });

        // Authenticated
        this.client.on('authenticated', () => {
            console.log('🔐 WhatsApp berhasil terautentikasi!');
            this.connectionStatus = 'authenticated';
            this.currentQRCode = null; // Clear QR code after authentication
        });

        // Authentication failure
        this.client.on('auth_failure', (msg) => {
            console.error('❌ Autentikasi WhatsApp gagal:', msg);
            this.connectionStatus = 'auth_failed';
        });

        // Disconnected
        this.client.on('disconnected', (reason) => {
            console.log('❌ WhatsApp terputus:', reason);
            this.connectionStatus = 'disconnected';
            // Clean up session on logout only
            if (reason === 'LOGOUT') {
                console.log('🧹 Logout detected, cleaning session...');
                this.cleanupSession(process.env.AUTH_PATH || './.wwebjs_auth', process.env.CLIENT_ID || 'wa-finance-render');
            }
            // Perbaiki reconnect untuk Render
            this.attemptReconnect();
        });

        // Gabungkan logika ke satu fungsi
        this.handleWhatsAppMessage = async (message) => {
            console.log("=========== handleWhatsAppMessage ===========", message.from);
            console.log("📱 Message details:", {
                from: message.from,
                fromMe: message.fromMe,
                author: message.author,
                body: message.body
            });
            if (message._data) {
                console.log("📱 Message _data:", {
                    notifyName: message._data.notifyName,
                    pushName: message._data.pushName,
                    verifiedName: message._data.verifiedName
                });
            }

            // Handle file upload for restore
            if (message.hasMedia && (message.type === 'document' || message.type === 'application/zip')) {
                if (typeof this.handleFileUpload === 'function') {
                    return await this.handleFileUpload(message);
                }
            }

            // Handle group messages (from other people)
            if (message.from.endsWith('@g.us') && !message.fromMe) {
                const allowedGroups = this.groupConfig && this.groupConfig.groups ? this.groupConfig.groups.map(g => g.id) : [];
                const defaultGroup = this.groupConfig && this.groupConfig.defaultGroup;
                const isGroupAllowed = allowedGroups.includes(message.from) || (defaultGroup && message.from === defaultGroup);
                if (!isGroupAllowed) {
                    console.log(`⚠️ Group ${message.from} tidak terdaftar, diabaikan`);
                    console.log(`💡 Daftar group yang diizinkan: ${JSON.stringify(allowedGroups)}`);
                    return;
                }
                console.log(`✅ Group ${message.from} terdaftar, memproses pesan...`);

                let contactName = message.author;
                try {
                    if (message._data && message._data.notifyName) {
                        contactName = message._data.notifyName;
                        console.log(`✅ Menggunakan notifyName: ${contactName}`);
                    } else {
                        const contact = await message.getContact();
                        if (contact && contact.pushname) {
                            contactName = contact.pushname;
                            console.log(`✅ Menggunakan pushname: ${contactName}`);
                        } else if (contact && contact.name) {
                            contactName = contact.name;
                            console.log(`✅ Menggunakan contact.name: ${contactName}`);
                        } else {
                            contactName = message.author.split('@')[0];
                            console.log(`⚠️ Menggunakan formatted phone: ${contactName}`);
                        }
                    }
                } catch (error) {
                    console.log('⚠️ Tidak bisa mendapatkan nama kontak, menggunakan formatted author');
                    contactName = message.author.split('@')[0];
                }

                const result = await this.financeBot.processMessage(message.body, message.author, contactName);
                if (result) {
                    await message.reply(result);
                    console.log(`✅ Response terkirim: ${result}`);
                }
            }
            // Handle self messages to registered groups (chat via pribadi)
            else if (message.fromMe && message.from.endsWith('@c.us') && message.author) {
                let contactName = message.author;
                try {
                    if (message._data && message._data.notifyName) {
                        contactName = message._data.notifyName;
                        console.log(`✅ Self message - Menggunakan notifyName: ${contactName}`);
                    } else {
                        const contact = await message.getContact();
                        if (contact && contact.pushname) {
                            contactName = contact.pushname;
                            console.log(`✅ Self message - Menggunakan pushname: ${contactName}`);
                        } else if (contact && contact.name) {
                            contactName = contact.name;
                            console.log(`✅ Self message - Menggunakan contact.name: ${contactName}`);
                        } else {
                            contactName = message.author.split('@')[0];
                            console.log(`⚠️ Self message - Menggunakan formatted phone: ${contactName}`);
                        }
                    }
                } catch (error) {
                    console.log('⚠️ Tidak bisa mendapatkan nama kontak untuk self message, menggunakan formatted author');
                    contactName = message.author.split('@')[0];
                }
                const result = await this.financeBot.processMessage(message.body, message.author, contactName);
                if (result) {
                    await message.reply(result);
                    console.log(`✅ Response terkirim ke chat: ${result}`);
                }
            }
            // Ignore all other messages
            else {
                console.log(`🚫 Pesan diabaikan: ${message.body}`);
                console.log(`📱 Jenis: ${message.fromMe ? 'Self' : 'Other'} - ${message.from.endsWith('@g.us') ? 'Group' : 'Private'}`);
            }
        };

        // Event handler panggil fungsi yang sama
        this.client.on('message', this.handleWhatsAppMessage);
        this.client.on('message_create', this.handleWhatsAppMessage);

        // Error handler
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
                    // Reset connection status
                    this.connectionStatus = 'reconnecting';
                    await this.client.initialize();
                } catch (error) {
                    console.error('Reconnect failed:', error.message);
                    this.connectionStatus = 'disconnected';
                    this.attemptReconnect();
                }
            }, 5000);
        } else {
            console.error('❌ Max reconnect attempts reached');
            this.connectionStatus = 'failed';
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
            
            // Jalankan API server terlebih dahulu untuk Render
            const port = process.env.PORT || 3000;
            this.app.listen(port, () => {
                console.log(`🚀 Server running on port ${port}`);
                console.log(`📊 Group management: http://localhost:${port}/api/groups`);
                console.log(`🔗 Health check: http://localhost:${port}/api/health`);
                console.log(`📱 QR Login: http://localhost:${port}/login`);
            });
            
            // Inisialisasi database
            await this.db.init();
            console.log('✅ Database berhasil diinisialisasi');

            // Inisialisasi WhatsApp client dengan retry untuk Render
            if (this.isRenderEnvironment) {
                console.log('🔄 Render environment: Initializing WhatsApp with retry mechanism...');
                let initAttempts = 0;
                const maxInitAttempts = 3;
                
                while (initAttempts < maxInitAttempts) {
                    try {
                        await this.client.initialize();
                        console.log('✅ WhatsApp client initialized successfully');
                        break;
                    } catch (error) {
                        initAttempts++;
                        console.error(`❌ WhatsApp initialization attempt ${initAttempts} failed:`, error.message);
                        if (initAttempts < maxInitAttempts) {
                            console.log(`🔄 Retrying in 10 seconds...`);
                            await new Promise(resolve => setTimeout(resolve, 10000));
                        } else {
                            console.error('❌ Max initialization attempts reached, but server will continue running');
                        }
                    }
                }
            } else {
                await this.client.initialize();
                console.log('✅ WhatsApp client initialized successfully');
            }
            
            console.log('🚀 WhatsApp Bot sedang memulai...');
            
            // Periodic connection check untuk Render
            setInterval(() => {
                if (!this.client.isConnected && this.connectionStatus === 'connected') {
                    console.log('Connection lost, attempting reconnect...');
                    this.connectionStatus = 'disconnected';
                    this.attemptReconnect();
                }
            }, 30000); // Check every 30 seconds
            
        } catch (error) {
            console.error('Start error:', error.message);
            // Jangan exit process di Render, biarkan server tetap berjalan
            if (!this.isRenderEnvironment) {
                process.exit(1);
            }
        }
    }
}

const server = new WhatsAppFinanceRenderServer();
server.start(); 