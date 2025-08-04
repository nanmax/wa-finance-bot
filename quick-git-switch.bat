@echo off
echo Quick Git Account Switcher
echo =========================
echo.
echo Repository: wa-finance
echo.

if "%1"=="nanmax" (
    git config --local user.name "nanmax"
    git config --local user.email "nandarifaturohman6@gmail.com"
    echo ✅ Switched to nanmax
    goto show
) else if "%1"=="nandaknitto" (
    git config --local user.name "nandaknitto"
    git config --local user.email "nanda.knitto@gmail.com"
    echo ✅ Switched to nandaknitto
    goto show
) else if "%1"=="global" (
    git config --local --unset user.name
    git config --local --unset user.email
    echo ✅ Reset to global config
    goto show
) else (
    echo Usage: quick-git-switch.bat [nanmax^|nandaknitto^|global]
    echo.
    echo Examples:
    echo   quick-git-switch.bat nanmax
    echo   quick-git-switch.bat nandaknitto
    echo   quick-git-switch.bat global
    exit /b 1
)

:show
echo.
echo Current Git config:
for /f "tokens=*" %%i in ('git config user.name') do echo Name:  %%i
for /f "tokens=*" %%i in ('git config user.email') do echo Email: %%i
echo. 