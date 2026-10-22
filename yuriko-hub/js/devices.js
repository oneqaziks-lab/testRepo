/* ============================================================
   Yuriko Hub v6.1 — Карта сети: все сетевые устройства,
   реально подключённые к хабу (ARP-таблица ОС через API сервера).
   Устройства умного дома из хаба убраны полностью.
   ============================================================ */
(function () {
  const api = () => window.HUB_CONFIG.apiBase;

  let lastData = null;      // кэш последнего ответа /api/network
  let refreshTimer = null;

  function esc(s) { return String(s == null ? "" : s); }

  /* ---------- рендер карты сети ---------- */
  function renderNetwork(devListEl, netStatsEl, data) {
    if (!devListEl) return;
    const devs = (data && data.devices) || [];

    devListEl.innerHTML = "";
    if (!devs.length) {
      devListEl.innerHTML = '<div class="card"><p class="proj-desc">В сети пока ничего не найдено. Проверьте, что сервер запущен и устройства подключены к той же подсети.</p></div>';
    }

    devs.forEach(n => {
      const card = document.createElement("div");
      card.className = "card dev-card" + (n.online ? " on" : "");

      const head = document.createElement("div"); head.className = "dev-head";
      const em = document.createElement("div"); em.className = "dev-emoji"; em.textContent = n.icon || "📟";
      const meta = document.createElement("div"); meta.className = "dev-meta";
      const nm = document.createElement("div"); nm.className = "dev-name"; nm.textContent = n.name || n.hostname || "Устройство";
      const sub = document.createElement("div"); sub.className = "dev-sub mono";
      sub.textContent = esc(n.ip || "?") + (n.mac ? " · " + n.mac : "") + (n.type ? " · " + n.type : "");
      meta.append(nm, sub);
      const st = document.createElement("div"); st.className = "dev-status-line";
      const dot = document.createElement("span"); dot.className = "dot-mini" + (n.online ? " ok" : "");
      st.append(dot, document.createTextNode(n.online ? "онлайн" : "оффлайн"));
      head.append(em, meta, st);
      card.append(head);
      devListEl.append(card);
    });

    if (netStatsEl) {
      netStatsEl.innerHTML = `
        <div class="card stat"><div class="stat-num">${data.total ?? devs.length}</div><div class="stat-lbl">устройств в сети</div></div>
        <div class="card stat"><div class="stat-num">${data.online ?? devs.filter(d => d.online).length}</div><div class="stat-lbl">активных сейчас</div></div>
        <div class="card stat"><div class="stat-num mono" style="font-size:16px">${esc(data.gateway || "—")}</div><div class="stat-lbl">шлюз / хаб</div></div>
        <div class="card stat"><div class="stat-num mono" style="font-size:16px">${esc(data.subnet || "—")}</div><div class="stat-lbl">подсеть</div></div>`;
    }

    const note = document.getElementById("net-note");
    if (note && data) {
      note.textContent = "Список получен с сервера хаба (" + (data.source || "ARP") + ") в реальном времени: " +
        new Date().toLocaleTimeString() + ".";
    }
  }

  function showError(devListEl, netStatsEl) {
    if (devListEl) devListEl.innerHTML =
      `<div class="card"><p class="proj-desc">Сервер хаба не отвечает (<b>${api()}</b>). Запустите <b>start-server.bat</b> (или <code>node server/server.js</code>) и обновите страницу. Если порт занят другим экземпляром — просто закройте лишнее окно сервера.</p></div>`;
    if (netStatsEl) netStatsEl.innerHTML = "";
    const note = document.getElementById("net-note");
    if (note) note.textContent = "Данные о сети появятся после запуска сервера хаба.";
  }

  /* ---------- загрузка ---------- */
  async function loadNetwork(manual) {
    const devListEl = document.getElementById("network-grid");
    const netStatsEl = document.getElementById("network-stats");
    try {
      const res = await fetch(api() + "/api/network", { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw 0;
      const data = await res.json();
      lastData = data;
      renderNetwork(devListEl, netStatsEl, data);
      if (manual) window.hubToast("🔄 Карта сети обновлена · устройств: " + (data.total ?? (data.devices || []).length));
    } catch (e) {
      if (lastData) { renderNetwork(devListEl, netStatsEl, lastData); }
      else showError(devListEl, netStatsEl);
      if (manual) window.hubToast("⚠ Сервер недоступен — показан последний снимок");
    }
  }

  window.hubDevices = {
    init() {
      loadNetwork(false);
      if (refreshTimer) clearInterval(refreshTimer);
      refreshTimer = setInterval(() => loadNetwork(false), 30000); // автообновление карты каждые 30 c
    },
    refresh: () => loadNetwork(true),
    list: () => (lastData && lastData.devices) || [],
    summary() {
      if (!lastData) return "Карта сети ещё не загружена — сервер должен быть запущен.";
      const d = lastData.devices || [];
      return "В сети " + d.length + " устройств (" + d.filter(x => x.online).length + " онлайн). Шлюз: " + (lastData.gateway || "?");
    }
  };
})();
