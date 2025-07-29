# Deployment Guide - WA Finance Bot

## 🏗️ Architecture Overview

### Hybrid Deployment Strategy
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vercel API    │    │  Local Server   │    │  WhatsApp Bot   │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│   (Bot Logic)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Deployment Options

### Option 1: Local Server + Vercel API
**Local Server (WhatsApp Bot):**
- Menjalankan WhatsApp Web.js
- Menyimpan auth session
- Database SQLite
- Backup system

**Vercel API (Frontend):**
- Dashboard web
- API endpoints
- Static files

### Option 2: Cloud Server
**Platform yang mendukung browser:**
- **Railway** - Mendukung browser automation
- **Render** - Dengan custom buildpacks
- **DigitalOcean** - Droplet dengan browser
- **AWS EC2** - Instance dengan GUI
- **Google Cloud** - Compute Engine

### Option 3: Docker + Cloud
**Docker container dengan browser:**
```dockerfile
FROM node:18

# Install Chrome dependencies
RUN apt-get update && apt-get install -y \
    chromium-browser \
    && rm -rf /var/lib/apt/lists/*

# Set Chrome path
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 📋 Setup Hybrid Deployment

### Step 1: Local WhatsApp Server
```bash
# Clone repository
git clone https://github.com/nanmax/wa-finance-bot.git
cd wa-finance-bot

# Install dependencies
npm install

# Setup environment
cp env.example .env
# Edit .env dengan konfigurasi

# Start WhatsApp server
npm start
```

### Step 2: Vercel API (Frontend)
```bash
# Deploy API ke Vercel
vercel --prod
```

### Step 3: Connect Local to Vercel
```javascript
// src/server.js - Add CORS for Vercel
app.use(cors({
  origin: ['https://your-vercel-app.vercel.app'],
  credentials: true
}));
```

## 🌐 Environment Variables

### Local Server (.env)
```env
# WhatsApp Configuration
WHATSAPP_GROUP_ID=your_group_id
BOT_NAME=FinanceBot

# AI Configuration
OPENAI_API_KEY=your_openai_key

# Database
DB_PATH=./data/finance.db

# Server
PORT=3000
NODE_ENV=development

# CORS for Vercel
VERCEL_URL=https://your-vercel-app.vercel.app
```

### Vercel Environment Variables
```env
# API Configuration
LOCAL_API_URL=http://localhost:3000
NODE_ENV=production
```

## 🔄 Data Flow

### WhatsApp → Local Server
1. User kirim pesan ke WhatsApp
2. Local server terima pesan
3. Process dengan AI
4. Simpan ke database
5. Kirim response ke WhatsApp

### Vercel API → Local Server
1. User akses dashboard Vercel
2. Vercel API request ke local server
3. Local server ambil data dari database
4. Return data ke Vercel
5. Vercel tampilkan di dashboard

## 📊 Monitoring

### Health Check
```bash
# Check local server
curl http://localhost:3000/api/health

# Check Vercel API
curl https://your-vercel-app.vercel.app/api/health
```

### Logs
```bash
# Local server logs
npm run dev

# Vercel logs
vercel logs
```

## 🔒 Security Considerations

### CORS Configuration
```javascript
// Allow only Vercel domain
app.use(cors({
  origin: process.env.VERCEL_URL,
  credentials: true
}));
```

### API Authentication
```javascript
// Add API key validation
app.use('/api', (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

## 🚀 Recommended Setup

### For Production:
1. **Local Server**: Raspberry Pi atau VPS kecil
2. **Vercel API**: Dashboard dan static files
3. **Database**: SQLite (local) atau PostgreSQL (cloud)
4. **Backup**: Automated backup ke cloud storage

### For Development:
1. **Local Server**: Development machine
2. **Vercel API**: Staging environment
3. **Database**: SQLite (local)
4. **Backup**: Manual backup

## 📞 Support

Jika ada pertanyaan tentang deployment, silakan buat issue di GitHub repository. 