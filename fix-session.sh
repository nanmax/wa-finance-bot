#!/bin/bash

echo "========================================"
echo "   WhatsApp Session Error Fixer"
echo "========================================"
echo

echo "🔧 Memperbaiki error session WhatsApp..."
echo

echo "Error yang diperbaiki:"
echo "- EBUSY: resource busy or locked"
echo "- chrome_debug.log tidak bisa dihapus"
echo "- Session tidak bisa dibersihkan"
echo

echo "Menjalankan session fixer..."
node fix-session-error.js

echo
echo "========================================"
echo

if [ $? -eq 0 ]; then
    echo "✅ Session berhasil diperbaiki!"
    echo
    echo "💡 Sekarang coba jalankan bot:"
    echo "   npm run dev"
else
    echo "❌ Gagal memperbaiki session"
    echo
    echo "💡 Coba restart komputer dan jalankan lagi"
fi

echo 