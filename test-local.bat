@echo off
echo Setting up environment for local testing...

REM Set environment variables for testing
set OPENAI_API_KEY=sk-test-key-for-local-testing
set AUTH_PATH=./.wwebjs_auth
set CLIENT_ID=wa-finance-render
set PORT=3000

echo Environment variables set:
echo - OPENAI_API_KEY: %OPENAI_API_KEY%
echo - AUTH_PATH: %AUTH_PATH%
echo - CLIENT_ID: %CLIENT_ID%
echo - PORT: %PORT%

echo.
echo Starting WhatsApp Finance Bot...
echo QR Code will be available at: http://localhost:3000/qr
echo API Health check: http://localhost:3000/api/health
echo.

npm run start:finance 