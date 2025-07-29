# WA Finance Bot

WhatsApp AI Bot untuk pencatatan keuangan dengan fitur backup otomatis dan laporan keuangan.

## 🚀 Fitur Utama

- **Pencatatan Keuangan Otomatis**: Mencatat pemasukan dan pengeluaran melalui WhatsApp
- **AI-Powered**: Menggunakan AI untuk memahami dan mengkategorikan transaksi
- **Backup Otomatis**: Backup data secara otomatis dengan jadwal yang dapat dikustomisasi
- **Laporan Keuangan**: Generate laporan keuangan dalam berbagai format
- **Dashboard Web**: Interface web untuk monitoring dan manajemen data
- **API REST**: API untuk integrasi dengan aplikasi lain

## 📋 Prerequisites

- Node.js 16+ 
- npm atau yarn
- WhatsApp Web (untuk QR code login)

## 🛠️ Installation

1. **Clone repository**
```bash
git clone https://github.com/nanmax/wa-finance-bot.git
cd wa-finance-bot
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment variables**
```bash
cp env.example .env
```

Edit file `.env` dan sesuaikan konfigurasi:
```env
# WhatsApp Configuration
WHATSAPP_GROUP_ID=your_group_id_here
BOT_NAME=FinanceBot

# AI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Database Configuration
DB_PATH=./data/finance.db

# Server Configuration
PORT=3000
NODE_ENV=development
```

4. **Start the application**
```bash
npm start
```

## 🌐 Deployment ke Vercel

### Langkah 1: Install Vercel CLI
```bash
npm i -g vercel
```

### Langkah 2: Login ke Vercel
```bash
vercel login
```

### Langkah 3: Deploy
```bash
vercel
```

### Langkah 4: Setup Environment Variables di Vercel
Setelah deploy, setup environment variables di dashboard Vercel:

1. Buka [Vercel Dashboard](https://vercel.com/dashboard)
2. Pilih project `wa-finance-bot`
3. Buka tab "Settings" > "Environment Variables"
4. Tambahkan variables berikut:
   - `OPENAI_API_KEY`: API key dari OpenAI
   - `WHATSAPP_GROUP_ID`: ID group WhatsApp
   - `BOT_NAME`: Nama bot (opsional)
   - `DB_PATH`: Path database (opsional)

### Langkah 5: Redeploy
```bash
vercel --prod
```

## 📱 Cara Penggunaan

### 1. Login WhatsApp
- Jalankan aplikasi
- Scan QR code yang muncul di terminal
- Bot akan terhubung ke WhatsApp Web

### 2. Setup Group
- Tambahkan bot ke group WhatsApp
- Kirim pesan "setup" untuk mengkonfigurasi group
- Atau gunakan API: `POST /api/allowed-groups`

### 3. Mencatat Transaksi
Kirim pesan ke group dengan format:
```
+50000 makan siang
-25000 bensin
```

### 4. Laporan Keuangan
Kirim pesan untuk mendapatkan laporan:
```
laporan hari ini
laporan bulan ini
summary
```

## 🔧 API Endpoints

### Health Check
```
GET /api/health
```

### Transactions
```
GET /api/transactions
GET /api/transactions/:id
POST /api/transactions
DELETE /api/transactions/:id
```

### Reports
```
GET /api/summary
GET /api/report?startDate=2024-01-01&endDate=2024-01-31
```

### Groups Management
```
GET /api/groups
GET /api/allowed-groups
POST /api/allowed-groups
DELETE /api/allowed-groups/:groupId
```

## 📊 Dashboard

Akses dashboard web di:
```
http://localhost:3000 (development)
https://your-app.vercel.app (production)
```

## 🔒 Security

- WhatsApp session disimpan secara lokal
- Database SQLite dengan enkripsi
- API rate limiting
- Environment variables untuk konfigurasi sensitif

## 🤝 Contributing

1. Fork repository
2. Buat feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📞 Support

Jika ada pertanyaan atau masalah, silakan buat issue di GitHub repository ini.

## 🔄 Updates

Untuk update aplikasi:
```bash
git pull origin main
npm install
npm start
``` 