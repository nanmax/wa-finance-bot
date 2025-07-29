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
                // Ensure allowedGroups array exists
                if (!this.config.allowedGroups) {
                    this.config.allowedGroups = [];
                }
            } else {
                this.config = {
                    allowedGroupId: null,
                    botName: "FinanceBot",
                    autoProcessAllGroups: false, // Changed to false for security
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

    // Check if a group is allowed
    isGroupAllowed(groupId) {
        // If auto-process is enabled, allow all groups
        if (this.config.autoProcessAllGroups) {
            return true;
        }
        
        // Check if group is in allowed groups list
        if (this.config.allowedGroups && this.config.allowedGroups.includes(groupId)) {
            return true;
        }
        
        // Check legacy allowedGroupId
        if (this.config.allowedGroupId && groupId === this.config.allowedGroupId) {
            return true;
        }
        
        return false;
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

    // Get all allowed groups
    getAllowedGroups() {
        return this.config.allowedGroups || [];
    }

    setupWhatsAppClient() {
        this.client = new Client({
            authStrategy: new LocalAuth({
                clientId: 'wa-finance-bot',
                dataPath: './.wwebjs_auth'
            }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox', 
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            },
            // Enable self message detection
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
            console.log('✅ WhatsApp Finance Bot siap!');
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

        // Self message handling (pesan dari diri sendiri)
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
        // Health check
        this.app.get('/api/health', (req, res) => {
            res.json({ 
                status: 'OK', 
                timestamp: new Date().toISOString(),
                whatsapp: this.client.isConnected ? 'connected' : 'disconnected'
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
                    autoProcessAllGroups: this.config.autoProcessAllGroups,
                    message: 'Gunakan Group ID untuk menambahkan ke daftar yang diizinkan'
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
                    autoProcessAllGroups: this.config.autoProcessAllGroups,
                    total: this.getAllowedGroups().length
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
                port: process.env.PORT || 3000
            };
            res.json(config);
        });

        // Get transaction by ID
        this.app.get('/api/transactions/:id', async (req, res) => {
            try {
                const id = parseInt(req.params.id);
                const transaction = await this.database.getTransaction(id);
                
                if (!transaction) {
                    return res.status(404).json({ error: 'Transaction not found' });
                }
                
                res.json(transaction);
            } catch (error) {
                console.error('Error getting transaction:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Get transactions by type
        this.app.get('/api/transactions/type/:type', async (req, res) => {
            try {
                const type = req.params.type;
                const limit = parseInt(req.query.limit) || 50;
                
                if (!['income', 'expense'].includes(type)) {
                    return res.status(400).json({ error: 'Invalid type. Must be income or expense' });
                }
                
                const transactions = await this.database.getTransactionsByType(type, limit);
                res.json(transactions);
            } catch (error) {
                console.error('Error getting transactions by type:', error);
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

        // Get transactions by date range
        this.app.get('/api/transactions/date-range', async (req, res) => {
            try {
                const { startDate, endDate } = req.query;
                
                if (!startDate || !endDate) {
                    return res.status(400).json({ error: 'startDate and endDate are required' });
                }
                
                const transactions = await this.database.getTransactionsByDateRange(startDate, endDate);
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
                const deleted = await this.database.deleteTransaction(id);
                
                if (!deleted) {
                    return res.status(404).json({ error: 'Transaction not found' });
                }
                
                res.json({ message: 'Transaction deleted successfully' });
            } catch (error) {
                console.error('Error deleting transaction:', error);
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
                
                const transaction = await this.database.saveTransaction({
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
                        message: 'No group configured - bot will process all groups',
                        groupId: null,
                        groupName: null,
                        autoProcessAllGroups: this.config.autoProcessAllGroups
                    });
                }
                
                // Get group details
                const chats = await this.client.getChats();
                const group = chats.find(chat => chat.id._serialized === groupId);
                
                res.json({
                    groupId: groupId,
                    groupName: group ? group.name : 'Unknown',
                    isConfigured: true,
                    autoProcessAllGroups: this.config.autoProcessAllGroups
                });
            } catch (error) {
                console.error('Error getting allowed group:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Toggle auto-process all groups
        this.app.post('/api/toggle-auto-process', async (req, res) => {
            try {
                const { enabled } = req.body;
                
                if (typeof enabled !== 'boolean') {
                    return res.status(400).json({ error: 'enabled must be a boolean' });
                }
                
                this.config.autoProcessAllGroups = enabled;
                this.saveConfig();
                
                res.json({ 
                    message: `Auto-process all groups ${enabled ? 'enabled' : 'disabled'}`,
                    autoProcessAllGroups: enabled
                });
            } catch (error) {
                console.error('Error toggling auto-process:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Clear allowed group (process all groups)
        this.app.delete('/api/allowed-group', async (req, res) => {
            try {
                this.config.allowedGroupId = null;
                this.saveConfig();
                
                res.json({ 
                    message: 'Allowed group cleared - bot will process all groups',
                    autoProcessAllGroups: this.config.autoProcessAllGroups
                });
            } catch (error) {
                console.error('Error clearing allowed group:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
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
        
        // Debug message data for contact name
        if (message._data) {
            console.log("📱 Message _data:", {
                notifyName: message._data.notifyName,
                pushName: message._data.pushName,
                verifiedName: message._data.verifiedName
            });
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
        
        // Handle group messages (from other people)
        if (message.from.endsWith('@g.us') && !message.fromMe) {
            console.log(`📨 Pesan dari group: ${message.body}`);
            console.log(`👤 Pengirim: ${message.author || 'Unknown'}`);
            console.log(`🏷️ Group ID: ${message.from}`);
            
            // Check if this group is registered/allowed
            const isGroupAllowed = this.isGroupAllowed(message.from);
            if (!isGroupAllowed) {
                console.log(`⚠️ Group ${message.from} tidak terdaftar, diabaikan`);
                console.log(`💡 Daftar group yang diizinkan: ${JSON.stringify(this.config.allowedGroups || [])}`);
                return;
            }
            
            console.log(`✅ Group ${message.from} terdaftar, memproses pesan...`);
            
            // Get contact name using notifyName (more reliable)
            let contactName = message.author;
            try {
                // Try notifyName first (most reliable)
                if (message._data && message._data.notifyName) {
                    contactName = message._data.notifyName;
                    console.log(`✅ Menggunakan notifyName: ${contactName}`);
                } else {
                    // Fallback to getContact()
                    const contact = await message.getContact();
                    if (contact && contact.pushname) {
                        contactName = contact.pushname;
                        console.log(`✅ Menggunakan pushname: ${contactName}`);
                    } else if (contact && contact.name) {
                        contactName = contact.name;
                        console.log(`✅ Menggunakan contact.name: ${contactName}`);
                    } else {
                        // Format phone number as fallback
                        contactName = message.author.split('@')[0];
                        console.log(`⚠️ Menggunakan formatted phone: ${contactName}`);
                    }
                }
            } catch (error) {
                console.log('⚠️ Tidak bisa mendapatkan nama kontak, menggunakan formatted author');
                contactName = message.author.split('@')[0];
            }
            
            // Process the message with AI
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
                await message.reply(result);
                console.log(`✅ Response terkirim: ${result}`);
            }
        }
        // Handle self messages to registered groups (chat via pribadi)
        else if (message.fromMe && message.from.endsWith('@c.us') && message.author) {
            console.log(`👤 Pesan dari diri sendiri ke group: ${message.body}`);
            console.log(`👤 Pengirim: ${message.author}`);
            console.log(`🏷️ Chat ID: ${message.from}`);
            
            // For self messages, we need to check if the target group is registered
            // Since this is a private chat, we'll process it if it's from the user
            // and assume it's meant for a registered group
            
            // Get contact name for self messages using notifyName
            let contactName = message.author;
            try {
                // Try notifyName first (most reliable)
                if (message._data && message._data.notifyName) {
                    contactName = message._data.notifyName;
                    console.log(`✅ Self message - Menggunakan notifyName: ${contactName}`);
                } else {
                    // Fallback to getContact()
                    const contact = await message.getContact();
                    if (contact && contact.pushname) {
                        contactName = contact.pushname;
                        console.log(`✅ Self message - Menggunakan pushname: ${contactName}`);
                    } else if (contact && contact.name) {
                        contactName = contact.name;
                        console.log(`✅ Self message - Menggunakan contact.name: ${contactName}`);
                    } else {
                        // Format phone number as fallback
                        contactName = message.author.split('@')[0];
                        console.log(`⚠️ Self message - Menggunakan formatted phone: ${contactName}`);
                    }
                }
            } catch (error) {
                console.log('⚠️ Tidak bisa mendapatkan nama kontak untuk self message, menggunakan formatted author');
                contactName = message.author.split('@')[0];
            }
            
            // Process the message with AI
            const result = await this.financeBot.processMessage(message.body, message.author, contactName);
            
            if (result) {
                // Check if this is a send backup file request
                if (result.includes('SEND BACKUP FILE') && result.includes('File sedang dikirim')) {
                    // Extract file path from result
                    const filePathMatch = result.match(/📁 \*Path:\* (.+)/);
                    if (filePathMatch) {
                        const filePath = filePathMatch[1];
                        await this.sendBackupFile(message, filePath);
                    }
                }
                
                // Send response back to the same chat
                await message.reply(result);
                console.log(`✅ Response terkirim ke chat: ${result}`);
            }
        }
        
        // Handle file upload for restore
        if (message.hasMedia && message.type === 'document') {
            return await this.handleFileUpload(message);
        }
        
        // Ignore all other messages (bot API, private chats, etc.)
        else {
            console.log(`🚫 Pesan diabaikan: ${message.body}`);
            console.log(`📱 Jenis: ${message.fromMe ? 'Self' : 'Other'} - ${message.from.endsWith('@g.us') ? 'Group' : 'Private'}`);
        }
    }

    async handleFileUpload(message) {
        try {
            console.log('📁 File upload detected, checking for backup file...');
            
            // Check if file is a zip file
            const fileName = message.body || 'unknown';
            if (!fileName.toLowerCase().endsWith('.zip')) {
                await message.reply('❌ *FILE TIDAK VALID*\n\nFile harus berformat .zip (backup file)\n\n💡 *Tips:*\n• Pastikan file adalah backup yang valid\n• File backup harus berformat .zip');
                return;
            }

            // Download the file
            const media = await message.downloadMedia();
            if (!media) {
                await message.reply('❌ *DOWNLOAD GAGAL*\n\nTidak bisa mengunduh file\n\n💡 *Tips:*\n• Pastikan file tidak rusak\n• Coba kirim ulang file');
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
                await message.reply(`❌ *BACKUP FILE TIDAK VALID*\n\nError: ${validation.error}\n\n💡 *Tips:*\n• Pastikan file adalah backup yang valid\n• File backup harus berformat .zip`);
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

            await message.reply(confirmMessage);

            // Store file path for confirmation
            this.pendingRestoreFile = filePath;
            this.pendingRestoreMetadata = validation;

        } catch (error) {
            console.error('❌ Error handling file upload:', error);
            await message.reply('❌ *ERROR*\n\nTerjadi kesalahan saat memproses file\n\n💡 *Tips:*\n• Pastikan file tidak rusak\n• Coba kirim ulang file');
        }
    }

    async sendBackupFile(message, filePath) {
        try {
            console.log(`📤 Sending backup file: ${filePath}`);
            
            // Check if file exists on disk
            if (!fs.existsSync(filePath)) {
                console.log(`❌ Backup file not found on disk: ${filePath}`);
                await message.reply('❌ *ERROR*\n\nFile backup tidak ditemukan di server\n\n💡 *Tips:*\n• Coba lagi nanti\n• Pastikan file tidak rusak');
                return;
            }
            
            // Get file info
            const fileName = path.basename(filePath);
            const stats = fs.statSync(filePath);
            const fileSize = this.formatFileSize(stats.size);
            const createdDate = new Date(stats.birthtime).toLocaleString('id-ID');
            
            // Send file via WhatsApp
            const { MessageMedia } = require('whatsapp-web.js');
            const media = MessageMedia.fromFilePath(filePath);
            
            await message.reply(media, {
                caption: `📦 *BACKUP FILE*\n\n📦 File: ${fileName}\n📅 Created: ${createdDate}\n📏 Size: ${fileSize}\n\n💡 *Tips:*\n• Simpan file untuk restore nanti\n• File berformat .zip\n• Upload file ini untuk restore`
            });
            
            console.log(`✅ Backup file sent: ${fileName}`);
            
        } catch (error) {
            console.error('❌ Error sending backup file:', error);
            await message.reply('❌ *ERROR*\n\nTerjadi kesalahan saat mengirim file backup\n\n💡 *Tips:*\n• Coba lagi nanti\n• Pastikan file tidak rusak');
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async start() {
        try {
            // Initialize database
            await this.database.init();
            console.log('✅ Database berhasil diinisialisasi');
            
            // Start WhatsApp client
            await this.client.initialize();
            console.log('🚀 WhatsApp Bot sedang memulai...');
            
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