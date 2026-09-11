@echo off
title PMS - Start Server
cd /d "%~dp0"
node scripts\start-server.js
if %errorlevel% neq 0 (
    echo.
    pause
)
