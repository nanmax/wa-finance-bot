# Troubleshooting Render Deployment

## Masalah Umum di Render

### 1. Client Not Connected
**Gejala:** Bot tidak terhubung ke WhatsApp di Render tapi normal di lokal

**Solusi:**
- Pastikan environment variable `RENDER=true` sudah diset
- Gunakan path session yang benar: `/opt/render/project/src/.wwebjs_auth`
- Cek log di Render dashboard untuk error detail

### 2. Puppeteer Issues
**Gejala:** Error terkait browser/Chrome di Render

**Solusi:**
- Render sudah menggunakan argumen puppeteer yang dioptimalkan
- Pastikan menggunakan plan `starter` atau lebih tinggi
- Cek memory usage tidak melebihi limit

### 3. Session Persistence
**Gejala:** Session hilang setelah restart

**Solusi:**
- Gunakan path session yang persistent: `/opt/render/project/src/.wwebjs_auth`
- Pastikan `CLIENT_ID` konsisten
- Cek file permission di Render

## Environment Variables untuk Render

```bash
NODE_ENV=production
RENDER=true
RENDER_PLAN=free
AUTH_PATH=/opt/render/project/src/.wwebjs_auth
CLIENT_ID=wa-finance-render
OPENAI_API_KEY=your_openai_key
```

## Monitoring di Render

### Health Check Endpoint
```
GET /api/health
```

### Status Endpoint
```
GET /api/status
```

### QR Code Endpoint
```
GET /api/qr
```

## Log Analysis

### Cek Connection Status
```bash
curl https://your-app.onrender.com/api/health
```

### Cek WhatsApp Status
```bash
curl https://your-app.onrender.com/api/status
```

## Troubleshooting Steps

1. **Cek Environment Variables**
   - Pastikan semua env vars sudah diset di Render dashboard
   - Khususnya `RENDER=true` dan `AUTH_PATH`

2. **Cek Logs**
   - Monitor log di Render dashboard
   - Cari error terkait puppeteer atau WhatsApp client

3. **Test QR Code**
   - Akses `/login` untuk scan QR code
   - Pastikan QR code muncul dan bisa di-scan

4. **Restart Service**
   - Restart service di Render dashboard
   - Tunggu beberapa menit untuk inisialisasi

5. **Check Memory Usage**
   - Monitor memory usage di Render dashboard
   - Upgrade plan jika memory tidak cukup

## Konfigurasi Optimal untuk Render

### render.yaml
```yaml
services:
  - type: web
    name: wa-finance-bot
    env: node
    plan: free  # Free plan
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: RENDER
        value: true
      - key: RENDER_PLAN
        value: free
      - key: AUTH_PATH
        value: /opt/render/project/src/.wwebjs_auth
      - key: CLIENT_ID
        value: wa-finance-render
    healthCheckPath: /api/health
    autoDeploy: true
```

### package.json Script
```json
{
  "scripts": {
    "start": "node src/whatsapp-finance-render.js"
  }
}
```

## Common Error Messages

### "Client not connected"
- Cek apakah QR code sudah di-scan
- Pastikan session tersimpan dengan benar
- Restart service dan scan ulang QR code

### "Puppeteer launch failed"
- Upgrade ke plan yang lebih tinggi
- Cek memory usage
- Pastikan environment variables benar

### "Session not found"
- Scan ulang QR code
- Cek path session di environment variables
- Restart service

## Tips untuk Render

1. **Gunakan Plan Free dengan Optimasi**
   - Free plan memiliki batasan memory (512MB)
   - Gunakan optimasi memory yang sudah diterapkan
   - Monitor resource usage secara ketat

2. **Monitor Resource Usage**
   - Cek CPU dan memory usage secara berkala
   - Upgrade ke plan berbayar jika diperlukan
   - Free plan memiliki sleep mode setelah 15 menit tidak aktif

3. **Backup Session**
   - Session akan hilang jika service restart
   - Selalu siap untuk scan QR code ulang
   - Free plan restart lebih sering

4. **Use Health Checks**
   - Monitor endpoint `/api/health`
   - Set up alerting jika diperlukan
   - Free plan memiliki cold start

5. **Log Management**
   - Monitor log secara berkala
   - Cari pattern error yang berulang
   - Free plan memiliki log retention terbatas

## Batasan Plan Free

- **Memory:** 512MB RAM
- **CPU:** 0.1 CPU cores
- **Sleep Mode:** Setelah 15 menit tidak aktif
- **Cold Start:** 30-60 detik untuk startup
- **Log Retention:** Terbatas
- **Custom Domains:** Tidak tersedia 