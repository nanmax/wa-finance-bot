# 🚀 Panduan Deploy WA Finance Bot ke Render.com

## 📋 Persiapan Selesai ✅

✅ `render.yaml` sudah dikonfigurasi dengan `npm run start:finance`
✅ Environment variables template sudah dibuat (`.env.render`)
✅ Perubahan sudah di-commit dan push ke GitHub

## 🌐 Langkah Deploy ke Render

### 1. Akses Render.com
- Buka [render.com](https://render.com)
- **Sign up** atau **Login** dengan GitHub account

### 2. Connect Repository
- Klik **"New +"** → **"Web Service"**
- **Connect** repository: `nanmax/wa-finance-bot`
- **Branch:** `main`

### 3. Konfigurasi Service
Render akan otomatis detect `render.yaml`, tapi verifikasi:

**Basic Settings:**
- **Name:** `wa-finance-bot` 
- **Environment:** `Node`
- **Plan:** `Free` 💰
- **Build Command:** `npm install`
- **Start Command:** `npm run start:finance` ✨

### 4. Environment Variables
Copy dari file `.env.render` ke Render Dashboard:

```
NODE_ENV=production
RENDER=true
RENDER_PLAN=free
AUTH_PATH=/opt/render/project/src/.wwebjs_auth
CLIENT_ID=wa-finance-render
BOT_NAME=FinanceBot
BOT_PREFIX=!
DATABASE_PATH=./data/finance.db
PORT=3000
```

**Optional (untuk AI features):**
```
OPENAI_API_KEY=your_actual_api_key_here
```

### 5. Deploy! 
- Klik **"Create Web Service"**
- Tunggu build process (~3-5 menit)
- ✅ Service akan auto-deploy setiap push ke GitHub

## 📱 Akses Bot Setelah Deploy

### URL Bot Anda:
```
https://wa-finance-bot-xxxx.onrender.com
```

### QR Code Login:
```
https://wa-finance-bot-xxxx.onrender.com/login
```

### Dashboard:
```
https://wa-finance-bot-xxxx.onrender.com
```

### Health Check:
```
https://wa-finance-bot-xxxx.onrender.com/api/health
```

## 🔧 Monitoring & Testing

### 1. Cek Status Deployment
- Monitor di Render Dashboard → Logs
- Tunggu sampai muncul: `✅ WhatsApp Finance Bot siap di Render!`

### 2. Scan QR Code
- Akses `/login` di browser
- Scan dengan WhatsApp di HP
- Bot akan terhubung dan siap digunakan

### 3. Test Bot
Kirim pesan di group WhatsApp:
- `"Beli nasi 15000"`
- `"summary"`
- `"laporan"`

## 🎉 Selesai!

Bot Anda akan running 24/7 di Render free plan dengan:
- ✅ Memory optimization untuk free tier
- ✅ Auto-reconnect WhatsApp
- ✅ Session persistence
- ✅ Web dashboard akses
- ✅ API endpoints
- ✅ Backup system

## 🔄 Update Bot
Setiap kali push ke GitHub main branch, Render akan auto-deploy ulang!

## 🆘 Troubleshooting
Jika ada masalah, cek:
1. **Logs** di Render Dashboard
2. **Health endpoint:** `/api/health`
3. **QR Code:** `/login`
4. **Environment variables** sudah benar