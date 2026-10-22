/* ============================================================
   Yuriko Hub v5.0 — «Приколюшки» пастельной темы
   • Смена обоев (8 градиентов) с сохранением выбора
   • Тёмные обои автоматически меняют палитру текста
   • Живые часы + дата в сайдбаре, приветствие по времени суток
   • Кнопка 🎲 — случайная стена; Ctrl+W — следующая стена
   ============================================================ */

(function () {
  const WALLS = [
    { id: "dawn",     name: "Рассвет",   dark: false, css: "linear-gradient(135deg,#ffe9e3,#ffd6e8,#e3d9ff,#d6ecff)" },
    { id: "mint",     name: "Мята",      dark: false, css: "linear-gradient(135deg,#e6f7ef,#d2f0e4,#dff2fa)" },
    { id: "lavender", name: "Лаванда",   dark: false, css: "linear-gradient(135deg,#f3edff,#e8dcff,#ffe9f6)" },
    { id: "peach",    name: "Персик",    dark: false, css: "linear-gradient(135deg,#fff3e6,#ffe4d1,#ffd9e8)" },
    { id: "ocean",    name: "Океан",     dark: false, css: "linear-gradient(135deg,#e8f4fb,#dcedf9,#e6f6f1)" },
    { id: "dusk",     name: "Сумерки",   dark: true,  css: "linear-gradient(135deg,#2e2a45,#4a3f63,#6b5a7e)" },
    { id: "night",    name: "Ночь",      dark: true,  css: "linear-gradient(135deg,#20242e,#2f3547,#3d3a52)" },
    { id: "forest",   name: "Лес",       dark: true,  css: "linear-gradient(135deg,#243530,#33503f,#4a6b52)" },
  ];
  const KEY = "yuriko.wall";

  function currentWallId() {
    try { return localStorage.getItem(KEY) || "lavender"; } catch (e) { return "lavender"; }
  }

  function applyWall(id) {
    const w = WALLS.find(x => x.id === id) || WALLS[0];
    document.body.dataset.wall = w.id;
    document.body.classList.toggle("wall-dark", !!w.dark);
    try { localStorage.setItem(KEY, w.id); } catch (e) {}
    document.querySelectorAll(".wall-pick-btn").forEach(b =>
      b.classList.toggle("active", b.dataset.wall === w.id));
    return w;
  }

  function nextWall(step) {
    const idx = WALLS.findIndex(w => w.id === currentWallId());
    const nw = WALLS[(idx + (step || 1) + WALLS.length) % WALLS.length];
    const w = applyWall(nw.id);
    toast("🎨 Обои: " + w.name);
  }

  let toastTimer = null;
  function toast(text) {
    let t = document.getElementById("wall-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "wall-toast";
      t.className = "home-toast";
      document.body.appendChild(t);
    }
    t.textContent = text;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  /* ---------- панель выбора обоев (секция «О системе») ---------- */
  function buildWallPicker() {
    const about = document.getElementById("section-about");
    if (!about || about.querySelector(".wall-card")) return;

    const card = document.createElement("div");
    card.className = "about-card wall-card";
    card.style.maxWidth = "none";
    card.innerHTML =
      '<h2>🖼 Оформление хаба</h2>' +
      '<p class="section-subtitle" style="margin-bottom:16px">Выбери обои — выбор сохраняется и переживает перезагрузку страницы.</p>' +
      '<div class="wall-row" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center"></div>';

    const row = card.querySelector(".wall-row");
    WALLS.forEach((w) => {
      const b = document.createElement("button");
      b.className = "wall-pick-btn";
      b.dataset.wall = w.id;
      b.title = w.name;
      b.style.background = w.css;
      b.addEventListener("click", () => {
        const applied = applyWall(w.id);
        toast("🎨 Обои: " + applied.name);
      });
      row.appendChild(b);
    });

    const rnd = document.createElement("button");
    rnd.className = "btn btn-small";
    rnd.textContent = "🎲 Случайные";
    rnd.style.marginLeft = "6px";
    rnd.addEventListener("click", () => nextWall(1 + Math.floor(Math.random() * (WALLS.length - 1))));
    row.appendChild(rnd);

    about.appendChild(card);
  }

  /* ---------- часы + приветствие ---------- */
  function tickClock() {
    const timeEl = document.getElementById("clock-time");
    const dateEl = document.getElementById("clock-date");
    const greetEl = document.getElementById("greeting");
    if (!timeEl) return;
    const now = new Date();
    timeEl.textContent = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    if (dateEl) dateEl.textContent = now.toLocaleDateString("ru-RU", {
      weekday: "long", day: "numeric", month: "long",
    });
    if (greetEl) {
      const h = now.getHours();
      const g = h < 5 ? "Доброй ночи" : h < 12 ? "Доброе утро" : h < 18 ? "Добрый день" : "Добрый вечер";
      greetEl.textContent = g + ", Yuriko 🌸";
    }
  }

  /* ---------- старт ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    applyWall(currentWallId());
    buildWallPicker();
    tickClock();
    setInterval(tickClock, 10000);

    const wallBtn = document.getElementById("btn-wall-next");
    if (wallBtn) wallBtn.addEventListener("click", () => nextWall(1));

    // Ctrl+W — следующая стена
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && (e.key === "w" || e.key === "ц")) {
        e.preventDefault();
        nextWall(1);
      }
    });
  });

  window.YurikoFun = { nextWall, toast, WALLS };
})();
