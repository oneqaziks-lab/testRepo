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

  function runBootSequence() {
    busy = true;
    input.disabled = true;
    let i = 0;

    function step() {
      if (i >= BOOT_COMMANDS.length) {
        finishBoot();
        return;
      }
      const c = BOOT_COMMANDS[i];
      // сама команда (как будто пользователь её набрал)
      addLine('<span class="prompt">user@yuriko-hub:~$</span> <span class="line-cmd">' + escapeHtml(c.cmd) + "</span>");
      // результат в стиле systemd
      const num = String(i + 1).padStart(2, "0");
      addLine(
        tagHtml("OK") +
        '<span class="line-info">' + pad(num, 4) + " " + escapeHtml(c.msg) + "</span>"
      );
      i++;
      // случайная задержка для реалистичности
      setTimeout(step, 55 + Math.random() * 90);
    }

    step();
  }

  function finishBoot() {
    busy = false;
    bootDone = true;
    addLine("", "");
    addLine("<b>Загрузка завершена за 8.42 с. Доступно 80 сервисов.</b>", "line-ok");
    addLine('Введите <span class="line-cmd"><b>GUI</b></span> для запуска графической части хаба, или <span class="line-cmd">help</span> для списка команд.', "line-info");
    addLine("", "");
    input.disabled = false;
    input.focus();
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
        "  banner   — показать логотип",
        "  clear    — очистить экран",
        "  reboot   — перезагрузить терминал",
        "  sudo ..  — попытаться получить права :)",
      ].join("\n"), "line-info");
    },
    gui() {
      addLine("Запуск графического окружения Yuriko Hub...", "line-ok");
      setTimeout(() => window.YurikoHub.openGUI(), 500);
    },
    status() {
      addLine("yuriko-core   ● running (healthy)", "line-ok");
      addLine("yuriko-net    ● running (healthy)", "line-ok");
      addLine("yuriko-auth   ● running (healthy)", "line-ok");
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
      output.innerHTML = "";
      showBanner();
      runBootSequence();
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
    const fn = COMMANDS[cmd.split(/\s+/)[0]];
    if (fn) {
      fn();
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
  window.YurikoHub.backToTerminal = function () {
    document.getElementById("gui-screen").classList.remove("active");
    document.getElementById("terminal-screen").classList.add("active");
    addLine("", "");
    addLine("Сессия GUI закрыта. Добро пожаловать обратно в терминал.", "line-info");
    input.focus();
  };

  /* ---------- старт ---------- */
  showBanner();
  runBootSequence();
})();
