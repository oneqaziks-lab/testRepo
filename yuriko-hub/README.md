# Yuriko Hub 🌸

Локальный хаб проектов: терминал с Linux-boot-секвенцией, GUI-витрина,
**Yuriko AI Assistant**, мессенджер **Rave** (боты с кодами + 2FA),
видеохостинг **YkoTube** (вход через Rave). Всё работает на вашей машине
через XAMPP + Node.js.

---

## ⚡ Быстрый старт (Windows + XAMPP) — 3 шага

### Шаг 1. Установите Node.js (один раз)

Команда `node` не найдена, потому что Node.js не установлен — XAMPP его
не поставляет и не умеет запускать. Скачайте LTS с https://nodejs.org/
и при установке **оставьте включённой галочку «Add to PATH»**.
После установки перезапустите cmd и проверьте:

```cmd
node -v        ← должно вывести v20.x / v22.x
```

### Шаг 2. Запустите API-сервер хаба

Два способа — выберите любой:

* **Двойной клик по файлу `start-server.bat`** в папке `yuriko-hub` — самый простой способ;
* либо вручную в консоли:

```cmd
cd V:\xampp\htdocs\yuriko-hub
node server/server.js
```

Сервер поднимется на **http://localhost:8080** и сам раздаст все страницы
хаба и API. Оставьте это окно открытым — сервер должен работать, пока вы
пользуетесь хабом.

> ❗ **Никогда не открывайте `server.js` двойным кликом!**
> Windows запустит его через Windows Script Host (JScript), который не
> понимает синтаксис Node.js — отсюда ошибка *«Синтаксическая ошибка,
> Код: 800A03EA»*. Файл `.js` — это код для Node, а не для WSH.
> Правильный вход: `start-server.bat` или команда `node server/server.js`.

### Шаг 3. Откройте хаб

Рекомендуемый адрес (страницы раздаёт Node-сервер):

👉 **http://localhost:8080**

Можно и через Apache/XAMPP (**http://localhost/yuriko-hub/**, порты 80/443) —
страницы откроются, а API они найдут сами на :8080 (автоопределение в
`js/config.js`). Но вариант из шага 2 проще и без сюрпризов.

В терминале дождитесь загрузки (мгновенно; скорость: `speed fast|normal`)
и введите `GUI` → карточки проектов → **Rave** / **YkoTube** работают как
отдельные страницы `/rave.html` и `/ykotube.html` (или чистые `/rave`, `/ykotube`).

---

## 🔌 Порты

| Сервис            | Порт   | Примечание                                  |
|-------------------|--------|---------------------------------------------|
| Apache (XAMPP)    | 80     | статика htdocs                              |
| Apache SSL        | 443    | если включён HTTPS                          |
| MySQL (XAMPP)     | 3306   | root, без пароля                            |
| **Node API хаба** | **8080** | запускается вручную (`start-server.bat`)  |

Порты не конфликтуют. Если 8080 занят другим приложением:
`set PORT=8090 && node server/server.js` (тогда укажите порт в `js/config.js`).

---

## 🗄 База данных

По умолчанию используется **встроенная файловая БД** (`server/data/*.json`) —
ничего дополнительно создавать не нужно, данные переживают перезапуски и
`git pull`.

Опционально можно включить MySQL из XAMPP:

```cmd
V:\xampp\mysql\bin\mysql.exe -u root < sql/schema.sql
```

Создаёт базы `yarikodb` (Rave: users, codes, sessions, bots, messages)
и `ykotube` (channels, videos, comments). Подключение: `root@localhost:3306`,
пароль пустой.

---

## 🧰 Полезные команды

```cmd
node -v                          # проверка установки Node
netstat -ano | findstr :8080     # жив ли API-сервер
curl http://localhost:8080/api/health   # статус БД
start-server.bat                 # запуск сервера двойным кликом
update.bat                       # автообновление с GitHub
```

Команды терминала хаба: `GUI`, `ai <вопрос>`, `speed instant|fast|normal`,
`help`, `status`, `projects`, `clear`, `reboot`, `whoami`.

---

## 📁 Структура

```
yuriko-hub/
├── index.html          — терминал + GUI
├── rave.html           — мессенджер Rave (отдельная страница)
├── ykotube.html        — видеохостинг YkoTube (отдельная страница)
├── start-server.bat    — ★ запуск API-сервера двойным кликом
├── update.bat/.sh      — автообновление с GitHub
├── .htaccess           — чистые URL + защита /server/data для Apache
├── css/, js/           — фронтенд (config.js — автопоиск API)
│   └── js/ai-engine.js — локальный AI (BM25-база знаний, парсер, память)
├── server/
│   ├── server.js       — Node API (запускать только через node!)
│   ├── db.js           — файловая БД (JSON)
│   └── data/           — ваши данные (в .gitignore, не затираются)
└── sql/schema.sql      — схема MySQL для XAMPP
```

## ❓ Частые проблемы

| Симптом | Причина / решение |
|---|---|
| `«node» не является внутренней командой` | Node.js не установлен → Шаг 1 |
| `WSH: Синтаксическая ошибка 800A03EA` | Вы дважды кликнули `server.js` → запускайте `start-server.bat` |
| «Сервер хаба не отвечает» | Не запущен Node-API → Шаг 2; проверьте `http://localhost:8080/api/health` |
| Порт 8080 занят | Смените порт: `set PORT=8090 && node server/server.js` |
| Данные пропали после обновления | Проверьте, что `server/data/` в `.gitignore` (он там есть) |
