@echo off
:: Set title for easy identification/killing
title OpsLocalServer

:: Navigate to project root (one level up from bin)
cd /d "%~dp0.."

:: Launch Browser
start http://localhost:8087

:: Run Server
echo Starting Ops Local Server...
powershell -NoProfile -ExecutionPolicy Bypass -File "serve.ps1"
if %errorlevel% neq 0 pause
