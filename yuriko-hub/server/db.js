/* ============================================================
   Yuriko Hub — база данных (чистый Node.js, без зависимостей)

   Две платформы, две БД (как в MySQL-схеме sql/schema.sql):
     yarikodb  — Rave       (пользователи, верификаторы, коды 2FA, сессии, боты)
     ykotube   — YkoTube    (профили через Rave, видео, комментарии, лайки)

   Хранение: JSON-файлы в server/data/ (аналог таблиц).
   Подключение: localhost, пользователь root, БЕЗ пароля.
   Сервер: http://localhost:8080
   ============================================================ */

"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(__dirname, "data");

/* ---------- «драйвер» подключения: root@localhost, без пароля ---------- */

const DB_CONNECTION = {
  host: "localhost",
  user: "root",
  password: "",        // логин root без пароля
  port: 8080,          // HTTP-порт хаба; для mysql --port=3306
};

class Table {
  constructor(dbName, name, initialRows = []) {
    this.file = path.join(DATA_DIR, dbName + "." + name + ".json");
    this.name = name;
    if (!fs.existsSync(this.file)) {
      this._write(initialRows);
    }
  }
  all() {
    return JSON.parse(fs.readFileSync(this.file, "utf8"));
  }
  _write(rows) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(rows, null, 2));
  }
  insert(row) {
    const rows = this.all();
    row.id = row.id || crypto.randomUUID();
    row.created_at = row.created_at || new Date().toISOString();
    rows.push(row);
    this._write(rows);
    return row;
  }
  find(pred) {
    return this.all().find(pred) || null;
  }
  filter(pred) {
    return this.all().filter(pred);
  }
  update(pred, patch) {
    const rows = this.all();
    let hit = 0;
    for (let i = 0; i < rows.length; i++) {
      if (pred(rows[i])) {
        rows[i] = { ...rows[i], ...(typeof patch === "function" ? patch(rows[i]) : patch) };
        hit++;
      }
    }
    this._write(rows);
    return hit;
  }
  remove(pred) {
    const before = this.all();
    const after = before.filter((r) => !pred(r));
    this._write(after);
    return before.length - after.length;
  }
}

class Database {
  constructor(name) {
    this.name = name;
    this.tables = {};
  }
  table(name, initial = []) {
    if (!this.tables[name]) this.tables[name] = new Table(this.name, name, initial);
    return this.tables[name];
  }
}

/* ---------- подключение двух баз ---------- */

console.log(`[db] connecting ${DB_CONNECTION.user}@${DB_CONNECTION.host} (no password)...`);

const raveDB = new Database("yarikodb");  // Rave
const ykoDB  = new Database("ykotube");   // YkoTube

console.log("[db] yarikodb attached ✓");
console.log("[db] ykotube  attached ✓");

/* ---------- вспомогательные функции ---------- */

function hashCode(str) {
  return crypto.createHash("sha256").update(String(str)).digest("hex");
}

// 6-значный цифровой код (верификаторы и 2FA)
function randomCode6() {
  return String(crypto.randomInt(100000, 999999));
}

// секретный ключ приложения (аналог TOTP-секрета)
function generateSecret() {
  return "YURIKO-" + crypto.randomBytes(10).toString("hex").toUpperCase();
}

module.exports = {
  raveDB, ykoDB, DB_CONNECTION,
  hashCode, randomCode6, generateSecret, DATA_DIR,
};
