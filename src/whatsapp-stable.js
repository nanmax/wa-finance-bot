const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');

dotenv.config();

class WhatsAppStableServer {
    constructor() {
        this.setupAPIServer();
        this.setupWhatsAppClient();
        this.connectionStatus = 'disconnected';
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    setupAPIServer() {
        this.app = express();
        this.app.use(cors());
        this.app.use(express.json());
        
        this.setupAPIRoutes();
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
                clientId: 'wa-finance-stable',
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

    setupWhatsAppEventHandlers() {
        this.client.on('qr', (qr) => {
            console.log('QR Code:');
            qrcode.generate(qr, { small: true });
            this.connectionStatus = 'qr_ready';
        });

        this.client.on('ready', () => {
            console.log('WhatsApp ready and connected');
            this.connectionStatus = 'connected';
            this.reconnectAttempts = 0;
        });

        this.client.on('authenticated', () => {
            console.log('WhatsApp authenticated');
            this.connectionStatus = 'authenticated';
        });

        this.client.on('auth_failure', (msg) => {
            console.error('Auth failed:', msg);
            this.connectionStatus = 'auth_failed';
        });

        this.client.on('disconnected', (reason) => {
            console.log('WhatsApp disconnected:', reason);
            this.connectionStatus = 'disconnected';
            this.attemptReconnect();
        });

        this.client.on('message', async (message) => {
            try {
                console.log('Message received:', message.body);
                await this.handleWhatsAppMessage(message);
            } catch (error) {
                console.error('Message error:', error.message);
            }
        });

        this.client.on('message_create', async (message) => {
            try {
                if (message.fromMe) {
                    console.log('Self message:', message.body);
                    await this.handleWhatsAppMessage(message);
                }
            } catch (error) {
                console.error('Self message error:', error.message);
            }
        });

        this.client.on('error', (error) => {
            console.error('Client error:', error.message);
            this.connectionStatus = 'error';
        });

        // Connection state monitoring
        this.client.on('loading_screen', (percent, message) => {
            console.log(`Loading: ${percent}% - ${message}`);
        });

        this.client.on('media_uploaded', (message) => {
            console.log('Media uploaded:', message.id._serialized);
        });

        this.client.on('media_message', (message) => {
            console.log('Media message received');
        });
    }

    async attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
            
            setTimeout(async () => {
                try {
                    await this.client.initialize();
                } catch (error) {
                    console.error('Reconnect failed:', error.message);
                    this.attemptReconnect();
                }
            }, 5000);
        } else {
            console.error('Max reconnect attempts reached');
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

        this.app.get('/api/status', (req, res) => {
            res.json({
                whatsapp: {
                    status: this.connectionStatus,
                    connected: this.client.isConnected,
                    authenticated: this.client.authStrategy.isAuthenticated,
                    reconnectAttempts: this.reconnectAttempts
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

        this.app.use('*', (req, res) => {
            res.status(404).json({ error: 'Not found' });
        });
    }

    async handleWhatsAppMessage(message) {
        console.log(`Processing message: ${message.body}`);
        
        // Test ping
        if (message.body.toLowerCase() === 'ping') {
            await message.reply('Pong! Bot is working! 🚀');
            console.log('Replied to ping');
        }
        
        // Handle group messages
        if (message.from.endsWith('@g.us') && !message.fromMe) {
            console.log(`Group message from ${message.from}: ${message.body}`);
            await message.reply('Message received in group! 📝');
        }
        
        // Handle private messages
        if (!message.from.endsWith('@g.us') && !message.fromMe) {
            console.log(`Private message from ${message.from}: ${message.body}`);
            await message.reply('Private message received! 💬');
        }
    }

    async start() {
        try {
            console.log('Starting stable WhatsApp server...');
            
            const port = process.env.PORT || 3000;
            this.app.listen(port, () => {
                console.log(`Server running on port ${port}`);
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

const server = new WhatsAppStableServer();
server.start(); 