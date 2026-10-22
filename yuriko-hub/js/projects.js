/* Каталог проектов хаба */
window.PROJECTS = [
  { id: "rave", icon: "💬", name: "Rave", status: "done",
    desc: "Мессенджер в стиле Telegram: чаты, боты с кодами регистрации и двухфакторной аутентификацией.",
    url: "rave.html" },
  { id: "ykotube", icon: "▶️", name: "YkoTube", status: "done",
    desc: "Видеохостинг — аналог YouTube. Регистрация только через аккаунт Rave (единый вход хаба).",
    url: "ykotube.html" },
  { id: "ai", icon: "✦", name: "Yuriko AI Assistant", status: "done",
    desc: "Локальный умный ассистент: база знаний BM25, калькулятор с приоритетами, память диалога и управление устройствами голосом… то есть текстом.",
    action: "openAI" },
  { id: "netmap", icon: "🛰", name: "NetMap", status: "dev",
    desc: "Карта домашней сети: все подключённые устройства, их IP, MAC и статус. Уже работает во вкладке «Устройства».",
    action: "openDevices" },
  { id: "orbit", icon: "🪐", name: "Orbit Notes", status: "soon",
    desc: "Заметки и вики умного дома: сценарии, инструкции, общие ссылки команды." }
];
