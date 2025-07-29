# Troubleshooting Guide 🔧

## Masalah Umum dan Solusi

### 1. Bot tidak merespon pesan

**Gejala:**
- Bot tidak mendeteksi pesan dari group WhatsApp
- Tidak ada response dari bot

**Solusi:**
1. Pastikan QR code sudah di-scan dengan benar
2. Cek apakah bot sudah terhubung ke WhatsApp Web
3. Pastikan bot ada di group yang sama
4. Restart bot dengan `npm run dev`

### 2. OpenAI API Error

**Gejala:**
- Error "OpenAI API key tidak valid"
- Bot tidak bisa menganalisis pesan

**Solusi:**
1. Pastikan OpenAI API key sudah benar di file `.env`
2. Cek saldo OpenAI API
3. Bot akan menggunakan pattern matching fallback jika AI tidak tersedia

### 3. Database Error

**Gejala:**
- Error "Database tidak dapat diakses"
- Data transaksi hilang

**Solusi:**
1. Hapus file `data/finance.db`
2. Restart bot untuk membuat database baru
3. Pastikan folder `data/` memiliki permission write

### 4. Dashboard tidak muncul

**Gejala:**
- Error 404 saat akses dashboard
- Dashboard kosong

**Solusi:**
1. Pastikan server berjalan di port 3000
2. Cek apakah ada aplikasi lain yang menggunakan port 3000
3. Akses `http://localhost:3000` di browser
4. Restart server dengan `npm run dev`

### 5. QR Code tidak muncul

**Gejala:**
- QR code tidak muncul di terminal
- Error puppeteer

**Solusi:**
1. Install dependencies: `npm install`
2. Pastikan Chrome/Chromium terinstall
3. Coba jalankan dengan headless: false di `src/index.js`
4. Restart bot

### 6. Bot tidak mendeteksi transaksi

**Gejala:**
- Pesan keuangan tidak terdeteksi
- Bot tidak merespon pesan keuangan

**Solusi:**
1. Gunakan format pesan yang jelas:
   - "Gaji bulan ini 5000000"
   - "Belanja makan 50000"
   - "Bayar tagihan listrik 300000"
2. Test dengan `npm run test-bot`
3. Cek log untuk melihat analisis AI

### 7. Performance Issues

**Gejala:**
- Bot lambat merespon
- Memory usage tinggi

**Solusi:**
1. Restart bot secara berkala
2. Monitor memory usage
3. Gunakan `npm start` untuk production
4. Optimize database queries

## Testing Bot

### Manual Testing
```bash
npm run test-bot
```

### Test Pesan Keuangan
```javascript
// Contoh pesan yang akan terdeteksi:
"Gaji bulan ini 5000000"     // ✅ Pemasukan
"Bonus 2000000"              // ✅ Pemasukan  
"Belanja makan 50000"        // ✅ Pengeluaran
"Bayar tagihan 300000"       // ✅ Pengeluaran
"Halo semua!"                // ❌ Bukan transaksi
```

## Log Analysis

### Debug Mode
Tambahkan di `.env`:
```env
DEBUG=true
NODE_ENV=development
```

### Log Levels
- `INFO`: Informasi umum
- `ERROR`: Error yang terjadi
- `DEBUG`: Detail debugging (jika DEBUG=true)

## Performance Monitoring

### Memory Usage
```bash
# Monitor memory
node --inspect src/server.js
```

### Database Size
```bash
# Check database size
ls -la data/finance.db
```

## Backup dan Restore

### Backup Database
```bash
cp data/finance.db backup/finance_$(date +%Y%m%d).db
```

### Restore Database
```bash
cp backup/finance_20231215.db data/finance.db
```

## Environment Variables

### Required Variables
```env
OPENAI_API_KEY=your_openai_api_key_here
DATABASE_PATH=./data/finance.db
PORT=3000
```

### Optional Variables
```env
DEBUG=true
NODE_ENV=development
BOT_NAME=FinanceBot
```

## Common Commands

```bash
# Start bot
npm run dev

# Start bot only (no API)
npm start

# Start API only
npm run api

# Test bot
npm run test-bot

# Install dependencies
npm install

# Clear database
rm data/finance.db
```

## Support

Jika masalah masih berlanjut:

1. Cek log error di terminal
2. Restart bot dan server
3. Clear database dan mulai ulang
4. Buat issue di repository dengan detail error

## Tips

1. **Gunakan format pesan yang jelas** untuk hasil terbaik
2. **Monitor log** untuk debugging
3. **Backup database** secara berkala
4. **Test bot** sebelum deploy ke production
5. **Gunakan OpenAI API** untuk analisis yang lebih akurat 