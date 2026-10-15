@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================================
echo   BAYANI ALERT RESPONSE CENTER  (port 4000)
echo   Keep this window OPEN.
echo ============================================================
echo.
npm run dev
echo.
echo ------------------------------------------------------------
echo   Server stopped. If there is a RED error above, READ it.
echo ------------------------------------------------------------
pause