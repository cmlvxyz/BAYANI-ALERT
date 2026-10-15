@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================================
echo   BAYANI EXPRESS SYNC SERVER  (port 8000)
echo   Connects Citizen App (4001) lt-gt RC (4000)
echo   Keep this window OPEN.
echo ============================================================
echo.
npm run server
echo.
echo ------------------------------------------------------------
echo   Server stopped. If there is a RED error above, READ it.
echo ------------------------------------------------------------
pause