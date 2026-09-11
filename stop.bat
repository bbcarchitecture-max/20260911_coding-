@echo off
title PMS - Stop Server
cd /d "%~dp0"
node scripts\stop-server.js
echo.
pause
