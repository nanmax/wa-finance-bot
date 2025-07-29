@echo off
echo ========================================
echo    WhatsApp Finance Bot - Session Mode
echo ========================================
echo.

echo Checking session status...
node session-manager.js

echo.
echo Starting WhatsApp Finance Bot...
echo.
echo 📱 Bot akan menggunakan session yang tersimpan
echo 🌐 Dashboard: http://localhost:3000
echo.
echo Tekan Ctrl+C untuk menghentikan bot
echo.

npm run dev

pause 