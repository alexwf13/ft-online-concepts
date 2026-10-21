/* FT online — concept D «Продукт»: prices, links into the bot, sticky CTA,
   live hero phone (M1), bento of layers (M2) and the body map (M3). */

window.ftReady = true; // tells the <head> safety timer that this script has loaded

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

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* === Prices === */
const num = (n) => n.toLocaleString("ru-RU");
const rub = (n) => num(n) + " ₽";

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

  // Until a link is set, explain it instead of jumping to the top of the page.
  document.addEventListener("click", (event) => {
    const a = event.target.closest("[data-cta]");
    if (a && !LINKS.bot) {
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
// Shows after the first screen is gone and hides while the body-map button or the footer is on screen.
function initStickyCta() {
  const bar = document.querySelector(".sticky");
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
  document.querySelectorAll(".fit__cta, .foot").forEach((el) => blockers.observe(el));
}

/* === Header: hairline once the page scrolls (the header is sticky on desktop) === */
function initHeader() {
  const top = document.querySelector(".top");
  if (!top) return;
  const update = () => top.classList.toggle("is-scrolled", window.scrollY > 4);
  update();
  window.addEventListener("scroll", update, { passive: true });
}

/* === Helpers === */
// Remove and re-add a class so its CSS animation plays again.
function restart(el, className) {
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
}

// Wrap each character for the typing effect; screen readers get the plain text.
function splitChars(el) {
  const text = el.textContent.trim();
  const plain = document.createElement("span");
  plain.className = "sr";
  plain.textContent = text;
  const shown = document.createElement("span");
  shown.setAttribute("aria-hidden", "true");
  [...text].forEach((char, i) => {
    const span = document.createElement("span");
    span.className = "ch";
    span.style.setProperty("--d", i);
    span.textContent = char;
    shown.append(span);
  });
  el.replaceChildren(plain, shown);
}

/* === M1: the hero phone comes alive once ===
   "печатает…" → the coach's comment → the exercise card → "Сделано ✅" is tapped → check mark.
   The before-state is set in <head> (html.m1) so nothing flashes; .is-done equals the final state. */
function initLivePhone() {
  const tg = document.querySelector("[data-live-phone]");
  const root = document.documentElement;
  if (reduceMotion) root.classList.remove("m1");
  if (!tg || !root.classList.contains("m1")) return;

  const coach = tg.querySelector(".msg--coach");
  const card = tg.querySelector(".msg--card");

  // The comment waits at the bottom of the chat until the card arrives and pushes it up.
  const measure = () => {
    const bottom = (el) => el.offsetTop + el.offsetHeight;
    tg.classList.add("no-tr");
    tg.style.setProperty("--push", `${bottom(card) - bottom(coach)}px`);
    void tg.offsetHeight;
    tg.classList.remove("no-tr");
  };
  measure();

  const steps = [[1200, "s1"], [2400, "s2"], [3800, "s3"], [4400, "s4"]];
  const play = () => {
    measure();
    steps.forEach(([delay, step]) => setTimeout(() => tg.classList.add(step), delay));
    setTimeout(() => {
      tg.classList.add("is-done");
      tg.classList.remove("s1", "s2", "s3", "s4");
    }, 5200);
  };

  const io = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;
    io.disconnect();
    play();
  }, { threshold: 0.35 });
  io.observe(tg);
}

/* === M2: three layers as live tiles ===
   Desktop: the tile under the middle of the screen lights up as you scroll.
   Phone: tap a tile. Tapping the active tile plays its fragment again. */
function initBento() {
  const bento = document.querySelector("[data-bento]");
  if (!bento) return;

  const tiles = [...bento.querySelectorAll(".tile")];
  let active = tiles.find((t) => t.classList.contains("is-active")) || tiles[0];

  const replay = (tile) => {
    if (reduceMotion) return;
    const typed = tile.querySelector("[data-type]");
    if (typed) {
      typed.classList.remove("is-paused");
      restart(typed, "is-typing");
    }
    const card = tile.querySelector(".excard");
    if (card) restart(card, "is-sweep");
  };

  const activate = (tile) => {
    if (tile === active) return;
    active = tile;
    tiles.forEach((t) => {
      const on = t === tile;
      t.classList.toggle("is-active", on);
      t.querySelector(".tile__btn").setAttribute("aria-pressed", String(on));
    });
    replay(tile);
  };

  // After a click, scrolling has to move a bit before it takes over again.
  let holdY = null;
  tiles.forEach((tile) => {
    tile.addEventListener("click", () => {
      holdY = window.scrollY;
      if (tile === active) replay(tile);
      else activate(tile);
    });
  });

  // The comment types itself the first time it comes into view.
  const typed = bento.querySelector("[data-type]");
  if (typed && !reduceMotion && "IntersectionObserver" in window) {
    splitChars(typed);
    typed.classList.add("is-typing", "is-paused");
    const io = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      typed.classList.remove("is-paused");
    }, { threshold: 0.6 });
    io.observe(typed);
  }

  const wide = window.matchMedia("(min-width: 1024px)");
  const onScroll = () => {
    if (!wide.matches) return;
    if (holdY !== null) {
      if (Math.abs(window.scrollY - holdY) < 160) return;
      holdY = null;
    }
    const box = bento.getBoundingClientRect();
    const line = window.innerHeight * 0.5;
    if (box.top > line || box.bottom < line) return;
    const share = (line - box.top) / box.height;
    activate(tiles[Math.min(tiles.length - 1, Math.floor(share * tiles.length))]);
  };

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      onScroll();
    });
  }, { passive: true });
}

/* === M3: body map — pick a zone (or a profile chip), get Alexander's answer === */
function initBodyMap() {
  const map = document.querySelector("[data-map]");
  const reply = document.querySelector(".reply");
  const text = document.querySelector("[data-reply]");
  if (!map || !reply || !text) return;

  const options = [...document.querySelectorAll(".zone-chip, .fit .chip")];
  let timer;

  const select = (btn) => {
    if (!btn || btn.getAttribute("aria-pressed") === "true") return;
    options.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));

    const zone = btn.dataset.zone || "";
    map.querySelectorAll(".zone").forEach((z) => z.classList.toggle("is-on", z.dataset.zone === zone));
    map.querySelectorAll("[data-lead]").forEach((p) => p.classList.toggle("is-on", p.dataset.lead === zone));

    clearTimeout(timer);
    if (reduceMotion) {
      text.textContent = btn.dataset.answer;
      return;
    }
    // A short "typing" pause, then the answer.
    reply.classList.add("is-typing");
    timer = setTimeout(() => {
      text.textContent = btn.dataset.answer;
      reply.classList.remove("is-typing");
    }, 450);
  };

  options.forEach((b) => b.addEventListener("click", () => select(b)));

  // The figure itself is clickable too; the buttons stay the keyboard path.
  map.querySelectorAll(".zone").forEach((z) => {
    z.addEventListener("click", () => select(map.querySelector(`.zone-chip[data-zone="${z.dataset.zone}"]`)));
  });
}

renderPrices();
wireLinks();
initStickyCta();
initHeader();
initLivePhone();
initBento();
initBodyMap();
