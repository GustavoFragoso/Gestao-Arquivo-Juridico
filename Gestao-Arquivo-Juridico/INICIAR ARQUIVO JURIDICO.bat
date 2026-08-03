@echo off
PowerShell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0iniciar-servidor.ps1"
timeout /t 2 /nobreak >nul
start "" http://localhost:3000
