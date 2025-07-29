# Quick Start Guide 🚀

## Langkah Cepat Menjalankan Bot

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
```bash
# Copy file environment
copy env.example .env

# Edit file .env dan tambahkan OpenAI API key
# OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Jalankan Bot
```bash
# Windows
start.bat

# Linux/Mac
./start.sh

# Atau manual
npm run dev
```

### 4. Scan QR Code
- QR code akan muncul di terminal
- Scan dengan WhatsApp di HP
- Bot akan otomatis terhubung

### 5. Akses Dashboard
- Buka browser ke `http://localhost:3000`
- Lihat dashboard monitoring keuangan

## Testing Bot

### Test tanpa WhatsApp
```bash
npm run test-bot
```

### Test pesan keuangan
Kirim pesan ke group WhatsApp:
- "Gaji bulan ini 5000000"
- "Belanja makan 50000"
- "Bayar tagihan listrik 300000"

## Struktur File

```
wa-finance/
├── src/
│   ├── index.js              # Bot WhatsApp
│   ├── server.js             # Bot + API Server
│   ├── bot/FinanceBot.js     # Logic bot
│   ├── services/AIService.js # AI Analysis
│   ├── database/Database.js  # SQLite DB
│   └── server/api.js         # REST API
├── public/
│   ├── index.html           # Dashboard
│   └── js/dashboard.js      # Dashboard JS
├── start.bat                # Windows starter
├── start.sh                 # Linux/Mac starter
├── test-bot.js              # Testing script
└── README.md               # Dokumentasi lengkap
```

## Fitur Utama

✅ **AI Analysis** - OpenAI GPT untuk analisis pesan
✅ **Auto Detection** - Deteksi otomatis pemasukan/pengeluaran  
✅ **Database Storage** - SQLite untuk menyimpan data
✅ **Real-time Dashboard** - Web dashboard monitoring
✅ **WhatsApp Integration** - Terintegrasi WhatsApp Web
✅ **Manual Entry** - Input transaksi manual
✅ **Pattern Matching** - Fallback jika AI tidak tersedia

## Troubleshooting

### Bot tidak merespon
1. Pastikan QR code sudah di-scan
2. Cek koneksi internet
3. Restart bot: `npm run dev`

### Dashboard tidak muncul
1. Akses `http://localhost:3000`
2. Pastikan server berjalan
3. Cek port 3000 tidak digunakan

### OpenAI Error
1. Pastikan API key benar di `.env`
2. Bot akan gunakan pattern matching fallback
3. Test dengan `npm run test-bot`

## Contoh Penggunaan

### Pesan yang akan terdeteksi:
```
✅ "Gaji bulan ini 5000000"
✅ "Bonus akhir tahun 2000000"  
✅ "Belanja makan siang 50000"
✅ "Bayar tagihan listrik 300000"
✅ "Transport ke kantor 25000"
```

### Response Bot:
```
💰 Pemasukan Tercatat!

📊 Detail Transaksi:
• Jumlah: Rp 5.000.000
• Kategori: Gaji
• Deskripsi: Gaji bulan ini
• Tanggal: 15/12/2023 10:30
• Oleh: John Doe

📈 Ringkasan Keuangan:
• Total Pemasukan: Rp 15.000.000
• Total Pengeluaran: Rp 2.500.000
• Saldo: Rp 12.500.000
```

## Support

- 📖 Dokumentasi lengkap: `README.md`
- 🔧 Troubleshooting: `TROUBLESHOOTING.md`
- 🧪 Testing: `npm run test-bot`
- 💬 Issues: Buat issue di repository

---

**Selamat menggunakan WhatsApp Finance Bot! 🎉** 