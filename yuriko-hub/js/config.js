/* ============================================================
   Yuriko Hub — автоопределение адреса API-сервера.

   Логика:
     • страница открыта через http(s)  → пробуем сначала ТЕ ЖЕ host
       и порт 8080 (Node-сервер), при недоступности откат на localhost:8080;
     • страница открыта через XAMPP/Apache (:80 / :443) → API живёт на
       том же хосте, но порту 8080 (Apache его не поднимает, см. README);
     • file:// (двойной клик) → localhost:8080.

   Все модули хаба берут адрес из window.YURIKO_CONFIG.apiBase.
   ============================================================ */

(function () {
  "use strict";

  function pickApiBase() {
    // file:// — только localhost
    if (location.protocol === "file:") return "http://localhost:8080/api";

    const host = location.hostname || "localhost";
    const port = location.port; // "" для :80 / :443

    // Если сама страница уже раздаётся Node-сервером (порт 8080) —
    // используем тот же origin, запросы идут без CORS-риска.
    if (port === "8080") return location.origin + "/api";

    // XAMPP/Apache (:80, :443) или любой другой порт → Node-API на :8080
    const proto = location.protocol === "https:" ? "https:" : "http:";
    return proto + "//" + host + ":8080/api";
  }

  window.YURIKO_CONFIG = {
    apiBase: pickApiBase(),
    mysql: { host: "localhost", port: 3306, user: "root", password: "" },
    apache: { ports: [80, 443] },
    nodePort: 8080,
  };

  /* ---- health-check с автовыбором рабочего адреса ---- */
  window.YURIKO_checkApi = async function (timeoutMs) {
    timeoutMs = timeoutMs || 1200;
    const candidates = [];
    const cur = window.YURIKO_CONFIG.apiBase;
    candidates.push(cur);
    // запасные варианты: localhost и 127.0.0.1 на 8080
    ["http://localhost:8080/api", "http://127.0.0.1:8080/api"].forEach((c) => {
      if (!candidates.includes(c)) candidates.push(c);
    });

    for (const base of candidates) {
      try {
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), timeoutMs);
        const res = await fetch(base + "/health", { signal: ctl.signal });
        clearTimeout(t);
        if (res.ok) {
          window.YURIKO_CONFIG.apiBase = base; // запоминаем рабочий адрес
          return { ok: true, base, data: await res.json().catch(() => ({})) };
        }
      } catch (e) { /* пробуем следующий кандидат */ }
    }
    return { ok: false, base: cur };
  };
})();
