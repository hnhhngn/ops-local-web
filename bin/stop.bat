@echo off
echo Stopping Ops Local Server...
taskkill /F /FI "WINDOWTITLE eq OpsLocalServer"
timeout /t 2 >nul
