@echo off
cd /d "%~dp0server"
start "Triko API" /min cmd /k npm run dev
cd /d "%~dp0client"
start "Triko Arayuz" /min cmd /k npm run dev
timeout /t 6 /nobreak >nul
start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:5173 --new-window
exit