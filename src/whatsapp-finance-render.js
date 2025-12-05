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
const ScheduledBackupService = require('./services/ScheduledBackupService');
const fs = require('fs');
const path = require('path');

dotenv.config();

class WhatsAppFinanceRenderServer {
    constructor() {
        this.configPath = path.join(__dirname, '..', 'config.json');
        this.loadConfig();
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

    loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                this.config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
                // Ensure allowedGroups array exists
                if (!this.config.allowedGroups) {
                    this.config.allowedGroups = [];
                }
            } else {
                this.config = {
                    allowedGroupId: null,
                    botName: "FinanceBot",
                    logLevel: "info",
                    allowedGroups: [] // Array untuk menyimpan group yang diizinkan
                };
                this.saveConfig();
            }
        } catch (error) {
            console.error('Error loading config:', error);
            this.config = {
                allowedGroupId: null,
                botName: "FinanceBot",
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

    // Check if a group is allowed
    isGroupAllowed(groupId) {
        const allowedGroups = this.getAllowedGroups();
        console.log(`🔍 Checking if group ${groupId} is allowed. Allowed groups: ${JSON.stringify(allowedGroups)}`);
        return allowedGroups.includes(groupId);
    }

    // Add group to allowed list
    addAllowedGroup(groupId) {
        if (!this.config.allowedGroups) {
            this.config.allowedGroups = [];
        }
        
        if (!this.config.allowedGroups.includes(groupId)) {
            this.config.allowedGroups.push(groupId);
            this.saveConfig();
            console.log(`✅ Group ${groupId} berhasil ditambahkan ke daftar yang diizinkan`);
            return true;
        } else {
            console.log(`⚠️ Group ${groupId} sudah ada di daftar yang diizinkan`);
            return false;
        }
    }

    // Remove group from allowed list
    removeAllowedGroup(groupId) {
        if (this.config.allowedGroups && this.config.allowedGroups.includes(groupId)) {
            this.config.allowedGroups = this.config.allowedGroups.filter(id => id !== groupId);
            this.saveConfig();
            console.log(`✅ Group ${groupId} berhasil dihapus dari daftar yang diizinkan`);
            return true;
        } else {
            console.log(`⚠️ Group ${groupId} tidak ditemukan di daftar yang diizinkan`);
            return false;
        }
    }

    // Get all allowed groups (from config + env)
    getAllowedGroups() {
        const groups = [...(this.config.allowedGroups || [])];

        // Tambahkan dari env WHATSAPP_GROUP_ID jika ada dan belum ada di list
        if (process.env.WHATSAPP_GROUP_ID && !groups.includes(process.env.WHATSAPP_GROUP_ID)) {
            groups.push(process.env.WHATSAPP_GROUP_ID);
        }

        // Tambahkan dari legacy config allowedGroupId jika ada dan belum ada di list
        if (this.config.allowedGroupId && !groups.includes(this.config.allowedGroupId)) {
            groups.push(this.config.allowedGroupId);
        }

        return groups;
    }

    checkEnvironment() {
        console.log('🔧 Environment Check:');
        console.log(`  - OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'Set' : 'Not set'}`);
        console.log(`  - WHATSAPP_GROUP_ID: ${process.env.WHATSAPP_GROUP_ID || 'Not set'}`);
        console.log(`  - AUTH_PATH: ${process.env.AUTH_PATH || './.wwebjs_auth'}`);
        console.log(`  - CLIENT_ID: ${process.env.CLIENT_ID || 'wa-finance-render'}`);
        console.log(`  - PORT: ${process.env.PORT || 3000}`);

        if (!process.env.OPENAI_API_KEY) {
            console.log('⚠️ OpenAI API key tidak ditemukan, AI features akan menggunakan pattern matching');
        }

        if (process.env.WHATSAPP_GROUP_ID) {
            console.log(`✅ Group dari env: ${process.env.WHATSAPP_GROUP_ID}`);
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
        this.scheduledBackupService = new ScheduledBackupService(this.backupService, this.client);
        this.financeBot = new FinanceBot(this.db, this.aiService, this.backupService, this.scheduledBackupService);
    }

    async safeSendMessage(message, text, retryCount = 0) {
        const maxRetries = 2;

        if (!message || !text) {
            console.log('⚠️ Invalid message or text for sending reply');
            return false;
        }

        if (!message.from) {
            console.log('⚠️ No chat ID found, skipping reply');
            return false;
        }

        if (!this.client) {
            console.log('⚠️ Client not initialized, skipping reply');
            return false;
        }

        try {
            await this.client.sendMessage(message.from, text);
            console.log('✅ Message sent to:', message.from);
            this.consecutiveErrors = 0; // Reset error counter on success
            return true;
        } catch (error) {
            const isContextError = error.message?.includes('context was destroyed') ||
                                   error.message?.includes('navigation') ||
                                   error.message?.includes('getChat') ||
                                   error.message?.includes('Evaluation failed');

            if (isContextError) {
                this.consecutiveErrors = (this.consecutiveErrors || 0) + 1;
                console.log(`⚠️ Context error #${this.consecutiveErrors}: ${error.message}`);

                // If too many consecutive errors, trigger page refresh
                if (this.consecutiveErrors >= 3 && !this.isRefreshing) {
                    console.log('🔄 Too many context errors, refreshing WhatsApp page...');
                    this.isRefreshing = true;
                    try {
                        await this.client.pupPage.reload();
                        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for page to load
                        console.log('✅ Page refreshed successfully');
                        this.consecutiveErrors = 0;
                    } catch (refreshError) {
                        console.error('❌ Page refresh failed:', refreshError.message);
                    }
                    this.isRefreshing = false;
                }

                if (retryCount < maxRetries) {
                    const delay = (retryCount + 1) * 1500;
                    console.log(`🔄 Retrying in ${delay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return this.safeSendMessage(message, text, retryCount + 1);
                }
            }

            console.error('❌ sendMessage failed:', error.message);
            return false;
        }
    }

    async handleFileUpload(message) {
        try {
            console.log('📁 File upload detected, checking for backup file...');
            
            // Check if file is a zip file
            const fileName = message.body || 'unknown';
            if (!fileName.toLowerCase().endsWith('.zip')) {
                await this.safeSendMessage(message, '❌ *FILE TIDAK VALID*\n\nFile harus berformat .zip (backup file)\n\n💡 *Tips:*\n• Pastikan file adalah backup yang valid\n• File backup harus berformat .zip');
                return;
            }

            // Download the file
            const media = await message.downloadMedia();
            if (!media) {
                await this.safeSendMessage(message, '❌ *DOWNLOAD GAGAL*\n\nTidak bisa mengunduh file\n\n💡 *Tips:*\n• Pastikan file tidak rusak\n• Coba kirim ulang file');
                return;
            }

            // Save file temporarily
            const tempDir = path.join(__dirname, '..', '..', 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const filePath = path.join(tempDir, fileName);
            const buffer = Buffer.from(media.data, 'base64');
            fs.writeFileSync(filePath, buffer);

            console.log(`📁 File saved: ${filePath}`);

            // Validate backup file
            const validation = await this.backupService.validateBackupFile(filePath);
            if (!validation.valid) {
                fs.unlinkSync(filePath); // Clean up
                await this.safeSendMessage(message, `❌ *BACKUP FILE TIDAK VALID*\n\nError: ${validation.error}\n\n💡 *Tips:*\n• Pastikan file adalah backup yang valid\n• File backup harus berformat .zip`);
                return;
            }

            // Confirm restore
            let confirmMessage = `✅ *BACKUP FILE VALID*\n\n`;
            confirmMessage += `📦 *File:* ${fileName}\n`;
            confirmMessage += `📅 *Backup Date:* ${new Date(validation.timestamp).toLocaleString('id-ID')}\n`;
            confirmMessage += `📊 *Data:* ${validation.transactionCount} transaksi\n\n`;
            confirmMessage += `⚠️ *PERINGATAN:*\n`;
            confirmMessage += `• Data saat ini akan dihapus\n`;
            confirmMessage += `• Proses tidak dapat dibatalkan\n`;
            confirmMessage += `• Pastikan ini adalah backup yang benar\n\n`;
            confirmMessage += `🔄 *Untuk melanjutkan restore:*\n`;
            confirmMessage += `• Ketik "restore confirm" untuk melanjutkan\n`;
            confirmMessage += `• Atau ketik "restore cancel" untuk membatalkan`;

            await this.safeSendMessage(message, confirmMessage);

            // Store file path for confirmation
            this.pendingRestoreFile = filePath;
            this.pendingRestoreMetadata = validation;

        } catch (error) {
            console.error('❌ Error handling file upload:', error);
            await this.safeSendMessage(message, '❌ *ERROR*\n\nTerjadi kesalahan saat memproses file\n\n💡 *Tips:*\n• Pastikan file tidak rusak\n• Coba kirim ulang file');
        }
    }

    async sendBackupFile(message, filePath) {
        try {
            console.log(`📤 Sending backup file: ${filePath}`);

            // Check if file exists on disk
            if (!fs.existsSync(filePath)) {
                console.log(`❌ Backup file not found on disk: ${filePath}`);
                await this.safeSendMessage(message, '❌ *ERROR*\n\nFile backup tidak ditemukan di server\n\n💡 *Tips:*\n• Coba lagi nanti\n• Pastikan file tidak rusak');
                return;
            }

            // Get file info
            const fileName = path.basename(filePath);
            const stats = fs.statSync(filePath);
            const fileSize = this.formatFileSize(stats.size);
            const createdDate = new Date(stats.birthtime).toLocaleString('id-ID');

            // Send file via WhatsApp with try-catch
            try {
                const { MessageMedia } = require('whatsapp-web.js');
                const media = MessageMedia.fromFilePath(filePath);

                // Use getChatById for more reliable sending
                const chat = await this.client.getChatById(message.from);
                if (chat) {
                    await chat.sendMessage(media, {
                        caption: `📦 *BACKUP FILE*\n\n📦 File: ${fileName}\n📅 Created: ${createdDate}\n📏 Size: ${fileSize}\n\n💡 *Tips:*\n• Simpan file untuk restore nanti\n• File berformat .zip\n• Upload file ini untuk restore`
                    });
                    console.log(`✅ Backup file sent: ${fileName}`);
                } else {
                    throw new Error('Could not get chat');
                }
            } catch (sendError) {
                console.error('❌ Error sending media:', sendError.message);
                await this.safeSendMessage(message, `📦 *BACKUP FILE READY*\n\n📦 File: ${fileName}\n📅 Created: ${createdDate}\n📏 Size: ${fileSize}\n\n⚠️ Tidak bisa mengirim file otomatis. Silakan download manual dari server.`);
            }

        } catch (error) {
            console.error('❌ Error sending backup file:', error);
            await this.safeSendMessage(message, '❌ *ERROR*\n\nTerjadi kesalahan saat mengirim file backup\n\n💡 *Tips:*\n• Coba lagi nanti\n• Pastikan file tidak rusak');
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

            // SKIP bot's own response messages to prevent infinite loop
            // Bot responses typically start with these patterns
            const botResponsePatterns = [
                /^📊/, /^✅/, /^❌/, /^📋/, /^🏦/, /^💰/, /^📈/, /^📉/,
                /^🔄/, /^⚠️/, /^\*RINGKASAN/, /^\*LAPORAN/, /^📁/, /^📦/,
                /^🗑️/, /^💡/, /^📱/, /^🔐/, /^⛔/, /^FINANCE BOT/
            ];

            if (message.fromMe && botResponsePatterns.some(pattern => pattern.test(message.body))) {
                console.log(`🔄 SKIP: Bot response message detected, ignoring to prevent loop`);
                return;
            }

            // BLOCK group management commands dari semua sumber kecuali dari diri sendiri
            const isGroupManagementCommand = message.body.toLowerCase().startsWith('add group ') || 
                message.body.toLowerCase().startsWith('remove group ') ||
                message.body.toLowerCase() === 'list groups' ||
                message.body.toLowerCase() === 'clear groups';
            
            if (isGroupManagementCommand) {
                console.log(`🔍 Group Management Command Detected: ${message.body}`);
                console.log(`🔍 FromMe: ${message.fromMe}, From: ${message.from}, Author: ${message.author}`);

                // Hanya izinkan jika fromMe = true
                if (!message.fromMe) {
                    console.log(`🚫 BLOCKED: Group management command bukan dari diri sendiri`);
                    // Jangan reply untuk menghindari error getChat
                    return;
                }
            }
            
            // Debug message data for contact name
            if (message._data) {
                console.log("📱 Message _data:", {
                    notifyName: message._data.notifyName,
                    pushName: message._data.pushName,
                    verifiedName: message._data.verifiedName
                });
            }

            // Handle file upload for restore
            if (message.hasMedia && (message.type === 'document' || message.type === 'application/zip')) {
                    return await this.handleFileUpload(message);
                }

                        // Handle self messages for group management (HANYA dari diri sendiri)
            if (message.fromMe) {
                console.log(`🔐 Pesan dari diri sendiri: ${message.body}`);

                // Handle group management commands
                if (message.body.toLowerCase().startsWith('add group ')) {
                    const groupId = message.body.substring(10).trim();
                    if (groupId && groupId.includes('@g.us')) {
                        const success = this.addAllowedGroup(groupId);
                        const response = success ?
                            `✅ Group ${groupId} berhasil ditambahkan ke daftar yang diizinkan` :
                            `⚠️ Group ${groupId} sudah ada di daftar yang diizinkan`;
                        await this.safeSendMessage(message, response);
                        return;
                    } else {
                        await this.safeSendMessage(message, '❌ Format salah. Gunakan: add group [GROUP_ID]\nContoh: add group 1234567890@g.us');
                        return;
                    }
                }

                if (message.body.toLowerCase().startsWith('remove group ')) {
                    const groupId = message.body.substring(13).trim();
                    if (groupId && groupId.includes('@g.us')) {
                        const success = this.removeAllowedGroup(groupId);
                        const response = success ?
                            `✅ Group ${groupId} berhasil dihapus dari daftar yang diizinkan` :
                            `⚠️ Group ${groupId} tidak ditemukan di daftar yang diizinkan`;
                        await this.safeSendMessage(message, response);
                        return;
                    } else {
                        await this.safeSendMessage(message, '❌ Format salah. Gunakan: remove group [GROUP_ID]\nContoh: remove group 1234567890@g.us');
                        return;
                    }
                }

                    if (message.body.toLowerCase() === 'list groups') {
                        const allowedGroups = this.getAllowedGroups();
                        let response;
                        if (allowedGroups.length === 0) {
                            response = '📋 Daftar group yang diizinkan kosong';
                        } else {
                            const groupList = allowedGroups.map((groupId, index) => `${index + 1}. ${groupId}`).join('\n');
                            response = `📋 Daftar group yang diizinkan:\n${groupList}`;
                        }
                        await this.safeSendMessage(message, response);
                        return;
                    }

                    if (message.body.toLowerCase() === 'clear groups') {
                        this.config.allowedGroups = [];
                        this.saveConfig();
                        await this.safeSendMessage(message, '🗑️ Semua group telah dihapus dari daftar yang diizinkan');
                        return;
                    }

                    // Handle 'help' command from self
                    if (message.body.toLowerCase() === 'help' || message.body.toLowerCase() === 'bantuan') {
                        const helpText = this.financeBot.getHelpText();
                        await this.safeSendMessage(message, helpText);
                        return;
                    }

                // Untuk pesan lain dari diri sendiri, JANGAN proses (untuk menghindari loop)
                // Hanya command di atas yang diizinkan dari self-message
                console.log(`🔄 SKIP: Self-message bukan command yang diizinkan: ${message.body.substring(0, 50)}...`);
                return;
            }

            // Handle group messages (from other people)
            if (message.from.endsWith('@g.us')) {
                console.log(`📨 Pesan dari group: ${message.body}`);
                console.log(`👤 Pengirim: ${message.author || 'Unknown'}`);
                console.log(`🏷️ Group ID: ${message.from}`);
                console.log(`🔍 FromMe: ${message.fromMe}, Author: ${message.author}`);
                
                // Check if this group is registered/allowed
                const isGroupAllowed = this.isGroupAllowed(message.from);
                
                console.log(`📋 Group Check (dev):`);
                console.log(`  - Message from: ${message.from}`);
                console.log(`  - Allowed groups: ${JSON.stringify(this.config.allowedGroups || [])}`);
                console.log(`  - Legacy allowedGroupId: ${this.config.allowedGroupId}`);
                console.log(`  - Is allowed: ${isGroupAllowed}`);
                
                if (!isGroupAllowed) {
                    console.log(`❌ Group ${message.from} tidak terdaftar, diabaikan`);
                    console.log(`💡 Daftar group yang diizinkan: ${JSON.stringify(this.config.allowedGroups || [])}`);
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
                        } else if (contact && contact.name) {
                            contactName = contact.name;
                        } else {
                            contactName = message.author.split('@')[0];
                        }
                    }
                } catch (error) {
                    contactName = message.author.split('@')[0];
                }

                const result = await this.financeBot.processMessage(message.body, message.author, contactName);
                
                if (result) {
                    // Check if this is a download backup request
                    if (result.includes('DOWNLOAD BACKUP') && result.includes('File sedang dikirim')) {
                        // Extract file path from result
                        const filePathMatch = result.match(/🔧 \*File Info:\* (.+)/);
                        if (filePathMatch) {
                            const filePath = filePathMatch[1];
                            await this.sendBackupFile(message, filePath);
                        }
                    }
                    
                    // Check if this is a send backup file request
                    if (result.includes('SEND BACKUP FILE') && result.includes('File sedang dikirim')) {
                        // Extract file path from result
                        const filePathMatch = result.match(/📁 \*Path:\* (.+)/);
                        if (filePathMatch) {
                            const filePath = filePathMatch[1];
                            await this.sendBackupFile(message, filePath);
                        }
                    }
                    
                    // Send response back to group
                    await this.safeSendMessage(message, result);
                    console.log(`✅ Response terkirim: ${result}`);
                }
            }
        }
        ;

        // Gunakan HANYA message_create untuk menangkap semua pesan (termasuk dari diri sendiri)
        // JANGAN gunakan keduanya karena akan menyebabkan pesan diproses 2x
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

        // Get all transactions
        this.app.get('/api/transactions', async (req, res) => {
            try {
                const limit = parseInt(req.query.limit) || 100;
                const transactions = await this.db.getTransactions(limit);
                res.json(transactions);
            } catch (error) {
                console.error('Error getting transactions:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Get WhatsApp groups
        this.app.get('/api/groups', async (req, res) => {
            try {
                const chats = await this.client.getChats();
                const groups = chats.filter(chat => chat.isGroup).map(group => ({
                    id: group.id._serialized,
                    name: group.name,
                    participants: group.participants.length,
                    isGroup: group.isGroup,
                    isAllowed: this.isGroupAllowed(group.id._serialized)
                }));
                
                res.json({
                    groups: groups,
                    total: groups.length,
                    allowedGroups: this.getAllowedGroups(),
                    message: 'Gunakan Group ID untuk menambahkan ke daftar yang diizinkan (HANYA via pesan dari diri sendiri)'
                });
            } catch (error) {
                console.error('Error getting groups:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Get allowed groups
        this.app.get('/api/allowed-groups', (req, res) => {
            try {
                res.json({
                    allowedGroups: this.getAllowedGroups(),
                    total: this.getAllowedGroups().length,
                    note: 'Group hanya bisa ditambahkan via pesan dari diri sendiri'
                });
            } catch (error) {
                console.error('Error getting allowed groups:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Add group to allowed list
        this.app.post('/api/allowed-groups', async (req, res) => {
            try {
                const { groupId } = req.body;
                
                if (!groupId) {
                    return res.status(400).json({ error: 'groupId is required' });
                }
                
                const success = this.addAllowedGroup(groupId);
                
                res.json({ 
                    success: success,
                    message: success ? 'Group berhasil ditambahkan' : 'Group sudah ada di daftar',
                    allowedGroups: this.getAllowedGroups()
                });
            } catch (error) {
                console.error('Error adding allowed group:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Remove group from allowed list
        this.app.delete('/api/allowed-groups/:groupId', async (req, res) => {
            try {
                const { groupId } = req.params;
                
                if (!groupId) {
                    return res.status(400).json({ error: 'groupId is required' });
                }
                
                const success = this.removeAllowedGroup(groupId);
                
                res.json({ 
                    success: success,
                    message: success ? 'Group berhasil dihapus' : 'Group tidak ditemukan',
                    allowedGroups: this.getAllowedGroups()
                });
            } catch (error) {
                console.error('Error removing allowed group:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });



        // Get current group configuration
        this.app.get('/api/config', (req, res) => {
            const config = {
                whatsappGroupId: process.env.WHATSAPP_GROUP_ID || 'Not configured',
                botName: process.env.BOT_NAME || 'FinanceBot',
                port: process.env.PORT || 3000,
                allowedGroups: this.getAllowedGroups(),
                securityNote: 'Group hanya bisa ditambahkan via pesan dari diri sendiri'
            };
            res.json(config);
        });

        // Set allowed group for bot processing
        this.app.post('/api/set-allowed-group', async (req, res) => {
            try {
                const { groupId } = req.body;
                
                if (!groupId) {
                    return res.status(400).json({ error: 'groupId is required' });
                }
                
                // Verify group exists
                const chats = await this.client.getChats();
                const group = chats.find(chat => chat.id._serialized === groupId && chat.isGroup);
                
                if (!group) {
                    return res.status(404).json({ error: 'Group not found' });
                }
                
                // Update configuration
                this.config.allowedGroupId = groupId;
                this.saveConfig();
                
                res.json({ 
                    message: 'Allowed group updated successfully',
                    groupId: groupId,
                    groupName: group.name,
                    note: 'Changes applied immediately'
                });
            } catch (error) {
                console.error('Error setting allowed group:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Get current allowed group
        this.app.get('/api/allowed-group', async (req, res) => {
            try {
                const groupId = this.config.allowedGroupId || process.env.WHATSAPP_GROUP_ID;
                
                if (!groupId) {
                    return res.json({ 
                        message: 'No group configured - bot will only process allowed groups',
                        groupId: null,
                        groupName: null,
                        allowedGroups: this.getAllowedGroups()
                    });
                }
                
                // Get group details
                const chats = await this.client.getChats();
                const group = chats.find(chat => chat.id._serialized === groupId);
                
                res.json({
                    groupId: groupId,
                    groupName: group ? group.name : 'Unknown',
                    isConfigured: true,
                    allowedGroups: this.getAllowedGroups(),
                    securityNote: 'Group hanya bisa ditambahkan via pesan dari diri sendiri'
                });
            } catch (error) {
                console.error('Error getting allowed group:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Clear allowed group (process only allowed groups)
        this.app.delete('/api/allowed-group', async (req, res) => {
            try {
                this.config.allowedGroupId = null;
                this.saveConfig();
                
                res.json({ 
                    message: 'Allowed group cleared - bot will only process allowed groups',
                    allowedGroups: this.getAllowedGroups()
                });
            } catch (error) {
                console.error('Error clearing allowed group:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Group management endpoints (legacy)
        this.app.get('/api/legacy-groups', (req, res) => {
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
                    default: this.groupConfig.defaultGroup,
                    allowedGroups: this.getAllowedGroups(),
                    securityNote: 'Group hanya bisa ditambahkan via pesan dari diri sendiri'
                },
                config: {
                    botName: this.config.botName,
                    logLevel: this.config.logLevel,
                    allowedGroupId: this.config.allowedGroupId
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

        // Send message to WhatsApp group (for testing)
        this.app.post('/api/send-message', async (req, res) => {
            try {
                const { message, groupId } = req.body;
                
                if (!message) {
                    return res.status(400).json({ error: 'message is required' });
                }
                
                // Find group by ID or use first available group
                const chats = await this.client.getChats();
                const group = groupId ? 
                    chats.find(chat => chat.id._serialized === groupId) :
                    chats.find(chat => chat.isGroup);
                
                if (!group) {
                    return res.status(404).json({ error: 'Group not found' });
                }
                
                await group.sendMessage(message);
                res.json({ message: 'Message sent successfully', group: group.name });
            } catch (error) {
                console.error('Error sending message:', error);
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
                
                const transaction = await this.db.saveTransaction({
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

        // Get financial summary
        this.app.get('/api/summary', async (req, res) => {
            try {
                const summary = await this.db.getSummary();
                res.json(summary);
            } catch (error) {
                console.error('Error getting summary:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Get summary by date range
        this.app.get('/api/summary/date-range', async (req, res) => {
            try {
                const { startDate, endDate } = req.query;
                
                if (!startDate || !endDate) {
                    return res.status(400).json({ 
                        error: 'startDate and endDate are required',
                        example: {
                            startDate: '2024-01-01',
                            endDate: '2024-01-31'
                        }
                    });
                }

                const summary = await this.financeBot.getSummaryByDate(startDate, endDate);
                
                res.json({
                    success: true,
                    data: {
                        period: {
                            startDate: summary.startDate,
                            endDate: summary.endDate,
                            totalDays: Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1
                        },
                        summary: {
                            totalIncome: summary.totalIncome,
                            totalExpense: summary.totalExpense,
                            balance: summary.balance,
                            transactionCount: summary.transactionCount
                        },
                        formatted: {
                            totalIncome: this.financeBot.formatCurrency(summary.totalIncome),
                            totalExpense: this.financeBot.formatCurrency(summary.totalExpense),
                            balance: this.financeBot.formatCurrency(summary.balance)
                        }
                    }
                });
            } catch (error) {
                console.error('Error getting summary by date:', error);
                res.status(500).json({ error: 'Failed to get summary by date' });
            }
        });

        // Get detailed report by date range
        this.app.get('/api/report', async (req, res) => {
            try {
                const { startDate, endDate } = req.query;
                
                if (!startDate || !endDate) {
                    return res.status(400).json({ 
                        error: 'startDate and endDate are required',
                        example: {
                            startDate: '2024-01-01',
                            endDate: '2024-01-31'
                        }
                    });
                }

                const report = await this.financeBot.getDetailByDate(startDate, endDate);
                
                res.json({
                    success: true,
                    data: {
                        period: report.period,
                        summary: {
                            ...report.summary,
                            balance: report.summary.totalIncome - report.summary.totalExpense
                        },
                        income: {
                            total: report.income.transactions.reduce((sum, t) => sum + t.amount, 0),
                            count: report.income.transactions.length,
                            byCategory: Object.keys(report.income.byCategory).map(category => ({
                                category,
                                total: report.income.byCategory[category].total,
                                count: report.income.byCategory[category].count,
                                formattedTotal: this.financeBot.formatCurrency(report.income.byCategory[category].total)
                            })),
                            transactions: report.income.transactions.map(t => ({
                                ...t,
                                formattedAmount: this.financeBot.formatCurrency(t.amount),
                                formattedDate: new Date(t.timestamp).toLocaleDateString('id-ID')
                            }))
                        },
                        expense: {
                            total: report.expense.transactions.reduce((sum, t) => sum + t.amount, 0),
                            count: report.expense.transactions.length,
                            byCategory: Object.keys(report.expense.byCategory).map(category => ({
                                category,
                                total: report.expense.byCategory[category].total,
                                count: report.expense.byCategory[category].count,
                                formattedTotal: this.financeBot.formatCurrency(report.expense.byCategory[category].total)
                            })),
                            transactions: report.expense.transactions.map(t => ({
                                ...t,
                                formattedAmount: this.financeBot.formatCurrency(t.amount),
                                formattedDate: new Date(t.timestamp).toLocaleDateString('id-ID')
                            }))
                        },
                        formatted: {
                            totalIncome: this.financeBot.formatCurrency(report.summary.totalIncome),
                            totalExpense: this.financeBot.formatCurrency(report.summary.totalExpense),
                            balance: this.financeBot.formatCurrency(report.summary.totalIncome - report.summary.totalExpense)
                        }
                    }
                });
            } catch (error) {
                console.error('Error getting detailed report:', error);
                res.status(500).json({ error: 'Failed to get detailed report' });
            }
        });

        // Backup and restore endpoints
        this.app.post('/api/backup', async (req, res) => {
            try {
                const backupResult = await this.backupService.createBackup();
                res.json({
                    success: true,
                    message: 'Backup created successfully',
                    filePath: backupResult.filePath,
                    fileName: backupResult.fileName,
                    timestamp: backupResult.timestamp
                });
            } catch (error) {
                console.error('Error creating backup:', error);
                res.status(500).json({ error: 'Failed to create backup' });
            }
        });

        this.app.post('/api/restore', async (req, res) => {
            try {
                const { filePath } = req.body;
                
                if (!filePath) {
                    return res.status(400).json({ error: 'filePath is required' });
                }
                
                const restoreResult = await this.backupService.restoreBackup(filePath);
                res.json({
                    success: true,
                    message: 'Backup restored successfully',
                    restoredTransactions: restoreResult.restoredTransactions
                });
            } catch (error) {
                console.error('Error restoring backup:', error);
                res.status(500).json({ error: 'Failed to restore backup' });
            }
        });

        // Get transactions by date range
        this.app.get('/api/transactions/date-range', async (req, res) => {
            try {
                const { startDate, endDate } = req.query;
                
                if (!startDate || !endDate) {
                    return res.status(400).json({ error: 'startDate and endDate are required' });
                }
                
                const transactions = await this.db.getTransactionsByDateRange(startDate, endDate);
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
                const deleted = await this.db.deleteTransaction(id);
                
                if (!deleted) {
                    return res.status(404).json({ error: 'Transaction not found' });
                }
                
                res.json({ message: 'Transaction deleted successfully' });
            } catch (error) {
                console.error('Error deleting transaction:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
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

            // Start scheduled backup service
            if (this.scheduledBackupService) {
                this.scheduledBackupService.start();
                console.log('✅ Scheduled backup service started');
            }

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