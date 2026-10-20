/* ============================================================
   Yuriko Hub — API-сервер (чистый Node.js, без зависимостей)

     node server/server.js            → http://localhost:8080

   • раздаёт статику хаба (yuriko-hub/)
   • REST API:   /api/rave/*   — Rave (аккаунты, боты с кодами, 2FA)
                 /api/ykotube/* — YkoTube (вход через Rave, видео)
                 /api/health   — статус БД

   Подключение к БД: root@localhost, без пароля (см. server/db.js)
   ============================================================ */

"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const {
  raveDB, ykoDB, DB_CONNECTION,
  hashCode, randomCode6, generateSecret, DATA_DIR,
} = require("./db");

const ROOT = path.join(__dirname, "..");        // yuriko-hub/
const PORT = process.env.PORT || 8080;
const HOST = "localhost";

/* ---------- таблицы (создаются при первом запуске) ---------- */

// yarikodb (Rave)
const tUsers    = raveDB.table("users");
const tVerifs   = raveDB.table("verificators");   // верификаторы = боты с кодами
const tCodes    = raveDB.table("codes");          // активные коды 2FA/регистрации
const tSessions = raveDB.table("sessions");
const tBots     = raveDB.table("bots");           // чат-боты Rave
const tMessages = raveDB.table("messages");

// ykotube (YkoTube)
const tChannels = ykoDB.table("channels");
const tVideos   = ykoDB.table("videos");
const tComments = ykoDB.table("comments");

/* ---------- сид начальных данных ---------- */

function seed() {
  if (!tVerifs.find(() => true)) {
    const bots = [
      { username: "Yuriko_VerifyBot",  display: "Yuriko Verify Bot 🛡️", desc: "Выдаёт коды регистрации и двухфакторной аутентификации." },
      { username: "Yuriko_AuthBot",    display: "Yuriko Auth Bot 🔐",    desc: "Управляет 2FA: включение, отключение, резервные коды." },
      { username: "Yuriko_SupportBot", display: "Yuriko Support 🤖",     desc: "Помощь по аккаунту и безопасносnости." },
    ];
    bots.forEach((b) => {
      const code = randomCode6();
      const v = tVerifs.insert({
        username: b.username, display: b.display, desc: b.desc,
        access_code: code, secret: generateSecret(), active: true,
      });
      tBots.insert({ verificator_id: v.id, username: b.username, display: b.display, commands: ["start", "code", "status"] });
      console.log(`[seed] ${b.username} создан, код доступа: ${code}`);
    });
  }
  if (!tVideos.find(() => true)) {
    const ch = tChannels.insert({ name: "Yuriko Studio", rave_username: "demo", avatar: "🌸" });
    tVideos.insert({ channel_id: ch.id, title: "Добро пожаловать в YkoTube!", emoji: "🎬", views: 1337, tags: ["hub", "intro"] });
    tVideos.insert({ channel_id: ch.id, title: "Rave: коды и 2FA за 60 секунд", emoji: "🔐", views: 904, tags: ["rave", "security"] });
  }
}
seed();

/* ---------- утилиты ---------- */

function json(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on("end", () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); } });
    req.on("error", reject);
  });
}

function makeToken() { return crypto.randomBytes(24).toString("hex"); }

function authUser(req) {
  const h = req.headers["authorization"] || "";
  const token = h.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const s = tSessions.find((x) => x.token === token);
  if (!s) return null;
  return tUsers.find((u) => u.id === s.user_id);
}

const CODE_TTL_MS = 5 * 60 * 1000; // код живёт 5 минут

function issueCode(userId, kind) {
  // один активный код на пользователя+тип
  tCodes.remove((c) => c.user_id === userId && c.kind === kind);
  const code = randomCode6();
  tCodes.insert({
    user_id: userId, kind, code_hash: hashCode(code),
    expires_at: Date.now() + CODE_TTL_MS, attempts: 0,
  });
  return code; // в демо-режиме код виден в ответе API
}

function consumeCode(userId, kind, code) {
  const rec = tCodes.find((c) => c.user_id === userId && c.kind === kind);
  if (!rec) return { ok: false, err: "Код не выдан. Запросите новый: /code" };
  if (Date.now() > rec.expires_at) { tCodes.remove((c) => c.id === rec.id); return { ok: false, err: "Код истёк (5 минут). Запросите новый." }; }
  if (rec.attempts >= 5) { tCodes.remove((c) => c.id === rec.id); return { ok: false, err: "Слишком много попыток. Код аннулирован." }; }
  if (hashCode(code) !== rec.code_hash) {
    tCodes.update((c) => c.id === rec.id, { attempts: rec.attempts + 1 });
    return { ok: false, err: `Неверный код. Осталось попыток: ${4 - rec.attempts}.` };
  }
  tCodes.remove((c) => c.id === rec.id);
  return { ok: true };
}

function verifyVerificatorCode(code) {
  const v = tVerifs.find((x) => x.active && x.access_code === String(code));
  return v || null;
}

/* ============================================================
   RAVE API  (/api/rave/...)
   ============================================================ */

const raveHandlers = {
  // --- верификаторы (боты с кодами) ---
  "GET /verificators": (req, res) => {
    json(res, 200, {
      verificators: tVerifs.all().map((v) => ({
        username: v.username, display: v.display, desc: v.desc,
      })),
      // демо-режим локальной БД: коды верификаторов видны клиентам
      access_codes: Object.fromEntries(tVerifs.all().map((v) => [v.username, v.access_code])),
    });
  },

  // запросить код регистрации у верификатора (имитация /start в боте)
  "POST /verificators/code": async (req, res) => {
    const { bot_username } = await readBody(req);
    const v = tVerifs.find((x) => x.username === bot_username && x.active);
    if (!v) return json(res, 404, { error: "Верификатор не найден" });
    const code = randomCode6();
    tCodes.insert({
      user_id: "reg:" + (v.username), kind: "register", code_hash: hashCode(code),
      expires_at: Date.now() + CODE_TTL_MS, attempts: 0, issuer: v.username,
    });
    json(res, 200, { bot: v.username, message: `✅ Код регистрации выдан: ${code} (действует 5 мин)` });
  },

  // --- регистрация ---
  "POST /register": async (req, res) => {
    const { username, password, verificator, reg_code } = await readBody(req);
    if (!username || !password) return json(res, 400, { error: "Нужны логин и пароль" });
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) return json(res, 400, { error: "Логин: 3–20 символов [A-Za-z0-9_]" });
    if (tUsers.find((u) => u.username === username)) return json(res, 409, { error: "Логин уже занят" });
    const v = verifyVerificatorCode(verificator);
    if (!v) return json(res, 400, { error: "Неверный код верификатора. Получите его у бота @Yuriko_VerifyBot" });
    const rc = consumeCode("reg:" + v.username, "register", reg_code);
    if (!rc.ok) return json(res, 400, { error: rc.err });

    const totp_secret = generateSecret();
    const user = tUsers.insert({
      username, pass_hash: hashCode(password), totp_secret,
      two_factor_enabled: false, verified_by: v.username,
    });
    json(res, 201, { ok: true, user: { id: user.id, username: user.username }, totp_secret });
  },

  // --- вход (проверяется 2FA, если включена) ---
  "POST /login": async (req, res) => {
    const { username, password, totp_code } = await readBody(req);
    const user = tUsers.find((u) => u.username === username);
    if (!user || user.pass_hash !== hashCode(password)) {
      return json(res, 401, { error: "Неверный логин или пароль" });
    }
    if (user.two_factor_enabled) {
      if (!totp_code) return json(res, 401, { need_2fa: true, error: "Требуется код двухфакторной аутентификации" });
      const ok = consumeCode(user.id, "2fa", totp_code);
      if (!ok.ok) return json(res, 401, { need_2fa: true, error: ok.err });
    }
    const token = makeToken();
    tSessions.insert({ user_id: user.id, token });
    json(res, 200, { ok: true, token, username: user.username, two_factor: !!user.two_factor_enabled });
  },

  "POST /logout": (req, res) => {
    const h = (req.headers["authorization"] || "").replace(/^Bearer\s+/i, "");
    tSessions.remove((s) => s.token === h);
    json(res, 200, { ok: true });
  },

  "GET /me": (req, res) => {
    const u = authUser(req);
    if (!u) return json(res, 401, { error: "Не авторизован" });
    json(res, 200, { username: u.username, two_factor: !!u.two_factor_enabled, verified_by: u.verified_by });
  },

  // --- 2FA: включение ---
  "POST /2fa/enable": async (req, res) => {
    const u = authUser(req);
    if (!u) return json(res, 401, { error: "Не авторизован" });
    const code = issueCode(u.id, "2fa-setup");
    json(res, 200, {
      message: `Код подтверждения отправлен «через бота» @Yuriko_AuthBot`,
      demo_code: code, secret: u.totp_secret,
    });
  },

  // --- 2FA: подтвердить включение кодом ---
  "POST /2fa/confirm": async (req, res) => {
    const u = authUser(req);
    if (!u) return json(res, 401, { error: "Не авторизован" });
    const { code } = await readBody(req);
    const r = consumeCode(u.id, "2fa-setup", code);
    if (!r.ok) return json(res, 400, { error: r.err });
    tUsers.update((x) => x.id === u.id, { two_factor_enabled: true });
    json(res, 200, { ok: true, message: "🔐 Двухфакторная аутентификация включена" });
  },

  "POST /2fa/disable": (req, res) => {
    const u = authUser(req);
    if (!u) return json(res, 401, { error: "Не авторизован" });
    tUsers.update((x) => x.id === u.id, { two_factor_enabled: false });
    json(res, 200, { ok: true, message: "2FA отключена" });
  },

  // --- выдача 2FA-кода для входа (имитация push от бота) ---
  "POST /2fa/request": async (req, res) => {
    const { username } = await readBody(req);
    const u = tUsers.find((x) => x.username === username);
    if (!u || !u.two_factor_enabled) return json(res, 404, { error: "2FA не включена" });
    const code = issueCode(u.id, "2fa");
    json(res, 200, { message: `🛡️ @Yuriko_AuthBot отправил код: ${code} (5 мин)` });
  },

  // --- боты Rave: мини-чат ---
  "GET /bots": (req, res) => json(res, 200, { bots: tBots.all() }),

  "POST /bots/chat": async (req, res) => {
    const { bot_username, text } = await readBody(req);
    const bot = tBots.find((b) => b.username === bot_username);
    if (!bot) return json(res, 404, { error: "Бот не найден" });
    tMessages.insert({ bot_id: bot.id, from: "user", text });
    let reply;
    const t = (text || "").toLowerCase();
    if (t.includes("/start")) reply = `Привет! Я ${bot.display}. Доступные команды: /code — выдать код, /status — состояние.`;
    else if (t.includes("/code")) {
      const v = tVerifs.find((x) => x.username === bot_username);
      const code = randomCode6();
      if (v) tCodes.insert({ user_id: "reg:" + bot_username, kind: "register", code_hash: hashCode(code), expires_at: Date.now() + CODE_TTL_MS, attempts: 0, issuer: bot_username });
      reply = `✅ Ваш одноразовый код: ${code} (действует 5 минут)`;
    }
    else if (t.includes("/status")) reply = `🟢 Верификатор ${bot_username} активен. Код доступа: ${tVerifs.find(x=>x.username===bot_username)?.access_code ?? "—"}`;
    else reply = "Я верификационный бот. Используй /start, /code или /status.";
    tMessages.insert({ bot_id: bot.id, from: bot_username, text: reply });
    json(res, 200, { reply });
  },
};

/* ============================================================
   YKOTUBE API  (/api/ykotube/...) — регистрация только через Rave
   ============================================================ */

const ykoHandlers = {
  "GET /videos": (req, res) => {
    const videos = tVideos.all().map((v) => {
      const ch = tChannels.find((c) => c.id === v.channel_id);
      return { ...v, channel: ch ? ch.name : "?", likes: tLikes_count(v.id) };
    });
    json(res, 200, { videos });
  },

  // вход в YkoTube через Rave (OAuth-подобный обмен токена)
  "POST /auth-with-rave": async (req, res) => {
    const { rave_token } = await readBody(req);
    const s = tSessions.find((x) => x.token === rave_token);
    if (!s) return json(res, 401, { error: "Rave-сессия недействительна. Войдите в Rave." });
    const u = tUsers.find((x) => x.id === s.user_id);
    let ch = tChannels.find((c) => c.rave_user_id === u.id);
    if (!ch) {
      ch = tChannels.insert({ name: u.username, rave_username: u.username, rave_user_id: u.id, avatar: "🎥" });
    }
    const yko_token = makeToken();
    tSessions.insert({ user_id: u.id, token: yko_token, app: "ykotube" });
    json(res, 200, { ok: true, yko_token, channel: { id: ch.id, name: ch.name } });
  },

  "GET /feed": (req, res) => {
    const u = authUser(req);
    json(res, 200, {
      logged_in: !!u,
      as: u ? u.username : "гость",
      videos: tVideos.all(),
    });
  },

  "POST /upload": async (req, res) => {
    const u = authUser(req);
    if (!u) return json(res, 401, { error: "Нужен вход через Rave" });
    const { title } = await readBody(req);
    if (!title) return json(res, 400, { error: "Нет названия" });
    let ch = tChannels.find((c) => c.rave_user_id === u.id);
    if (!ch) ch = tChannels.insert({ name: u.username, rave_user_id: u.id, avatar: "🎥" });
    const vid = tVideos.insert({ channel_id: ch.id, title, emoji: "📼", views: 0, tags: ["new"] });
    json(res, 201, { ok: true, video: vid });
  },

  "POST /like": async (req, res) => {
    const u = authUser(req);
    if (!u) return json(res, 401, { error: "Нужен вход через Rave" });
    const { video_id } = await readBody(req);
    const existing = tLikes().find((l) => l.video_id === video_id && l.user_id === u.id);
    if (existing) { tLikes().remove((l) => l.id === existing.id); return json(res, 200, { liked: false }); }
    tLikes().insert({ video_id, user_id: u.id });
    json(res, 200, { liked: true });
  },

  "GET /stats": (req, res) => {
    json(res, 200, {
      db: "ykotube", host: DB_CONNECTION.host, user: DB_CONNECTION.user, password: "(пусто)",
      channels: tChannels.all().length, videos: tVideos.all().length, comments: tComments.all().length,
    });
  },
};

function tLikes() { return ykoDB.table("likes"); }
function tLikes_count(videoId) { return tLikes().filter((l) => l.video_id === videoId).length; }

/* ============================================================
   Здравого смысла ради: /api/health
   ============================================================ */

function health(res) {
  json(res, 200, {
    ok: true,
    service: "yuriko-hub-api",
    connection: { user: DB_CONNECTION.user, host: DB_CONNECTION.host, password: "(empty)" },
    databases: {
      yarikodb: { users: tUsers.all().length, verificators: tVerifs.all().length, codes_active: tCodes.filter((c) => c.expires_at > Date.now()).length, sessions: tSessions.all().length },
      ykotube:  { channels: tChannels.all().length, videos: tVideos.all().length, likes: tLikes().all().length },
    },
  });
}

/* ---------- статика ---------- */

const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".md": "text/plain" };

function serveStatic(req, res, urlPath) {
  let p = path.normalize(path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath));
  if (!p.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { p = path.join(p, "index.html"); }
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end("404"); }
  res.writeHead(200, { "Content-Type": (MIME[path.extname(p)] || "application/octet-stream") + "; charset=utf-8" });
  fs.createReadStream(p).pipe(res);
}

/* ---------- маршрутизация ---------- */

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const p = url.pathname;

  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }

  if (p === "/api/health") return health(res);

  try {
    if (p.startsWith("/api/rave/")) {
      const key = req.method + " " + p.replace("/api/rave", "");
      const h = raveHandlers[key];
      if (h) return await h(req, res);
      return json(res, 404, { error: "Нет такого эндпоинта Rave: " + key });
    }
    if (p.startsWith("/api/ykotube/")) {
      const key = req.method + " " + p.replace("/api/ykotube", "");
      const h = ykoHandlers[key];
      if (h) return await h(req, res);
      return json(res, 404, { error: "Нет такого эндпоинта YkoTube: " + key });
    }
    // чистые адреса: /rave → rave.html, /ykotube → ykotube.html
    if (p === "/rave" || p === "/rave/")   return serveStatic(req, res, "/rave.html");
    if (p === "/ykotube" || p === "/ykotube/") return serveStatic(req, res, "/ykotube.html");
    // защита данных БД от прямой раздачи через Node-сервер
    if (p.startsWith("/server/data/")) { res.writeHead(403); return res.end("403 Forbidden"); }
    return serveStatic(req, res, p);
  } catch (e) {
    json(res, 500, { error: e.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`\n  ◈ Yuriko Hub API запущен:  http://${HOST}:${PORT}`);
  console.log(`  ◈ БД: root@${DB_CONNECTION.host} (без пароля), базы: yarikodb + ykotube`);
  console.log(`  ◈ Данные: ${DATA_DIR}/\n`);
});
