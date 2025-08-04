@echo off
echo ========================================
echo    WhatsApp Finance Bot - Session Fixer
echo ========================================
echo.

echo 🔧 Memulai perbaikan session error...
echo.

REM Matikan semua proses Node.js yang mungkin masih berjalan
echo 🛑 Menghentikan proses Node.js yang masih berjalan...
taskkill /f /im node.exe 2>nul
if %errorlevel% equ 0 (
    echo ✅ Proses Node.js berhasil dihentikan
) else (
    echo ℹ️ Tidak ada proses Node.js yang perlu dihentikan
)

echo.
echo ⏳ Menunggu 3 detik untuk memastikan semua proses selesai...
timeout /t 3 /nobreak >nul

REM Jalankan script perbaikan session
echo 🚀 Menjalankan script perbaikan session...
node fix-session-error.js

echo.
echo ========================================
echo ✅ Proses perbaikan selesai!
echo ========================================
echo.
echo 💡 Langkah selanjutnya:
echo    1. Jalankan: npm run start:finance
echo    2. Scan QR code untuk login WhatsApp
echo    3. Bot akan mulai berfungsi normal
echo.
pause 