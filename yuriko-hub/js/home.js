/* ============================================================
   Yuriko Hub — панель умного дома (GUI-режим)
   Устройства, комнаты, сцены, статистика. Состояние живёт в
   localStorage и переживает перезагрузку страницы.
   API для AI-ассистента: window.YurikoHome
   ============================================================ */

(function () {
  const LS_KEY = "yuriko-home-v1";

  /* ---------- каталог устройств (дефолты) ---------- */
  const DEFAULT_DEVICES = [
    // Гостиная
    { id: "light-living",  name: "Люстра «Гостиная»",     room: "Гостиная", type: "light", icon: "💡", power: 60,  on: true,  brightness: 80 },
    { id: "tv-living",     name: "Телевизор LG C3",       room: "Гостиная", type: "tv",    icon: "📺", power: 120, on: false },
    { id: "ac-living",     name: "Кондиционер Mitsubishi",room: "Гостиная", type: "climate",icon:"❄️", power: 900, on: false, target: 23 },
    { id: "speaker-living",name: "Колонка Yuriko One",    room: "Гостиная", type: "speaker",icon:"🔊", power: 25,  on: true,  volume: 40 },
    // Кухня
    { id: "light-kitchen", name: "Свет «Кухня»",          room: "Кухня",    type: "light", icon: "💡", power: 40,  on: false, brightness: 100 },
    { id: "kettle-kitchen",name: "Умный чайник",          room: "Кухня",    type: "kettle",icon: "🫖", power: 2000, on: false },
    { id: "coffee-kitchen",name: "Кофемашина",            room: "Кухня",    type: "coffee",icon: "☕", power: 1500, on: false, strength: 2 },
    { id: "fridge",        name: "Холодильник",           room: "Кухня",    type: "fridge",icon: "🧊", power: 110, on: true },
    // Спальня
    { id: "light-bed",     name: "Ночник «Спальня»",      room: "Спальня",  type: "light", icon: "🛏", power: 15,  on: false, brightness: 30 },
    { id: "curtain-bed",   name: "Шторы (электрокарниз)", room: "Спальня",  type: "curtain",icon:"🪟", power: 30,  on: false, open: 0 },
    { id: "humidifier-bed",name: "Увлажнитель",           room: "Спальня",  type: "humidifier",icon:"💨",power: 35, on: true },
    // Ванная / прихожая / двор
    { id: "floor-bath",    name: "Тёплый пол «Ванная»",   room: "Ванная",   type: "heater",icon: "♨️", power: 800, on: false, target: 28 },
    { id: "light-hall",    name: "Свет «Прихожая»",       room: "Прихожая", type: "light", icon: "💡", power: 30,  on: false, brightness: 70 },
    { id: "lock-door",     name: "Замок входной двери",   room: "Прихожая", type: "lock",  icon: "🔒", power: 5,   on: true },  // on = закрыто
    { id: "camera-yard",   name: "Камера «Двор»",         room: "Двор",     type: "camera",icon: "📹", power: 12,  on: true },
    { id: "robot-yard",    name: "Робот-пылесос Robo",    room: "Двор",     type: "vacuum",icon: "🤖", power: 55,  on: false },
  ];

  /* ---------- сцены ---------- */
  const SCENES = [
    { id: "morning", name: "Доброе утро", icon: "🌅", desc: "Свет в спальне и на кухне, шторы открыты, кофе варится, чайник включён.",
      steps: [["light-bed","on",false],["curtain-bed","open",100],["light-kitchen","on",true],["coffee-kitchen","on",true],["kettle-kitchen","on",true]] },
    { id: "movie", name: "Режим «Кино»", icon: "🎬", desc: "Телевизор включён, свет приглушён до 15%, колонка на 60%.",
      steps: [["tv-living","on",true],["light-living","brightness",15],["speaker-living","volume",60]] },
    { id: "evening", name: "Уютный вечер", icon: "🕯", desc: "Тёплый свет в гостиной 60%, кондиционер 24°, колонка играет.",
      steps: [["light-living","on",true],["light-living","brightness",60],["ac-living","target",24],["speaker-living","on",true]] },
    { id: "night", name: "Спокойной ночи", icon: "🌙", desc: "Всё выключено, шторы закрыты, замок проверен, ночник на 10%.",
      steps: [["light-living","on",false],["light-kitchen","on",false],["tv-living","on",false],["curtain-bed","open",0],["light-bed","brightness",10],["light-bed","on",true]] },
    { id: "away", name: "Я ушёл из дома", icon: "🚪", desc: "Свет и техника выключены, двери закрыты, камеры и пылесос на пост.",
      steps: [["light-living","on",false],["light-kitchen","on",false],["light-hall","on",false],["tv-living","on",false],["lock-door","on",true],["camera-yard","on",true],["robot-yard","on",true]] },
    { id: "welcome", name: "Добро пожаловать домой", icon: "🏡", desc: "Свет в прихожей и гостиной, чайник греет воду, замок открыт.",
      steps: [["light-hall","on",true],["light-living","on",true],["kettle-kitchen","on",true],["lock-door","on",false]] },
  ];

  /* ---------- состояние + persistence ---------- */
  let devices;
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY));
    devices = Array.isArray(saved) && saved.length ? saved : DEFAULT_DEVICES;
    // подтягиваем новые дефолтные устройства, которых нет в сохранённом списке
    DEFAULT_DEVICES.forEach(d => { if (!devices.some(x => x.id === d.id)) devices.push(d); });
  } catch (e) { devices = DEFAULT_DEVICES; }

  function save() { try { localStorage.setItem(LS_KEY, JSON.stringify(devices)); } catch (e) {} }

  const getDev = (id) => devices.find(d => d.id === id);

  /* ---------- расчётная статистика ---------- */
  function calcStats() {
    let onCount = 0, watts = 0;
    devices.forEach(d => { if (d.on) { onCount++; watts += d.power || 0; } });
    // температура/влажность "датчиков" зависят от климата
    const ac = getDev("ac-living"), heater = getDev("floor-bath"), hum = getDev("humidifier-bed");
    let temp = 22.5;
    if (ac && ac.on) temp = ac.target;
    else if (heater && heater.on) temp = Math.max(temp, heater.target - 4);
    let humidity = hum && hum.on ? 55 : 45;
    return { onCount, watts, temp: temp.toFixed(1), humidity };
  }

  /* ---------- рендер карточки устройства ---------- */
  function deviceCard(d) {
    const card = document.createElement("div");
    card.className = "device-card" + (d.on ? " dev-on" : "");
    card.dataset.id = d.id;

    const head = document.createElement("div");
    head.className = "dev-head";
    head.innerHTML =
      '<span class="dev-icon">' + d.icon + "</span>" +
      "<div><div class=\"dev-name\">" + d.name + '</div>' +
      '<div class="dev-room">' + d.room + "</div></div>";
    const toggle = document.createElement("label");
    toggle.className = "switch";
    toggle.title = "Вкл/выкл";
    toggle.innerHTML = '<input type="checkbox"' + (d.on ? " checked" : "") + "><span class=\"slider\"></span>";
    toggle.querySelector("input").addEventListener("change", (e) => {
      e.stopPropagation();
      setDevice(d.id, "on", toggle.querySelector("input").checked);
    });
    head.appendChild(toggle);
    card.appendChild(head);

    // специфичные контролы
    if (d.type === "light") card.appendChild(sliderRow("Яркость", "%", v => (d.brightness = v), d.brightness ?? 100));
    if (d.type === "speaker") card.appendChild(sliderRow("Громкость", "%", v => (d.volume = v), d.volume ?? 50));
    if (d.type === "curtain") card.appendChild(sliderRow("Открыты", "%", v => (d.open = v), d.open ?? 0));
    if (d.type === "climate" || d.type === "heater") card.appendChild(sliderRow("Цель °C", "°C", v => (d.target = v), d.target ?? 22, 16, 30));
    if (d.type === "coffee") {
      const row = document.createElement("div"); row.className = "dev-extra";
      row.innerHTML = '<span>Крепость</span>';
      const sel = document.createElement("select");
      [1,2,3].forEach(n => { const o=document.createElement("option"); o.value=n; o.textContent="★".repeat(n); if (n===d.strength) o.selected=true; sel.appendChild(o); });
      sel.addEventListener("change", () => { d.strength = +sel.value; save(); renderAll(); });
      row.appendChild(sel); card.appendChild(row);
    }
    if (d.type === "lock") {
      const hint = document.createElement("div"); hint.className = "dev-extra";
      hint.textContent = d.on ? "🔒 Закрыто" : "🔓 Открыто"; card.appendChild(hint);
    }

    card.addEventListener("click", (e) => {
      if (e.target.closest(".switch, .dev-extra, input[type=range]")) return;
      setDevice(d.id, "on", !d.on);
    });
    return card;
  }

  function sliderRow(label, unit, apply, value, min = 0, max = 100) {
    const row = document.createElement("div"); row.className = "dev-extra range-row";
    const span = document.createElement("span"); span.textContent = label;
    const val = document.createElement("b"); val.textContent = value + unit;
    const input = document.createElement("input");
    input.type = "range"; input.min = min; input.max = max; input.value = value;
    input.addEventListener("input", () => { apply(+input.value); val.textContent = input.value + unit; save(); updateStats(); });
    row.append(span, input, val);
    return row;
  }

  /* ---------- изменение состояния ---------- */
  function setDevice(id, prop, value) {
    const d = getDev(id);
    if (!d) return false;
    d[prop] = value;
    if (prop === "on" && value === true && d.type === "light" && d.brightness == null) d.brightness = 80;
    save(); renderAll();
    return true;
  }

  function runScene(sceneId) {
    const s = SCENES.find(x => x.id === sceneId);
    if (!s) return false;
    s.steps.forEach(([id, prop, val]) => { const d = getDev(id); if (d) d[prop] = val; });
    save(); renderAll();
    return true;
  }

  /* ---------- рендер разделов ---------- */
  let currentRoom = "Все";

  function renderDevices() {
    const grid = document.getElementById("devices-grid");
    const tabs = document.getElementById("room-tabs");
    if (!grid) return;
    const rooms = ["Все", ...new Set(devices.map(d => d.room))];
    tabs.innerHTML = "";
    rooms.forEach(r => {
      const b = document.createElement("button");
      b.className = "room-tab" + (r === currentRoom ? " active" : "");
      b.textContent = r;
      b.addEventListener("click", () => { currentRoom = r; renderDevices(); });
      tabs.appendChild(b);
    });
    grid.innerHTML = "";
    devices.filter(d => currentRoom === "Все" || d.room === currentRoom)
      .forEach(d => grid.appendChild(deviceCard(d)));

    const fav = document.getElementById("fav-devices");
    if (fav) {
      fav.innerHTML = "";
      ["light-living","tv-living","ac-living","kettle-kitchen","lock-door","humidifier-bed"]
        .map(getDev).filter(Boolean).forEach(d => fav.appendChild(deviceCard(d)));
    }
  }

  function renderScenes() {
    const grid = document.getElementById("scenes-grid");
    if (!grid) return;
    grid.innerHTML = "";
    SCENES.forEach(s => {
      const c = document.createElement("div");
      c.className = "scene-card";
      c.innerHTML = '<div class="scene-icon">' + s.icon + "</div>" +
        '<h3>' + s.name + "</h3><p>" + s.desc + "</p>" +
        '<button class="btn-scene">▶ Запустить</button>';
      c.querySelector(".btn-scene").addEventListener("click", () => {
        runScene(s.id);
        toast("Сцена «" + s.name + "» применена " + s.icon);
      });
      grid.appendChild(c);
    });
  }

  function renderQuick() {
    const row = document.getElementById("quick-row");
    if (!row) return;
    row.innerHTML = "";
    const items = [
      { icon: "💡", label: "Свет в гостиной", action: () => setDevice("light-living", "on", !getDev("light-living").on) },
      { icon: "🎬", label: "Режим кино",      action: () => { runScene("movie"); toast("Режим «Кино» 🎬"); } },
      { icon: "🌙", label: "Спокойной ночи",  action: () => { runScene("night"); toast("Спокойной ночи 🌙"); } },
      { icon: "🫖", label: "Вскипятить воду", action: () => setDevice("kettle-kitchen", "on", !getDev("kettle-kitchen").on) },
      { icon: "🔐", label: "Замок: " + (getDev("lock-door").on ? "закрыт" : "открыт"),
        action: () => { const l = getDev("lock-door"); setDevice("lock-door", "on", !l.on); toast(l.on ? "Дверь закрыта 🔒" : "Дверь открыта 🔓"); } },
      { icon: "🤖", label: "Пылесосить двор", action: () => setDevice("robot-yard", "on", !getDev("robot-yard").on) },
    ];
    items.forEach(it => {
      const b = document.createElement("button");
      b.className = "quick-btn";
      b.innerHTML = "<span>" + it.icon + "</span>" + it.label;
      b.addEventListener("click", it.action);
      row.appendChild(b);
    });
  }

  function updateStats() {
    const st = calcStats();
    const t = document.getElementById("stat-temp");
    if (t) t.textContent = st.temp + "°C";
    const h = document.getElementById("stat-hum");
    if (h) h.textContent = st.humidity + "%";
    const o = document.getElementById("stat-on");
    if (o) o.textContent = st.onCount + " / " + devices.length;
    const p = document.getElementById("stat-power");
    if (p) p.textContent = st.watts.toLocaleString("ru-RU") + " Вт";
  }

  function renderAll() { renderDevices(); renderQuick(); updateStats(); }

  /* ---------- тост ---------- */
  function toast(text) {
    let el = document.getElementById("home-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "home-toast"; el.className = "home-toast";
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("show"), 2200);
  }

  /* ---------- приветствие + часы + шлюз ---------- */
  function tickClock() {
    const now = new Date();
    const ct = document.getElementById("clock-time");
    const cd = document.getElementById("clock-date");
    if (ct) ct.textContent = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    if (cd) cd.textContent = now.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
    const g = document.getElementById("greeting");
    if (g) {
      const h = now.getHours();
      const hello = h < 5 ? "Доброй ночи" : h < 12 ? "Доброе утро" : h < 18 ? "Добрый день" : "Добрый вечер";
      g.textContent = hello + ", Yuriko 👋";
    }
  }

  async function checkGateway() {
    const dot = document.getElementById("gw-dot"), txt = document.getElementById("gw-text");
    try {
      const base = (window.YurikoConfig && window.YurikoConfig.apiBase) || "/api";
      const r = await fetch(base + "/health", { cache: "no-store" });
      if (!r.ok) throw 0;
      dot.classList.add("online");
      txt.textContent = "Шлюз онлайн · БД подключена";
    } catch (e) {
      dot.classList.add("offline");
      txt.textContent = "Шлюз офлайн (UI работает автономно)";
    }
  }

  /* ---------- интеграция с AI-ассистентом ---------- */
  window.YurikoHome = {
    list() { return devices.map(d => ({ id: d.id, name: d.name, room: d.room, type: d.type, on: !!d.on })); },
    set: setDevice,
    scene: runScene,
    scenes: () => SCENES.map(s => ({ id: s.id, name: s.name })),
    stats: calcStats,
    toast,
  };

  /* ---------- старт ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    renderAll();
    renderScenes();
    tickClock(); setInterval(tickClock, 1000);
    checkGateway(); setInterval(checkGateway, 15000);
  });
})();
