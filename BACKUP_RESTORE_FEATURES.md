# 📦 Backup & Restore Features

## 🎯 **Overview Fitur Backup & Restore**

### **Fitur yang Tersedia:**
1. **Manual Backup** - Backup data secara manual
2. **Scheduled Backup** - Backup otomatis terjadwal
3. **Backup List** - Daftar file backup yang tersimpan
4. **Restore Backup** - Pulihkan data dari file backup
5. **File Management** - Kirim file backup ke group

## 📋 **Commands yang Tersedia**

### **1. Manual Backup**
```
User: backup
User: buat backup
User: backup manual
```
**Response:** Membuat backup manual dan menampilkan summary

### **2. Backup List**
```
User: backup list
User: daftar backup
User: list backup
```
**Response:** Menampilkan daftar file backup yang tersimpan

### **3. Backup Schedule**
```
User: backup schedule
User: jadwal backup
User: scheduled backup
```
**Response:** Menampilkan jadwal backup otomatis

### **4. Restore Backup**
```
User: restore
User: restore backup
User: pulihkan backup
```
**Response:** Instruksi cara restore data

## 🔧 **Technical Implementation**

### **1. BackupService.js**
```javascript
class BackupService {
    constructor(database) {
        this.database = database;
        this.backupDir = path.join(__dirname, '..', '..', 'backups');
    }

    async createBackup() {
        // Create zip file with all data
        // Include transactions, config, metadata
        // Return backup file path and metadata
    }

    async restoreFromFile(filePath) {
        // Extract zip file
        // Validate backup data
        // Clear existing data
        // Restore transactions and config
    }

    async getBackupList() {
        // List all backup files
        // Show file size and creation date
    }
}
```

### **2. ScheduledBackupService.js**
```javascript
class ScheduledBackupService {
    constructor(backupService, whatsappClient) {
        this.backupService = backupService;
        this.whatsappClient = whatsappClient;
        this.scheduledJobs = new Map();
    }

    // Default schedules
    // - Daily: Every day at 8 PM
    // - Weekly: Every Sunday at 6 PM
    // - Monthly: First day of month at 4 PM
}
```

### **3. FinanceBot.js Integration**
```javascript
// Backup & Restore commands
if (lowerMessage === 'backup' || lowerMessage === 'buat backup') {
    return await this.handleManualBackup();
}

if (lowerMessage === 'backup list' || lowerMessage === 'daftar backup') {
    return await this.handleBackupList();
}

if (lowerMessage === 'backup schedule' || lowerMessage === 'jadwal backup') {
    return await this.handleBackupSchedule();
}

if (lowerMessage === 'restore' || lowerMessage === 'restore backup') {
    return await this.handleRestoreBackup();
}
```

## 📊 **Backup Data Structure**

### **Backup File Format:**
```json
{
  "version": "1.0.0",
  "timestamp": "2025-01-28T10:30:00.000Z",
  "transactions": [
    {
      "id": 1,
      "type": "expense",
      "amount": 50000,
      "description": "jajan 50000",
      "category": "Food & Beverage",
      "author": "John Doe",
      "timestamp": "2025-01-28T10:30:00.000Z",
      "original_message": "jajan 50000"
    }
  ],
  "config": {
    "allowedGroups": ["123456789@g.us"],
    "autoProcessAllGroups": false
  },
  "metadata": {
    "totalTransactions": 150,
    "totalIncome": 50000000,
    "totalExpense": 25000000,
    "backupType": "manual"
  }
}
```

## 🕐 **Scheduled Backup Schedules**

### **1. Daily Backup**
- **Schedule:** `0 20 * * *` (Every day at 8 PM)
- **Description:** Backup harian untuk data terbaru
- **Target:** Group yang sudah diset

### **2. Weekly Backup**
- **Schedule:** `0 18 * * 0` (Every Sunday at 6 PM)
- **Description:** Backup mingguan untuk data lengkap
- **Target:** Group yang sudah diset

### **3. Monthly Backup**
- **Schedule:** `0 16 1 * *` (First day of month at 4 PM)
- **Description:** Backup bulanan untuk arsip
- **Target:** Group yang sudah diset

## 📦 **Backup File Management**

### **File Location:**
```
wa-finance/
├── backups/
│   ├── finance-backup-2025-01-28T10-30-00-000Z.zip
│   ├── finance-backup-2025-01-27T20-00-00-000Z.zip
│   └── finance-backup-2025-01-26T18-00-00-000Z.zip
```

### **File Naming Convention:**
```
finance-backup-{timestamp}.zip
```

### **File Contents:**
- `backup-data.json` - All data in JSON format
- Compressed with ZIP for smaller size

## 🔄 **Restore Process**

### **1. File Upload**
```
User: [Send backup file .zip]
```

### **2. File Validation**
- Check file format (.zip)
- Validate backup structure
- Verify data integrity

### **3. Data Restoration**
- Clear existing data
- Restore transactions
- Restore configuration
- Confirm restoration

### **4. Confirmation**
```
✅ RESTORE BERHASIL

📊 Data yang dipulihkan:
• Total Transaksi: 150
• Total Pemasukan: Rp 50.000.000
• Total Pengeluaran: Rp 25.000.000
• Backup Date: 28/01/2025 10:30

💡 Tips:
• Data lama telah dihapus
• Data backup telah dipulihkan
• Ketik "summary" untuk cek data
```

## 🚀 **Usage Examples**

### **Example 1: Manual Backup**
```
User: backup
Bot: ✅ BACKUP BERHASIL DIBUAT

📦 File: finance-backup-2025-01-28T10-30-00-000Z.zip
📅 Tanggal: 28/01/2025 10:30

📊 Data Summary:
• Total Transaksi: 150
• Total Pemasukan: Rp 50.000.000
• Total Pengeluaran: Rp 25.000.000

💡 Tips:
• File backup tersimpan di server
• Ketik "backup list" untuk melihat daftar backup
• Ketik "restore" untuk memulihkan data
```

### **Example 2: Backup List**
```
User: backup list
Bot: 📦 DAFTAR BACKUP

1. finance-backup-2025-01-28T10-30-00-000Z.zip
   📅 28/01/2025 10:30
   📏 45.2 KB

2. finance-backup-2025-01-27T20-00-00-000Z.zip
   📅 27/01/2025 20:00
   📏 44.8 KB

💡 Tips:
• Total 2 file backup
• File terbaru di atas
• Ketik "restore" untuk memulihkan data
```

### **Example 3: Scheduled Backup**
```
User: backup schedule
Bot: 🕐 JADWAL BACKUP OTOMATIS

📅 Daily Backup
• Status: 🟢 AKTIF
• Jadwal: 0 20 * * *
• Next Run: 28/01/2025 20:00
• Target Group: ✅ Set

📅 Weekly Backup
• Status: 🟢 AKTIF
• Jadwal: 0 18 * * 0
• Next Run: 02/02/2025 18:00
• Target Group: ✅ Set

💡 Tips:
• Backup otomatis akan dikirim ke group
• Set target group untuk mengaktifkan
• File backup akan terlampir otomatis
```

### **Example 4: Restore Instructions**
```
User: restore
Bot: 🔄 RESTORE BACKUP

📝 Cara Restore:
1. Kirim file backup (.zip) ke chat ini
2. Bot akan memvalidasi file backup
3. Data akan dipulihkan otomatis

⚠️ PERINGATAN:
• Data saat ini akan dihapus
• Pastikan backup file valid
• Proses tidak dapat dibatalkan

💡 Tips:
• Ketik "backup list" untuk melihat daftar backup
• File backup harus berformat .zip
• Tunggu konfirmasi sebelum restore
```

## 💡 **Key Features**

### **1. Automatic Compression**
- ZIP compression untuk ukuran file kecil
- Level 9 compression untuk optimal size
- Metadata included untuk tracking

### **2. Data Integrity**
- Validation sebelum restore
- Backup structure verification
- Error handling untuk corrupt files

### **3. Scheduled Automation**
- Cron-based scheduling
- Multiple schedule types
- Automatic file delivery to groups

### **4. File Management**
- Automatic cleanup
- File size tracking
- Creation date tracking

## 🔧 **Dependencies Required**

### **New Dependencies:**
```json
{
  "archiver": "^6.0.1",
  "extract-zip": "^2.0.1",
  "node-cron": "^3.0.3",
  "cron-parser": "^4.9.0"
}
```

### **Installation:**
```bash
npm install archiver extract-zip node-cron cron-parser
```

## 🚀 **Benefits**

### **1. Data Safety**
- Regular backups prevent data loss
- Multiple backup types for different needs
- Easy restoration process

### **2. Automation**
- Scheduled backups reduce manual work
- Automatic delivery to groups
- No need to remember backup schedule

### **3. File Management**
- Organized backup storage
- Easy backup listing and management
- Automatic cleanup of old files

### **4. User-Friendly**
- Simple commands for all operations
- Clear instructions for restore process
- Helpful tips and guidance

---

**💡 Tips:** Fitur backup & restore memberikan keamanan data yang lengkap dengan backup manual dan otomatis, serta proses restore yang mudah dan aman! 