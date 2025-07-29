# 📦 Automatic Backup File Feature

## 🎯 **Overview Fitur Backup Otomatis dengan File**

### **Fitur yang Tersedia:**
1. **Scheduled Backup** - Backup otomatis terjadwal
2. **File Delivery** - Kirim file backup ke group
3. **Group Management** - Set target group untuk backup
4. **Direct Download** - File bisa langsung download di device

## 📋 **Commands yang Tersedia**

### **1. Set Backup Group**
```
User: set backup group 123456789@g.us daily
User: set backup group 123456789@g.us weekly
User: set backup group 123456789@g.us monthly
```
**Response:** Set target group untuk backup otomatis

### **2. Check Backup Group Status**
```
User: backup group status
User: status backup group
```
**Response:** Status backup group dan jadwal

### **3. Check Backup Schedule**
```
User: backup schedule
User: jadwal backup
```
**Response:** Jadwal backup otomatis

## 🔧 **Technical Implementation**

### **1. Scheduled Backup Process**
```javascript
async runScheduledBackup(schedule) {
    // Create backup file
    const backupResult = await this.backupService.createBackup();
    
    // Send message to group
    const message = this.generateScheduledBackupMessage(backupResult, schedule);
    await this.whatsappClient.sendMessage(schedule.targetGroup, message);
    
    // Send backup file
    const { MessageMedia } = require('whatsapp-web.js');
    const media = MessageMedia.fromFilePath(backupResult.filePath);
    await this.whatsappClient.sendMessage(schedule.targetGroup, media, {
        caption: this.generateBackupFileCaption(backupResult, schedule)
    });
}
```

### **2. Backup File Caption**
```javascript
generateBackupFileCaption(backupResult, schedule) {
    let caption = `📦 *BACKUP FILE - ${schedule.name.toUpperCase()}*\n\n`;
    caption += `📅 *Tanggal Backup:* ${timestamp}\n`;
    caption += `📦 *File:* ${backupResult.fileName}\n`;
    caption += `📊 *Data Summary:*\n`;
    caption += `• Total Transaksi: ${metadata.totalTransactions}\n`;
    caption += `• Total Pemasukan: Rp ${formattedIncome}\n`;
    caption += `• Total Pengeluaran: Rp ${formattedExpense}\n\n`;
    caption += `💡 *Cara Download:*\n`;
    caption += `• Tap file di atas untuk download\n`;
    caption += `• Simpan file untuk restore nanti\n`;
    caption += `• File berformat .zip\n\n`;
    caption += `🔄 *Cara Restore:*\n`;
    caption += `• Upload file ini ke bot\n`;
    caption += `• Ketik "restore confirm"\n`;
    caption += `• Data akan dipulihkan otomatis`;
    
    return caption;
}
```

### **3. Group Management**
```javascript
setTargetGroup(scheduleId, groupId) {
    const schedule = this.schedules.find(s => s.id === scheduleId);
    if (schedule) {
        schedule.targetGroup = groupId;
        
        if (schedule.enabled) {
            this.startScheduledJob(schedule);
        }
        
        return { success: true, message: `Target group set for ${schedule.name}` };
    }
    return { success: false, error: 'Schedule not found' };
}
```

## 🕐 **Scheduled Backup Schedules**

### **1. Daily Backup**
- **Schedule:** `0 20 * * *` (Every day at 8 PM)
- **Description:** Backup harian untuk data terbaru
- **File Delivery:** Kirim file backup ke group
- **Caption:** Detail backup dengan summary data

### **2. Weekly Backup**
- **Schedule:** `0 18 * * 0` (Every Sunday at 6 PM)
- **Description:** Backup mingguan untuk data lengkap
- **File Delivery:** Kirim file backup ke group
- **Caption:** Detail backup dengan summary data

### **3. Monthly Backup**
- **Schedule:** `0 16 1 * *` (First day of month at 4 PM)
- **Description:** Backup bulanan untuk arsip
- **File Delivery:** Kirim file backup ke group
- **Caption:** Detail backup dengan summary data

## 🚀 **Usage Examples**

### **Example 1: Set Backup Group**
```
User: set backup group 123456789@g.us daily
Bot: ✅ BACKUP GROUP SET

📦 Schedule: DAILY
👥 Target Group: 123456789@g.us
📅 Status: Backup otomatis aktif

💡 INFO:
• Backup akan dikirim ke group secara otomatis
• File backup akan terlampir otomatis
• Ketik "backup schedule" untuk cek jadwal
```

### **Example 2: Check Backup Group Status**
```
User: backup group status
Bot: 📦 BACKUP GROUP STATUS

📅 Daily Backup
• Status: ✅ AKTIF
• Target Group: 123456789@g.us
• Next Run: 28/01/2025 20:00

📅 Weekly Backup
• Status: ❌ NONAKTIF
• Target Group: Belum diset
• Next Run: Tidak dijadwalkan

💡 TIPS:
• Ketik "set backup group [group_id] [schedule]" untuk mengatur
• Schedule: daily, weekly, monthly
• File backup akan dikirim otomatis ke group
```

### **Example 3: Scheduled Backup Message**
```
Bot: 🕐 SCHEDULED BACKUP - DAILY BACKUP

📅 Tanggal: 28/01/2025 20:00
📦 File: finance-backup-2025-01-28T20-00-00-000Z.zip

📊 Data Summary:
• Total Transaksi: 150
• Total Pemasukan: Rp 50.000.000
• Total Pengeluaran: Rp 25.000.000

💡 Tips:
• File backup terlampir di bawah
• Simpan file untuk restore jika diperlukan
• Backup otomatis berjalan sesuai jadwal
```

### **Example 4: Backup File Caption**
```
📦 BACKUP FILE - DAILY BACKUP

📅 Tanggal Backup: 28/01/2025 20:00
📦 File: finance-backup-2025-01-28T20-00-00-000Z.zip
📊 Data Summary:
• Total Transaksi: 150
• Total Pemasukan: Rp 50.000.000
• Total Pengeluaran: Rp 25.000.000

💡 Cara Download:
• Tap file di atas untuk download
• Simpan file untuk restore nanti
• File berformat .zip

🔄 Cara Restore:
• Upload file ini ke bot
• Ketik "restore confirm"
• Data akan dipulihkan otomatis
```

## 📱 **Device Download Process**

### **1. WhatsApp Web**
- **File Display:** File backup ditampilkan dengan caption
- **Download:** Click file untuk download
- **Save:** File tersimpan di Downloads folder

### **2. WhatsApp Mobile**
- **File Display:** File backup ditampilkan dengan caption
- **Download:** Tap file untuk download
- **Save:** File tersimpan di WhatsApp/Media folder

### **3. File Access**
- **Format:** `.zip` file
- **Size:** Compressed backup data
- **Content:** All transactions and config
- **Restore:** Upload kembali ke bot

## 💡 **Key Features**

### **1. Automatic File Delivery**
- Scheduled backup creates file automatically
- File sent to target group via WhatsApp
- Direct download capability on devices

### **2. Detailed File Information**
- File name and creation date
- Data summary (transactions, income, expense)
- Download and restore instructions

### **3. Group Management**
- Set target group for each schedule
- Multiple groups support
- Status tracking and monitoring

### **4. User-Friendly**
- Simple commands for setup
- Clear status information
- Easy file access and download

## 🔍 **Error Handling**

### **1. Group Not Set**
```
❌ ERROR: Target group not set for Daily Backup

💡 TIPS:
• Ketik "set backup group [group_id] daily"
• Group ID format: [number]@g.us
• Backup akan dikirim ke group otomatis
```

### **2. File Send Failed**
```
❌ ERROR: Failed to send backup file to group

💡 TIPS:
• Cek koneksi internet
• Pastikan group masih aktif
• Coba set ulang target group
```

### **3. Schedule Not Found**
```
❌ ERROR: Schedule not found

💡 TIPS:
• Schedule yang tersedia: daily, weekly, monthly
• Contoh: "set backup group 123456789@g.us daily"
• Ketik "backup schedule" untuk cek jadwal
```

## 🚀 **Benefits**

### **1. Automatic Backup**
- No manual intervention needed
- Regular backup schedule
- File delivery to groups

### **2. Easy File Access**
- Direct download from WhatsApp
- No external file sharing
- Immediate file availability

### **3. Data Safety**
- Regular backup schedule
- File integrity check
- Easy restore process

### **4. Group Management**
- Multiple group support
- Flexible schedule setup
- Status monitoring

---

**💡 Tips:** Fitur backup otomatis dengan file memungkinkan backup data secara otomatis dan mengirim file backup langsung ke group, sehingga file bisa langsung di-download di device (web WA atau WA HP)! 