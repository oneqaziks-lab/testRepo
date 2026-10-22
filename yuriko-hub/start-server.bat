@echo off
rem ============================================================
rem  Yuriko Hub — запуск API-сервера (Node.js) двойным кликом.
rem  НЕ открывайте server.js напрямую — Windows запустит его
rem  через WSH/JScript и выдаст ошибку "Синтаксическая ошибка".
rem ============================================================
title Yuriko Hub API Server
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel%==0 goto RUN

echo [X] Node.js не найден в PATH.
echo.
echo   Установите LTS-версию: https://nodejs.org/
echo   (при установке ОБЯЗАТЕЛЬНО включите галочку
echo    "Add to PATH", затем перезапустите этот файл)
echo.
pause
exit /b 1

:RUN
echo [*] Запускаю Yuriko Hub API на http://localhost:8080 ...
echo     (не закрывайте это окно, пока работаете с хабом)
echo.
node server/server.js
pause
