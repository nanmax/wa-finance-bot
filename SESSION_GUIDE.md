# 📱 Panduan Session WhatsApp Web

## 🔍 **Bagaimana Session Disimpan**

WhatsApp Finance Bot menggunakan `LocalAuth` dari `whatsapp-web.js` yang secara otomatis menyimpan session di folder:

```
wa-finance/
├── .wwebjs_auth/          # Folder autentikasi
│   └── session/           # Data session browser
│       ├── Default/       # Profile browser
│       ├── Crashpad/      # Crash reports
│       └── DevToolsActivePort
└── .wwebjs_cache/         # Cache WhatsApp Web
    └── *.html            # File cache
```

## ✅ **Fitur Session Management**

### 🔄 **Otomatis Tersimpan**
- Session disimpan otomatis setelah scan QR code pertama
- Bot akan langsung terhubung tanpa scan ulang saat restart
- Session tetap valid selama tidak logout dari WhatsApp

### 📊 **Status Session**
```bash
npm run session:status
```

### 🗑️ **Hapus Session**
```bash
npm run session:clear
```

### 💾 **Backup Session**
```bash
npm run session:backup
```

## 🚀 **Cara Kerja Session**

### 1. **Pertama Kali**
```
📱 QR Code muncul
↓
📱 Scan dengan WhatsApp
↓
🔐 Autentikasi berhasil
↓
💾 Session tersimpan di .wwebjs_auth/
```

### 2. **Restart Bot**
```
🔄 Bot mulai
↓
🔍 Cek session di .wwebjs_auth/
↓
✅ Session ditemukan
↓
🔗 Langsung terhubung tanpa QR code
```

## 🛠️ **Troubleshooting Session**

### ❌ **Session Expired**
**Gejala:** Bot tidak bisa terhubung, muncul QR code lagi

**Solusi:**
```bash
# Hapus session lama
npm run session:clear

# Jalankan bot dan scan QR code baru
npm run dev
```

### ❌ **Session Corrupt**
**Gejala:** Error saat bot start

**Solusi:**
```bash
# Backup session (jika ada)
npm run session:backup

# Hapus session
npm run session:clear

# Restart bot
npm run dev
```

### ❌ **WhatsApp Logout**
**Gejala:** Bot terputus dan tidak bisa reconnect

**Solusi:**
1. Login ulang di WhatsApp di HP
2. Hapus session bot: `npm run session:clear`
3. Restart bot dan scan QR code baru

## 📋 **Commands Session Management**

| Command | Deskripsi |
|---------|-----------|
| `npm run session:status` | Cek status session |
| `npm run session:clear` | Hapus session |
| `npm run session:backup` | Backup session |
| `npm run dev` | Jalankan bot dengan session |

## 🔧 **Konfigurasi Session**

### **File: src/server.js & src/index.js**
```javascript
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
    }
});
```

## 📱 **Event Handlers Session**

### **Loading Screen**
```javascript
this.client.on('loading_screen', (percent, message) => {
    console.log(`🔄 Loading WhatsApp: ${percent}% - ${message}`);
});
```

### **QR Code**
```javascript
this.client.on('qr', (qr) => {
    console.log('📱 QR Code untuk login WhatsApp:');
    console.log('💡 Scan QR code ini dengan WhatsApp di HP Anda');
    qrcode.generate(qr, { small: true });
});
```

### **Authenticated**
```javascript
this.client.on('authenticated', () => {
    console.log('🔐 WhatsApp berhasil terautentikasi!');
    console.log('💾 Session akan tersimpan untuk penggunaan selanjutnya');
});
```

### **Ready**
```javascript
this.client.on('ready', () => {
    console.log('✅ WhatsApp Finance Bot siap!');
    console.log('🔗 Session tersimpan di: ./.wwebjs_auth/');
    console.log('📊 Bot akan memantau pesan di group WhatsApp...');
});
```

## 🎯 **Best Practices**

### ✅ **Yang Harus Dilakukan:**
1. **Backup session** sebelum update bot
2. **Monitor status session** secara berkala
3. **Restart bot** jika ada masalah koneksi
4. **Gunakan session yang sama** untuk konsistensi

### ❌ **Yang Tidak Boleh:**
1. **Hapus session** tanpa backup
2. **Gunakan session** di multiple device
3. **Share session** dengan orang lain
4. **Logout WhatsApp** di HP saat bot berjalan

## 🔄 **Lifecycle Session**

```
1. Bot Start
   ↓
2. Cek Session (.wwebjs_auth/)
   ↓
3a. Session Ada → Langsung Connect
   ↓
3b. Session Tidak Ada → Tampilkan QR Code
   ↓
4. Scan QR Code
   ↓
5. Autentikasi Berhasil
   ↓
6. Simpan Session
   ↓
7. Bot Ready
```

## 📞 **Support**

Jika mengalami masalah dengan session:

1. **Cek status:** `npm run session:status`
2. **Clear session:** `npm run session:clear`
3. **Restart bot:** `npm run dev`
4. **Scan QR code** jika diperlukan

---

**💡 Tips:** Session WhatsApp Web biasanya valid selama 30-60 hari, tergantung aktivitas di WhatsApp. Jika bot tidak terhubung, coba restart dan scan QR code baru. 