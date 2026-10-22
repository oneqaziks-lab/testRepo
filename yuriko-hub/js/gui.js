/* ============================================================
   GUI Yuriko Hub — панель умного дома
   Навигация по разделам через боковую панель.
   ============================================================ */

(function () {
  const guiScreen = document.getElementById("gui-screen");
  if (!guiScreen) return;

  window.YurikoHub = window.YurikoHub || {};
  // совместимость с apps.js / ai-ui.js (открывали GUI из терминала)
  window.YurikoHub.openGUI = function () { guiScreen.classList.add("active"); };
  window.YurikoHub.backToTerminal = function () {}; // терминал убран — ничего не делаем

  /* ---------- кнопка AI Assistant в шапке ---------- */
  const btnAI = document.getElementById("btn-open-ai");
  if (btnAI) btnAI.addEventListener("click", () => {
    if (window.YurikoAUI) window.YurikoAUI.open();
  });

  /* ---------- навигация по разделам (боковая панель) ---------- */
  document.querySelectorAll(".home-nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      document.querySelectorAll(".home-nav-link").forEach(l => l.classList.remove("active"));
      link.classList.add("active");

      document.querySelectorAll(".gui-section").forEach(s => s.classList.remove("active"));
      const target = document.getElementById("section-" + link.dataset.section);
      if (target) target.classList.add("active");
    });
  });

  /* ---------- клавиатурный шорткат: Ctrl+J открывает AI ---------- */
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && (e.key === "j" || e.key === "л") && window.YurikoAUI) {
      e.preventDefault();
      window.YurikoAUI.toggle ? window.YurikoAUI.toggle() : window.YurikoAUI.open();
    }
  });
})();
