# 📅 Period Reports - Fitur Laporan Periode Waktu

## 🎯 **Fitur Laporan Periode Waktu**

Bot WhatsApp sekarang mendukung laporan keuangan untuk berbagai periode waktu, sama persis seperti fitur "bulan ini" yang sudah ada.

## 📋 **Daftar Periode yang Tersedia**

### **📊 Laporan Bulanan**
```bash
Command: "bulan ini" atau "laporan bulan" atau "monthly"
Response: Laporan keuangan bulan berjalan
```

### **📊 Laporan Bulan Kemarin**
```bash
Command: "bulan kemarin" atau "bulan lalu" atau "last month"
Response: Laporan keuangan bulan kemarin
```

### **📊 Laporan 2 Bulan yang Lalu**
```bash
Command: "2 bulan" atau "dua bulan" atau "2 months"
Response: Laporan keuangan 2 bulan yang lalu
```

### **📊 Laporan 3 Bulan yang Lalu**
```bash
Command: "3 bulan" atau "tiga bulan" atau "3 months"
Response: Laporan keuangan 3 bulan yang lalu
```

### **📊 Laporan 6 Bulan yang Lalu**
```bash
Command: "6 bulan" atau "enam bulan" atau "6 months"
Response: Laporan keuangan 6 bulan yang lalu
```

### **📊 Laporan 1 Tahun yang Lalu**
```bash
Command: "1 tahun" atau "satu tahun" atau "1 year"
Response: Laporan keuangan 1 tahun yang lalu
```

## 🧪 **Testing Examples**

### **Test Laporan Bulan Kemarin:**
```
User: bulan kemarin
Bot: 📅 LAPORAN BULAN JUNI 2024

📊 RINGKASAN:
💰 Total Pemasukan: Rp 5.000.000
💸 Total Pengeluaran: Rp 3.000.000
💳 Saldo: Rp 2.000.000
📝 Total Transaksi: 25

🏆 TOP 3 PENGELUARAN:
1. Food & Beverage: Rp 1.500.000
2. Transport: Rp 800.000
3. Shopping: Rp 700.000

📅 Periode: 2024-06-01 s/d 2024-06-30
💡 Tips: Ketik "bulan ini" untuk laporan bulanan
```

### **Test Laporan 2 Bulan yang Lalu:**
```
User: 2 bulan
Bot: 📅 LAPORAN 2 BULAN YANG LALU
📅 BULAN MEI 2024

📊 RINGKASAN:
💰 Total Pemasukan: Rp 4.500.000
💸 Total Pengeluaran: Rp 2.800.000
💳 Saldo: Rp 1.700.000
📝 Total Transaksi: 22

🏆 TOP 3 PENGELUARAN:
1. Food & Beverage: Rp 1.200.000
2. Transport: Rp 700.000
3. Shopping: Rp 600.000

📅 Periode: 2024-05-01 s/d 2024-05-31
💡 Tips: Ketik "bulan ini" untuk laporan bulanan
```

### **Test Laporan 3 Bulan yang Lalu:**
```
User: 3 bulan
Bot: 📅 LAPORAN 3 BULAN YANG LALU
📅 BULAN APRIL 2024

📊 RINGKASAN:
💰 Total Pemasukan: Rp 4.000.000
💸 Total Pengeluaran: Rp 2.500.000
💳 Saldo: Rp 1.500.000
📝 Total Transaksi: 20

🏆 TOP 3 PENGELUARAN:
1. Food & Beverage: Rp 1.000.000
2. Transport: Rp 600.000
3. Shopping: Rp 500.000

📅 Periode: 2024-04-01 s/d 2024-04-30
💡 Tips: Ketik "bulan ini" untuk laporan bulanan
```

### **Test Laporan 6 Bulan yang Lalu:**
```
User: 6 bulan
Bot: 📅 LAPORAN 6 BULAN YANG LALU
📅 BULAN JANUARI 2024

📊 RINGKASAN:
💰 Total Pemasukan: Rp 3.500.000
💸 Total Pengeluaran: Rp 2.200.000
💳 Saldo: Rp 1.300.000
📝 Total Transaksi: 18

🏆 TOP 3 PENGELUARAN:
1. Food & Beverage: Rp 800.000
2. Transport: Rp 500.000
3. Shopping: Rp 400.000

📅 Periode: 2024-01-01 s/d 2024-01-31
💡 Tips: Ketik "bulan ini" untuk laporan bulanan
```

### **Test Laporan 1 Tahun yang Lalu:**
```
User: 1 tahun
Bot: 📅 LAPORAN 1 TAHUN YANG LALU
📅 BULAN JULI 2023

📊 RINGKASAN:
💰 Total Pemasukan: Rp 3.000.000
💸 Total Pengeluaran: Rp 1.800.000
💳 Saldo: Rp 1.200.000
📝 Total Transaksi: 15

🏆 TOP 3 PENGELUARAN:
1. Food & Beverage: Rp 600.000
2. Transport: Rp 400.000
3. Shopping: Rp 300.000

📅 Periode: 2023-07-01 s/d 2023-07-31
💡 Tips: Ketik "bulan ini" untuk laporan bulanan
```

## 📊 **Response Format**

### **Format Laporan dengan Data:**
```
📅 LAPORAN [PERIODE]
📅 BULAN [NAMA_BULAN] [TAHUN]

📊 RINGKASAN:
💰 Total Pemasukan: Rp [formatted amount]
💸 Total Pengeluaran: Rp [formatted amount]
💳 Saldo: Rp [formatted amount]
📝 Total Transaksi: [count]

🏆 TOP 3 PENGELUARAN:
1. [category]: Rp [formatted amount]
2. [category]: Rp [formatted amount]
3. [category]: Rp [formatted amount]

📅 Periode: [startDate] s/d [endDate]
💡 Tips: Ketik "bulan ini" untuk laporan bulanan
```

### **Format Laporan Kosong:**
```
📅 LAPORAN [PERIODE]
📅 BULAN [NAMA_BULAN] [TAHUN]

📊 RINGKASAN:
💰 Total Pemasukan: Rp 0
💸 Total Pengeluaran: Rp 0
💳 Saldo: Rp 0
📝 Total Transaksi: 0

📝 STATUS: Belum ada transaksi [periode]

💡 TIPS:
• Ketik transaksi keuangan untuk menambah data
• Contoh: "jajan 50000" atau "gaji 5000000"
• Ketik "bulan ini" untuk laporan bulanan

📅 Periode: [startDate] s/d [endDate]
💡 Tips: Ketik "bulan ini" untuk laporan bulanan
```

## 🎯 **Use Cases**

### **1. Analisis Tren Bulanan**
```
User: bulan kemarin
Bot: [Laporan bulan kemarin untuk analisis tren]
```

### **2. Perbandingan dengan Periode Sebelumnya**
```
User: 2 bulan
Bot: [Laporan 2 bulan yang lalu untuk perbandingan]
```

### **3. Analisis Jangka Panjang**
```
User: 6 bulan
Bot: [Laporan 6 bulan yang lalu untuk analisis jangka panjang]
```

### **4. Analisis Tahunan**
```
User: 1 tahun
Bot: [Laporan 1 tahun yang lalu untuk analisis tahunan]
```

## 🔧 **Technical Implementation**

### **Command Detection:**
```javascript
// Last month report commands
if (lowerMessage.includes('bulan kemarin') || lowerMessage.includes('bulan lalu') || lowerMessage.includes('last month')) {
    return await this.generateLastMonthReport();
}

// 2 months ago report commands
if (lowerMessage.includes('2 bulan') || lowerMessage.includes('dua bulan') || lowerMessage.includes('2 months')) {
    return await this.generateTwoMonthsAgoReport();
}

// 3 months ago report commands
if (lowerMessage.includes('3 bulan') || lowerMessage.includes('tiga bulan') || lowerMessage.includes('3 months')) {
    return await this.generateThreeMonthsAgoReport();
}

// 6 months ago report commands
if (lowerMessage.includes('6 bulan') || lowerMessage.includes('enam bulan') || lowerMessage.includes('6 months')) {
    return await this.generateSixMonthsAgoReport();
}

// 1 year ago report commands
if (lowerMessage.includes('1 tahun') || lowerMessage.includes('satu tahun') || lowerMessage.includes('1 year')) {
    return await this.generateOneYearAgoReport();
}
```

### **Date Calculation:**
```javascript
// Last month
const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

// 2 months ago
const startOfTwoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
const endOfTwoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 1, 0);

// 3 months ago
const startOfThreeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
const endOfThreeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 0);

// 6 months ago
const startOfSixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
const endOfSixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 0);

// 1 year ago
const startOfOneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);
const endOfOneYearAgo = new Date(now.getFullYear() - 1, now.getMonth() + 1, 0);
```

## 💡 **Tips Penggunaan**

### **Untuk User:**
1. **"bulan kemarin"** - Laporan bulan kemarin untuk perbandingan
2. **"2 bulan"** - Laporan 2 bulan yang lalu untuk analisis tren
3. **"3 bulan"** - Laporan 3 bulan yang lalu untuk analisis kuartalan
4. **"6 bulan"** - Laporan 6 bulan yang lalu untuk analisis semester
5. **"1 tahun"** - Laporan 1 tahun yang lalu untuk analisis tahunan

### **Untuk Developer:**
1. **Monitor log** untuk debugging periode
2. **Test edge cases** - Bulan dengan hari yang berbeda
3. **Verify date calculation** - Pastikan periode yang tepat
4. **Check data integrity** - Pastikan timestamp tersimpan dengan benar

## 🚀 **Benefits**

### **✅ Keuntungan:**
1. **Analisis tren** - Dapat melihat pola keuangan dari waktu ke waktu
2. **Perbandingan periode** - Bandingkan performa antar bulan
3. **Analisis jangka panjang** - Lihat tren 6 bulan dan 1 tahun
4. **Konsistensi format** - Semua laporan menggunakan format yang sama
5. **User experience** - Mudah digunakan dengan command yang intuitif

### **⚠️ Catatan:**
1. **Data availability** - Laporan bergantung pada data yang tersimpan
2. **Date accuracy** - Pastikan timestamp tersimpan dengan benar
3. **Performance** - Query database untuk periode lama mungkin lebih lambat
4. **Memory usage** - Laporan periode lama mungkin menggunakan lebih banyak memory

## 🎉 **Hasil Akhir**

Setelah implementasi ini:
- ✅ **Laporan bulan kemarin** - Untuk perbandingan dengan bulan ini
- ✅ **Laporan 2 bulan yang lalu** - Untuk analisis tren 2 bulan
- ✅ **Laporan 3 bulan yang lalu** - Untuk analisis kuartalan
- ✅ **Laporan 6 bulan yang lalu** - Untuk analisis semester
- ✅ **Laporan 1 tahun yang lalu** - Untuk analisis tahunan
- ✅ **Format konsisten** - Semua laporan menggunakan format yang sama
- ✅ **Error handling** - Penanganan error yang baik
- ✅ **Logging detail** - Untuk debugging dan monitoring

---

**💡 Tips:** Sekarang user dapat melihat laporan keuangan untuk berbagai periode waktu dengan mudah, sama persis seperti fitur "bulan ini" yang sudah ada! 