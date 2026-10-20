#!/usr/bin/env bash
# ============================================================
#  Yuriko Hub — автообновление с GitHub (Linux/macOS/WSL)
#  Использование:  ./update.sh
#  Автозапуск каждые 15 минут (cron):
#    crontab -e
#    */15 * * * * /путь/к/yuriko-hub/update.sh >> /tmp/yuriko-update.log 2>&1
# ============================================================
set -e

# --- НАСТРОЙКИ ПОД СЕБЯ --------------------------------------
REPO_URL="${YURIKO_REPO_URL:-https://github.com/YOUR_USER/yuriko-hub.git}"
HUB_DIR="${YURIKO_HUB_DIR:-$(cd "$(dirname "$0")" && pwd)}"
BRANCH="${YURIKO_BRANCH:-main}"
# --------------------------------------------------------------

cd "$HUB_DIR"

if [ ! -d .git ]; then
  echo "[INFO] Инициализация локального репозитория..."
  git init
  git remote add origin "$REPO_URL"
fi
git remote set-url origin "$REPO_URL"

echo "[INFO] Проверка обновлений на $BRANCH..."
git fetch origin "$BRANCH"

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH")

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "[OK] Обновлений нет. Вы актуальны (${LOCAL:0:7})."
  exit 0
fi

echo "[INFO] Обновлено ${LOCAL:0:7} -> ${REMOTE:0:7}. Синхронизация..."

# сохраняем локальные изменения (данные БД и пр.), если они есть
git stash push -u -m "auto-update $(date '+%F %T')" || true

git checkout -f "$BRANCH"
git reset --hard "origin/$BRANCH"

git stash pop || echo "[WARN] Локальные изменения не восстановлены (конфликт). Разберитесь вручную: git status"

# перезапускаем Node-сервер хаба, чтобы подхватить новые файлы
pkill -f "node .*server/server.js" 2>/dev/null || true
sleep 1
nohup node server/server.js > server.log 2>&1 &

echo "[OK] Yuriko Hub обновлён до ${REMOTE:0:7}. Сервер: http://localhost:8080"
