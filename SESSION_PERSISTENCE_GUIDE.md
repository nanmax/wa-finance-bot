# 📱 Session Persistence Guide - WhatsApp Finance Bot

## 🔐 **Session Persistence Overview**

WhatsApp Web.js menggunakan sistem session persistence yang memungkinkan bot untuk tetap terhubung tanpa perlu scan QR code berulang kali setelah restart server.

## 📁 **File Session yang Disimpan**

### **1. Auth Directory**
```
.wwebjs_auth/
└── session-wa-finance-render/
    ├── session.json
    ├── tokens.json
    └── media/
```

### **2. Cache Directory**
```
.wwebjs_cache/
├── 2.3000.1025202580.html
├── 2.3000.1025201781.html
└── ... (cache files)
```

## ⚙️ **Konfigurasi Session**

### **Environment Variables**
```bash
# Path untuk menyimpan session
AUTH_PATH=./.wwebjs_auth

# ID unik untuk client
CLIENT_ID=wa-finance-render
```

### **LocalAuth Configuration**
```javascript
authStrategy: new LocalAuth({
    clientId: 'wa-finance-render',
    dataPath: './.wwebjs_auth',
    backupSyncIntervalMs: 300000, // 5 menit
    disableInlinedChunksInDataURL: true
})
```

## 🔍 **API Endpoints untuk Session**

### **1. Cek Status Session**
```bash
GET /api/session/status
```

**Response:**
```json
{
    "exists": true,
    "lastModified": "2024-01-15T10:30:00.000Z",
    "size": 1024,
    "path": "./.wwebjs_auth/session-wa-finance-render",
    "message": "Session tersimpan dan siap digunakan"
}
```

### **2. Hapus Session**
```bash
DELETE /api/session/clear
```

**Response:**
```json
{
    "success": true,
    "message": "Session berhasil dihapus"
}
```

### **3. Health Check dengan Session Info**
```bash
GET /api/health
```

**Response:**
```json
{
    "status": "OK",
    "whatsapp": "connected",
    "authenticated": true,
    "session": {
        "exists": true,
        "info": {
            "exists": true,
            "lastModified": "2024-01-15T10:30:00.000Z",
            "size": 1024,
            "path": "./.wwebjs_auth/session-wa-finance-render"
        },
        "authPath": "./.wwebjs_auth",
        "clientId": "wa-finance-render"
    }
}
```

## 🚀 **Cara Kerja Session Persistence**

### **1. Pertama Kali Login**
1. **Scan QR Code** - User scan QR code di `/qr`
2. **Autentikasi** - WhatsApp Web.js melakukan autentikasi
3. **Simpan Session** - Data session disimpan di `.wwebjs_auth/`
4. **Siap Digunakan** - Bot siap menerima pesan

### **2. Setelah Restart Server**
1. **Load Session** - WhatsApp Web.js memuat session dari disk
2. **Auto Connect** - Otomatis terhubung tanpa QR code
3. **Siap Digunakan** - Bot langsung siap

### **3. Jika Session Expired**
1. **Deteksi Expired** - WhatsApp Web.js mendeteksi session expired
2. **Generate QR** - Otomatis generate QR code baru
3. **Scan Ulang** - User perlu scan QR code lagi
4. **Simpan Session Baru** - Session baru disimpan

## 🔧 **Troubleshooting Session**

### **1. Session Tidak Tersimpan**
```bash
# Cek apakah folder auth ada
ls -la .wwebjs_auth/

# Cek isi folder session
ls -la .wwebjs_auth/session-wa-finance-render/
```

### **2. Session Expired**
```bash
# Hapus session lama
curl -X DELETE https://your-app.onrender.com/api/session/clear

# Atau hapus manual
rm -rf .wwebjs_auth/session-wa-finance-render/
```

### **3. Multiple Session Conflict**
```bash
# Gunakan client ID yang berbeda
CLIENT_ID=wa-finance-render-v2
```

## 📊 **Monitoring Session**

### **1. Cek Status via API**
```bash
curl https://your-app.onrender.com/api/session/status
```

### **2. Cek Health dengan Session Info**
```bash
curl https://your-app.onrender.com/api/health
```

### **3. Log Session Events**
```javascript
client.on('authenticated', () => {
    console.log('🔐 Session berhasil disimpan');
});

client.on('auth_failure', (msg) => {
    console.log('❌ Session expired atau invalid');
});
```

## 🛡️ **Security Considerations**

### **1. Session File Protection**
- Session file berisi data sensitif
- Jangan commit ke git repository
- Gunakan `.gitignore` untuk exclude

### **2. Environment Variables**
```bash
# .env file
AUTH_PATH=./.wwebjs_auth
CLIENT_ID=wa-finance-render
```

### **3. Backup Session**
```bash
# Backup session untuk restore
cp -r .wwebjs_auth/session-wa-finance-render/ backup/
```

## 🔄 **Auto Reconnect**

### **1. Konfigurasi Reconnect**
```javascript
takeoverOnConflict: true,
takeoverTimeoutMs: 10000
```

### **2. Event Handling**
```javascript
client.on('disconnected', (reason) => {
    console.log('❌ WhatsApp terputus:', reason);
    // Auto reconnect akan dilakukan
});
```

## 📱 **Render Deployment**

### **1. Persistent Storage**
- Render menyediakan persistent storage
- Session akan tersimpan antar deployment
- Tidak perlu scan QR code berulang

### **2. Environment Setup**
```yaml
# render.yaml
envVars:
  - key: AUTH_PATH
    value: ./wwebjs_auth
  - key: CLIENT_ID
    value: wa-finance-render
```

## ✅ **Best Practices**

1. **Gunakan Client ID Unik** - Hindari konflik session
2. **Monitor Session Status** - Cek secara berkala
3. **Backup Session** - Simpan backup untuk restore
4. **Handle Expired Session** - Implementasi auto QR generation
5. **Log Session Events** - Untuk debugging

## 🎯 **Kesimpulan**

Session persistence WhatsApp Web.js sudah dihandle dengan baik:

- ✅ **Auto Save** - Session otomatis tersimpan
- ✅ **Auto Load** - Session otomatis dimuat saat restart
- ✅ **Auto Reconnect** - Otomatis reconnect jika terputus
- ✅ **QR Fallback** - Generate QR jika session expired
- ✅ **API Monitoring** - Endpoint untuk cek status session

Bot akan tetap terhubung setelah restart server tanpa perlu scan QR code lagi! 🎉 