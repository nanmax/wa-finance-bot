# 📦 Backup Download & Upload Features

## 🎯 **Overview Fitur Download & Upload Backup**

### **Fitur yang Tersedia:**
1. **Download Backup** - Download file backup dari server
2. **Upload Backup** - Upload file backup untuk restore
3. **File Validation** - Validasi file backup sebelum restore
4. **Progress Tracking** - Tracking progress download/upload

## 📋 **Commands yang Tersedia**

### **1. Download Backup**
```
User: download backup finance-backup-2025-01-28T10-30-00-000Z.zip
User: download finance-backup-2025-01-28T10-30-00-000Z.zip
```
**Response:** Download file backup dan kirim ke chat

### **2. Upload Backup untuk Restore**
```
User: [Send backup file .zip via WhatsApp]
```
**Response:** Validasi file dan konfirmasi restore

### **3. Restore Confirm/Cancel**
```
User: restore confirm
User: restore cancel
```
**Response:** Konfirmasi atau batalkan proses restore

## 🔧 **Technical Implementation**

### **1. Download Backup Process**
```javascript
async handleDownloadBackup(message) {
    // Extract file name from message
    // Check if file exists in backup list
    // Send file via WhatsApp
    // Return success message
}
```

### **2. Upload Backup Process**
```javascript
async handleFileUpload(message) {
    // Check file type (.zip)
    // Download file from WhatsApp
    // Save to temp directory
    // Validate backup structure
    // Confirm restore process
}
```

### **3. File Type Support**
```javascript
// Supported file types for upload
if (message.hasMedia && (
    message.type === 'document' || 
    message.type === 'application/zip'
)) {
    return await this.handleFileUpload(message);
}
```

## 📊 **File Upload Validation**

### **1. File Type Check**
```javascript
// Check if file is a zip file
const fileName = message.body || 'unknown';
if (!fileName.toLowerCase().endsWith('.zip')) {
    await message.reply('❌ FILE TIDAK VALID\n\nFile harus berformat .zip');
    return;
}
```

### **2. File Download**
```javascript
// Download the file from WhatsApp
const media = await message.downloadMedia();
if (!media) {
    await message.reply('❌ DOWNLOAD GAGAL\n\nTidak bisa mengunduh file');
    return;
}
```

### **3. File Save**
```javascript
// Save file temporarily
const tempDir = path.join(__dirname, '..', '..', 'temp');
const filePath = path.join(tempDir, fileName);
const buffer = Buffer.from(media.data, 'base64');
fs.writeFileSync(filePath, buffer);
```

### **4. Backup Validation**
```javascript
// Validate backup file structure
const validation = await this.backupService.validateBackupFile(filePath);
if (!validation.valid) {
    fs.unlinkSync(filePath); // Clean up
    await message.reply(`❌ BACKUP FILE TIDAK VALID\n\nError: ${validation.error}`);
    return;
}
```

## 🚀 **Usage Examples**

### **Example 1: Download Backup**
```
User: download backup finance-backup-2025-01-28T10-30-00-000Z.zip
Bot: ✅ DOWNLOAD BACKUP

📦 File: finance-backup-2025-01-28T10-30-00-000Z.zip
📅 Created: 28/01/2025 10:30
📏 Size: 45.2 KB

📤 Status: File sedang dikirim...

💡 Tips:
• File backup akan dikirim ke chat ini
• Simpan file untuk restore nanti
• File berformat .zip
```

### **Example 2: Upload Backup**
```
User: [Send backup file .zip]
Bot: ✅ BACKUP FILE VALID

📦 File: finance-backup-2025-01-28T10-30-00-000Z.zip
📅 Backup Date: 28/01/2025 10:30
📊 Data: 150 transaksi

⚠️ PERINGATAN:
• Data saat ini akan dihapus
• Proses tidak dapat dibatalkan
• Pastikan ini adalah backup yang benar

🔄 Untuk melanjutkan restore:
• Ketik "restore confirm" untuk melanjutkan
• Atau ketik "restore cancel" untuk membatalkan
```

### **Example 3: Restore Confirm**
```
User: restore confirm
Bot: 🔄 RESTORE CONFIRMED

Proses restore sedang berjalan...

⚠️ PERINGATAN:
• Data saat ini akan dihapus
• Proses tidak dapat dibatalkan
• Tunggu konfirmasi selesai
```

### **Example 4: Restore Cancel**
```
User: restore cancel
Bot: ❌ RESTORE DIBATALKAN

Proses restore telah dibatalkan.

💡 Tips:
• File backup tetap tersimpan
• Ketik "restore" untuk mencoba lagi
• Ketik "backup list" untuk melihat daftar backup
```

## 📁 **File Management**

### **1. Temporary Directory**
```
wa-finance/
├── temp/
│   ├── finance-backup-2025-01-28T10-30-00-000Z.zip
│   └── finance-backup-2025-01-27T20-00-00-000Z.zip
```

### **2. Backup Directory**
```
wa-finance/
├── backups/
│   ├── finance-backup-2025-01-28T10-30-00-000Z.zip
│   ├── finance-backup-2025-01-27T20-00-00-000Z.zip
│   └── finance-backup-2025-01-26T18-00-00-000Z.zip
```

### **3. File Cleanup**
```javascript
// Clean up temporary files after validation
if (!validation.valid) {
    fs.unlinkSync(filePath); // Clean up
}

// Clean up after restore
fs.rmSync(extractDir, { recursive: true });
```

## 🔍 **Error Handling**

### **1. Invalid File Type**
```
❌ FILE TIDAK VALID

File harus berformat .zip (backup file)

💡 Tips:
• Pastikan file adalah backup yang valid
• File backup harus berformat .zip
```

### **2. Download Failed**
```
❌ DOWNLOAD GAGAL

Tidak bisa mengunduh file

💡 Tips:
• Pastikan file tidak rusak
• Coba kirim ulang file
```

### **3. Invalid Backup File**
```
❌ BACKUP FILE TIDAK VALID

Error: Invalid backup file structure

💡 Tips:
• Pastikan file adalah backup yang valid
• File backup harus berformat .zip
```

### **4. File Not Found**
```
❌ ERROR: File backup "finance-backup-2025-01-28T10-30-00-000Z.zip" tidak ditemukan!

📝 DAFTAR BACKUP YANG TERSEDIA:
1. finance-backup-2025-01-27T20-00-00-000Z.zip
2. finance-backup-2025-01-26T18-00-00-000Z.zip

💡 Tips:
• Ketik "backup list" untuk daftar lengkap
• Pastikan nama file benar
• File backup harus ada di server
```

## 💡 **Key Features**

### **1. File Type Support**
- Support `.zip` files
- Support `document` and `application/zip` types
- Automatic file type detection

### **2. Security Validation**
- File structure validation
- Backup data integrity check
- Confirmation before restore

### **3. Progress Tracking**
- Download progress indication
- Upload status tracking
- Error handling and recovery

### **4. File Management**
- Temporary file storage
- Automatic cleanup
- Backup file organization

## 🚀 **Benefits**

### **1. Easy File Transfer**
- Direct download from server
- Upload via WhatsApp
- No external file sharing needed

### **2. Secure Process**
- File validation before restore
- Confirmation steps
- Error handling

### **3. User-Friendly**
- Simple commands
- Clear instructions
- Progress feedback

### **4. Data Safety**
- Backup file integrity check
- Confirmation before data loss
- Rollback capability

---

**💡 Tips:** Fitur download dan upload backup memungkinkan transfer file backup yang mudah dan aman melalui WhatsApp, dengan validasi dan konfirmasi untuk memastikan data safety! 