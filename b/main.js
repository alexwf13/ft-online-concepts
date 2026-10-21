/* FT online — concept B: prices, links into the bot, sticky CTA on phones and three mechanics:
   M1 "the phone comes alive", M2 "layers", M4 "reps slider". */

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

const REPS_VERDICT = {
  low: "Меньше 8 — вес тяжеловат. Бот подскажет снизить.",
  ok: "В вилке 8–12 — вес подходит. Работай с ним.",
  high: "Больше 12 — пора добавлять вес.",
};

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* === Prices === */
const num = (n) => n.toLocaleString("ru-RU");
const rub = (n) => num(n) + " ₽";

function renderPrices() {
  const values = {
    monthly: rub(PRICING.monthly),
    quarter: rub(PRICING.quarter),
    quarterFull: rub(PRICING.monthly * 3),
    quarterPerMonth: rub(Math.round(PRICING.quarter / 3)),
    trainerSession: PRICING.trainerSession.map(num).join("–") + " ₽",
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

  // Until a link is set, explain it instead of jumping to the top of the page.
  document.addEventListener("click", (event) => {
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
// Shows after the first screen is gone and hides while the final button is on screen.
function initStickyCta() {
  const bar = document.querySelector(".sticky-cta");
  const hero = document.querySelector("#hero");
  if (!bar || !hero || !("IntersectionObserver" in window)) return;

  let heroOnScreen = true;
  const blockersOnScreen = new Set();

  const update = () => {
    const show = !heroOnScreen && blockersOnScreen.size === 0;
    bar.classList.toggle("is-visible", show);
    bar.inert = !show;
  };

  new IntersectionObserver(([entry]) => {
    heroOnScreen = entry.isIntersecting;
    update();
  }).observe(hero);

  const blockers = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) blockersOnScreen.add(entry.target);
      else blockersOnScreen.delete(entry.target);
    });
    update();
  });
  document.querySelectorAll("#final .final__action").forEach((el) => blockers.observe(el));
}

/* === M1. The phone comes alive (first screen) === */
// Plays once when the phone is on screen: "печатает…" → trainer's comment → exercise card →
// "Сделано ✅" is pressed → the trainer ticks it. With reduced motion the final state is shown at once.
function initHeroPhone() {
  const phone = document.querySelector(".m1");
  if (!phone) return;
  const tick = phone.querySelector(".m1__tick");

  const finish = () => {
    phone.classList.remove("is-armed", "is-typing", "is-pressed");
    tick.classList.add("is-drawn");
  };
  if (reduceMotion || !("IntersectionObserver" in window)) {
    finish();
    return;
  }

  phone.classList.add("is-armed");
  const steps = [
    [200, () => phone.classList.add("is-typing")],
    [1500, () => phone.classList.replace("is-typing", "has-comment")],
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
      layer.querySelectorAll(".ink").forEach((ink) => ink.classList.toggle("is-drawn", on && seen));
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

/* === M4. Reps slider (block 5) === */
function initReps() {
  const widget = document.querySelector(".reps-widget");
  if (!widget) return;
  const scale = widget.querySelector(".scale");
  const input = widget.querySelector(".scale__input");
  const text = widget.querySelector(".verdict__text");
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
initHeroPhone();
initLayers();
initReps();
