@echo off
chcp 65001 >nul
REM ============================================================
REM  Yuriko Hub — автообновление с GitHub (для Windows / XAMPP)
REM  Запуск: двойным кликом или из планировщика каждые N минут.
REM  Требует: git (https://git-scm.com) и настроенный remote origin.
REM ============================================================

REM --- НАСТРОЙКИ ПОД СЕБЯ -------------------------------------
set REPO_URL=https://github.com/YOUR_USER/yuriko-hub.git
set HUB_DIR=C:\xampp\htdocs\yuriko-hub
set BRANCH=main
REM -------------------------------------------------------------

cd /d "%HUB_DIR%" || (echo [ERR] Папка %HUB_DIR% не найдена & exit /b 1)

REM если репозиторий ещё не инициализирован — подключаем удалённый
if not exist ".git" (
    echo [INFO] Инициализация локального репозитория...
    git init
    git remote add origin "%REPO_URL%"
    git fetch origin
    git checkout -f %BRANCH% 2>nul || git checkout -b %BRANCH% origin/%BRANCH%
)

REM проверяем, что origin правильный
git remote set-url origin "%REPO_URL%"

echo [INFO] Проверка обновлений на %BRANCH%...
git fetch origin %BRANCH%

REM сравниваем локальный и удалённый коммиты
for /f "usebackq delims=" %%L in (`git rev-parse HEAD`) do set LOCAL=%%L
for /f "usebackq delims=" %%R in (`git rev-parse origin/%BRANCH%`) do set REMOTE=%%R

if "%LOCAL%"=="%REMOTE%" (
    echo [OK] Обновлений нет. Вы актуальны ^(%LOCAL:~0,7%^).
    goto :end
)

echo [INFO] Найдено обновление %LOCAL:~0,7% -^> %REMOTE:~0,7%. Синхронизация...

REM сохраняем локальные изменения (например, данные БД), если они есть
git stash push -u -m "auto-update %date% %time%" >nul 2>&1

REM жёсткий сброс на версию из GitHub
git checkout -f %BRANCH%
git reset --hard origin/%BRANCH%

REM возвращаем локальные изменения обратно (не конфликтуя с новыми файлами)
git stash pop >nul 2>&1 || echo [WARN] Локальные изменения не восстановлены автоматически (конфликт).

REM перезапуск Node-сервера хаба, чтобы подхватить новые файлы
taskkill /F /IM node.exe >nul 2>&1
start "YurikoHubServer" /min cmd /c "cd /d %HUB_DIR% && node server/server.js"

echo [OK] Yuriko Hub обновлён до %REMOTE:~0,7%. Сервер перезапущен: http://localhost:8080

:end
echo.
