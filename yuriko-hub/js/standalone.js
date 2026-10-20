/* ============================================================
   Отдельные страницы приложений (rave.html / ykotube.html).
   Определяет, какое приложение показать, по имени файла страницы,
   и рендерит его напрямую в контейнер #standalone-app.
   Токены Rave/YkoTube общие для всего origin (localStorage),
   поэтому вход, сделанный где-либо, действует на всех страницах.
   ============================================================ */

(function () {
  const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();

  let appId = null;
  if (page.startsWith("rave"))    appId = "rave";
  else if (page.startsWith("ykotube")) appId = "ykotube";
  if (!appId) return; // не standalone-страница

  function boot() {
    const root = document.getElementById("standalone-app");
    if (!root || !window.YurikoApps) return setTimeout(boot, 50);
    const app = window.YurikoApps.apps[appId];
    document.title = app.title.replace(/^[^ ]+\s*/, "") + " — Yuriko Hub";
    app.render(root);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
