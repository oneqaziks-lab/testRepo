/* ============================================================
   Каталог проектов Yuriko Hub.
   Чтобы добавить проект — допишите объект в массив PROJECTS:
   { icon, name, desc, status: "soon" | "progress" | "ready", url }
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
    desc: "Умный ассистент хаба: поможет найти проект, объяснить код и составить план.",
    status: "soon",
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
    const card = document.createElement(p.url && p.url !== "#" ? "a" : "div");
    card.className = "project-card" + (p.status === "soon" ? " card-soon" : "");
    if (p.url && p.url !== "#") {
      card.href = p.url;
      card.style.textDecoration = "none";
    }
    card.innerHTML =
      '<span class="project-icon">' + p.icon + "</span>" +
      '<h3 class="project-name">' + p.name + "</h3>" +
      '<p class="project-desc">' + p.desc + "</p>" +
      '<span class="project-status ' + s.cls + '">' + s.text + "</span>";
    grid.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", renderProjects);
