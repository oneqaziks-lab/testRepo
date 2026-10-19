/* ============================================================
   GUI Yuriko Hub: переключение экранов и разделов
   ============================================================ */

(function () {
  const termScreen = document.getElementById("terminal-screen");
  const guiScreen  = document.getElementById("gui-screen");

  /* ---------- открыть / закрыть GUI ---------- */

  function openGUI() {
    termScreen.classList.remove("active");
    guiScreen.classList.add("active");
    document.body.style.overflow = "auto"; // разрешить прокрутку в GUI
  }

  function closeGUI() {
    guiScreen.classList.remove("active");
    termScreen.classList.add("active");
    if (window.YurikoHub && window.YurikoHub.backToTerminal) {
      window.YurikoHub.backToTerminal();
    }
  }

  window.YurikoHub = window.YurikoHub || {};
  window.YurikoHub.openGUI = openGUI;

  document.getElementById("btn-exit-gui").addEventListener("click", closeGUI);

  /* ---------- кнопка AI Assistant в шапке GUI ---------- */
  document.getElementById("btn-open-ai").addEventListener("click", () => {
    if (window.YurikoAUI) window.YurikoAUI.open();
  });

  /* ---------- навигация по разделам GUI ---------- */

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
      link.classList.add("active");

      document.querySelectorAll(".gui-section").forEach(s => s.classList.remove("active"));
      const target = document.getElementById("section-" + link.dataset.section);
      if (target) target.classList.add("active");
    });
  });

  /* ---------- клавиатурный шорткат: Ctrl+` закрывает GUI ---------- */
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "`" && guiScreen.classList.contains("active")) {
      closeGUI();
    }
  });
})();
