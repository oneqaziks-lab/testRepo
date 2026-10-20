/* ============================================================
   Терминал Yuriko Hub: автозагрузка 80 команд + ввод пользователя
   ============================================================ */

(function () {
  const output   = document.getElementById("terminal-output");
  const input    = document.getElementById("terminal-input");
  const promptEl = document.querySelector(".prompt");

  let bootDone   = false;
  let busy       = false;   // идёт ли автозагрузка
  const history  = [];
  let histIdx    = -1;

  /* ---------- вспомогательные функции ---------- */

  function scrollBottom() {
    output.scrollTop = output.scrollHeight;
  }

  function addLine(html, cls) {
    const div = document.createElement("div");
    if (cls) div.className = cls;
    div.innerHTML = html;
    output.appendChild(div);
    scrollBottom();
    return div;
  }

  function pad(n, width) {
    let s = "[" + n + "]";
    while (s.length < width) s += " ";
    return s;
  }

  function tagHtml(tag) {
    return tag === "OK"
      ? '<span class="boot-tag-ok">[  OK  ]</span> '
      : '<span class="boot-tag-fail">[FAILED]</span> ';
  }

  /* ---------- баннер приветствия ---------- */

  function showBanner() {
    addLine(
      "<pre class=\"line-banner\">" +
      "  __   __               _     _  \n" +
      " \\ \\ / /  _   _ _   _(_) __| | ___ \n" +
      "  \\ V /  | | | | | | | |/ _` |/ _ \\\n" +
      "  _| |_  | |_| | |_| | | (_| |  __/\n" +
      " |_|_____| \\__,_|\\__,_|_|\\__,_|\\___|\n" +
      "        H U B  ·  v2.6.1 «Stardust»\n" +
      "</pre>"
    );
    addLine("Yuriko Hub BIOS 2.6.1 — CPU OK — RAM 32768 MB OK", "line-info");
    addLine("Начало загрузки... Выполняется 80 команд инициализации", "line-warn");
    addLine("", "");
  }

  /* ---------- автозагрузка 80 команд ---------- */

  /* скорость загрузки: yuriko_boot_speed = instant | fast | normal
     по умолчанию — instant (мгновенно), чтобы не ждать при каждом входе */
  function bootSpeed() {
    const s = localStorage.getItem("yuriko_boot_speed");
    return s === "fast" || s === "normal" ? s : "instant";
  }

  function bootDelay() {
    const sp = bootSpeed();
    if (sp === "instant") return 0;
    if (sp === "fast")    return 3 + Math.random() * 6;   // ~80 строк/сек
    return 55 + Math.random() * 90;                        // классический режим
  }

  function runBootSequence(onDone) {
    busy = true;
    input.disabled = true;
    let i = 0;
    const speed = bootSpeed();

    function emit(c) {
      addLine('<span class="prompt">user@yuriko-hub:~$</span> <span class="line-cmd">' + escapeHtml(c.cmd) + "</span>");
      const num = String(i + 1).padStart(2, "0");
      addLine(
        tagHtml("OK") +
        '<span class="line-info">' + pad(num, 4) + " " + escapeHtml(c.msg) + "</span>"
      );
      i++;
    }

    function step() {
      if (speed === "instant") {
        // мгновенный режим: все 80 команд одним кадром, без прокрутки по одной
        while (i < BOOT_COMMANDS.length) emit(BOOT_COMMANDS[i]);
        finishBoot(onDone);
        return;
      }
      if (i >= BOOT_COMMANDS.length) {
        finishBoot(onDone);
        return;
      }
      emit(BOOT_COMMANDS[i]);
      setTimeout(step, bootDelay());
    }

    if (speed === "instant") { step(); } else { setTimeout(step, 120); }
  }

  function finishBoot(onDone) {
    busy = false;
    bootDone = true;
    localStorage.setItem("yuriko_booted", "1"); // сессия: загрузку больше не повторяем

    addLine("", "");
    addLine("<b>Загрузка завершена — доступно 80 сервисов.</b>", "line-ok");
    addLine('Введите <span class="line-cmd"><b>GUI</b></span> для запуска графической части хаба, или <span class="line-cmd">help</span> для списка команд.', "line-info");
    addLine('<small>Скорость загрузки: <b>' + bootSpeed() + '</b> — изменить: <span class="line-cmd">speed instant|fast|normal</span></small>', "line-info");
    addLine("", "");
    input.disabled = false;
    input.focus();
    if (typeof onDone === "function") onDone();
  }

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* ---------- обработка пользовательских команд ---------- */

  const COMMANDS = {
    help() {
      addLine([
        "Доступные команды:",
        "  GUI      — запустить графическую часть хаба",
        "  status   — состояние сервисов хаба",
        "  projects — список проектов (текстом)",
        "  whoami   — кто я?",
        "  ai <вопрос> — спросить Yuriko AI (или 'ai' — открыть чат)",
        "  rave [status]     — открыть Rave / проверить аккаунт",
        "  ykotube [stats]   — открыть YkoTube / статистику БД",
        "  speed <режим>     — скорость загрузки: instant|fast|normal",
        "  banner   — показать логотип",
        "  clear    — очистить экран",
        "  reboot   — перезагрузить терминал",
        "  sudo ..  — попытаться получить права :)",
      ].join("\n"), "line-info");
    },
    ai(arg) {
      const q = arg.trim();
      if (!q) {
        addLine("Открываю Yuriko AI Assistant...", "line-ok");
        setTimeout(() => window.YurikoAUI.open(), 300);
        return;
      }
      addLine('yuriko-ai: обрабатываю запрос "' + escapeHtml(q) + '"...', "line-info");
      let resp;
      try {
        resp = window.YurikoAI.answer(q);
      } catch (e) {
        resp = "ошибка движка: " + e.message;
      }
      resp.split("\n").forEach((l) => addLine("✦ " + l, "line-ok"));
    },
    gui() {
      addLine("Запуск графического окружения Yuriko Hub...", "line-ok");
      setTimeout(() => window.YurikoHub.openGUI(), 500);
    },
    async rave(arg) {
      const a = (arg || "").trim();
      const base = window.YURIKO_CONFIG ? window.YURIKO_CONFIG.apiBase : "http://localhost:8080/api";
      if (a === "status" && typeof fetch === "function") {
        fetch(base + "/rave/me").then(r => r.json()).then(d =>
          addLine(d.error ? "Rave: не авторизован (войди через GUI → Rave)" : "Rave: пользователь " + d.username + ", 2FA: " + (d.two_factor ? "вкл" : "выкл"), "line-info")
        ).catch(() => addLine("Rave API недоступен. Запусти: node server/server.js", "line-error"));
        return;
      }
      addLine("Открываю Rave — мессенджер с ботами-верификаторами...", "line-ok");
      setTimeout(() => { window.YurikoHub.openGUI(); setTimeout(() => location.href = "rave.html", 300); }, 400);
    },
    async ykotube(arg) {
      const a = (arg || "").trim();
      const base = window.YURIKO_CONFIG ? window.YURIKO_CONFIG.apiBase : "http://localhost:8080/api";
      if (a === "stats" && typeof fetch === "function") {
        fetch(base + "/ykotube/stats").then(r => r.json()).then(d =>
          addLine(`YkoTube БД @${d.host} (${d.user}, без пароля): channels=${d.channels} videos=${d.videos}`, "line-info")
        ).catch(() => addLine("YkoTube API недоступен. Запусти: node server/server.js", "line-error"));
        return;
      }
      addLine("Открываю YkoTube — видеохостинг со входом через Rave...", "line-ok");
      setTimeout(() => { window.YurikoHub.openGUI(); setTimeout(() => location.href = "ykotube.html", 300); }, 400);
    },
    status() {
      const base = window.YURIKO_CONFIG ? window.YURIKO_CONFIG.apiBase : "http://localhost:8080/api";
      addLine("yuriko-core   ● running (healthy)", "line-ok");
      addLine("yuriko-net    ● running (healthy)", "line-ok");
      addLine("yuriko-auth   ● running (healthy)", "line-ok");
      addLine("mysql         ● localhost:3306 (root, без пароля)", "line-ok");
      addLine("apache        ● :80 / :443 (статика хаба)", "line-ok");
      addLine("rave-api      ● " + base + "/rave (БД yarikodb)", "line-ok");
      addLine("ykotube-api   ● " + base + "/ykotube (БД ykotube)", "line-ok");
      addLine("yuriko-gui    ○ standby — ждёт команды GUI", "line-warn");
    },
    projects() {
      if (window.PROJECTS && window.PROJECTS.length) {
        window.PROJECTS.forEach(p =>
          addLine("  ◈ " + p.name + " — " + p.desc, "line-info")
        );
      } else {
        addLine("Проектов пока нет. Введите GUI, чтобы увидеть будущее.", "line-warn");
      }
    },
    whoami() {
      addLine("guest@yuriko-hub — добро пожаловать, странник ✦", "line-info");
    },
    banner() {
      showBanner();
    },
    clear() {
      output.innerHTML = "";
    },
    reboot() {
      localStorage.removeItem("yuriko_booted");
      localStorage.removeItem("yuriko_session");
      output.innerHTML = "";
      showBanner();
      runBootSequence();
    },
    speed(arg) {
      const a = (arg || "").trim().toLowerCase();
      if (["instant", "fast", "normal"].includes(a)) {
        localStorage.setItem("yuriko_boot_speed", a);
        addLine("Скорость загрузки установлена: " + a + ". Теперь: reboot", "line-ok");
      } else {
        addLine("Использование: speed instant | speed fast | speed normal (сейчас: " + bootSpeed() + ")", "line-info");
      }
    },
  };

  function handleCommand(raw) {
    const cmd = raw.trim().toLowerCase();
    if (!cmd) return;
    addLine('<span class="prompt">user@yuriko-hub:~$</span> <span class="line-cmd">' + escapeHtml(raw) + "</span>");
    history.push(raw);
    histIdx = history.length;

    if (cmd.startsWith("sudo")) {
      addLine("user is not in the sudoers file. This incident will be reported. 😄", "line-error");
      return;
    }
    const parts = cmd.split(/\s+/);
    const fn = COMMANDS[parts[0]];
    if (fn) {
      // передаём аргументы команде (например: ai <вопрос>)
      const arg = raw.trim().slice(parts[0].length).trim();
      fn(arg);
    } else {
      addLine('bash: ' + escapeHtml(cmd.split(/\s+/)[0]) + ": команда не найдена. Введите help.", "line-error");
    }
  }

  input.addEventListener("keydown", (e) => {
    if (busy) { e.preventDefault(); return; }
    if (e.key === "Enter") {
      const val = input.value;
      input.value = "";
      handleCommand(val);
    } else if (e.key === "ArrowUp") {
      if (histIdx > 0) { histIdx--; input.value = history[histIdx]; }
      e.preventDefault();
    } else if (e.key === "ArrowDown") {
      if (histIdx < history.length - 1) { histIdx++; input.value = history[histIdx]; }
      else { histIdx = history.length; input.value = ""; }
      e.preventDefault();
    }
  });

  // клик по окну терминала фокусирует ввод
  document.querySelector(".terminal-window").addEventListener("click", () => {
    if (!input.disabled) input.focus();
  });

  /* ---------- публичный API ---------- */
  window.YurikoHub = window.YurikoHub || {};

  // сохранение сессии: куда вести пользователя после загрузки терминала
  function saveSession() {
    const guiActive = document.getElementById("gui-screen").classList.contains("active");
    localStorage.setItem("yuriko_session", guiActive ? "gui" : "terminal");
  }
  window.addEventListener("beforeunload", saveSession);
  setInterval(saveSession, 2000);

  window.YurikoHub.backToTerminal = function () {
    document.getElementById("gui-screen").classList.remove("active");
    document.getElementById("terminal-screen").classList.add("active");
    addLine("", "");
    addLine("Сессия GUI закрыта. Добро пожаловать обратно в терминал.", "line-info");
    input.focus();
  };

  /* ---------- старт (с учётом сохранённой сессии) ---------- */
  showBanner();

  const resumedGui = localStorage.getItem("yuriko_session") === "gui";

  runBootSequence(function () {
    if (resumedGui && window.YurikoHub.openGUI) {
      addLine("♻ Восстановлена прошлая сессия — возвращаемся в GUI.", "line-ok");
      setTimeout(() => window.YurikoHub.openGUI(), 250);
    }
  });
})();
