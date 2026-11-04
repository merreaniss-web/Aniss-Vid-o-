@echo off
cd /d "%~dp0"
start "ANISS STUDIO" cmd /c "timeout /t 2 >nul & start http://localhost:8765/"
py -3 server.py
if errorlevel 1 python server.py
pause
