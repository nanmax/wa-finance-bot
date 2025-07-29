const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const dotenv = require('dotenv');
const FinanceBot = require('./bot/FinanceBot');
const Database = require('./database/Database');
const AIService = require('./services/AIService');

// Load environment variables
dotenv.config();

class WhatsAppFinanceBot {
    constructor() {
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
        
        this.database = new Database();
        this.aiService = new AIService();
        this.financeBot = new FinanceBot(this.database, this.aiService);
        
        this.setupEventHandlers();
    }

    setupEventHandlers() {
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
                
                await this.handleMessage(message);
            } catch (error) {
                console.error('Error handling message:', error);
            }
        });

        // Self message handling (pesan dari diri sendiri)
        this.client.on('message_create', async (message) => {
            try {
                
                if (message.fromMe) {
                    console.log("📱 Pesan dari diri sendiri terdeteksi!");
                    await this.handleMessage(message);
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

    async handleMessage(message) {
        console.log("=========== handleMessage ===========", message);
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
            
            // Check if this is the configured group (if specified)
            const configuredGroupId = process.env.WHATSAPP_GROUP_ID;
            if (configuredGroupId && message.from !== configuredGroupId) {
                console.log(`⚠️ Pesan dari group yang tidak dikonfigurasi, diabaikan`);
                return;
            }
            
            // Get contact name if available
            let contactName = message.author;
            try {
                const contact = await message.getContact();
                if (contact && contact.pushname) {
                    contactName = contact.pushname;
                } else if (contact && contact.name) {
                    contactName = contact.name;
                }
            } catch (error) {
                console.log('⚠️ Tidak bisa mendapatkan nama kontak, menggunakan author');
            }
            
            // Process the message with AI
            const result = await this.financeBot.processMessage(message.body, message.author, contactName);
            
            if (result) {
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
            
            // Get contact name for self messages
            let contactName = message.author;
            try {
                const contact = await message.getContact();
                if (contact && contact.pushname) {
                    contactName = contact.pushname;
                } else if (contact && contact.name) {
                    contactName = contact.name;
                }
            } catch (error) {
                console.log('⚠️ Tidak bisa mendapatkan nama kontak untuk self message, menggunakan author');
            }
            
            // Process the message with AI
            const result = await this.financeBot.processMessage(message.body, message.author, contactName);
            
            if (result) {
                // Send response back to the same chat
                await message.reply(result);
                console.log(`✅ Response terkirim ke chat: ${result}`);
            }
        }
        // Ignore all other messages (bot API, private chats, etc.)
        else {
            console.log(`🚫 Pesan diabaikan: ${message.body}`);
            console.log(`📱 Jenis: ${message.fromMe ? 'Self' : 'Other'} - ${message.from.endsWith('@g.us') ? 'Group' : 'Private'}`);
        }
    }

    async start() {
        try {
            // Initialize database
            await this.database.init();
            console.log('✅ Database berhasil diinisialisasi');
            
            // Start WhatsApp client
            await this.client.initialize();
            console.log('🚀 Bot sedang memulai...');
            
        } catch (error) {
            console.error('❌ Error starting bot:', error);
            process.exit(1);
        }
    }
}

// Start the bot
const bot = new WhatsAppFinanceBot();
bot.start(); 