@echo off
echo ========================================
echo    WhatsApp Finance Bot Starter
echo ========================================
echo.

echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js tidak ditemukan!
    echo Silakan install Node.js dari https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js found: 
node --version

echo.
echo Checking dependencies...
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Gagal install dependencies!
        pause
        exit /b 1
    )
)

echo.
echo Checking .env file...
if not exist ".env" (
    echo Creating .env file from template...
    copy "env.example" ".env"
    echo.
    echo ⚠️  IMPORTANT: Edit file .env dan tambahkan OpenAI API key Anda!
    echo.
    pause
)

echo.
echo Starting WhatsApp Finance Bot...
echo.
echo 📱 Bot akan memulai dan menampilkan QR code
echo 🌐 Dashboard akan tersedia di http://localhost:3000
echo.
echo Tekan Ctrl+C untuk menghentikan bot
echo.

npm run dev

pause 