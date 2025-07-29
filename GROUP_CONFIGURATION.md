# 📱 Konfigurasi Group WhatsApp

## 🎯 **Fitur Baru: Kontrol Group**

Bot sekarang mendukung konfigurasi untuk memproses pesan dari group tertentu atau semua group.

## 🔧 **Cara Menggunakan**

### **1. Melihat Group yang Tersedia**
```bash
GET http://localhost:3000/api/groups
```

### **2. Mengatur Group Tertentu**
```bash
POST http://localhost:3000/api/set-allowed-group
Content-Type: application/json

{
  "groupId": "120363025123456789@g.us"
}
```

### **3. Melihat Konfigurasi Saat Ini**
```bash
GET http://localhost:3000/api/allowed-group
```

### **4. Mengaktifkan/Menonaktifkan Auto-Process Semua Group**
```bash
POST http://localhost:3000/api/toggle-auto-process
Content-Type: application/json

{
  "enabled": true
}
```

### **5. Menghapus Konfigurasi Group (Process Semua Group)**
```bash
DELETE http://localhost:3000/api/allowed-group
```

## 📊 **Mode Operasi**

### **Mode 1: Group Tertentu**
- Bot hanya memproses pesan dari group yang dikonfigurasi
- Pesan dari group lain diabaikan
- Berguna untuk fokus pada group keuangan tertentu

### **Mode 2: Semua Group**
- Bot memproses pesan dari semua group
- Berguna untuk monitoring multiple group
- Dapat diaktifkan/nonaktifkan

### **Mode 3: Nonaktif**
- Bot tidak memproses pesan dari group manapun
- Berguna untuk maintenance atau testing

## 🔄 **Perubahan Otomatis**

- Konfigurasi disimpan di file `config.json`
- Perubahan diterapkan secara real-time
- Tidak perlu restart server

## 📝 **Contoh Response**

### **Set Allowed Group:**
```json
{
  "message": "Allowed group updated successfully",
  "groupId": "120363025123456789@g.us",
  "groupName": "Finance Group",
  "note": "Changes applied immediately"
}
```

### **Get Allowed Group:**
```json
{
  "groupId": "120363025123456789@g.us",
  "groupName": "Finance Group",
  "isConfigured": true,
  "autoProcessAllGroups": true
}
```

## 🚀 **Langkah Cepat**

1. **Dapatkan Group ID:**
   ```bash
   curl http://localhost:3000/api/groups
   ```

2. **Set Group Tertentu:**
   ```bash
   curl -X POST http://localhost:3000/api/set-allowed-group \
     -H "Content-Type: application/json" \
     -d '{"groupId": "YOUR_GROUP_ID"}'
   ```

3. **Atau Aktifkan Semua Group:**
   ```bash
   curl -X POST http://localhost:3000/api/toggle-auto-process \
     -H "Content-Type: application/json" \
     -d '{"enabled": true}'
   ```

## ⚠️ **Catatan Penting**

- Bot akan memproses **semua pesan** dari group yang dikonfigurasi
- Termasuk pesan dari diri sendiri
- Response hanya dikirim jika pesan bukan dari bot sendiri (mencegah loop)
- Log akan menampilkan informasi pengirim dan group ID 