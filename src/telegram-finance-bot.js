require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const path = require('path');
const fs = require('fs');

// Import existing services
const Database = require('./database/Database');
const FinanceBot = require('./bot/FinanceBot');
const AIService = require('./services/AIService');
const BackupService = require('./services/BackupService');
const ScheduledBackupService = require('./services/ScheduledBackupService');

class TelegramFinanceBot {
    constructor() {
        this.bot = null;
        this.db = null;
        this.financeBot = null;
        this.aiService = null;
        this.backupService = null;
        this.scheduledBackupService = null;
        this.app = express();
        this.allowedChatIds = [];
        this.config = {};
    }

    async init() {
        console.log('🚀 Initializing Telegram Finance Bot...');

        // Check for required env variables
        if (!process.env.TELEGRAM_BOT_TOKEN) {
            console.error('❌ TELEGRAM_BOT_TOKEN is required!');
            console.log('💡 Get your token from @BotFather on Telegram');
            process.exit(1);
        }

        // Initialize database
        await this.initDatabase();

        // Initialize services
        this.setupServices();

        // Initialize Telegram bot
        this.setupTelegramBot();

        // Setup Express server for health checks
        this.setupExpressServer();

        console.log('✅ Telegram Finance Bot initialized successfully!');
    }

    async initDatabase() {
        console.log('📦 Initializing database...');
        this.db = new Database();
        await this.db.init();
        this.config = await this.db.loadConfig();
        this.allowedChatIds = this.getAllowedChatIds();
        console.log('✅ Database initialized');
    }

    setupServices() {
        console.log('🔧 Setting up services...');

        // AI Service
        this.aiService = new AIService();

        // Backup Service
        this.backupService = new BackupService(this.db);

        // Scheduled Backup Service (will be set up after bot is ready)
        this.scheduledBackupService = new ScheduledBackupService(this.backupService, null);

        // Finance Bot (reuse existing logic)
        this.financeBot = new FinanceBot(this.db, this.aiService, this.backupService, this.scheduledBackupService);

        console.log('✅ Services initialized');
    }

    setupTelegramBot() {
        console.log('🤖 Setting up Telegram bot...');

        const token = process.env.TELEGRAM_BOT_TOKEN;

        // Create bot instance
        this.bot = new TelegramBot(token, { polling: true });

        // Handle messages
        this.bot.on('message', async (msg) => {
            await this.handleMessage(msg);
        });

        // Handle callback queries (for inline keyboards if needed)
        this.bot.on('callback_query', async (query) => {
            await this.handleCallbackQuery(query);
        });

        // Handle errors
        this.bot.on('polling_error', (error) => {
            console.error('❌ Telegram polling error:', error.message);
        });

        // Update scheduled backup service with bot
        this.scheduledBackupService.setClient({
            sendMessage: async (chatId, text) => {
                await this.bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
            }
        });

        console.log('✅ Telegram bot ready');
    }

    getAllowedChatIds() {
        const chatIds = [];

        // From config
        if (this.config.allowedChatIds) {
            chatIds.push(...this.config.allowedChatIds);
        }

        // From env
        if (process.env.TELEGRAM_CHAT_ID) {
            const envIds = process.env.TELEGRAM_CHAT_ID.split(',').map(id => id.trim());
            envIds.forEach(id => {
                if (!chatIds.includes(id)) {
                    chatIds.push(id);
                }
            });
        }

        return chatIds;
    }

    isChatAllowed(chatId) {
        // If no restrictions, allow all
        if (this.allowedChatIds.length === 0) {
            return true;
        }
        return this.allowedChatIds.includes(String(chatId));
    }

    async handleMessage(msg) {
        const chatId = msg.chat.id;
        const text = msg.text || '';
        const userName = msg.from.first_name || msg.from.username || 'Unknown';

        console.log(`📨 Message from ${userName} (${chatId}): ${text}`);

        // Skip empty messages
        if (!text.trim()) {
            return;
        }

        // Handle /start command
        if (text === '/start') {
            await this.sendWelcomeMessage(chatId);
            return;
        }

        // Handle /help command
        if (text === '/help') {
            const helpText = this.financeBot.generateHelpMessage();
            await this.sendMessage(chatId, helpText);
            return;
        }

        // Handle /chatid command (useful for setup)
        if (text === '/chatid') {
            await this.sendMessage(chatId, `🆔 *Chat ID:* \`${chatId}\`\n\nGunakan ID ini untuk konfigurasi bot.`);
            return;
        }

        // Check if chat is allowed (for group restrictions)
        if (!this.isChatAllowed(chatId)) {
            console.log(`🚫 Chat ${chatId} not allowed`);
            return;
        }

        // Handle admin commands (add/remove chat)
        if (text.toLowerCase().startsWith('add chat ')) {
            await this.handleAddChat(chatId, text);
            return;
        }

        if (text.toLowerCase().startsWith('remove chat ')) {
            await this.handleRemoveChat(chatId, text);
            return;
        }

        if (text.toLowerCase() === 'list chats') {
            await this.handleListChats(chatId);
            return;
        }

        // Process message through FinanceBot
        try {
            const result = await this.financeBot.processMessage(text, String(chatId), userName);

            if (result) {
                // Check for backup file requests
                if (result.includes('File sedang dikirim') && result.includes('Path:')) {
                    const filePathMatch = result.match(/\*Path:\* (.+)/);
                    if (filePathMatch) {
                        const filePath = filePathMatch[1].trim();
                        await this.sendBackupFile(chatId, filePath);
                    }
                }

                await this.sendMessage(chatId, result);
            }
        } catch (error) {
            console.error('❌ Error processing message:', error);
            await this.sendMessage(chatId, '❌ Maaf, terjadi kesalahan dalam memproses pesan Anda.');
        }
    }

    async handleCallbackQuery(query) {
        const chatId = query.message.chat.id;
        const data = query.data;

        console.log(`📲 Callback query: ${data}`);

        // Answer callback to remove loading state
        await this.bot.answerCallbackQuery(query.id);

        // Handle different callback data
        // Add your callback handlers here if needed
    }

    async sendWelcomeMessage(chatId) {
        let message = `🤖 *FINANCE BOT - TELEGRAM*\n\n`;
        message += `Selamat datang! Bot ini membantu mencatat keuangan Anda.\n\n`;
        message += `📝 *Cara Menggunakan:*\n`;
        message += `• Ketik transaksi langsung, contoh:\n`;
        message += `  - "jajan 50000"\n`;
        message += `  - "gaji 5000000"\n`;
        message += `  - "belanja 200000"\n\n`;
        message += `📊 *Perintah Laporan:*\n`;
        message += `• /help - Menu bantuan lengkap\n`;
        message += `• summary - Ringkasan keuangan\n`;
        message += `• detail - Laporan detail\n`;
        message += `• bulan ini - Laporan bulanan\n`;
        message += `• hari ini - Laporan harian\n\n`;
        message += `🆔 *Chat ID Anda:* \`${chatId}\`\n\n`;
        message += `💡 Ketik /help untuk menu lengkap`;

        await this.sendMessage(chatId, message);
    }

    async sendMessage(chatId, text) {
        try {
            await this.bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
            console.log(`✅ Message sent to ${chatId}`);
        } catch (error) {
            console.error(`❌ Failed to send message to ${chatId}:`, error.message);

            // Try without markdown if it fails
            try {
                await this.bot.sendMessage(chatId, text.replace(/[*_`\[\]]/g, ''));
            } catch (retryError) {
                console.error('❌ Retry also failed:', retryError.message);
            }
        }
    }

    async sendBackupFile(chatId, filePath) {
        try {
            if (!fs.existsSync(filePath)) {
                await this.sendMessage(chatId, '❌ File backup tidak ditemukan.');
                return;
            }

            const fileName = path.basename(filePath);
            const stats = fs.statSync(filePath);
            const fileSize = this.formatFileSize(stats.size);

            await this.bot.sendDocument(chatId, filePath, {
                caption: `📦 *BACKUP FILE*\n\n📁 File: ${fileName}\n📏 Size: ${fileSize}\n\n💡 Simpan file ini untuk restore nanti.`,
                parse_mode: 'Markdown'
            });

            console.log(`✅ Backup file sent: ${fileName}`);
        } catch (error) {
            console.error('❌ Failed to send backup file:', error.message);
            await this.sendMessage(chatId, '❌ Gagal mengirim file backup.');
        }
    }

    async handleAddChat(chatId, text) {
        const parts = text.split(' ');
        const newChatId = parts[2];

        if (!newChatId) {
            await this.sendMessage(chatId, '❌ Format: add chat [chat_id]');
            return;
        }

        if (!this.config.allowedChatIds) {
            this.config.allowedChatIds = [];
        }

        if (this.config.allowedChatIds.includes(newChatId)) {
            await this.sendMessage(chatId, `⚠️ Chat ${newChatId} sudah terdaftar.`);
            return;
        }

        this.config.allowedChatIds.push(newChatId);
        await this.db.saveConfig(this.config);
        this.allowedChatIds = this.getAllowedChatIds();

        await this.sendMessage(chatId, `✅ Chat ${newChatId} berhasil ditambahkan.`);
    }

    async handleRemoveChat(chatId, text) {
        const parts = text.split(' ');
        const removeChatId = parts[2];

        if (!removeChatId) {
            await this.sendMessage(chatId, '❌ Format: remove chat [chat_id]');
            return;
        }

        if (!this.config.allowedChatIds || !this.config.allowedChatIds.includes(removeChatId)) {
            await this.sendMessage(chatId, `⚠️ Chat ${removeChatId} tidak ditemukan.`);
            return;
        }

        this.config.allowedChatIds = this.config.allowedChatIds.filter(id => id !== removeChatId);
        await this.db.saveConfig(this.config);
        this.allowedChatIds = this.getAllowedChatIds();

        await this.sendMessage(chatId, `✅ Chat ${removeChatId} berhasil dihapus.`);
    }

    async handleListChats(chatId) {
        const chats = this.getAllowedChatIds();

        if (chats.length === 0) {
            await this.sendMessage(chatId, '📋 Belum ada chat yang didaftarkan.\n\n💡 Bot akan menerima pesan dari semua chat.');
            return;
        }

        let message = `📋 *DAFTAR CHAT YANG DIIZINKAN*\n\n`;
        chats.forEach((id, index) => {
            message += `${index + 1}. \`${id}\`\n`;
        });
        message += `\n💡 Total: ${chats.length} chat`;

        await this.sendMessage(chatId, message);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    setupExpressServer() {
        const PORT = process.env.PORT || 3000;

        this.app.use(express.json());

        // Health check endpoint
        this.app.get('/', (req, res) => {
            res.json({
                status: 'ok',
                bot: 'Telegram Finance Bot',
                timestamp: new Date().toISOString()
            });
        });

        this.app.get('/health', (req, res) => {
            res.json({ status: 'healthy' });
        });

        // API to get summary
        this.app.get('/api/summary', async (req, res) => {
            try {
                const summary = await this.financeBot.getSummary();
                res.json(summary);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.listen(PORT, () => {
            console.log(`🌐 Express server running on port ${PORT}`);
        });
    }
}

// Start the bot
const bot = new TelegramFinanceBot();
bot.init().catch(error => {
    console.error('❌ Failed to initialize bot:', error);
    process.exit(1);
});
