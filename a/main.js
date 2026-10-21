/* FT online — concept A «Зал»: links, sticky CTA and three mechanics
   (M1 the phone comes alive, M2 layers, M4 reps slider). */

/* === Settings: same as the prototype === */
const PRICING = {
  monthly: 1290,                // 1 month
  quarter: 2990,                // 3 months
  trainerSession: [1500, 3000], // one personal session with a trainer, for comparison
};

const LINKS = {
  bot: "",     // bot link, e.g. "https://t.me/ft_online_bot" — fill in before launch
  trainer: "", // trainer's Telegram
};

const NOT_READY_TEXT = "Ссылка появится перед запуском";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const desktop = window.matchMedia("(min-width: 1024px)");

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
// Telegram passes ?start=... to the bot: button place + utm_source.
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

/* === Header: solid background once the page is scrolled (desktop) === */
function initHeader() {
  const header = document.querySelector(".top");
  if (!header) return;
  const update = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  update();
  window.addEventListener("scroll", update, { passive: true });
}

/* === After the hero button scrolls away === */
// Phones: the sticky button slides in. Desktop: the header button lights up.
function initAfterHero() {
  const bar = document.querySelector(".sticky-cta");
  const header = document.querySelector(".top");
  const heroCta = document.querySelector(".hero__cta");
  if (!bar || !header || !heroCta || !("IntersectionObserver" in window)) return;

  new IntersectionObserver(([entry]) => {
    const past = !entry.isIntersecting && entry.boundingClientRect.top < 0;
    header.classList.toggle("is-past-hero", past);
    bar.classList.toggle("is-visible", past);
    bar.inert = !past;
  }).observe(heroCta);
}

/* === M1: the phone comes alive === */
// Plays once when the phone is on screen: "печатает…" → comment → exercise card → tap on «Сделано ✅».
// Without JS or with reduced motion the phone simply shows the final state.
function initHeroPhone() {
  const phone = document.querySelector("#hero-phone");
  if (!phone || reducedMotion.matches || !("IntersectionObserver" in window)) return;

  const feed = phone.querySelector(".tg-feed");
  const comment = phone.querySelector('[data-m1="comment"]');

  // Until the card arrives the comment is the last message, so the feed sits lower by the card's height.
  const dropFeed = () => {
    const below = feed.offsetHeight - (comment.offsetTop + comment.offsetHeight);
    feed.style.transform = `translateY(${below}px)`;
  };

  phone.classList.remove("is-done");
  phone.classList.add("m1");
  dropFeed();
  window.addEventListener("resize", dropFeed);

  const steps = [
    [0, () => phone.classList.add("is-typing")],
    [1400, () => { phone.classList.remove("is-typing"); phone.classList.add("has-comment"); }],
    [2300, () => {
      window.removeEventListener("resize", dropFeed);
      phone.classList.add("has-card");
      feed.style.transform = "";
    }],
    [3700, () => phone.classList.add("is-tapping")],
    [4000, () => phone.classList.add("is-done")],
  ];

  const io = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    io.disconnect();
    steps.forEach(([delay, run]) => setTimeout(run, delay));
  }, { threshold: 0.5 });
  io.observe(phone);
}

/* === M2: three layers === */
// Desktop: the step in the middle of the screen lights up its part of the phone; steps are clickable.
// Phones: the steps work as tabs above the mockup.
function initLayers() {
  const phone = document.querySelector("#layers-phone");
  const items = [...document.querySelectorAll(".layer")];
  if (!phone || !items.length) return;

  const chat = phone.querySelector(".tg-chat");
  const feed = phone.querySelector(".tg-feed");

  function setActive(name) {
    items.forEach((li) => {
      const on = li.dataset.layer === name;
      li.classList.toggle("is-active", on);
      li.querySelector(".layer__btn").setAttribute("aria-pressed", String(on));
    });
    phone.dataset.active = name;

    // Scroll the chat inside the phone so the active part is in view.
    const part = feed.querySelector(`[data-part="${name}"]`);
    const top = part.getBoundingClientRect().top - feed.getBoundingClientRect().top;
    const max = Math.max(0, feed.offsetHeight - chat.clientHeight);
    const y = Math.min(max, Math.max(0, top - 12));
    feed.style.transform = `translateY(${-y}px)`;
  }

  items.forEach((li) => {
    li.querySelector(".layer__btn").addEventListener("click", () => {
      setActive(li.dataset.layer);
      if (desktop.matches) {
        li.scrollIntoView({ block: "center", behavior: reducedMotion.matches ? "auto" : "smooth" });
      }
    });
  });

  let observer;
  function followScroll(on) {
    if (observer) observer.disconnect();
    observer = null;
    if (!on || !("IntersectionObserver" in window)) return;
    // A thin band across the middle of the screen: the step crossing it is the active one.
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.dataset.layer);
      });
    }, { rootMargin: "-48% 0px -48% 0px" });
    items.forEach((li) => observer.observe(li));
  }

  followScroll(desktop.matches);
  desktop.addEventListener("change", (event) => followScroll(event.matches));

  let frame;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => setActive(phone.dataset.active));
  });

  setActive(phone.dataset.active || "comment");
}

/* === M4: reps slider === */
const REPS_VERDICTS = {
  low: "Меньше 8 — вес тяжеловат. Бот подскажет снизить.",
  ok: "В вилке 8–12 — вес подходит. Работай с ним.",
  high: "Больше 12 — пора добавлять вес.",
};

function initReps() {
  const box = document.querySelector(".reps");
  if (!box) return;
  const input = box.querySelector(".reps__input");
  const count = box.querySelector(".reps__count");
  const msg = box.querySelector(".reps__msg");
  const ticks = [...box.querySelectorAll(".reps__ticks li")];

  const update = () => {
    const reps = Number(input.value);
    const zone = reps < 8 ? "low" : reps > 12 ? "high" : "ok";
    count.textContent = reps;
    input.setAttribute("aria-valuetext", `${reps} повторов`);
    ticks.forEach((li) => li.classList.toggle("is-current", Number(li.textContent) === reps));
    if (box.dataset.zone !== zone) {
      box.dataset.zone = zone;
      msg.textContent = REPS_VERDICTS[zone];
    }
  };

  input.addEventListener("input", update);
  update();
}

renderPrices();
wireLinks();
initHeader();
initAfterHero();
initHeroPhone();
initLayers();
initReps();
