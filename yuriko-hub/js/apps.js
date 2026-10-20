/* ============================================================
   Yuriko Hub — встроенные приложения: Rave и YkoTube
   Автоопределение адреса API (см. js/config.js):
     • страница открыта через Node-сервер (порт 8080) → тот же origin
     • страница открыта через XAMPP/Apache (:80/:443)  → localhost:8080
     • файл открыт двойным кликом (file://)            → localhost:8080
   Если сервер не запущен — показывается понятная подсказка.
   ============================================================ */

(function () {
  const API = window.YURIKO_CONFIG ? window.YURIKO_CONFIG.apiBase : "http://localhost:8080/api";

  /* ---------- общее состояние ---------- */

  const state = {
    rave_token: localStorage.getItem("rave_token") || null,
    rave_user:  localStorage.getItem("rave_user")  || null,
    yko_token:  localStorage.getItem("yko_token")  || null,
    yko_channel: null,
  };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function api(pathname, opts = {}) {
    const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
    if (opts.token) headers["Authorization"] = "Bearer " + opts.token;
    let res;
    try {
      // используем актуальный рабочий адрес (может быть переопределён health-check'ом)
      const base = window.YURIKO_CONFIG ? window.YURIKO_CONFIG.apiBase : API;
      res = await fetch(base + pathname, {
        method: opts.method || (opts.body ? "POST" : "GET"),
        headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
      });
    } catch (e) {
      throw new Error("OFFLINE");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok && !data.error) throw new Error(data.message || ("HTTP " + res.status));
    return data; // data.error проверяет вызывающий код
  }

  function offlineNotice() {
    return '<div class="app-offline">' +
      "<h3>⚠ Сервер хаба не отвечает</h3>" +
      "<p>Приложения Rave и YkoTube работают поверх локальной БД " +
      "(<code>root@localhost</code>, без пароля).</p>" +
      "<p><b>Если хаб открыт через XAMPP (Apache :80/:443)</b> — сервер Node нужно запустить отдельно, Apache его не поднимает:</p>" +
      '<pre class="app-code">cd C:\\xampp\\htdocs\\yuriko-hub\nnode server/server.js\n<span class="app-comment"># API: ' + API.slice(0, -4) + ' · БД: yarikodb + ykotube</span></pre>' +
      "<p>Или откройте хаб прямо через Node-сервер (он сам раздаёт статику на :8080):</p>" +
      '<pre class="app-code">node server/server.js\n<span class="app-comment"># затем откройте http://localhost:8080</span></pre>' +
      "<p>После запуска нажмите «Проверить и обновить» ниже. Статус сервера: " +
      '<a href="' + API + '/health" target="_blank">' + API + '/health</a></p>' +
      '<button class="btn btn-primary" onclick="location.reload()">↻ Проверить и обновить</button></div>';
  }

  /* ============================================================
     RAVE — мессенджер: регистрация по коду верификатора, 2FA
     ============================================================ */

  const RaveApp = {
    id: "rave",
    title: "💬 Rave",
    view: "auth",
    verificators: [],
    access_codes: {},          // логин бота → код верификатора (для демо-регистрации)
    currentBot: "Yuriko_VerifyBot",

    async render(root) {
      root.innerHTML = '<div class="rave-wrap"><div class="app-loading">Загрузка Rave...</div></div>';
      const inner = root.querySelector(".rave-wrap");

      try {
        const d = await api("/rave/verificators");
        this.verificators = d.verificators || [];
        this.access_codes = d.access_codes || {};
      } catch (e) {
        inner.innerHTML = offlineNotice();
        return;
      }

      if (state.rave_token && this.view !== "register") {
        inner.innerHTML = this.tplMain();
        this.bindMain(inner);
        this.refreshMe(inner);
      } else if (this.view === "register") {
        inner.innerHTML = this.tplRegister();
        this.bindRegister(inner);
      } else {
        inner.innerHTML = this.tplAuth();
        this.bindAuth(inner);
      }
    },

    /* ---------- шаблоны ---------- */

    tplAuth() {
      return `
      <div class="rave-panel">
        <div class="rave-brand"><span class="rave-logo">💬</span><div><b>Rave</b><small>мессенджер экосистемы Yuriko</small></div></div>
        <h2>Вход</h2>
        <label>Логин<input id="rv-login" autocomplete="username"></label>
        <label>Пароль<input id="rv-pass" type="password" autocomplete="current-password"></label>
        <div id="rv-2fa-row" class="hidden">
          <label>🔐 Код двухфакторной аутентификации<input id="rv-totp" inputmode="numeric" maxlength="6" placeholder="6 цифр от @Yuriko_AuthBot"></label>
          <button class="btn btn-ghost" id="rv-get-code">Запросить код у бота</button>
        </div>
        <div class="rave-actions"><button class="btn btn-primary" id="rv-login-btn">Войти</button></div>
        <p class="rave-alt">Нет аккаунта? <a href="#" id="rv-to-register">Зарегистрироваться через верификатора →</a></p>
        <div id="rv-msg" class="app-msg"></div>
      </div>
      ${this.tplVerifs()}`;
    },

    tplVerifs() {
      return `<div class="rave-verifs">
        <h3>🛡 Боты-верификаторы</h3>
        <p class="app-hint">Регистрация в Rave возможна только с кодом верификатора. Получи его у бота ниже:</p>
        ${this.verificators.map(v => `
          <div class="verif-card">
            <div class="verif-info"><b>${esc(v.display)}</b><small>@${esc(v.username)} — ${esc(v.desc)}</small></div>
            <div class="verif-code">код верификатора:<br><b>${esc(this.access_codes[v.username] || "••••••")}</b></div>
            <button class="btn btn-small chat-with-bot" data-bot="${esc(v.username)}">💬 Получить код</button>
          </div>`).join("")}
        <div class="bot-chat hidden" id="bot-chat">
          <div class="bot-chat-head"><b id="bot-chat-name">@Yuriko_VerifyBot</b><button class="btn btn-x" id="bot-chat-close">✕</button></div>
          <div class="bot-chat-log" id="bot-chat-log"></div>
          <div class="bot-chat-input">
            <input id="bot-chat-text" placeholder="/start, /code или /status">
            <button class="btn btn-primary" id="bot-chat-send">➤</button>
          </div>
        </div>
      </div>`;
    },

    tplRegister() {
      return `
      <div class="rave-panel">
        <h2>Регистрация в Rave</h2>
        <p class="app-hint">Шаг 1 — получи одноразовый код у бота-верификатора.<br>Шаг 2 — введи код верификатора и свой код регистрации.</p>
        <label>Логин (a-z, 0-9, _) 3–20<input id="rg-user"></label>
        <label>Пароль<input id="rg-pass" type="password"></label>
        <label>Код верификатора (6 цифр из карточки бота)<input id="rg-verif" inputmode="numeric" maxlength="6"></label>
        <label>Код регистрации (из чата с ботом)<input id="rg-code" inputmode="numeric" maxlength="6"></label>
        <div class="rave-actions">
          <button class="btn btn-primary" id="rg-submit">Создать аккаунт</button>
          <button class="btn btn-ghost" id="rg-back">← Назад</button>
        </div>
        <div id="rv-msg" class="app-msg"></div>
      </div>
      ${this.tplVerifs()}`;
    },

    tplMain() {
      return `
      <div class="rave-main">
        <aside class="rave-side">
          <div class="rave-brand"><span class="rave-logo">💬</span><b>Rave</b></div>
          <div class="rave-me">
            <div class="rave-avatar">${(state.rave_user || "?")[0].toUpperCase()}</div>
            <div><b id="rm-user">${esc(state.rave_user)}</b><br><small id="rm-2fa">2FA: —</small></div>
          </div>
          <button class="btn btn-block ${"btn-ghost"}" id="rm-2fa-toggle">🔐 Управление 2FA</button>
          <div id="rm-2fa-box" class="hidden rave-2fa-box">
            <p>После включения бот <b>@Yuriko_AuthBot</b> будет присылать 6-значный код при каждом входе.</p>
            <button class="btn btn-primary btn-block" id="rm-2fa-enable">Включить 2FA</button>
            <input id="rm-2fa-confirm" class="hidden" inputmode="numeric" maxlength="6" placeholder="код из сообщения бота">
            <button class="btn btn-ghost btn-block hidden" id="rm-2fa-confirm-btn">Подтвердить код</button>
            <button class="btn btn-danger btn-block hidden" id="rm-2fa-disable">Отключить 2FA</button>
          </div>
          <button class="btn btn-block btn-danger" id="rm-logout">Выйти</button>
        </aside>
        <section class="rave-content">
          <div class="rave-bots-list">
            <h3>Боты</h3>
            ${this.verificators.map(v => `
              <div class="rave-bot-row"><b>${esc(v.display)}</b><small>@${esc(v.username)}</small></div>`).join("")}
          </div>
          <div class="rave-status-card">
            <h3>Статус платформы</h3>
            <div id="rm-health">—</div>
          </div>
        </section>
      </div>
      <div id="bot-chat-host"></div>`;
    },

    /* ---------- обработчики ---------- */

    msg(text, cls) {
      const el = document.getElementById("rv-msg");
      if (el) { el.textContent = text; el.className = "app-msg " + (cls || ""); }
    },

    bindAuth(root) {
      const q = (s) => root.querySelector(s);
      q("#rv-login-btn").onclick = async () => {
        const body = { username: q("#rv-login").value.trim(), password: q("#rv-pass").value };
        if (q("#rv-2fa-row").classList.contains("shown")) body.totp_code = q("#rv-totp").value.trim();
        this.msg("...");
        const d = await api("/rave/login", { body }).catch((e) => ({ error: e.message === "OFFLINE" ? "Сервер недоступен" : e.message }));
        if (d.error) {
          if (d.need_2fa) { q("#rv-2fa-row").classList.add("shown"); q("#rv-2fa-row").classList.remove("hidden"); }
          this.msg("✖ " + d.error, "err"); return;
        }
        state.rave_token = d.token; state.rave_user = d.username;
        localStorage.setItem("rave_token", d.token); localStorage.setItem("rave_user", d.username);
        this.render(root.closest(".app-body"));
      };
      q("#rv-get-code").onclick = async () => {
        const d = await api("/rave/2fa/request", { body: { username: q("#rv-login").value.trim() } });
        if (d.error) return this.msg("✖ " + d.error, "err");
        this.msg("🛡 " + d.message, "ok");
      };
      q("#rv-to-register").onclick = (e) => { e.preventDefault(); this.view = "register"; this.render(root.closest(".app-body")); };
      this.bindBots(root);
    },

    bindRegister(root) {
      const q = (s) => root.querySelector(s);
      q("#rg-back").onclick = () => { this.view = "auth"; this.render(root.closest(".app-body")); };
      q("#rg-submit").onclick = async () => {
        const d = await api("/rave/register", {
          body: {
            username: q("#rg-user").value.trim(),
            password: q("#rg-pass").value,
            verificator: q("#rg-verif").value.trim(),
            reg_code: q("#rg-code").value.trim(),
          },
        }).catch((e) => ({ error: e.message }));
        if (d.error) return this.msg("✖ " + d.error, "err");
        this.msg("✅ Аккаунт создан! Теперь войди.", "ok");
        setTimeout(() => { this.view = "auth"; this.render(root.closest(".app-body")); }, 1200);
      };
      this.bindBots(root);
    },

    bindBots(root) {
      root.querySelectorAll(".chat-with-bot").forEach((btn) => {
        btn.onclick = () => {
          this.currentBot = btn.dataset.bot;
          const host = root.querySelector("#bot-chat") || document.getElementById("bot-chat");
          if (!host) return;
          host.classList.remove("hidden");
          host.querySelector("#bot-chat-name").textContent = "@" + this.currentBot;
          host.querySelector("#bot-chat-log").innerHTML = "";
          this.sendBotMsg("/start", host);
          host.scrollIntoView({ behavior: "smooth", block: "nearest" });
        };
      });
      const host = root.querySelector("#bot-chat");
      if (!host) return;
      host.querySelector("#bot-chat-close").onclick = () => host.classList.add("hidden");
      const send = () => {
        const inp = host.querySelector("#bot-chat-text");
        if (!inp.value.trim()) return;
        this.sendBotMsg(inp.value.trim(), host);
        inp.value = "";
      };
      host.querySelector("#bot-chat-send").onclick = send;
      host.querySelector("#bot-chat-text").onkeydown = (e) => { if (e.key === "Enter") send(); };
    },

    async sendBotMsg(text, host) {
      const log = host.querySelector("#bot-chat-log");
      log.insertAdjacentHTML("beforeend", `<div class="bot-msg user">${esc(text)}</div>`);
      const d = await api("/rave/bots/chat", { body: { bot_username: this.currentBot, text } })
        .catch(() => ({ reply: "⚠ Сервер недоступен" }));
      log.insertAdjacentHTML("beforeend", `<div class="bot-msg bot">${esc(d.reply || d.error || "...")}</div>`);
      // если бот выдал одноразовый код — автоподставляем его в форму регистрации
      const m = (d.reply || "").match(/код[:\s]*(\d{6})/i);
      if (m) {
        const codeInput = document.getElementById("rg-code");
        if (codeInput && !codeInput.value) {
          codeInput.value = m[1];
          log.insertAdjacentHTML("beforeend", '<div class="bot-msg bot">↩ Код автоматически подставлен в форму регистрации.</div>');
        }
      }
      log.scrollTop = log.scrollHeight;
    },

    bindMain(root) {
      const q = (s) => root.querySelector(s);
      q("#rm-logout").onclick = async () => {
        await api("/rave/logout", { token: state.rave_token, body: {} }).catch(() => {});
        localStorage.removeItem("rave_token"); localStorage.removeItem("rave_user");
        state.rave_token = null; state.rave_user = null;
        this.view = "auth";
        window.YurikoApps.renderCurrent();
      };
      q("#rm-2fa-toggle").onclick = () => q("#rm-2fa-box").classList.toggle("hidden");
      q("#rm-2fa-enable").onclick = async () => {
        const d = await api("/rave/2fa/enable", { method: "POST", token: state.rave_token, body: {} });
        if (d.error) return alert(d.error);
        alert("🛡 " + d.message + "\n\nДемо-режим: код = " + d.demo_code);
        q("#rm-2fa-confirm").classList.remove("hidden");
        q("#rm-2fa-confirm-btn").classList.remove("hidden");
      };
      q("#rm-2fa-confirm-btn").onclick = async () => {
        const d = await api("/rave/2fa/confirm", { token: state.rave_token, body: { code: q("#rm-2fa-confirm").value.trim() } });
        alert(d.ok ? d.message : "✖ " + d.error);
        this.refreshMe(root);
      };
      q("#rm-2fa-disable").onclick = async () => {
        await api("/rave/2fa/disable", { method: "POST", token: state.rave_token, body: {} });
        this.refreshMe(root);
      };
      api("/health").then((h) => {
        q("#rm-health").innerHTML =
          `<pre class="app-code">БД yarikodb @ ${esc(h.connection.host)} (${esc(h.connection.user)}, пароль: нет)
users: ${h.databases.yarikodb.users} · verificators: ${h.databases.yarikodb.verificators} · sessions: ${h.databases.yarikodb.sessions}
БД ykotube — videos: ${h.databases.ykotube.videos} · channels: ${h.databases.ykotube.channels}</pre>`;
      }).catch(() => {});
    },

    async refreshMe(root) {
      const d = await api("/rave/me", { token: state.rave_token }).catch(() => null);
      if (!d || d.error) {
        localStorage.removeItem("rave_token"); state.rave_token = null;
        return this.render(root.closest ? root.closest(".app-body") : root);
      }
      const el = root.querySelector("#rm-2fa");
      if (el) el.textContent = "2FA: " + (d.two_factor ? "включена 🔐" : "выключена");
      const dis = root.querySelector("#rm-2fa-disable");
      if (dis) dis.classList.toggle("hidden", !d.two_factor);
    },
  };

  /* ============================================================
     YKOTUBE — видеохостинг, вход только через Rave
     ============================================================ */

  const YkoApp = {
    id: "ykotube",
    title: "📺 YkoTube",

    async render(root) {
      root.innerHTML = '<div class="yko-wrap"><div class="app-loading">Загрузка YkoTube...</div></div>';
      const inner = root.querySelector(".yko-wrap");
      let videos;
      try {
        videos = (await api("/ykotube/videos")).videos || [];
      } catch (e) {
        inner.innerHTML = offlineNotice();
        return;
      }

      const signedInRave = !!state.rave_token;
      const ykoSignedIn = !!state.yko_token;

      inner.innerHTML = `
        <div class="yko-header">
          <div class="yko-brand"><span>▶</span><b>Yko<b class="yko-red">Tube</b></b></div>
          <div class="yko-authbox">
            ${ykoSignedIn
              ? `<span class="yko-user">👤 ${esc(state.rave_user)} <small>(через Rave)</small></span>
                 <button class="btn btn-small" id="yk-upload-btn">⬆ Загрузить</button>
                 <button class="btn btn-small btn-ghost" id="yk-signout">Выйти</button>`
              : signedInRave
                ? `<button class="btn btn-primary" id="yk-enter">Войти через Rave (${esc(state.rave_user)})</button>`
                : `<button class="btn btn-primary" id="yk-enter-rave">Войти через Rave</button>
                   <small class="app-hint">свой аккаунт YkoTube не создаётся — только Rave</small>`}
          </div>
        </div>
        <div id="yk-upload-row" class="hidden yko-upload-row">
          <input id="yk-title" placeholder="Название нового ролика...">
          <button class="btn btn-primary" id="yk-upload-go">Опубликовать</button>
        </div>
        <div class="yko-grid">
          ${videos.map((v) => `
            <div class="yko-card" data-id="${esc(v.id)}">
              <div class="yko-thumb">${esc(v.emoji || "📼")}<span class="yko-views">${v.views} 👁</span></div>
              <div class="yko-meta">
                <b>${esc(v.title)}</b>
                <small>${esc(v.channel || "Yuriko Studio")}</small>
                <div class="yko-actions">
                  <button class="btn btn-small yk-like">❤ <span>${v.likes || 0}</span></button>
                </div>
              </div>
            </div>`).join("")}
        </div>
        <div id="yk-msg" class="app-msg"></div>`;

      const q = (s) => inner.querySelector(s);
      const msg = (t, c) => { const m = q("#yk-msg"); m.textContent = t; m.className = "app-msg " + (c || ""); };

      const toRave = () => {
        window.YurikoApps.open("rave");
        setTimeout(() => {
          const note = document.createElement("div");
          note.className = "app-toast";
          note.textContent = "🔑 YkoTube открывается этим же аккаунтом Rave после входа";
          document.body.appendChild(note);
          setTimeout(() => note.remove(), 4000);
        }, 350);
      };

      if (q("#yk-enter-rave")) q("#yk-enter-rave").onclick = toRave;

      if (q("#yk-enter")) q("#yk-enter").onclick = async () => {
        const d = await api("/ykotube/auth-with-rave", { body: { rave_token: state.rave_token } });
        if (d.error) { msg("✖ " + d.error + ". Сначала войди в Rave.", "err"); return; }
        state.yko_token = d.yko_token; state.yko_channel = d.channel;
        localStorage.setItem("yko_token", d.yko_token);
        msg("✅ Канал «" + d.channel.name + "» привязан к Rave-аккаунту", "ok");
        setTimeout(() => this.render(root), 700);
      };

      if (q("#yk-signout")) q("#yk-signout").onclick = () => {
        localStorage.removeItem("yko_token"); state.yko_token = null;
        this.render(root);
      };

      if (q("#yk-upload-btn")) q("#yk-upload-btn").onclick = () => q("#yk-upload-row").classList.toggle("hidden");
      if (q("#yk-upload-go")) q("#yk-upload-go").onclick = async () => {
        const title = q("#yk-title").value.trim();
        if (!title) return;
        const d = await api("/ykotube/upload", { token: state.yko_token, body: { title } });
        if (d.error) return msg("✖ " + d.error, "err");
        msg("✅ Ролик опубликован!", "ok");
        setTimeout(() => this.render(root), 600);
      };

      inner.querySelectorAll(".yko-card").forEach((card) => {
        card.querySelector(".yk-like").onclick = async () => {
          if (!state.yko_token) return msg("🔐 Поставить лайк может только пользователь Rave. Войди через Rave.", "err");
          const d = await api("/ykotube/like", { token: state.yko_token, body: { video_id: card.dataset.id } });
          if (d.error) return msg("✖ " + d.error, "err");
          const n = card.querySelector(".yk-like span");
          n.textContent = parseInt(n.textContent, 10) + (d.liked ? 1 : -1);
        };
      });
    },
  };

  /* ============================================================
     Приложение AI — открывает плавающий чат ассистента
     ============================================================ */

  const AiApp = {
    id: "ai",
    title: "🤖 Yuriko AI Assistant",
    render(root) {
      root.innerHTML = `
        <div class="ai-app-card">
          <h2>✦ Yuriko AI Assistant — уже ГОТОВ и работает</h2>
          <p>Ассистент вышел из статуса «скоро»: BM25-поиск по базе знаний, собственный парсер математики, память контекста диалога.</p>
          <ul>
            <li>«Что такое Rave?» — ответ из базы знаний</li>
            <li>«Сколько будет (12+8)*3 − sqrt(25)?» — посчитает: 55</li>
            <li>«прибавь 10» — помнит предыдущий результат</li>
            <li>Slash-команды: <code>/skills</code>, <code>/status</code>, <code>/clear</code></li>
          </ul>
          <button class="btn btn-primary" id="ai-open-chat">Открыть чат с ассистентом ✦</button>
        </div>`;
      root.querySelector("#ai-open-chat").onclick = () => window.YurikoAUI && window.YurikoAUI.open();
    },
  };

  /* ============================================================
     Менеджер приложений: полноэкранное окно поверх GUI
     ============================================================ */

  const apps = { rave: RaveApp, ykotube: YkoApp, ai: AiApp };
  let current = null;

  function ensureShell() {
    let shell = document.getElementById("apps-shell");
    if (shell) return shell;
    shell = document.createElement("div");
    shell.id = "apps-shell";
    shell.className = "apps-shell hidden";
    const standalone = !!document.getElementById("standalone-app");
    shell.innerHTML =
      '<div class="apps-window">' +
      '<div class="apps-titlebar"><span id="apps-title"></span>' +
      (standalone
        ? '<a class="btn btn-x" href="index.html" title="Вернуться в хаб">⌂</a></div>'
        : '<button class="btn btn-x" id="apps-close-btn" title="Закрыть">✕</button></div>') +
      '<div class="app-body" id="apps-body"></div></div>';
    document.body.appendChild(shell);
    const closeBtn = shell.querySelector("#apps-close-btn");
    if (closeBtn) closeBtn.onclick = close;
    return shell;
  }

  function close() {
    const shell = document.getElementById("apps-shell");
    if (shell) shell.classList.add("hidden");
    current = null;
  }

  function open(id) {
    const app = apps[id];
    if (!app) return;
    current = app;
    const shell = ensureShell();
    shell.classList.remove("hidden");
    document.getElementById("apps-title").textContent = app.title;
    renderCurrent();
  }

  function renderCurrent() {
    if (!current) return;
    const body = document.getElementById("apps-body");
    body.innerHTML = "";
    Promise.resolve(current.render(body)).catch(() => {
      body.innerHTML = offlineNotice();
    });
  }

  window.YurikoApps = { open, close, renderCurrent, state, apps };

  /* ---- автопроверка API при старте: если страница открыта через XAMPP,
     а Node живёт на другом адресе — health-check подберёт рабочий base ---- */
  if (window.YURIKO_checkApi) {
    window.YURIKO_checkApi().then((r) => {
      window.YURIKO_CONFIG.apiOnline = r.ok;
      if (r.ok && r.base !== API) console.log("[Yuriko] API →", r.base);
    });
  }
})();
