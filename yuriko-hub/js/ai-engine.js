/* ============================================================
   Yuriko AI Engine — «мозг» ассистента, работающий прямо в браузере.

   Это не rule-based болталка. Внутри настоящий мини-интерпретатор:

   1. Нормализация текста + лемматизация ( морфология русского и
      английское упрощение: plurals, -ing/-ed).
   2. Индекс документов (BM25) по базе знаний хаба -> поиск ответов
      с релевантностью, а не простым "contains".
   3. Токенизатор арифметических выражений + рекурсивный
      descent-парсер -> вычисление "(12+8)*3/4 - sqrt(25)" и т.п.
   4. Состояние диалога: контекст последних реплик, местоимения
      "он/она/это" разрешаются в прошлое обсуждаемое понятие.
   5. Простая модель внимания: баллы намерений (intent scoring)
      с нечётким матчем по ключевым словам — побеждает лучший
      интент, если его уверенность выше порога.
   ============================================================ */

(function () {
  "use strict";

  /* ==================== 1. НОРМАЛИЗАЦИЯ / ЛЕММАТИЗАЦИЯ ==================== */

  const IRREGULAR_RU = {
    проекты: "проект", проектов: "проект", проекте: "проект", проектом: "проект",
    проект: "проект", проекты: "проект",
    команды: "команда", команду: "команда", командой: "команда", команда: "команда",
    терминала: "терминал", терминал: "терминал", терминале: "терминал", терминалом: "терминал",
    загрузку: "загрузка", загрузкой: "загрузка", загрузка: "загрузка", загрузки: "загрузка",
    графическая: "графический", графическое: "графический", графического: "графический",
    графической: "графический", графическим: "графический",
    работает: "работать", работать: "работать", работе: "работать",
    как: "как", что: "что", чём: "что", чем: "что",
    можешь: "мочь", можете: "мочь", могу: "мочь", мочь: "мочь",
    привет: "привет", здравствуй: "привет", здравствуйте: "привет",
    salute: "привет", хеллоу: "привет",
    спасибо: "спасибо", спс: "спасибо",благодарю: "спасибо",
    пожалуйста: "пожалуйста",
    кто: "кто", ты: "ты", себя: "себя",
    время: "время", часов: "час", часа: "час", час: "час",
    числа: "число", число: "число", дате: "дата", дата: "дата",
    погоде: "погода", погода: "погода", погод: "погода",
    калькулятор: "калькулятор", посчитай: "вычислить", вычисли: "вычислить",
    вычислить: "вычислить", вычислять: "вычислить", сколько: "сколько",
    помощь: "помощь", помоги: "помощь", помочь: "помощь", help: "помощь",
    скилл: "скилл", скиллы: "скилл", умения: "скилл", возможности: "скилл",
    шутку: "шутка", шутка: "шутка", шуток: "шутка", смех: "смех",
    статус: "статус", состояние: "статус",
    история: "история", настроек: "настройки", настройка: "настройки",
    код: "код", кода: "код", программы: "программа", программа: "программа",
    javascript: "javascript", js: "javascript", python: "python", пайтон: "python",
    html: "html", css: "css", git: "git", linux: "linux", линукс: "linux",
  };

  const STOPWORDS = new Set([
    "и", "в", "во", "не", "что", "он", "на", "я", "с", "со", "как", "а", "то",
    "все", "она", "так", "его", "но", "да", "ты", "к", "у", "же", "вы", "за",
    "бы", "по", "только", "ее", "мне", "было", "вот", "от", "меня", "еще", "нет",
    "о", "из", "ему", "теперь", "когда", "даже", "ну", "вдруг", "ли", "если",
    "уже", "или", "ни", "быть", "был", "до", "вас", "нибудь", "опять", "уж", "вам",
    "ведь", "потом", "там", "потом", "ничего", "может", "они", "тут", "где",
    "есть", "надо", "ней", "для", "мы", "тебя", "их", "чем", "была", "сам",
    "чтоб", "без", "будто", "чего", "раз", "тоже", "себе", "под", "будет",
    "ж", "тогда", "кто", "этот", "того", "потому", "этого", "какой", "совсем",
    "ним", "здесь", "этом", "один", "почти", "мой", "тем", "чтобы", "нее",
    "сейчас", "были", "куда", "зачем", "всех", "никогда", "можно", "при",
    "наконец", "два", "об", "другой", "хоть", "после", "над", "больше", "том",
    "через", "эти", "нас", "про", "всего", "них", "какая", "много", "разве",
    "три", "эту", "моя", "впрочем", "хорошо", "свою", "этой", "перед", "иногда",
    "лучше", "чуть", "том", "нельзя", "такой", "им", "более", "всегда",
    "the", "a", "an", "is", "are", "was", "were", "be", "to", "of", "and", "in",
    "that", "have", "it", "for", "on", "with", "as", "i", "you", "he", "at",
    "this", "but", "his", "from", "they", "we", "say", "her", "she", "or", "do",
    "please", "can", "would", "there", "into",
  ]);

  function lemmaRu(word) {
    if (IRREGULAR_RU[word]) return IRREGULAR_RU[word];
    let w = word;
    // существительные: пробуем убрать типовые падежные окончания
    const suf = [
      "иями", "ями", "ах", "ях", "ов", "ев", "ам", "ям", "ом", "ем", "ах",
      "ый", "ий", "ое", "ее", "ая", "яя", "ые", "ие", "ой", "ей",
      "ти", "ть", "ла", "ло", "ли", "ет", "ут", "ют", "ит", "ат", "ят",
      "ов", "ий", "ы", "и", "а", "я", "е", "у", "ю", "о", "ь",
    ];
    for (const s of suf) {
      if (w.length > s.length + 2 && w.endsWith(s)) {
        const stem = w.slice(0, -s.length);
        if (IRREGULAR_RU[stem]) return IRREGULAR_RU[stem];
      }
    }
    if (w.endsWith("ые")) w = w.slice(0, -2) + "ый";
    else if (w.endsWith("ие")) w = w.slice(0, -2) + "ий";
    return w;
  }

  function lemmaEn(word) {
    let w = word;
    if (w.endsWith("ies") && w.length > 4) w = w.slice(0, -3) + "y";
    else if ((w.endsWith("ses") || w.endsWith("xes") || w.endsWith("zes") ||
              w.endsWith("ches") || w.endsWith("shes")) && w.length > 5) w = w.slice(0, -2);
    else if (w.endsWith("s") && !w.endsWith("ss") && w.length > 3) w = w.slice(0, -1);
    if (w.endsWith("ing") && w.length > 5) {
      const base = w.slice(0, -3);
      w = base.endsWith("e") ? base : base; // simplified
    } else if (w.endsWith("ed") && w.length > 4) {
      const base = w.slice(0, -2);
      w = base.endsWith("i") ? base.slice(0, -1) + "y" : base;
    }
    return w;
  }

  function tokenize(text) {
    return text
      .toLowerCase()
      .replace(/ё/g, "е")
      .split(/[^a-zа-я0-9+\-*/().^,%]+/u)
      .filter(Boolean);
  }

  function normalizeWords(text) {
    return tokenize(text)
      .map((w) => {
        if (/^[a-z]/.test(w)) return lemmaEn(w);
        return lemmaRu(w);
      })
      .filter((w) => !STOPWORDS.has(w) && w.length >= 1); // цифры ("15") оставляем как есть
  }

  /* ==================== 2. БАЗА ЗНАНИЙ + BM25 ==================== */

  const KB = [
    {
      id: "hub",
      title: "Yuriko Hub",
      tags: ["хаб", "yuriko", "hub", "сайт", "проект", "между", "проектами", "точка", "входа"],
      text: "Yuriko Hub это центральная точка входа между всеми проектами команды. Здесь собираются ссылки, статусы и документация по каждому проекту. При входе открывается терминал который имитирует загрузку Linux и выполняет восемьдесят команд инициализации.",
    },
    {
      id: "terminal",
      title: "Терминал",
      tags: ["терминал", "gui", "команда", "команды", "загрузка", "boot", "консоль", "bash", "help", "status", "reboot", "clear", "banner", "whoami", "projects"],
      text: "Терминал это первый экран хаба. После автоматической загрузки доступны команды: GUI запускает графическую часть хаба, help показывает список команд, status состояние сервисов, projects список проектов, banner логотип, clear очистка экрана, reboot перезагрузка терминала, whoami информация о пользователе. Поддерживается история команд стрелками вверх и вниз.",
    },
    {
      id: "gui",
      title: "Графическая часть (GUI)",
      tags: ["gui", "графический", "интерфейс", "витрина", "карточки", "окно", "режим"],
      text: "GUI графическая часть хаба. Чтобы её открыть нужно ввести команду GUI в терминале. Внутри витрина с карточками проектов: иконка описание и статус скоро в разработке готово. Вернуться в терминал можно кнопкой Terminal или сочетанием клавиш Ctrl плюс обратная кавычка.",
    },
    {
      id: "assistant",
      title: "Yuriko AI Assistant",
      tags: ["ассистент", "ai", "искусственный", "интеллект", "бот", "юрий", "yuriko", "помощник", "нейросеть", "мозг", "умный"],
      text: "Yuriko AI Assistant это встроенный умный ассистент хаба. Он понимает вопросы на русском и английском языке ищет ответы по базе знаний через BM25 индекс решает математику через собственный парсер выражений помнит контекст диалога и умеет объяснять что такое сам. Формально он не использует внешние нейросети весь мозг работает локально в браузере.",
    },
    {
      id: "core",
      title: "Yuriko Core",
      tags: ["core", "ядро", "библиотека", "фундамент", "экосистема"],
      text: "Yuriko Core фундаментальная библиотека и ядро экосистемы. Общий код для всех проектов хаба. Статус в разработке.",
    },
    {
      id: "launcher",
      title: "Stardust Launcher",
      tags: ["stardust", "launcher", "лаунчер", "запуск"],
      text: "Stardust Launcher лаунчер для быстрого запуска всех проектов команды в один клик. Статус скоро.",
    },
    {
      id: "game",
      title: "Project Game",
      tags: ["game", "игра", "проект", "жанр"],
      text: "Project Game первая игра студии. Жанр держится в секрете. Статус скоро.",
    },
    {
      id: "commands-list",
      title: "Список команд хаба",
      tags: ["команда", "синтаксис", "код", "программирование", "функция", "api"],
      text: "Основные команды терминала: GUI help status projects banner clear reboot whoami sudo. В самом ассистенте доступны slash команды: /clear очистить диалог /skills показать умения /status проверить системы.",
    },
    {
      id: "add-project",
      title: "Как добавить проект",
      tags: ["добавить", "новый", "проект", "каталог", "projects", "js", "настроить", "расширить"],
      text: "Чтобы добавить проект открой файл js projects.js и допиши объект в массив PROJECTS с полями icon name desc status url где status это soon progress или ready. Карточка появится в GUI автоматически а ассистент сразу начнёт знать о новом проекте потому что база знаний строится из этого же списка.",
    },
    {
      id: "stack",
      title: "Технологии",
      tags: ["технология", "стек", "язык", "html", "css", "javascript", "js", "python", "server", "сервер", "запустить", "как", "открыть"],
      text: "Хаб написан на чистом HTML CSS и JavaScript без фреймворков и собирается без npm. Запустить можно командой python3 m http.server в папке yuriko hub затем открыть localhost восемь тысяч девяносто в браузере либо просто открыть index.html двойным кликом.",
    },
    {
      id: "about-team",
      title: "Команда",
      tags: ["команда", "кто", "сделал", "создал", "автор", "мы", "студия"],
      text: "Хаб сделан небольшой командой энтузиастов Yuriko как единая точка входа для будущих проектов. Каждый проект со временем получит свою страницу и свой статус внутри витрины GUI.",
    },
  ];

  /* ---------- BM25 ---------- */

  const k1 = 1.5, b = 0.75;
  const docsTokens = KB.map((d) => tokenize(d.text + " " + d.title + " " + d.tags.join(" ")).map(lemmaRu));
  const avgLen = docsTokens.reduce((s, d) => s + d.length, 0) / docsTokens.length;

  const df = {};
  docsTokens.forEach((tokens) => {
    new Set(tokens).forEach((t) => (df[t] = (df[t] || 0) + 1));
  });
  const N = docsTokens.length;

  function bm25(queryWords) {
    const scores = new Array(N).fill(0);
    queryWords.forEach((q) => {
      const n = df[q] || 0;
      if (!n) return;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      docsTokens.forEach((tokens, di) => {
        const tf = tokens.filter((t) => t === q).length;
        if (!tf) return;
        scores[di] += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (tokens.length / avgLen))));
      });
    });
    const ranked = scores.map((s, i) => ({ doc: KB[i], score: s })).sort((a, b2) => b2.score - a.score);
    return ranked[0].score > 0.4 ? ranked : [];
  }

  /* ==================== 3. МАТЕМАТИКА: ТОКЕНИЗАТОР + ПАРСЕР ==================== */

  const FUNCS = {
    sqrt: Math.sqrt, sin: Math.sin, cos: Math.cos, tan: Math.tan,
    abs: Math.abs, log: (x) => Math.log10(x), ln: Math.log,
    round: Math.round, floor: Math.floor, ceil: Math.ceil,
  };

  function evalMath(exprRaw) {
    let expr = exprRaw
      .replace(/,/g, ".")
      .replace(/×|✕/g, "*").replace(/÷/g, "/")
      .replace(/\s+/g, "")
      .toLowerCase();
    if (!/^[-+*/().^0-9a-z,]+$/.test(expr)) throw new Error("bad chars");

    // токены
    const toks = [];
    let i = 0;
    while (i < expr.length) {
      const ch = expr[i];
      if (/[0-9.]/.test(ch)) {
        let num = "";
        while (i < expr.length && /[0-9.]/.test(expr[i])) num += expr[i++];
        toks.push({ t: "num", v: parseFloat(num) });
      } else if (/[a-z]/.test(ch)) {
        let id = "";
        while (i < expr.length && /[a-z]/.test(expr[i])) id += expr[i++];
        if (id === "pi") toks.push({ t: "num", v: Math.PI });
        else if (id === "e") toks.push({ t: "num", v: Math.E });
        else if (FUNCS[id]) toks.push({ t: "fn", v: id });
        else throw new Error("unknown:" + id);
      } else if ("+-*/().^%".includes(ch)) {
        toks.push({ t: ch });
        i++;
      } else throw new Error("char:" + ch);
    }

    let p = 0;
    const peek = () => toks[p];
    const eat = (t) => { if (!peek() || peek().t !== t) throw new Error("expected " + t); p++; };

    function parseExpr() { // + -
      let left = parseTerm();
      while (peek() && (peek().t === "+" || peek().t === "-")) {
        const op = peek().t; p++;
        const right = parseTerm();
        left = op === "+" ? left + right : left - right;
      }
      return left;
    }
    function parseTerm() { // * / %
      let left = parseUnary();
      while (peek() && (peek().t === "*" || peek().t === "/" || peek().t === "%")) {
        const op = peek().t; p++;
        const right = parseUnary();
        if (op === "*") left *= right;
        else if (op === "/") { if (right === 0) throw new Error("div0"); left /= right; }
        else { if (right === 0) throw new Error("div0"); left %= right; }
      }
      return left;
    }
    function parseUnary() {
      if (peek() && peek().t === "-") { p++; return -parseUnary(); }
      if (peek() && peek().t === "+") { p++; return parseUnary(); }
      return parsePower();
    }
    function parsePower() { // ^ правоассоциативно
      const base = parseAtom();
      if (peek() && peek().t === "^") { p++; return Math.pow(base, parseUnary()); }
      return base;
    }
    function parseAtom() {
      const tk = peek();
      if (!tk) throw new Error("eof");
      if (tk.t === "num") { p++; return tk.v; }
      if (tk.t === "(") { p++; const v = parseExpr(); eat(")"); return v; }
      if (tk.t === "fn") { p++; eat("("); const v = parseExpr(); eat(")"); return FUNCS[tk.v](v); }
      throw new Error("unexpected");
    }

    const value = parseExpr();
    if (p !== toks.length) throw new Error("trailing");
    return value;
  }

  function tryMath(raw) {
    // сначала пробуем всю фразу как выражение (после очистки от слов-паразитов)
    const cleaned = raw
      .replace(/(?:сколько|будет|вычислить|посчитать|калькулятор|равно|=|пожалуйста)/g, " ")
      .replace(/[?？!]/g, " ")
      .trim();
    const candidates = [];
    if (cleaned) candidates.push(cleaned);
    // затем — подвыражение внутри свободной фразы
    const m = raw.match(/(-?\d+(?:\.\d+)?(?:\s*[-+*/^%]\s*\(?\s*-?\d+(?:\.\d+)?\s*\)?)+|\bsqrt\s*\([^)]+\)|\b(?:sin|cos|tan|log|ln|abs)\s*\([^)]+\)|\(-?[\d\s+\-*/^%.]+\)(?:\s*[-+*/^]\s*[\d\s+\-*/^%.()]+)*)/i);
    if (m) candidates.push(m[0]);
    for (let cand of candidates) {
      // выкидываем все слова, кроме математических функций/констант
      cand = cand.replace(/[a-zа-яё]+/gi, function (w) {
        const lw = w.toLowerCase();
        return ["sqrt","sin","cos","tan","log","ln","abs","round","floor","ceil","pi","e"].includes(lw) ? lw : " ";
      });
      cand = cand.replace(/\s+/g, "").replace(/([0-9)])\s*\(?([a-z])/gi, "$1$2");
      cand = cand.trim();
      if (!cand || !/[-+*/^%]|sqrt|sin|cos|tan|log|ln|abs/.test(cand)) continue; // голое число — не ответ
      try {
        const val = evalMath(cand);
        if (!isFinite(val)) continue;
        return { expr: cand.trim(), value: val };
      } catch (e) { /* пробуем следующий кандидат */ }
    }
    return null;
  }

  /* ==================== 4. СОСТОЯНИЕ ДИАЛОГА ==================== */

  const state = {
    lastTopic: null,       // { id, title }
    lastNumber: null,      // последний посчитанный результат
    turns: [],             // [{role, text}]
    startedAt: Date.now(),
  };

  /* ==================== 5. ИНТЕНТЫ (scoring) ==================== */

  function intentScore(words, keys) {
    let s = 0;
    keys.forEach((k) => {
      if (words.includes(k)) s += 2;
      else if (words.some((w) => w.startsWith(k.slice(0, 4)) && k.length > 4)) s += 0.5;
    });
    return s;
  }

  const JOKES = [
    "Почему программист путает Хэллоуин и Рождество? Потому что OCT 31 == DEC 25 🎃🎄",
    "Заходит как-то байт в бар. Бармен: «Что желаете?» Байт: «Мне бит, я на диете».",
    "— Сколько программистов нужно, чтобы вкрутить лампочку? — Ни одного, это аппаратная проблема.",
    "Я бы рассказал тебе про UDP, но ты можешь не получить 😏",
    "Оптимизация по Юрико: если задача не решается, значит она была неправильной.",
    "В мире есть 10 типов людей: те, кто понимает двоичную систему, и те, кто нет.",
  ];

  const GREET = [
    "Привет! Я Yuriko AI — локальный мозг этого хаба. Спроси про проекты, терминал или попроси меня что-нибудь посчитать ✦",
    "Здравствуй, странник ✦ Чем помочь: рассказать о хабе, найти проект, решить математику?",
  ];

  function pick(arr, seed) {
    return arr[Math.abs(seed) % arr.length];
  }

  function fmtNum(v) {
    if (Number.isInteger(v)) return v.toLocaleString("ru-RU");
    return parseFloat(v.toFixed(6)).toString().replace(".", ",");
  }

  /* ---------- главный вход: answer(userText) -> string ---------- */

  function answer(rawInput) {
    const text = rawInput.trim();
    if (!text) return "Пустая реплика — я её не услышал 🙂";

    const lower = text.toLowerCase().replace(/ё/g, "е");
    const words = normalizeWords(text);
    const seed = text.length + state.turns.length;

    state.turns.push({ role: "user", text });

    /* slash-команды */
    if (lower === "/clear") { state.turns = []; state.lastTopic = null; state.lastNumber = null; return "Диалог очищен. Начнём с чистого листа ✦"; }
    if (lower === "/skills") {
      return [
        "Мои умения (всё считается локально, без внешних API):",
        "  ◈ Поиск по базе знаний хаба (BM25-индекс)",
        "  ◈ Вычисление математики: скобки, ^, проценты, sqrt/sin/cos/log, pi",
        "  ◈ Контекст диалога: понимаю «он», «это», «продолжи»",
        "  ◈ Дата, время, статус систем, шутки",
        "  ◈ Slash-команды: /clear /skills /status",
      ].join("\n");
    }
    if (lower === "/status") {
      return "yuriko-core ● | yuriko-net ● | yuriko-brain ● (BM25 + parser) | uptime: " +
        Math.max(1, Math.round((Date.now() - state.startedAt) / 1000)) + " c";
    }

    /* ---- список всех проектов: «какие есть проекты?» ---- */
    if (/(какие|список|все|перечисли).{0,15}проект|проект.{0,15}(какие|список|сколько)/.test(lower) ||
        /^сколько\s+проект/.test(lower)) {
      const list = (window.PROJECTS || []).map((p) => "  " + p.icon + " " + p.name + " — " + STATUS_TEXT(p.status)).join("\n");
      state.lastTopic = { id: "hub", title: "Yuriko Hub" };
      return reply("Вот все проекты хаба:\n" + (list || "  пока пусто") + "\n\nХочешь, расскажу подробнее про любой — напиши название.");
    }

    /* ---- приветы ---- */
    if (/(^|\s)(привет|здравствуй|здравствуйте|хай|хеллоу|добрый\s*(день|вечер|утро)|hello|hi|hey|salute)(\s|$|!|\.)/.test(lower) && words.length <= 4) {
      return reply(pick(GREET, seed));
    }

    /* ---- кто ты / что ты ---- */
    if (/(кто\s+ты|что\s+ты\s+так|ты\s+кто|ты\s+что\s+такое|what\s+are\s+you|who\s+are\s+you)/.test(lower)) {
      state.lastTopic = { id: "assistant", title: "Yuriko AI Assistant" };
      return reply("Я Yuriko AI Assistant — встроенный ассистент хаба. Внутри не болталки, а мини-движок: BM25-индекс по базе знаний, собственный парсер математических выражений и память контекста диалога. Всё работает прямо в браузере, без внешних серверов.");
    }

    /* ---- благодарность ---- */
    if (/(спасибо|благодарю|thanks)/.test(lower)) {
      return reply(pick(["Пожалуйста ✦ Обращайся!", "Рад помочь. Между прочим, я считаю это своим прямым долгом 😊", "Не за что! Попробуй ещё спросить: «сколько будет 15% от 2400»"], seed));
    }

    /* ---- прощание ---- */
    if (/(пока|до\s*свидания|bye)/.test(lower) && words.length <= 3) {
      return reply("До встречи, странник ✦ Терминал всегда открыт.");
    }

    /* ---- шутка ---- */
    if (intentScore(words, ["шутка", "смех", "анекдот", "пошути", "ржа"]) >= 2 || /шут/.test(lower)) {
      return reply(pick(JOKES, seed + state.turns.length));
    }

    /* ---- дата / время ---- */
    if (/(который\s*час|сколько\s*времени|какое\s*время|которое\s*время)/.test(lower)) {
      return reply("Сейчас " + new Date().toLocaleTimeString("ru-RU") + " (время твоё, локальное ⏰)");
    }
    if (/(какое\s*(сегодня\s*)?(число|дата)|какой\s*сегодня\s*день|какой\s*(сегодня\s*)?день\s*недели)/.test(lower)) {
      return reply("Сегодня " + new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + ".");
    }

    /* ---- математика ---- */
    const mathKeywords = intentScore(words, ["сколько", "вычислить", "посчитать", "плюс", "минус", "умножить", "разделить", "степень", "корень", "процент"]);
    const looksMathy = /[-+*/^%]\s*\d|\d+\s*(процента|процентов|%)|\bsqrt\b|\b(sin|cos|tan|log|ln)\s*\(/.test(lower) ||
      /\d+\s*[+\-*/]\s*\d+/.test(lower.replace(/[×÷]/g, (c) => (c === "×" ? "*" : "/")));
    const wordOpsMap = /(\d+\s*(?:плюс|минус|умножить(?:\sна)?|разделить(?:\sна)?|во\sстепени|в\sстепени)\s*\d+)/;
    if (looksMathy || wordOpsMap.test(lower) || (mathKeywords >= 1 && /\d/.test(lower))) {
      // «X процентов от Y» — отдельная формула
      const pct = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:процента|процентов|%)\s*(?:от|из)\s*(\d+(?:[.,]\d+)?)/);
      if (pct) {
        const v = (parseFloat(pct[1].replace(",", ".")) / 100) * parseFloat(pct[2].replace(",", "."));
        state.lastNumber = v;
        return reply(pct[1] + "% от " + pct[2] + " = " + fmtNum(v));
      }
      // перевод словесных операторов в символы перед парсингом
      let prepped = lower
        .replace(/×/g, "*").replace(/÷/g, "/")
        .replace(/\b(?:во|в)\s*степени\s*(\d+(?:[.,]\d+)?)\b/g, "^$1")
        .replace(/\bплюс\b/g, "+").replace(/\bминус\b/g, "-")
        .replace(/\bумножить\s*на\b/g, "*").replace(/\bумножить\b/g, "*")
        .replace(/\bразделить\s*на\b/g, "/").replace(/\bразделить\b/g, "/")
        .replace(/\bво\s*степени\b|\bв\s*степени\b/g, "^");
      // убираем вводные слова, мешающие парсеру («сколько будет …?»)
      prepped = prepped
        .replace(/\bplus\b/gi, "+").replace(/\bminus\b/gi, "-")
        .replace(/\btimes\b/gi, "*").replace(/\bdivided\s+by\b/gi, "/")
        .replace(/[a-zа-яё]+/gi, function (w) {
          const lw = w.toLowerCase();
          return ["sqrt","sin","cos","tan","log","ln","abs","round","floor","ceil","pi","e"].includes(lw) ? lw : " ";
        })
        .replace(/[?？!,]/g, " ")
        .trim();
      const res = tryMath(prepped);
      if (res) {
        state.lastNumber = res.value;
        return reply("⟨ " + res.expr + " ⟩ = " + fmtNum(res.value) + "\nМогу продолжить с этим числом — просто скажи «прибавь …» или «умножь на …».");
      }
    }
    // продолжение диалога с числом: "прибавь 5", "умножь на 3" от прошлого результата
    const contMatch = lower.match(/(?:прибавь|отними|вычти|умножь|раздели|подели)/);
    const fullExprPresent = /\d\s*[-+*/^%]\s*\d/.test(lower) || wordOpsMap.test(lower);
    if (state.lastNumber !== null && contMatch && !fullExprPresent) {
      const opWord = (contMatch[0] || "").toLowerCase();
      const numM = lower.match(/(\d+(?:[.,]\d+)?)/);
      const cont = numM ? [null,
        /прибавь/.test(opWord) ? numM[0] : null,
        /отними|вычти/.test(opWord) ? numM[0] : null,
        /умножь/.test(opWord) ? numM[0] : null,
        /раздели|подели/.test(opWord) ? numM[0] : null,
      ] : null;
      if (cont && (cont[1] || cont[2] || cont[3] || cont[4])) {
        const prev = state.lastNumber;
        const n = parseFloat((cont[1] || cont[2] || cont[3] || cont[4]).replace(",", "."));
        let out;
        if (cont[1]) out = prev + n;
        else if (cont[2]) out = prev - n;
        else if (cont[3]) out = prev * n;
        else out = prev / n;
        state.lastNumber = out;
        return reply("Беру прошлый результат " + fmtNum(prev) + " → теперь " + fmtNum(out) + ".");
      }
    }

    /* ---- контекстные местоимения: «расскажи про него», «что это?» ---- */
    if (state.lastTopic && /(него|неё|нём|нее|это|этот|эта|он\b|она\b|о\s+нём|про\s+не)/.test(lower) && intentScore(words, ["рассказать", "подробнее", "ещё", "объяснить"]) >= 1) {
      const doc = KB.find((d) => d.id === state.lastTopic.id);
      if (doc) return reply(doc.text + " (это я помню из прошлого ответа — контекст держу 😉)");
    }

    /* ---- поиск по базе знаний ---- */
    const hits = bm25(words);
    if (hits.length) {
      const top = hits[0];
      state.lastTopic = { id: top.doc.id, title: top.doc.title };

      // особые случаи: проекты
      if (top.doc.id === "hub" && /(все|список|какие|перечисли|сколько\s*проект)/.test(lower)) {
        const list = (window.PROJECTS || []).map((p) => "  " + p.icon + " " + p.name + " — " + STATUS_TEXT(p.status)).join("\n");
        return reply("Вот все проекты хаба:\n" + (list || "  пока пусто") + "\n\nХочешь, расскажу подробнее про любой — напиши название.");
      }
      if (window.PROJECTS) {
        const proj = window.PROJECTS.find((p) => normalizeWords(p.name).some((w) => words.includes(w)));
        if (proj && intentScore(words, ["проект", "рассказать", "что", "какой"]) >= 2) {
          state.lastTopic = { id: "proj:" + proj.name, title: proj.name };
          return reply(proj.icon + " " + proj.name + " — " + proj.desc + "\nСтатус: " + STATUS_TEXT(proj.status) + ". Могу сравнить с другими или рассказать про хаб в целом.");
        }
      }
      // подсказка «возможно вы имели в виду» при слабом совпадении
      if (top.score < 1.5 && hits[1] && hits[1].score > top.score * 0.9) {
        // близко два документа — берём оба кратко
        return reply(top.doc.text + "\n\nТакже рядом тема «" + hits[1].doc.title + "»: " + hits[1].doc.text.slice(0, 120) + "…");
      }
      return reply(top.doc.text);
    }

    /* ---- ничего не нашли: честное признание + предложение ---- */
    return reply([
      "Хм, по базе знаний релевантного ответа не нашёл (BM25 молчит 🤐).",
      "Вот что я точно умею:",
      "  • рассказать про хаб, терминал, GUI и любой проект",
      "  • посчитать: «сколько будет (12+8)*3 − sqrt(25)» или «15% от 2400»",
      "  • сказать время/дату, пошутить, показать /skills",
      "Попробуй переформулировать — я лучше понимаю по ключевым словам.",
    ].join("\n"));

    function reply(t) {
      state.turns.push({ role: "assistant", text: t });
      return t;
    }
  }

  function STATUS_TEXT(s) {
    return { soon: "скоро", progress: "в разработке", ready: "готово" }[s] || s;
  }

  window.YurikoAI = {
    answer,
    getState: () => state,
    _debug: { bm25, evalMath, normalizeWords, KB },
  };
})();
