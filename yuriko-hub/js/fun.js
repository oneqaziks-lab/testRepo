/* ============================================================
   Yuriko Hub v5.1 — «Приколюшки» пастельной темы
   • Обои (мягкие светлые по умолчанию) + панель настроек
   • Акцентный цвет, частицы, эмодзи-салют, круглые карточки, стекло
   • Живые часы + приветствие по времени суток
   • Ctrl+W — следующий обои, Ctrl+M — раздел настроек
   Все настройки сохраняются в localStorage.
   ============================================================ */

(function () {
  const WALLS = [
    { id: "cloud",    name: "Облако",    dark: false, css: "linear-gradient(160deg,#f7f4fb 0%,#eef3fa 55%,#f6f0f8 100%)" },
    { id: "dawn",     name: "Рассвет",   dark: false, css: "linear-gradient(135deg,#fdf1ec 0%,#fbe4ee 40%,#ece5fb 75%,#e2f0fa 100%)" },
    { id: "mint",     name: "Мята",      dark: false, css: "linear-gradient(135deg,#eef9f3 0%,#ddf1e8 45%,#e9f6fb 100%)" },
    { id: "lavender", name: "Лаванда",   dark: false, css: "linear-gradient(135deg,#f6f2fc 0%,#ebe2f8 50%,#f9ecf6 100%)" },
    { id: "peach",    name: "Персик",    dark: false, css: "linear-gradient(135deg,#fdf5ea 0%,#fbeadb 45%,#f9e3ec 100%)" },
    { id: "ocean",    name: "Океан",     dark: false, css: "linear-gradient(135deg,#edf6fb 0%,#e2eff8 45%,#e9f6f2 100%)" },
    { id: "blossom",  name: "Сакура",    dark: false, css: "linear-gradient(135deg,#fdf0f3 0%,#f8e7f2 50%,#efe9fa 100%)" },
    { id: "sand",     name: "Песок",     dark: false, css: "linear-gradient(135deg,#faf5ec 0%,#f3ead9 50%,#f7eee8 100%)" },
    { id: "dusk",     name: "Сумерки",   dark: true,  css: "linear-gradient(135deg,#4a4560 0%,#5d5474 55%,#77688a 100%)" },
    { id: "night",    name: "Ночь",      dark: true,  css: "linear-gradient(135deg,#3a3f4c 0%,#4a5064 60%,#565270 100%)" },
  ];

  const ACCENTS = [
    { id: "lilac",  name: "Сирень",  a: "#b48cc4", d: "#8e6aa6", g2: "#aecfec" },
    { id: "sage",   name: "Шалфей",  a: "#8bbfa3", d: "#5f9a7e", g2: "#a8d8e8" },
    { id: "apricot",name: "Абрикос", a: "#eab58a", d: "#c98a5e", g2: "#f3c1cf" },
    { id: "rose",   name: "Роза",    a: "#e8a2b8", d: "#c56f8d", g2: "#d9b8ec" },
    { id: "sky",    name: "Небо",    a: "#8fbce0", d: "#5f92bd", g2: "#b8d8ca" },
  ];

  const TOGGLES = [
    { key: "particles", def: true,  el: "tg-particles" },
    { key: "emoji",     def: true,  el: "tg-emoji" },
    { key: "round",     def: false, el: "tg-round" },
    { key: "glass",     def: true,  el: "tg-glass" },
  ];

  const K = { wall: "yuriko.wall", accent: "yuriko.accent", tg: "yuriko.toggles." };
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };

  /* ---------- обои ---------- */
  function currentWall() {
    const id = store.get(K.wall, "cloud");
    return WALLS.find(w => w.id === id) || WALLS[0];
  }
  function applyWall(w) {
    document.body.dataset.wall = w.id;
    document.body.classList.toggle("wall-dark", !!w.dark);
    store.set(K.wall, w.id);
    document.querySelectorAll("[data-wall]").forEach(b =>
      b.classList.toggle("active", b.dataset.wall === w.id));
    if (getTg("emoji")) emojiBurst();
  }
  function nextWall(step) {
    const i = WALLS.findIndex(x => x.id === currentWall().id);
    applyWall(WALLS[(i + (step || 1) + WALLS.length) % WALLS.length]);
    toast("🎨 Обои: " + currentWall().name);
  }

  /* ---------- акцент ---------- */
  function applyAccent(id) {
    const c = ACCENTS.find(a => a.id === id) || ACCENTS[0];
    const r = document.documentElement.style;
    r.setProperty("--p-accent", c.a);
    r.setProperty("--p-accent-deep", c.d);
    r.setProperty("--p-accent-2", c.g2);
    store.set(K.accent, c.id);
    document.querySelectorAll(".accent-btn").forEach(b =>
      b.classList.toggle("active", b.dataset.accent === c.id));
  }

  /* ---------- тумблеры ---------- */
  function getTg(key) {
    const t = TOGGLES.find(x => x.key === key);
    return store.get(K.tg + key, t ? t.def : false) === "1";
  }
  function applyToggles() {
    document.body.classList.toggle("fx-particles", getTg("particles"));
    document.body.classList.toggle("fx-round", getTg("round"));
    document.body.classList.toggle("fx-noglass", !getTg("glass"));
    TOGGLES.forEach(t => {
      const host = document.getElementById(t.el);
      if (!host || host.querySelector("input")) return;
      const lab = document.createElement("label");
      lab.className = "switch";
      const inp = document.createElement("input");
      inp.type = "checkbox"; inp.checked = getTg(t.key);
      const sl = document.createElement("span"); sl.className = "slider";
      lab.append(inp, sl); host.replaceChildren(lab);
      inp.addEventListener("change", () => {
        store.set(K.tg + t.key, inp.checked ? "1" : "0");
        applyToggles();
        toast((t.key === "particles" ? "✨ " : "🔮 ") + (inp.checked ? "включено" : "выключено"));
      });
    });
  }

  /* ---------- панель выбора обоев (секция «Настройки») ---------- */
  function buildSettings() {
    const wallsHost = document.getElementById("settings-walls");
    if (wallsHost && !wallsHost.querySelector(".wall-grid")) {
      const grid = document.createElement("div");
      grid.className = "wall-grid";
      WALLS.forEach(w => {
        const b = document.createElement("button");
        b.className = "wall-pick-btn"; b.dataset.wall = w.id; b.title = w.name;
        b.style.background = w.css;
        b.addEventListener("click", () => {
          applyWall(w); toast("🎨 Обои: " + w.name);
        });
        grid.appendChild(b);
      });
      const rnd = document.createElement("button");
      rnd.className = "btn btn-small"; rnd.textContent = "🎲 Случайные";
      rnd.addEventListener("click", () => nextWall(1 + Math.floor(Math.random() * (WALLS.length - 1))));
      grid.appendChild(rnd);
      wallsHost.appendChild(grid);
    }

    const accHost = document.getElementById("settings-accents");
    if (accHost && !accHost.querySelector(".accent-btn")) {
      ACCENTS.forEach(c => {
        const b = document.createElement("button");
        b.className = "accent-btn"; b.dataset.accent = c.id; b.title = c.name;
        b.style.background = "linear-gradient(135deg," + c.a + "," + c.g2 + ")";
        b.addEventListener("click", () => { applyAccent(c.id); toast("🎯 Акцент: " + c.name); });
        accHost.appendChild(b);
      });
    }

    const reset = document.getElementById("btn-reset-style");
    if (reset && !reset._bound) {
      reset._bound = true;
      reset.addEventListener("click", () => {
        Object.values(K).forEach(k => k.endsWith(".") ? TOGGLES.forEach(t => store.del(K.tg + t.key)) : store.del(k));
        applyWall(WALLS[0]);
        applyAccent(ACCENTS[0].id);
        applyToggles();
        toast("↺ Стиль сброшен к мягкому стандарту");
      });
    }
  }

  /* ---------- эмодзи-салют + частицы ---------- */
  const EMOJIS = ["🌸", "✨", "🫧", "🌷", "☁️", "💜", "🍑", "🌿"];
  function emojiBurst() {
    for (let i = 0; i < 14; i++) {
      const s = document.createElement("span");
      s.className = "fun-float";
      s.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
      s.style.left = (5 + Math.random() * 90) + "vw";
      s.style.animationDuration = (2.4 + Math.random() * 2.2) + "s";
      s.style.fontSize = (16 + Math.random() * 20) + "px";
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 4800);
    }
  }

  let particlesBuilt = false;
  function buildParticles() {
    if (particlesBuilt) return;
    particlesBuilt = true;
    for (let i = 0; i < 16; i++) {
      const p = document.createElement("span");
      p.className = "fun-particle";
      const sz = 4 + Math.random() * 10;
      p.style.width = p.style.height = sz + "px";
      p.style.left = (Math.random() * 100) + "vw";
      p.style.animationDuration = (14 + Math.random() * 20) + "s";
      p.style.animationDelay = (-Math.random() * 20) + "s";
      document.body.appendChild(p);
    }
  }

  /* ---------- toast ---------- */
  let toastTimer = null;
  function toast(text) {
    let t = document.getElementById("wall-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "wall-toast"; t.className = "home-toast";
      document.body.appendChild(t);
    }
    t.textContent = text;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  /* ---------- часы + приветствие ---------- */
  function tickClock() {
    const timeEl = document.getElementById("clock-time");
    const dateEl = document.getElementById("clock-date");
    const greetEl = document.getElementById("greeting");
    if (!timeEl) return;
    const now = new Date();
    timeEl.textContent = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    if (dateEl) dateEl.textContent = now.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
    if (greetEl) {
      const h = now.getHours();
      greetEl.textContent = (h < 5 ? "Доброй ночи" : h < 12 ? "Доброе утро" : h < 18 ? "Добрый день" : "Добрый вечер") + ", Yuriko 🌸";
    }
  }

  /* ---------- переход к настройкам ---------- */
  function openSettings() {
    const link = document.querySelector('.home-nav-link[data-section="settings"]');
    if (link) link.click();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------- старт ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    buildParticles();
    applyWall(currentWall());
    applyAccent(store.get(K.accent, ACCENTS[0].id));
    applyToggles();
    buildSettings();
    tickClock();
    setInterval(tickClock, 10000);

    const wallBtn = document.getElementById("btn-wall-next");
    if (wallBtn) wallBtn.addEventListener("click", () => nextWall(1));
    const setBtn = document.getElementById("btn-settings");
    if (setBtn) setBtn.addEventListener("click", openSettings);

    document.addEventListener("keydown", (e) => {
      if (!e.ctrlKey) return;
      const k = e.key.toLowerCase();
      if (k === "w" || k === "ц") { e.preventDefault(); nextWall(1); }
      if (k === "m" || k === "ь") { e.preventDefault(); openSettings(); }
    });
  });

  window.YurikoFun = { nextWall, toast, WALLS, ACCENTS, openSettings };
})();
