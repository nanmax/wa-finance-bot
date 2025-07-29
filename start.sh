#!/bin/bash

echo "========================================"
echo "   WhatsApp Finance Bot Starter"
echo "========================================"
echo

echo "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js tidak ditemukan!"
    echo "Silakan install Node.js dari https://nodejs.org/"
    exit 1
fi

echo "Node.js found: $(node --version)"

echo
echo "Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "ERROR: Gagal install dependencies!"
        exit 1
    fi
fi

echo
echo "Checking .env file..."
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp env.example .env
    echo
    echo "⚠️  IMPORTANT: Edit file .env dan tambahkan OpenAI API key Anda!"
    echo
    read -p "Press Enter to continue..."
fi

echo
echo "Starting WhatsApp Finance Bot..."
echo
echo "📱 Bot akan memulai dan menampilkan QR code"
echo "🌐 Dashboard akan tersedia di http://localhost:3000"
echo
echo "Tekan Ctrl+C untuk menghentikan bot"
echo

npm run dev 