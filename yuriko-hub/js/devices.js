/* ============================================================
   Yuriko Hub v6.0 — Устройства: все сетевые устройства,
   которые реально подключены к хабу (через API сервера)
   + локальные smart-устройства как резерв при недоступности API
   ============================================================ */
(function () {
  const api = () => window.HUB_CONFIG.apiBase;

  // статичные smart-устройства дома (управляемые)
  const SMART = [
    { id: "light-living", name: "Люстра «Гостиная»", room: "Гостиная", emoji: "💡", kind: "light", on: true, value: 70, unit: "%" },
    { id: "tv", name: "Телевизор Samsung", room: "Гостиная", emoji: "📺", kind: "switch", on: false },
    { id: "ac", name: "Кондиционер Ballu", room: "Гостиная", emoji: "❄️", kind: "temp", on: true, value: 23, min: 16, max: 30, unit: "°C" },
    { id: "speaker", name: "Колонка Yandex Mini", room: "Гостиная", emoji: "🔊", kind: "volume", on: true, value: 45, unit: "%" },
    { id: "kettle", name: "Умный чайник", room: "Кухня", emoji: "🫖", kind: "switch", on: false },
    { id: "coffee", name: "Кофемашина", room: "Кухня", emoji: "☕", kind: "switch", on: false },
    { id: "fridge", name: "Холодильник LG", room: "Кухня", emoji: "🧊", kind: "sensor", on: true, info: "4°C · всегда онлайн" },
    { id: "light-kitchen", name: "Подсветка кухни", room: "Кухня", emoji: "💡", kind: "light", on: true, value: 85, unit: "%" },
    { id: "bedside", name: "Ночник в спальне", room: "Спальня", emoji: "🌙", kind: "light", on: false, value: 20, unit: "%" },
    { id: "curtain", name: "Умные шторы", room: "Спальня", emoji: "🪟", kind: "percent", on: true, value: 60, unit: "% открыты" },
    { id: "floor", name: "Тёплый пол", room: "Спальня", emoji: "🔥", kind: "temp", on: true, value: 26, min: 18, max: 35, unit: "°C" },
    { id: "lock", name: "Замок входной двери", room: "Прихожая", emoji: "🔐", kind: "lock", on: false /* on = открыт */ },
    { id: "camera", name: "Камера у двери", room: "Прихожая", emoji: "📷", kind: "sensor", on: true, info: "запись · движение ок" },
    { id: "vacuum", name: "Робот-пылесос Xiaomi", room: "Коридор", emoji: "🤖", kind: "switch", on: false },
    { id: "humidifier", name: "Увлажнитель", room: "Кабинет", emoji: "💧", kind: "percent", on: true, value: 55, unit: "% влажности" },
    { id: "pc", name: "Рабочий ПК", room: "Кабинет", emoji: "🖥", kind: "switch", on: true }
  ];

  let state = {};
  try { state = JSON.parse(localStorage.getItem("hub.devices.v6") || "{}"); } catch (e) {}
  SMART.forEach(d => { if (typeof state[d.id] === "object") Object.assign(d, state[d.id]); });

  function persist() {
    const out = {};
    SMART.forEach(d => out[d.id] = { on: d.on, value: d.value });
    localStorage.setItem("hub.devices.v6", JSON.stringify(out));
  }

  function save() { persist(); }

  // ---------- рендер ----------
  let filterRoom = "all";

  function render(listEl, statsEl) {
    listEl.innerHTML = "";
    const rooms = [...new Set(SMART.map(d => d.room))];
    const shown = filterRoom === "all" ? SMART : SMART.filter(d => d.room === filterRoom);

    shown.forEach(d => {
      const card = document.createElement("div");
      card.className = "card dev-card" + (d.on ? " on" : "");

      const head = document.createElement("div"); head.className = "dev-head";
      const em = document.createElement("div"); em.className = "dev-emoji"; em.textContent = d.emoji;
      const meta = document.createElement("div"); meta.className = "dev-meta";
      const nm = document.createElement("div"); nm.className = "dev-name"; nm.textContent = d.name;
      const sub = document.createElement("div"); sub.className = "dev-sub";
      sub.textContent = d.room + (d.kind === "sensor" && d.info ? " · " + d.info : "");
      meta.append(nm, sub);

      const sw = document.createElement("label"); sw.className = "switch";
      const inp = document.createElement("input"); inp.type = "checkbox"; inp.checked = !!d.on;
      if (d.kind === "sensor") inp.disabled = true;
      const tr = document.createElement("span"); tr.className = "track";
      sw.append(inp, tr);
      inp.addEventListener("change", () => {
        d.on = inp.checked; save();
        window.hubToast((d.on ? "Включено: " : "Выключено: ") + d.name);
        render(listEl, statsEl);
      });
      head.append(em, meta, sw);
      card.append(head);

      if (["light", "temp", "volume", "percent"].includes(d.kind)) {
        const ctl = document.createElement("div"); ctl.className = "dev-ctl";
        const lbl = document.createElement("span");
        lbl.textContent = (d.kind === "light" ? "Яркость" : d.kind === "temp" ? "Температура" : d.kind === "volume" ? "Громкость" : "Значение")
          + ": " + d.value + d.unit;
        const rg = document.createElement("input"); rg.type = "range";
        rg.min = d.min ?? 0; rg.max = d.max ?? 100; rg.value = d.value;
        rg.addEventListener("input", () => {
          d.value = +rg.value; lbl.textContent = lbl.textContent.split(":")[0] + ": " + d.value + d.unit;
        });
        rg.addEventListener("change", () => { save(); window.hubToast(d.name + ": " + d.value + d.unit); });
        ctl.append(lbl, rg);
        card.append(ctl);
      }
      listEl.append(card);
    });

    // фильтры комнат
    const chipsEl = document.getElementById("room-chips");
    if (chipsEl && !chipsEl.dataset.built) {
      chipsEl.dataset.built = "1";
      ["all", ...rooms].forEach(r => {
        const c = document.createElement("button");
        c.className = "chip" + ((r === filterRoom) ? " active" : "");
        c.textContent = r === "all" ? "Все комнаты" : r;
        c.onclick = () => {
          filterRoom = r;
          chipsEl.querySelectorAll(".chip").forEach(x => x.classList.remove("active"));
          c.classList.add("active");
          render(listEl, statsEl);
        };
        chipsEl.append(c);
      });
    }

    // статистика
    if (statsEl) {
      const onCount = SMART.filter(d => d.on).length;
      const watts = SMART.reduce((s, d) => s + (d.on ? ({ light: 40, tv: 90, ac: 1100, speaker: 25, kettle: 2000, coffee: 1300, fridge: 120, bedside: 8, curtain: 15, floor: 800, lock: 2, camera: 7, vacuum: 30, humidifier: 22, pc: 350 }[d.id.split("-")[0]] || 50) : 0), 0);
      statsEl.innerHTML = `
        <div class="card stat"><div class="stat-num">${SMART.length}</div><div class="stat-lbl">устройств всего</div></div>
        <div class="card stat"><div class="stat-num">${onCount}</div><div class="stat-lbl">сейчас включено</div></div>
        <div class="card stat"><div class="stat-num">${watts} Вт</div><div class="stat-lbl">потребление</div></div>
        <div class="card stat"><div class="stat-num">${rooms.length}</div><div class="stat-lbl">комнат</div></div>`;
    }
  }

  // ---------- сетевые устройства из API ----------
  async function loadNetwork(devListEl, netStatsEl) {
    try {
      const res = await fetch(api() + "/api/network", { signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw 0;
      const data = await res.json();
      const devs = data.devices || [];
      devListEl.innerHTML = "";
      devs.forEach(n => {
        const card = document.createElement("div");
        card.className = "card dev-card" + (n.online ? " on" : "");
        card.innerHTML = `
          <div class="dev-head">
            <div class="dev-emoji">${n.icon || "📟"}</div>
            <div class="dev-meta">
              <div class="dev-name"></div>
              <div class="dev-sub mono"></div>
            </div>
            <div class="dev-status-line"><span class="dot-mini ${n.online ? "ok" : ""}"></span>${n.online ? "онлайн" : "оффлайн"}</div>
          </div>`;
        card.querySelector(".dev-name").textContent = n.name || n.hostname || "Устройство";
        card.querySelector(".dev-sub").textContent = (n.ip || "?") + (n.mac ? " · " + n.mac : "") + (n.type ? " · " + n.type : "");
        devListEl.append(card);
      });
      if (netStatsEl) netStatsEl.innerHTML = `
        <div class="card stat"><div class="stat-num">${data.total ?? devs.length}</div><div class="stat-lbl">устройств в сети</div></div>
        <div class="card stat"><div class="stat-num">${data.online ?? devs.filter(d => d.online).length}</div><div class="stat-lbl">активных сейчас</div></div>
        <div class="card stat"><div class="stat-num mono" style="font-size:16px">${data.gateway || "—"}</div><div class="stat-lbl">шлюз / хаб</div></div>
        <div class="card stat"><div class="stat-num mono" style="font-size:16px">${data.subnet || "—"}</div><div class="stat-lbl">подсеть</div></div>`;
      const note = document.getElementById("net-note");
      if (note) note.textContent = "Список получен с сервера хаба в реальном времени (" + new Date().toLocaleTimeString() + ").";
    } catch (e) {
      devListEl.innerHTML = `<div class="card"><p class="proj-desc">Сервер хаба не отвечает (${api()}). Запустите <b>start-server.bat</b> или <code>node server/server.js</code>, затем обновите страницу. Smart-устройства ниже работают автономно.</p></div>`;
      if (netStatsEl) netStatsEl.innerHTML = "";
    }
  }

  window.hubDevices = {
    init() {
      const list = document.getElementById("device-grid");
      const stats = document.getElementById("device-stats");
      const netGrid = document.getElementById("network-grid");
      const netStats = document.getElementById("network-stats");
      render(list, stats);
      loadNetwork(netGrid, netStats);
      setInterval(() => loadNetwork(netGrid, netStats), 30000); // автообновление карты сети
    },
    SMART,
    set(id, patch) {
      const d = SMART.find(x => x.id === id); if (!d) return false;
      Object.assign(d, patch); save();
      const l = document.getElementById("device-grid"), s = document.getElementById("device-stats");
      if (l) render(l, s);
      return true;
    },
    summary() {
      const on = SMART.filter(d => d.on && d.kind !== "sensor");
      return on.length ? "Сейчас включено: " + on.map(d => d.name).join(", ") : "Сейчас всё выключено 🌿";
    }
  };
})();
