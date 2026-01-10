@echo off
echo Restarting Server...
call "%~dp0stop.bat"
timeout /t 1 >nul
start "" "%~dp0start.bat"
