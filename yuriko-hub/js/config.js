/* Yuriko Hub v6.0 — автоопределение адреса API (XAMPP :80/:443 или Node :8080) */
(function () {
  const loc = window.location;
  let apiBase = "";
  if (loc.protocol === "file:") {
    apiBase = "http://localhost:8080";
  } else if (loc.port === "8080") {
    apiBase = loc.origin;
  } else {
    // страница отдаётся Apache/другим сервером → пробуем Node на 8080 этого же хоста
    apiBase = loc.protocol + "//" + loc.hostname + ":8080";
  }
  window.HUB_CONFIG = { apiBase, self: loc.origin + loc.pathname };
})();

/* совместимость с приложениями Rave/YkoTube (js/apps.js) */
window.YURIKO_CONFIG = { apiBase: window.HUB_CONFIG.apiBase + "/api", apiRoot: window.HUB_CONFIG.apiBase + "/api" };

/* health-check для приложений: проверяет, что API отвечает */
window.YURIKO_checkApi = async function () {
  try {
    const r = await fetch(window.HUB_CONFIG.apiBase + "/api/health", { signal: AbortSignal.timeout(2500) });
    return { ok: r.ok, base: window.YURIKO_CONFIG.apiBase };
  } catch (e) { return { ok: false, base: window.YURIKO_CONFIG.apiBase }; }
};
