# 📊 Financial Reports & Analytics

## 🎯 **Fitur Rekapan Keuangan**

### **1. Summary Report (Rekapan Ringkas)**
Endpoint untuk mendapatkan ringkasan pemasukan dan pengeluaran berdasarkan rentang tanggal.

### **2. Detailed Report (Rekapan Detail)**
Endpoint untuk mendapatkan detail lengkap transaksi berdasarkan rentang tanggal dengan breakdown per kategori.

## 🔧 **API Endpoints**

### **📈 Summary Report**
```bash
GET /api/summary/date-range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```

**Parameters:**
- `startDate` (required): Tanggal mulai (format: YYYY-MM-DD)
- `endDate` (required): Tanggal akhir (format: YYYY-MM-DD)

**Example Request:**
```bash
curl "http://localhost:3000/api/summary/date-range?startDate=2024-01-01&endDate=2024-01-31"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31",
      "totalDays": 31
    },
    "summary": {
      "totalIncome": 5000000,
      "totalExpense": 3000000,
      "balance": 2000000,
      "transactionCount": 25
    },
    "formatted": {
      "totalIncome": "Rp 5.000.000",
      "totalExpense": "Rp 3.000.000",
      "balance": "Rp 2.000.000"
    }
  }
}
```

### **📋 Detailed Report**
```bash
GET /api/report?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```

**Parameters:**
- `startDate` (required): Tanggal mulai (format: YYYY-MM-DD)
- `endDate` (required): Tanggal akhir (format: YYYY-MM-DD)

**Example Request:**
```bash
curl "http://localhost:3000/api/report?startDate=2024-01-01&endDate=2024-01-31"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31",
      "totalDays": 31
    },
    "summary": {
      "totalIncome": 5000000,
      "totalExpense": 3000000,
      "balance": 2000000,
      "transactionCount": 25,
      "incomeCount": 8,
      "expenseCount": 17
    },
    "income": {
      "total": 5000000,
      "count": 8,
      "byCategory": [
        {
          "category": "Gaji",
          "total": 4000000,
          "count": 1,
          "formattedTotal": "Rp 4.000.000"
        },
        {
          "category": "Freelance",
          "total": 1000000,
          "count": 7,
          "formattedTotal": "Rp 1.000.000"
        }
      ],
      "transactions": [
        {
          "id": 1,
          "type": "income",
          "amount": 4000000,
          "description": "Gaji bulan Januari",
          "category": "Gaji",
          "author": "John Doe",
          "timestamp": "2024-01-05T08:00:00.000Z",
          "formattedAmount": "Rp 4.000.000",
          "formattedDate": "5/1/2024"
        }
      ]
    },
    "expense": {
      "total": 3000000,
      "count": 17,
      "byCategory": [
        {
          "category": "Food & Beverage",
          "total": 1500000,
          "count": 12,
          "formattedTotal": "Rp 1.500.000"
        },
        {
          "category": "Transport",
          "total": 800000,
          "count": 3,
          "formattedTotal": "Rp 800.000"
        },
        {
          "category": "Shopping",
          "total": 700000,
          "count": 2,
          "formattedTotal": "Rp 700.000"
        }
      ],
      "transactions": [
        {
          "id": 2,
          "type": "expense",
          "amount": 50000,
          "description": "jajan makan siang",
          "category": "Food & Beverage",
          "author": "John Doe",
          "timestamp": "2024-01-05T12:00:00.000Z",
          "formattedAmount": "Rp 50.000",
          "formattedDate": "5/1/2024"
        }
      ]
    },
    "formatted": {
      "totalIncome": "Rp 5.000.000",
      "totalExpense": "Rp 3.000.000",
      "balance": "Rp 2.000.000"
    }
  }
}
```

## 🧪 **Testing Examples**

### **Test Summary Report:**
```bash
# Summary untuk bulan Januari 2024
curl "http://localhost:3000/api/summary/date-range?startDate=2024-01-01&endDate=2024-01-31"

# Summary untuk minggu ini
curl "http://localhost:3000/api/summary/date-range?startDate=2024-01-15&endDate=2024-01-21"

# Summary untuk hari ini
curl "http://localhost:3000/api/summary/date-range?startDate=2024-01-20&endDate=2024-01-20"
```

### **Test Detailed Report:**
```bash
# Detail report untuk bulan Januari 2024
curl "http://localhost:3000/api/report?startDate=2024-01-01&endDate=2024-01-31"

# Detail report untuk minggu ini
curl "http://localhost:3000/api/report?startDate=2024-01-15&endDate=2024-01-21"

# Detail report untuk hari ini
curl "http://localhost:3000/api/report?startDate=2024-01-20&endDate=2024-01-20"
```

## 📊 **Data Structure**

### **Summary Report Structure:**
```javascript
{
  period: {
    startDate: "2024-01-01",
    endDate: "2024-01-31",
    totalDays: 31
  },
  summary: {
    totalIncome: 5000000,
    totalExpense: 3000000,
    balance: 2000000,
    transactionCount: 25
  },
  formatted: {
    totalIncome: "Rp 5.000.000",
    totalExpense: "Rp 3.000.000",
    balance: "Rp 2.000.000"
  }
}
```

### **Detailed Report Structure:**
```javascript
{
  period: {
    startDate: "2024-01-01",
    endDate: "2024-01-31",
    totalDays: 31
  },
  summary: {
    totalIncome: 5000000,
    totalExpense: 3000000,
    balance: 2000000,
    transactionCount: 25,
    incomeCount: 8,
    expenseCount: 17
  },
  income: {
    total: 5000000,
    count: 8,
    byCategory: [...], // Breakdown per kategori
    transactions: [...] // Detail transaksi
  },
  expense: {
    total: 3000000,
    count: 17,
    byCategory: [...], // Breakdown per kategori
    transactions: [...] // Detail transaksi
  },
  formatted: {
    totalIncome: "Rp 5.000.000",
    totalExpense: "Rp 3.000.000",
    balance: "Rp 2.000.000"
  }
}
```

## 🎯 **Use Cases**

### **1. Monthly Financial Review**
```bash
# Review keuangan bulan Januari
curl "http://localhost:3000/api/report?startDate=2024-01-01&endDate=2024-01-31"
```

### **2. Weekly Budget Tracking**
```bash
# Tracking budget minggu ini
curl "http://localhost:3000/api/summary/date-range?startDate=2024-01-15&endDate=2024-01-21"
```

### **3. Daily Expense Monitoring**
```bash
# Monitoring pengeluaran hari ini
curl "http://localhost:3000/api/report?startDate=2024-01-20&endDate=2024-01-20"
```

### **4. Category Analysis**
```bash
# Analisis kategori pengeluaran bulan ini
curl "http://localhost:3000/api/report?startDate=2024-01-01&endDate=2024-01-31"
# Lihat bagian "expense.byCategory"
```

## 📈 **Analytics Features**

### **✅ Summary Analytics:**
- **Total Income** - Total pemasukan dalam periode
- **Total Expense** - Total pengeluaran dalam periode
- **Balance** - Saldo (Income - Expense)
- **Transaction Count** - Jumlah total transaksi
- **Period Info** - Informasi periode (start, end, total days)

### **✅ Detailed Analytics:**
- **Income Breakdown** - Breakdown pemasukan per kategori
- **Expense Breakdown** - Breakdown pengeluaran per kategori
- **Transaction Details** - Detail setiap transaksi
- **Category Analysis** - Analisis per kategori
- **Formatted Data** - Data yang sudah diformat untuk display

### **✅ Category Analysis:**
- **Category Total** - Total per kategori
- **Category Count** - Jumlah transaksi per kategori
- **Category Percentage** - Persentase per kategori
- **Category Ranking** - Ranking kategori berdasarkan total

## 🔍 **Error Handling**

### **Missing Parameters:**
```json
{
  "error": "startDate and endDate are required",
  "example": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }
}
```

### **Invalid Date Format:**
```json
{
  "error": "Invalid date format. Use YYYY-MM-DD"
}
```

### **No Data Found:**
```json
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31",
      "totalDays": 31
    },
    "summary": {
      "totalIncome": 0,
      "totalExpense": 0,
      "balance": 0,
      "transactionCount": 0
    },
    "formatted": {
      "totalIncome": "Rp 0",
      "totalExpense": "Rp 0",
      "balance": "Rp 0"
    }
  }
}
```

## 💡 **Tips Penggunaan**

### **Untuk Development:**
1. **Test dengan berbagai rentang tanggal** - Pastikan filtering bekerja dengan benar
2. **Test dengan data kosong** - Pastikan handling untuk periode tanpa transaksi
3. **Test dengan data besar** - Pastikan performance tetap baik
4. **Monitor response time** - Pastikan API responsif

### **Untuk Production:**
1. **Cache hasil report** - Untuk periode yang sering diakses
2. **Implement pagination** - Untuk report dengan banyak transaksi
3. **Add date validation** - Pastikan format tanggal valid
4. **Add rate limiting** - Mencegah abuse API

## 🚀 **Next Steps**

### **Fitur yang Bisa Ditambahkan:**
1. **Export to PDF/Excel** - Export report ke file
2. **Email Reports** - Kirim report via email
3. **Scheduled Reports** - Report otomatis per periode
4. **Comparative Analysis** - Bandingkan dengan periode sebelumnya
5. **Budget Tracking** - Tracking vs budget yang direncanakan
6. **Charts & Graphs** - Visualisasi data
7. **Custom Categories** - Kategori yang bisa dikustomisasi
8. **Multi-currency** - Support untuk berbagai mata uang

---

**💡 Tips:** Fitur rekapan ini memungkinkan Anda untuk menganalisis keuangan dengan detail dan akurat berdasarkan periode waktu yang spesifik! 