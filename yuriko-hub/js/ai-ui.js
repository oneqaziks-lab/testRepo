/* ============================================================
   Yuriko AI Assistant — UI: плавающий чат-виджет + интеграция
   с терминалом (команда ai) и GUI (кнопка в шапке).
   Мозг — window.YurikoAI (js/ai-engine.js).
   ============================================================ */

(function () {
  "use strict";

  const FAB_ID = "ai-fab";
  const PANEL_ID = "ai-panel";

  let panel, fab, logEl, inputEl, typingEl;
  let opened = false;

  /* ---------- построение DOM один раз ---------- */

  function ensureUI() {
    if (document.getElementById(PANEL_ID)) return;

    fab = document.createElement("button");
    fab.id = FAB_ID;
    fab.className = "ai-fab";
    fab.title = "Yuriko AI Assistant (Ctrl+J)";
    fab.innerHTML = '<span class="ai-fab-glyph">✦</span><span class="ai-fab-label">AI</span>';
    document.body.appendChild(fab);

    panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.className = "ai-panel";
    panel.innerHTML = [
      '<div class="ai-head">',
      '  <span class="ai-avatar">✦</span>',
      '  <div class="ai-head-text"><b>Yuriko AI Assistant</b><span class="ai-sub">локальный движок · BM25 + math parser</span></div>',
      '  <button class="ai-close" title="Закрыть">✕</button>',
      "</div>",
      '<div class="ai-log" id="ai-log"></div>',
      '<div class="ai-chips" id="ai-chips"></div>',
      '<div class="ai-input-row">',
      '  <input type="text" id="ai-input" placeholder="Спроси что-нибудь… («что такое хаб?», «(12+8)*3 − sqrt(25)», «15% от 2400»)" autocomplete="off" spellcheck="false" />',
      '  <button class="ai-send" title="Отправить">➤</button>',
      "</div>",
    ].join("");
    document.body.appendChild(panel);

    logEl = panel.querySelector("#ai-log");
    inputEl = panel.querySelector("#ai-input");
    const chipsEl = panel.querySelector("#ai-chips");

    /* быстрые подсказки-чипы */
    ["Что такое Yuriko Hub?", "Какие есть проекты?", "Как открыть GUI?", "Сколько будет (12+8)*3 - sqrt(25)?", "Пошути"].forEach((q) => {
      const c = document.createElement("button");
      c.className = "ai-chip";
      c.textContent = q;
      c.addEventListener("click", () => send(q));
      chipsEl.appendChild(c);
    });

    panel.querySelector(".ai-close").addEventListener("click", closePanel);
    panel.querySelector(".ai-send").addEventListener("click", () => send(inputEl.value));
    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { send(inputEl.value); inputEl.value = ""; }
    });
    fab.addEventListener("click", togglePanel);

    greetingShown = false;
  }

  let greetingShown = false;

  /* ---------- сообщения ---------- */

  function addMsg(role, text) {
    const div = document.createElement("div");
    div.className = "ai-msg ai-msg-" + role;
    const who = document.createElement("span");
    who.className = "ai-who";
    who.textContent = role === "bot" ? "✦ Yuriko" : "Ты";
    const body = document.createElement("div");
    body.className = "ai-body";
    body.textContent = text; // textContent — безопасно, без HTML-инъекций
    div.appendChild(who);
    div.appendChild(body);
    logEl.appendChild(div);
    logEl.scrollTop = logEl.scrollHeight;
    return div;
  }

  function showTyping() {
    hideTyping();
    typingEl = document.createElement("div");
    typingEl.className = "ai-msg ai-msg-bot ai-typing";
    typingEl.innerHTML = '<span class="ai-who">✦ Yuriko</span><div class="ai-body"><i class="dot"></i><i class="dot"></i><i class="dot"></i></div>';
    logEl.appendChild(typingEl);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function hideTyping() {
    if (typingEl) { typingEl.remove(); typingEl = null; }
  }

  /* ---------- отправка ---------- */

  function send(text) {
    const t = (text || "").trim();
    if (!t) return;
    ensureUI();
    if (!greetingShown) {
      addMsg("bot", "Привет! Я Yuriko AI. Спрашивай про хаб, проекты и команды — или дай мне математику. /skills покажет всё, что я умею ✦");
      greetingShown = true;
    }
    addMsg("user", t);
    showTyping();

    // имитация «думает» + реальная работа движка
    const delay = 350 + Math.min(900, t.length * 12);
    setTimeout(() => {
      let resp;
      try {
        resp = window.YurikoAI.answer(t);
      } catch (e) {
        resp = "Упс, мой парсер споткнулся: " + e.message;
      }
      hideTyping();
      addMsg("bot", resp);
    }, delay);
  }

  /* ---------- панель ---------- */

  function openPanel() {
    ensureUI();
    panel.classList.add("open");
    fab.classList.add("hidden");
    opened = true;
    setTimeout(() => inputEl.focus(), 60);
  }

  function closePanel() {
    panel.classList.remove("open");
    fab.classList.remove("hidden");
    opened = false;
  }

  function togglePanel() {
    opened ? closePanel() : openPanel();
  }

  /* ---------- публичный API ---------- */

  window.YurikoAUI = {
    open: openPanel,
    close: closePanel,
    toggle: togglePanel,
    ask: send, // спросить извне (терминал: `ai <вопрос>`)
  };

  /* ---------- горячая клавиша Ctrl+J ---------- */
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && (e.key === "j" || e.key === "J" || e.code === "KeyJ")) {
      e.preventDefault();
      togglePanel();
    }
    if (e.key === "Escape" && opened) closePanel();
  });
})();
