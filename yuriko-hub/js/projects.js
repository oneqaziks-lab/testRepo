/* ============================================================
   Каталог проектов Yuriko Hub.
   Чтобы добавить проект — допишите объект в массив PROJECTS:
   { icon, name, desc, status: "soon" | "progress" | "ready", url }

   url = "app:<id>" — открыть встроенное веб-приложение из apps.js
   ============================================================ */

const PROJECTS = [
  {
    icon: "🌸",
    name: "Yuriko Core",
    desc: "Фундаментальная библиотека и ядро экосистемы. Общий код для всех проектов хаба.",
    status: "progress",
    url: "#",
  },
  {
    icon: "🚀",
    name: "Stardust Launcher",
    desc: "Лаунчер для быстрого запуска всех проектов команды в один клик.",
    status: "soon",
    url: "#",
  },
  {
    icon: "🎮",
    name: "Project Game",
    desc: "Первая игра студии. Жанр держится в секрете...",
    status: "soon",
    url: "#",
  },
  {
    icon: "🤖",
    name: "Yuriko AI Assistant",
    desc: "Умный ассистент хаба: база знаний с BM25-поиском, собственный парсер математики, память контекста. Уже работает!",
    status: "ready",
    url: "app:ai",
  },
  {
    icon: "💬",
    name: "Rave",
    desc: "Мессенджер новой волны: боты-верификаторы с кодами доступа, двухфакторная аутентификация, единый аккаунт для всего хаба.",
    status: "ready",
    url: "app:rave",
  },
  {
    icon: "📺",
    name: "YkoTube",
    desc: "Видеохостинг от команды. Вход и регистрация — только через аккаунт Rave. Лайки, загрузка роликов, каналы.",
    status: "ready",
    url: "app:ykotube",
  },
  {
    icon: "🛰️",
    name: "Orbit Notes",
    desc: "Заметки и вики командной работы: markdown, теги, поиск — всё синхронизировано вокруг хаба.",
    status: "progress",
    url: "#",
  },
  {
    icon: "🌐",
    name: "Hub Website",
    desc: "Этот сайт-хаб. Да, он уже работает — вы прямо внутри него!",
    status: "ready",
    url: "#",
  },
];

window.PROJECTS = PROJECTS;

const STATUS_LABELS = {
  soon:     { text: "СКОРО",        cls: "status-soon" },
  progress: { text: "В РАЗРАБОТКЕ", cls: "status-progress" },
  ready:    { text: "ГОТОВО",       cls: "status-ready" },
};

function renderProjects() {
  const grid = document.getElementById("projects-grid");
  if (!grid) return;
  grid.innerHTML = "";

  PROJECTS.forEach((p) => {
    const s = STATUS_LABELS[p.status] || STATUS_LABELS.soon;
    const isApp = p.url && p.url.startsWith("app:");
    const card = document.createElement(p.url && p.url !== "#" ? "a" : "div");
    card.className = "project-card" + (p.status === "soon" ? " card-soon" : "");
    if (isApp) {
      card.href = "#";
      card.addEventListener("click", (e) => {
        e.preventDefault();
        if (window.YurikoApps) window.YurikoApps.open(p.url.slice(4));
      });
    } else if (p.url && p.url !== "#") {
      card.href = p.url;
    }
    if (p.url && p.url !== "#") card.style.textDecoration = "none";
    card.innerHTML =
      '<span class="project-icon">' + p.icon + "</span>" +
      '<h3 class="project-name">' + p.name + "</h3>" +
      '<p class="project-desc">' + p.desc + "</p>" +
      '<span class="project-status ' + s.cls + '">' + s.text +
      (isApp ? " · Открыть →" : "") + "</span>";
    grid.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", renderProjects);
