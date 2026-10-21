/* FT online — landing: prices, links into the bot, sticky CTA on phones, the trainer's pen marks
   and the mechanics: M1 "the phone comes alive", the four questions, M2 "layers",
   M3 "situation → the trainer's answer", M4 "reps slider". */

/* === Settings: the only place to change prices and links === */
const PRICING = {
  monthly: 1290,                // 1 month
  quarter: 2990,                // 3 months
  trainerSession: [1500, 3000], // one personal session with a trainer, for comparison
};

const LINKS = {
  bot: "",     // bot link, e.g. "https://t.me/ft_online_bot" — fill in before launch
  trainer: "", // trainer's Telegram, e.g. "https://t.me/username"
};

const NOT_READY_TEXT = "Ссылка появится перед запуском";
const VIDEO_SOON_TEXT = "Видео появится перед запуском";

const REPS_VERDICT = {
  low: "Меньше 8 — вес тяжеловат. Бот подскажет снизить.",
  ok: "В вилке 8–12 — вес подходит. Работай с ним.",
  high: "Больше 12 — пора добавлять вес.",
};

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* === Prices === */
const num = (n) => n.toLocaleString("ru-RU");
const rub = (n) => num(n) + " ₽"; // a non-breaking space keeps "₽" with the number

function renderPrices() {
  const values = {
    monthly: rub(PRICING.monthly),
    quarter: rub(PRICING.quarter),
    quarterFull: rub(PRICING.monthly * 3),
    quarterPerMonth: rub(Math.round(PRICING.quarter / 3)),
    trainerSession: PRICING.trainerSession.map(num).join("–") + " ₽",
  };
  document.querySelectorAll("[data-price]").forEach((el) => {
    const value = values[el.dataset.price];
    if (value) el.textContent = value;
  });
}

/* === Links === */
// Telegram passes ?start=... to the bot: it shows where the click came from
// (button place + utm_source). Allowed: A–Z, a–z, 0–9, _ and -, up to 64 chars.
function startPayload(place) {
  const source = new URLSearchParams(location.search).get("utm_source") || "";
  return [place, source].filter(Boolean).join("-").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
}

function wireLinks() {
  if (LINKS.bot) {
    document.querySelectorAll("[data-cta]").forEach((a) => {
      a.href = `${LINKS.bot}?start=${startPayload(a.dataset.cta)}`;
    });
  }
  if (LINKS.trainer) {
    document.querySelectorAll("[data-contact]").forEach((a) => { a.href = LINKS.trainer; });
  }

  // Until a link or a video is ready, explain it instead of jumping to the top of the page.
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-video-soon]")) {
      showToast(VIDEO_SOON_TEXT);
      return;
    }
    const a = event.target.closest("[data-cta], [data-contact], [data-soon]");
    if (!a) return;
    const ready = a.hasAttribute("data-cta") ? LINKS.bot
      : a.hasAttribute("data-contact") ? LINKS.trainer
      : "";
    if (!ready) {
      event.preventDefault();
      showToast(NOT_READY_TEXT);
    }
  });
}

let toastTimer;
function showToast(text) {
  const toast = document.querySelector(".toast");
  if (!toast) return;
  toast.textContent = text;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2500);
}

/* === Sticky CTA on phones === */
// Shows once the first screen's button has gone up and hides while the price or the final button is on screen.
function initStickyCta() {
  const bar = document.querySelector(".sticky-cta");
  const heroAction = document.querySelector("#hero .hero__action");
  if (!bar || !heroAction || !("IntersectionObserver" in window)) return;

  let heroPassed = false;
  const blockersOnScreen = new Set();

  const update = () => {
    const show = heroPassed && blockersOnScreen.size === 0;
    bar.classList.toggle("is-visible", show);
    bar.inert = !show;
  };

  new IntersectionObserver(([entry]) => {
    heroPassed = !entry.isIntersecting && entry.boundingClientRect.top < 0;
    update();
  }).observe(heroAction);

  const blockers = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) blockersOnScreen.add(entry.target);
      else blockersOnScreen.delete(entry.target);
    });
    update();
  });
  document.querySelectorAll("#price .price__action, #final .final__action").forEach((el) => blockers.observe(el));
}

/* === Pen marks === */
// Each mark is <svg class="pen"><use href="#pen-…"/></svg>. The strokes are copied in from the sprite,
// so every stroke can be drawn: its dash slides along the path (stroke-dashoffset in CSS).
// Without JS, or if measuring fails, the marks are simply shown.
function initPen() {
  document.querySelectorAll("svg.pen").forEach((svg) => {
    const use = svg.querySelector("use");
    const symbol = use && document.querySelector(use.getAttribute("href"));
    if (!symbol) return;
    ["viewBox", "preserveAspectRatio"].forEach((name) => {
      if (symbol.hasAttribute(name)) svg.setAttribute(name, symbol.getAttribute(name));
    });
    symbol.querySelectorAll("path").forEach((path) => svg.appendChild(path.cloneNode()));
    use.remove();
  });

  measurePen();
  document.documentElement.classList.add("pen-ready");

  // stretched marks change length with the layout
  let timer;
  window.addEventListener("resize", () => {
    clearTimeout(timer);
    timer = setTimeout(measurePen, 150);
  });
  if (document.fonts) document.fonts.ready.then(measurePen);
}

// The dash must be as long as the stroke. Circles and underlines are stretched to the word they mark
// and keep a constant pen width (non-scaling-stroke); their dash is in screen pixels,
// so they are measured after the stretch. Other marks are measured in their own units.
// A stroke that can't be measured (e.g. hidden at this screen width) keeps a long default dash.
function measurePen() {
  document.querySelectorAll("svg.pen path").forEach((path) => {
    try {
      const total = path.getTotalLength();
      let length = total;
      if (path.getAttribute("vector-effect") === "non-scaling-stroke") {
        const matrix = path.getCTM();
        if (!matrix) return;
        let prev = null;
        length = 0;
        for (let i = 0; i <= 40; i++) {
          const point = path.getPointAtLength((total * i) / 40).matrixTransform(matrix);
          if (prev) length += Math.hypot(point.x - prev.x, point.y - prev.y);
          prev = point;
        }
      }
      if (length > 1) path.style.setProperty("--len", (length * 1.02 + 2).toFixed(1));
    } catch (error) {
      // leave the default
    }
  });
}

function drawMarks(root) {
  const marks = root.matches(".pen") ? [root] : root.querySelectorAll(".pen");
  marks.forEach((mark) => mark.classList.add("is-drawn"));
}

// Marks with data-draw are drawn once, when they come into view.
function initDrawOnView() {
  const marks = document.querySelectorAll(".pen[data-draw]");
  if (!("IntersectionObserver" in window)) {
    marks.forEach(drawMarks);
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      drawMarks(entry.target);
    });
  }, { rootMargin: "0px 0px -20% 0px" });
  marks.forEach((mark) => observer.observe(mark));
}

/* === M1. The phone comes alive (first screen) === */
// Plays once when the phone is on screen: "печатает…" → trainer's comment (the margin note points at it) →
// exercise card → "Сделано ✅" is pressed → the trainer ticks it. With reduced motion the final state is shown at once.
function initHeroPhone() {
  const phone = document.querySelector(".m1");
  if (!phone) return;
  const tick = phone.querySelector(".m1__tick");
  const note = document.querySelector(".hero__note");

  const showNote = () => {
    note.classList.remove("is-waiting");
    drawMarks(note);
  };
  const finish = () => {
    phone.classList.remove("is-armed", "is-typing", "is-pressed");
    tick.classList.add("is-drawn");
    showNote();
  };
  if (reduceMotion || !("IntersectionObserver" in window)) {
    finish();
    return;
  }

  phone.classList.add("is-armed");
  note.classList.add("is-waiting");
  const steps = [
    [200, () => phone.classList.add("is-typing")],
    [1500, () => {
      phone.classList.replace("is-typing", "has-comment");
      showNote();
    }],
    [2500, () => phone.classList.add("has-card")],
    [3800, () => phone.classList.add("is-pressed")],
    [4100, finish],
  ];
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    observer.disconnect();
    steps.forEach(([ms, step]) => setTimeout(step, ms));
  }, { threshold: 0.5 });
  observer.observe(phone);
}

/* === Four questions (block 2) === */
// Each question is a link to its answer: the trainer underlines it, the page goes there,
// and the same question is underlined next to the answer.
function initAsks() {
  document.querySelectorAll("[data-ask]").forEach((link) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      link.closest(".ask").classList.add("is-asked");
      drawMarks(link);
      const go = () => {
        target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
        target.focus({ preventScroll: true });
        drawWhenSeen(target);
      };
      if (reduceMotion) go();
      else setTimeout(go, 450);
    });
  });
}

function drawWhenSeen(el) {
  if (!("IntersectionObserver" in window)) {
    drawMarks(el);
    return;
  }
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    observer.disconnect();
    setTimeout(() => drawMarks(el), reduceMotion ? 0 : 300);
  }, { threshold: 1 });
  observer.observe(el);
}

/* === M2. Three layers of one exercise (block 3) === */
// Desktop: the layer crossing the middle of the screen is active, the sticky phone shows its part.
// Phones: tabs above the mock. Clicks on a layer or a tab do the same.
function initLayers() {
  const section = document.querySelector("#inside");
  if (!section) return;
  const layers = [...section.querySelectorAll(".layer")];
  const buttons = [...section.querySelectorAll("button[data-layer]")];
  const visual = section.querySelector(".inside__visual");
  const chat = visual.querySelector(".tg-chat");
  const feed = chat.querySelector(".tg-chat__feed");
  const marker = visual.querySelector(".layers-marker");
  const markerNum = marker.querySelector(".layers-marker__num");
  const desktop = matchMedia("(min-width: 960px)");
  let active = 1;
  let seen = false;   // pen marks are drawn only once the block is on screen
  let lockUntil = 0;  // ignore scroll updates while scrolling to a clicked layer

  function show(n) {
    active = n;
    section.dataset.active = n;
    layers.forEach((layer) => {
      const on = Number(layer.dataset.layer) === n;
      layer.classList.toggle("is-active", on);
      layer.querySelectorAll(".pen").forEach((mark) => mark.classList.toggle("is-drawn", on && seen));
    });
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.layer) === n)));
    placePhone();
  }

  // Scrolls the chat inside the mock to the active part and puts the circled number next to it.
  function placePhone() {
    const parts = [...feed.querySelectorAll(`[data-part="${active}"]`)];
    const top = Math.min(...parts.map((p) => p.offsetTop));
    const bottom = Math.max(...parts.map((p) => p.offsetTop + p.offsetHeight));
    const pad = parseFloat(getComputedStyle(chat).paddingTop);
    const room = chat.clientHeight;
    const maxShift = Math.max(0, feed.offsetHeight + 2 * pad - room);
    const shift = Math.min(maxShift, top);
    feed.style.transform = `translateY(${-shift}px)`;

    const seenTop = Math.max(top, shift - pad);
    const seenBottom = Math.min(bottom, shift - pad + room);
    const chatTop = chat.getBoundingClientRect().top - visual.getBoundingClientRect().top;
    const y = chatTop + pad - shift + (seenTop + seenBottom) / 2;
    marker.style.transform = `translateY(${Math.round(y)}px)`;
    markerNum.textContent = active;
  }

  buttons.forEach((button) => button.addEventListener("click", () => {
    const n = Number(button.dataset.layer);
    show(n);
    if (desktop.matches && button.classList.contains("layer__btn")) {
      lockUntil = Date.now() + 900;
      layers[n - 1].scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    }
  }));

  if ("IntersectionObserver" in window) {
    const middle = new IntersectionObserver((entries) => {
      if (!desktop.matches || Date.now() < lockUntil) return;
      entries.forEach((entry) => {
        if (entry.isIntersecting) show(Number(entry.target.dataset.layer));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    layers.forEach((layer) => middle.observe(layer));

    const firstLook = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      firstLook.disconnect();
      seen = true;
      show(active);
    }, { threshold: 0.35 });
    firstLook.observe(visual);
  } else {
    seen = true;
  }

  desktop.addEventListener("change", () => show(active));
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(placePhone, 150);
  });
  show(active);
}

/* === M3. Situation → the trainer's answer (block 4) === */
function initAdapt() {
  const box = document.querySelector(".adapt");
  if (!box) return;
  const chips = [...box.querySelectorAll(".chip")];
  const answers = [...box.querySelectorAll(".adapt__answer")];

  chips.forEach((chip) => chip.addEventListener("click", () => {
    if (chip.getAttribute("aria-pressed") === "true") return;
    chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
    answers.forEach((answer) => {
      const on = answer.dataset.adapt === chip.dataset.adapt;
      answer.classList.toggle("is-active", on);
      if (on && !reduceMotion) {
        answer.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 300, easing: "ease-out" });
      }
    });
  }));
}

/* === M4. Reps slider (block 5) === */
function initReps() {
  const widget = document.querySelector(".reps-widget");
  if (!widget) return;
  const scale = widget.querySelector(".scale");
  const input = widget.querySelector(".scale__input");
  const text = widget.querySelector(".verdict__text");
  const icons = [...widget.querySelectorAll(".verdict__icon")];
  const min = Number(input.min);
  const max = Number(input.max);

  const update = () => {
    const value = Number(input.value);
    const zone = value < 8 ? "low" : value > 12 ? "high" : "ok";
    widget.style.setProperty("--i", value - min);
    input.setAttribute("aria-valuetext", `${value} повторов`);
    if (widget.dataset.zone === zone) return;
    widget.dataset.zone = zone;
    text.textContent = REPS_VERDICT[zone];
    // the trainer redraws the mark on the margin: ✓ the weight fits, ↑ add weight, ↓ lower it
    icons.forEach((icon) => icon.classList.toggle("is-drawn", icon.dataset.zone === zone));
    if (!reduceMotion) {
      text.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 260, easing: "ease-out" });
    }
  };

  // Taps and drags on the numbers set the value (iOS ignores taps on a range track);
  // the range input itself keeps keyboard and screen reader support.
  const setFromPointer = (event) => {
    const box = scale.getBoundingClientRect();
    const column = Math.floor(((event.clientX - box.left) / box.width) * (max - min + 1));
    const value = Math.min(max, Math.max(min, min + column));
    if (Number(input.value) === value) return;
    input.value = value;
    update();
  };
  scale.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault(); // keep focus on the input, so arrow keys work right after a tap
    scale.setPointerCapture(event.pointerId);
    setFromPointer(event);
    input.focus({ preventScroll: true });
  });
  scale.addEventListener("pointermove", (event) => {
    if (scale.hasPointerCapture(event.pointerId)) setFromPointer(event);
  });
  input.addEventListener("input", update);
  update();
}

renderPrices();
wireLinks();
initStickyCta();
initPen();
initDrawOnView();
initHeroPhone();
initAsks();
initLayers();
initAdapt();
initReps();
