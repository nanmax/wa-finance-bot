const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');

dotenv.config();

class WhatsAppRenderServer {
    constructor() {
        this.setupAPIServer();
        this.setupWhatsAppClient();
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

        // Use persistent storage path
        const authPath = process.env.AUTH_PATH || './.wwebjs_auth';
        
        this.client = new Client({
            authStrategy: new LocalAuth({
                clientId: 'wa-finance-render',
                dataPath: authPath
            }),
            puppeteer: {
                headless: true,
                args: puppeteerArgs,
                // Let Puppeteer find Chrome automatically
                executablePath: undefined,
                defaultViewport: { width: 640, height: 480 },
                ignoreHTTPSErrors: true,
                timeout: 20000
            },
            selfMessage: true
        });
        
        this.setupWhatsAppEventHandlers();
    }

    setupWhatsAppEventHandlers() {
        this.client.on('qr', (qr) => {
            console.log('QR Code:');
            qrcode.generate(qr, { small: true });
        });

        this.client.on('ready', () => {
            console.log('WhatsApp ready');
        });

        this.client.on('authenticated', () => {
            console.log('WhatsApp authenticated');
        });

        this.client.on('message', async (message) => {
            try {
                await this.handleWhatsAppMessage(message);
            } catch (error) {
                console.error('Message error:', error.message);
            }
        });

        this.client.on('auth_failure', (msg) => {
            console.error('Auth failed:', msg);
        });

        this.client.on('disconnected', (reason) => {
            console.log('Disconnected:', reason);
        });

        this.client.on('error', (error) => {
            console.error('Client error:', error.message);
        });
    }

    setupAPIRoutes() {
        this.app.get('/api/health', (req, res) => {
            const used = process.memoryUsage();
            res.json({ 
                status: 'OK', 
                timestamp: new Date().toISOString(),
                whatsapp: this.client.isConnected ? 'connected' : 'disconnected',
                memory: `${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB`,
                session: this.client.authStrategy.isAuthenticated ? 'restored' : 'new'
            });
        });

        this.app.get('/', (req, res) => {
            res.json({
                message: 'WA Finance Bot API',
                version: '1.0.0',
                whatsapp: this.client.isConnected ? 'connected' : 'disconnected',
                session: this.client.authStrategy.isAuthenticated ? 'restored' : 'new',
                memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100} MB`
            });
        });

        this.app.get('/api/status', (req, res) => {
            res.json({
                whatsapp: {
                    connected: this.client.isConnected,
                    authenticated: this.client.authStrategy.isAuthenticated,
                    sessionType: this.client.authStrategy.isAuthenticated ? 'restored' : 'new'
                },
                memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100} MB`,
                uptime: `${Math.round(process.uptime())} seconds`
            });
        });

        this.app.use('*', (req, res) => {
            res.status(404).json({ error: 'Not found' });
        });
    }

    async handleWhatsAppMessage(message) {
        if (message.body.toLowerCase() === 'ping') {
            await message.reply('Pong!');
        }
        
        if (message.from.endsWith('@g.us') && !message.fromMe) {
            await message.reply('Message received');
        }
    }

    async start() {
        try {
            console.log('Starting Render server...');
            
            const port = process.env.PORT || 3000;
            this.app.listen(port, () => {
                console.log(`Server running on port ${port}`);
            });
            
            await this.client.initialize();
            console.log('WhatsApp initialized');
            
        } catch (error) {
            console.error('Start error:', error.message);
            process.exit(1);
        }
    }
}

const server = new WhatsAppRenderServer();
server.start(); 