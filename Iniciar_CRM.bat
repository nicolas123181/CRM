@echo off
title Shaluqa CRM - Panel de Control
echo ========================================
echo    Shaluqa CRM - Iniciando servidor...
echo ========================================
echo.

cd /d "%~dp0"

:: Esperar 3 segundos y abrir el navegador
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:4321"

:: Iniciar el servidor de desarrollo
npm run dev
