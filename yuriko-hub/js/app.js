/* ============================================================
   Yuriko Hub v6.0 — ядро GUI: навигация, обои, настройки, часы,
   приветствия, тосты, салют, сохранение состояния
   ============================================================ */
(function () {
  const LS = "hub.settings.v6";
  let settings = { wallpaper: "cloud", accent: "lilac", particles: true, confetti: true, roundness: false, glass: true };
  try { Object.assign(settings, JSON.parse(localStorage.getItem(LS) || "{}")); } catch (e) {}

  /* ---------- обои (мягкие, светлые) ---------- */
  const WALLPAPERS = [
    { id: "cloud",   name: "Облако",    css: "linear-gradient(160deg,#f7f4fb 0%,#ece5f5 45%,#e3ecf7 100%)" },
    { id: "dawn",    name: "Рассвет",   css: "linear-gradient(150deg,#fdf3ee 0%,#f8e3e9 50%,#efe4f6 100%)" },
    { id: "mint",    name: "Мята",      css: "linear-gradient(155deg,#f0f8f3 0%,#e2f2ea 55%,#eaf5ef 100%)" },
    { id: "lavand",  name: "Лаванда",   css: "linear-gradient(150deg,#f5f1fa 0%,#eae1f4 50%,#f3edf9 100%)" },
    { id: "peach",   name: "Персик",    css: "linear-gradient(150deg,#fdf4ec 0%,#fbe8d8 50%,#f9eee4 100%)" },
    { id: "sky",     name: "Небо",      css: "linear-gradient(160deg,#eff6fb 0%,#e2eef8 50%,#eef4fa 100%)" },
    { id: "sakura",  name: "Сакура",    css: "linear-gradient(150deg,#fcf2f5 0%,#f7e4ec 55%,#faf0f4 100%)" },
    { id: "sand",    name: "Песок",     css: "linear-gradient(155deg,#faf6ee 0%,#f3ead9 55%,#f8f2e6 100%)" },
    { id: "mist",    name: "Дымка",     css: "linear-gradient(160deg,#f2f3f6 0%,#e7e9ef 50%,#f0f1f5 100%)" },
    { id: "dusk",    name: "Сумерки",   css: "linear-gradient(155deg,#e9e4f0 0%,#ddd3e8 55%,#e6dff0 100%)" }
  ];

  const ACCENTS = [
    { id: "lilac",  name: "Сирень", a: "#b195cf", b: "#d4bce8" },
    { id: "sage",   name: "Шалфей", a: "#93bda0", b: "#c2dfca" },
    { id: "apricot",name: "Абрикос",a: "#ddab7e", b: "#f0d3b4" },
    { id: "rose",   name: "Роза",   a: "#d49bb4", b: "#eccadb" },
    { id: "sky",    name: "Небо",   a: "#8fb4d9", b: "#c3dbef" }
  ];

  function applyWallpaper(id, silent) {
    const w = WALLPAPERS.find(x => x.id === id) || WALLPAPERS[0];
    document.getElementById("wallpaper").style.background = w.css;
    settings.wallpaper = id; persist();
    document.querySelectorAll(".wp-tile").forEach(t => t.classList.toggle("sel", t.dataset.wp === id));
    if (!silent && settings.confetti) fireworks();
    if (!silent) window.hubToast("🖼 Обои: " + w.name);
  }

  function applyAccent(id) {
    const a = ACCENTS.find(x => x.id === id) || ACCENTS[0];
    document.documentElement.style.setProperty("--accent", a.a);
    document.documentElement.style.setProperty("--accent-2", a.b);
    settings.accent = id; persist();
    document.querySelectorAll(".swatch").forEach(s => s.classList.toggle("sel", s.dataset.ac === id));
  }

  function persist() { localStorage.setItem(LS, JSON.stringify(settings)); }

  /* ---------- частицы ---------- */
  let particleTimer = null;
  function startParticles() {
    stopParticles();
    if (!settings.particles) return;
    const zone = document.getElementById("particles");
    particleTimer = setInterval(() => {
      if (document.hidden) return;
      const p = document.createElement("div");
      p.className = "particle";
      const size = 6 + Math.random() * 14;
      p.style.width = p.style.height = size + "px";
      p.style.left = Math.random() * 100 + "vw";
      const pal = ["#d9c7ea", "#cfe7d8", "#f3dcc9", "#cfe0f0", "#eecfd9"];
      p.style.background = pal[Math.floor(Math.random() * pal.length)];
      p.style.animationDuration = 9 + Math.random() * 12 + "s";
      zone.append(p);
      setTimeout(() => p.remove(), 22000);
    }, 1400);
  }
  function stopParticles() { if (particleTimer) clearInterval(particleTimer); particleTimer = null; document.getElementById("particles").innerHTML = ""; }

  /* ---------- салют ---------- */
  function fireworks() {
    const emo = ["🌸", "✨", "🫧", "🍬", "💜", "🌈"];
    for (let i = 0; i < 18; i++) {
      const c = document.createElement("div");
      c.className = "confetti";
      c.textContent = emo[i % emo.length];
      c.style.left = Math.random() * 100 + "vw";
      c.style.top = "-24px";
      c.style.animationDelay = Math.random() * .5 + "s";
      document.body.append(c);
      setTimeout(() => c.remove(), 2200);
    }
  }

  /* ---------- тосты ---------- */
  window.hubToast = function (text) {
    const z = document.getElementById("toast-zone");
    const t = document.createElement("div");
    t.className = "toast"; t.textContent = text;
    z.append(t);
    setTimeout(() => { t.style.opacity = "0"; t.style.transition = ".4s"; setTimeout(() => t.remove(), 400); }, 2400);
  };

  /* ---------- навигация ---------- */
  function showSection(name) {
    document.querySelectorAll(".section").forEach(s => s.classList.toggle("active", s.id === "sec-" + name));
    document.querySelectorAll(".nav-link").forEach(n => n.classList.toggle("active", n.dataset.section === name));
    localStorage.setItem("hub.section", name);
    if (name === "devices") window.hubDevices.init();
  }

  /* ---------- часы и приветствие ---------- */
  function tickClock() {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0"), mm = String(d.getMinutes()).padStart(2, "0");
    document.getElementById("clock-time").textContent = hh + ":" + mm;
    document.getElementById("clock-date").textContent = d.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
    const h = d.getHours();
    const gr = h < 5 ? "Доброй ночи" : h < 12 ? "Доброе утро" : h < 18 ? "Добрый день" : "Добрый вечер";
    document.getElementById("greeting").textContent = gr + ", Yuriko 🌿";
  }

  /* ---------- статус шлюза ---------- */
  async function checkGateway() {
    const dot = document.getElementById("gw-dot"), txt = document.getElementById("gw-text");
    try {
      const r = await fetch(window.HUB_CONFIG.apiBase + "/api/health", { signal: AbortSignal.timeout(3000) });
      const j = await r.json();
      dot.className = "gw-dot online";
      txt.textContent = "Шлюз онлайн · БД подключена";
    } catch (e) {
      dot.className = "gw-dot offline";
      txt.textContent = "Шлюз офлайн · запустите сервер";
    }
  }

  /* ---------- проекты ---------- */
  function renderProjects() {
    const grid = document.getElementById("projects-grid");
    grid.innerHTML = "";
    window.PROJECTS.forEach(p => {
      const card = document.createElement("div"); card.className = "card proj-card";
      const badge = p.status === "done" ? '<span class="badge badge-done">ГОТОВО</span>'
        : p.status === "dev" ? '<span class="badge badge-dev">В РАЗРАБОТКЕ</span>'
        : '<span class="badge badge-soon">СКОРО</span>';
      card.innerHTML = `<div class="proj-icon">${p.icon}</div><div class="proj-name"></div>${badge}<p class="proj-desc"></p>`;
      card.querySelector(".proj-name").textContent = p.name;
      card.querySelector(".proj-desc").textContent = p.desc;
      const btnRow = document.createElement("div");
      if (p.url) {
        const b = document.createElement("button"); b.className = "btn btn-primary btn-sm"; b.textContent = "Открыть →";
        b.onclick = () => location.href = p.url;
        btnRow.append(b);
      } else if (p.action === "openAI") {
        const b = document.createElement("button"); b.className = "btn btn-primary btn-sm"; b.textContent = "Спросить ✦";
        b.onclick = () => window.hubAI.open();
        btnRow.append(b);
      } else if (p.action === "openDevices") {
        const b = document.createElement("button"); b.className = "btn btn-primary btn-sm"; b.textContent = "Карта сети →";
        b.onclick = () => showSection("devices");
        btnRow.append(b);
      } else {
        const b = document.createElement("button"); b.className = "btn btn-sm"; b.textContent = "В разработке"; b.disabled = true; b.style.opacity = ".5";
        btnRow.append(b);
      }
      card.append(btnRow);
      grid.append(card);
    });
  }

  /* ---------- сцены ---------- */
  const SCENES = [
    { id: "morning", emoji: "🌅", name: "Доброе утро", desc: "Свет 80%, шторы открыты, чайник включён, новости в колонку.",
      act: () => { dev("light-living", { on: true, value: 80 }); dev("curtain", { on: true, value: 100 }); dev("kettle", { on: true }); dev("speaker", { on: true, value: 30 }); } },
    { id: "movie", emoji: "🎬", name: "Режим «Кино»", desc: "Люстра на 15%, телевизор вкл., шторы закрыты.",
      act: () => { dev("light-living", { on: true, value: 15 }); dev("tv", { on: true }); dev("curtain", { on: true, value: 0 }); } },
    { id: "cozy", emoji: "🕯", name: "Уютный вечер", desc: "Ночник вкл., тёплый пол 27°, подсветка 40%.",
      act: () => { dev("bedside", { on: true, value: 35 }); dev("floor", { on: true, value: 27 }); dev("light-kitchen", { on: true, value: 40 }); } },
    { id: "night", emoji: "🌙", name: "Спокойной ночи", desc: "Всё выключить, замок проверить, свет минимальный.",
      act: () => { ["light-living","tv","kettle","coffee","speaker","vacuum"].forEach(id => dev(id, { on: false })); dev("bedside", { on: false }); dev("curtain", { on: true, value: 0 }); } },
    { id: "away", emoji: "🚪", name: "Я ушёл из дома", desc: "Экономия: всё off, камера и замок — на охране.",
      act: () => { SMART_ON().forEach(d => dev(d, { on: false })); window.hubToast("🔒 Охранный режим активен"); } },
    { id: "welcome", emoji: "🏡", name: "Добро пожаловать домой", desc: "Свет в прихожей и кухне, кондиционер 24°, музыка.",
      act: () => { dev("light-kitchen", { on: true, value: 75 }); dev("ac", { on: true, value: 24 }); dev("speaker", { on: true, value: 35 }); } }
  ];
  function dev(id, patch) { window.hubDevices.set(id, patch); }
  function SMART_ON() { return window.hubDevices.SMART.filter(d => d.on && d.kind !== "sensor").map(d => d.id); }

  function renderScenes() {
    const grid = document.getElementById("scenes-grid");
    grid.innerHTML = "";
    SCENES.forEach(s => {
      const card = document.createElement("div"); card.className = "card scene-card";
      card.innerHTML = `<div class="scene-emoji">${s.emoji}</div><div class="scene-name"></div><p class="scene-desc"></p>`;
      card.querySelector(".scene-name").textContent = s.name;
      card.querySelector(".scene-desc").textContent = s.desc;
      const b = document.createElement("button"); b.className = "btn btn-primary btn-sm"; b.textContent = "Активировать";
      b.onclick = () => { s.act(); window.hubToast(s.emoji + " Сцена «" + s.name + "» активна"); };
      card.append(b);
      grid.append(card);
    });
  }

  /* ---------- настройки ---------- */
  function renderSettings() {
    const wpGrid = document.getElementById("wp-grid");
    wpGrid.innerHTML = "";
    WALLPAPERS.forEach(w => {
      const t = document.createElement("div");
      t.className = "wp-tile" + (w.id === settings.wallpaper ? " sel" : "");
      t.dataset.wp = w.id; t.style.background = w.css; t.textContent = w.name;
      t.onclick = () => applyWallpaper(w.id);
      wpGrid.append(t);
    });
    const sw = document.getElementById("accent-row");
    sw.innerHTML = "";
    ACCENTS.forEach(a => {
      const el = document.createElement("div");
      el.className = "swatch" + (a.id === settings.accent ? " sel" : "");
      el.dataset.ac = a.id; el.title = a.name;
      el.style.background = `linear-gradient(135deg, ${a.a}, ${a.b})`;
      el.onclick = () => { applyAccent(a.id); window.hubToast("🎨 Акцент: " + a.name); };
      sw.append(el);
    });
    bindToggle("tg-particles", settings.particles, v => { settings.particles = v; v ? startParticles() : stopParticles(); persist(); });
    bindToggle("tg-confetti", settings.confetti, v => { settings.confetti = v; persist(); });
    bindToggle("tg-round", settings.roundness, v => { settings.roundness = v; document.documentElement.style.setProperty("--radius", v ? "30px" : "20px"); persist(); });
    bindToggle("tg-glass", settings.glass, v => {
      settings.glass = v;
      document.querySelectorAll(".card,.sidebar").forEach(x => x.style.backdropFilter = v ? "" : "none");
      persist();
    });
    document.getElementById("btn-random-wp").onclick = () => {
      const others = WALLPAPERS.filter(w => w.id !== settings.wallpaper);
      applyWallpaper(others[Math.floor(Math.random() * others.length)].id);
    };
    document.getElementById("btn-reset").onclick = () => {
      localStorage.removeItem(LS); location.reload();
    };
    if (settings.roundness) document.documentElement.style.setProperty("--radius", "30px");
  }
  function bindToggle(id, val, cb) {
    const inp = document.getElementById(id); inp.checked = val;
    inp.onchange = () => cb(inp.checked);
  }

  /* ---------- о системе ---------- */
  function fillAbout() {
    const el = document.getElementById("about-info");
    el.innerHTML = `
      <div class="kv"><span>Версия хаба</span><b>v6.0 · soft pastel</b></div>
      <div class="kv"><span>Интерфейс</span><b>только графический (без терминала)</b></div>
      <div class="kv"><span>API-сервер</span><b class="mono">${window.HUB_CONFIG.apiBase}</b></div>
      <div class="kv"><span>БД Rave</span><b>yarikodb · root@localhost</b></div>
      <div class="kv"><span>БД YkoTube</span><b>ykotube · root@localhost</b></div>
      <div class="kv"><span>Порты</span><b>Apache 80/443 · MySQL 3306 · Node 8080</b></div>
      <div class="kv"><span>Автообновление</span><b>update.bat / update.sh</b></div>`;
  }

  /* ---------- горячие клавиши ---------- */
  document.addEventListener("keydown", e => {
    if (e.ctrlKey && e.key.toLowerCase() === "w") { e.preventDefault(); nextWallpaper(); }
    if (e.ctrlKey && e.key.toLowerCase() === "m") { e.preventDefault(); showSection("settings"); }
  });
  function nextWallpaper() {
    const i = WALLPAPERS.findIndex(w => w.id === settings.wallpaper);
    applyWallpaper(WALLPAPERS[(i + 1) % WALLPAPERS.length].id);
  }

  /* ---------- старт ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    applyWallpaper(settings.wallpaper, true);
    applyAccent(settings.accent);
    startParticles();
    renderProjects();
    renderScenes();
    renderSettings();
    fillAbout();
    tickClock(); setInterval(tickClock, 10000);
    checkGateway(); setInterval(checkGateway, 20000);

    document.querySelectorAll(".nav-link").forEach(n => n.onclick = () => showSection(n.dataset.section));
    document.getElementById("btn-wp-quick").onclick = nextWallpaper;
    document.getElementById("btn-ai-top").onclick = () => window.hubAI.open();

    const saved = localStorage.getItem("hub.section") || "projects";
    showSection(saved);

    fireworksOnce();
  });

  function fireworksOnce() {
    // лёгкая анимация появления при первом входе за сессию
    if (sessionStorage.getItem("hub.welcomed")) return;
    sessionStorage.setItem("hub.welcomed", "1");
    setTimeout(() => window.hubToast("🌿 Добро пожаловать в Yuriko Hub"), 500);
  }

  window.hubNav = { showSection };
})();
