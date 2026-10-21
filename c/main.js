/* FT online — concept C «Переписка»: prices, links, start bar, M1–M3 and reply chips. */

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

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const wide = window.matchMedia("(min-width: 1024px)");
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, reducedMotion.matches ? 0 : ms));

// Restart a one-off CSS animation on an element.
function arrive(el) {
  el.classList.remove("is-new");
  void el.offsetWidth;
  el.classList.add("is-new");
}

// A sent message gets one tick, then two once it is "read".
function send(msg) {
  msg.classList.add("is-sending");
  arrive(msg);
  setTimeout(() => msg.classList.remove("is-sending"), reducedMotion.matches ? 0 : 650);
}

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

/* === Start bar on phones === */
// Shows after the first screen is gone and hides while the final button is on screen.
function initStartBar() {
  const bar = document.querySelector(".startbar");
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
  document.querySelectorAll("#final .kb").forEach((el) => blockers.observe(el));
}

/* === Messages arrive as you scroll === */
function initReveal() {
  const groups = document.querySelectorAll("[data-reveal]");
  if (reducedMotion.matches || !("IntersectionObserver" in window)) return;
  document.documentElement.classList.add("reveal-on");

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-in");
      io.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0.1 });
  groups.forEach((el) => io.observe(el));
}

/* === M1: the phone comes alive once === */
// Typing → trainer's comment → exercise card → "Сделано ✅" is pressed → a check appears.
// Starts when the phone is on screen; the end state is the same as the page without JS.
function initM1() {
  const phone = document.getElementById("m1");
  if (!phone || reducedMotion.matches || !("IntersectionObserver" in window)) return;

  const part = (name) => phone.querySelector(`[data-m1="${name}"]`);
  const comment = part("comment");
  const card = part("card");
  const badge = part("badge");
  const done = part("done");
  const typing = part("typing");
  const feed = phone.querySelector(".tg-feed");
  const status = phone.querySelector("[data-status]");

  // While only the comment is there, it sits at the bottom: shift the feed by the card's height.
  const cardShift = () => card.offsetHeight + parseFloat(getComputedStyle(feed).rowGap || 0);

  [comment, card, badge].forEach((el) => el.classList.add("is-hidden"));
  done.classList.remove("is-done");

  const io = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    io.disconnect();
    play();
  }, { threshold: 0.6 });
  io.observe(phone);

  async function play() {
    await wait(350);
    typing.hidden = false;
    status.textContent = "печатает…";
    status.classList.add("is-typing");

    await wait(1300);
    typing.hidden = true;
    status.textContent = "бот";
    status.classList.remove("is-typing");
    feed.style.transition = "none";
    feed.style.transform = `translateY(${cardShift()}px)`;
    void feed.offsetWidth;
    feed.style.transition = "";
    comment.classList.remove("is-hidden");

    await wait(900);
    feed.style.transform = "";
    card.classList.remove("is-hidden");

    await wait(1200);
    done.classList.add("is-pressed");

    await wait(260);
    done.classList.remove("is-pressed");
    done.classList.add("is-done");
    badge.classList.remove("is-hidden");
  }
}

/* === M2: three layers === */
// Desktop: the phone sticks beside the list, scrolling highlights the layer, items are clickable.
// Phones: tabs above the mockup, "Комментарий" by default.
function initM2() {
  const phone = document.getElementById("m2");
  if (!phone) return;

  const chat = phone.querySelector(".tg-chat");
  const feed = phone.querySelector(".tg-feed");
  const tabs = [...document.querySelectorAll('.tab[data-layer]')];
  const buttons = [...document.querySelectorAll(".layer__btn")];
  const layers = [...document.querySelectorAll(".layer")];
  let current = phone.dataset.active;

  // Scroll the phone's chat so the chosen layer is in view (centered when it fits).
  // A layer can be several pieces (the card is the caption plus its buttons).
  function scrollPhone() {
    const parts = [...phone.querySelectorAll(`.tg-part[data-part="${current}"]`)];
    const overflow = Math.max(0, feed.offsetHeight - chat.clientHeight);
    if (!parts.length || !overflow) { feed.style.transform = ""; return; }
    const origin = feed.getBoundingClientRect().top;
    const top = Math.min(...parts.map((el) => el.getBoundingClientRect().top)) - origin;
    const bottom = Math.max(...parts.map((el) => el.getBoundingClientRect().bottom)) - origin;
    const down = feed.offsetHeight - (top + bottom) / 2 - chat.clientHeight / 2;
    feed.style.transform = `translateY(${Math.round(Math.min(Math.max(down, 0), overflow))}px)`;
  }

  function show(name) {
    current = name;
    phone.dataset.active = name;
    phone.setAttribute("aria-labelledby", `tab-${name}`);
    tabs.forEach((tab) => {
      const on = tab.dataset.layer === name;
      tab.setAttribute("aria-selected", String(on));
      tab.tabIndex = on ? 0 : -1;
    });
    buttons.forEach((btn) => btn.setAttribute("aria-pressed", String(btn.dataset.layer === name)));
    layers.forEach((li) => li.classList.toggle("is-active", li.dataset.layer === name));
    scrollPhone();
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => show(tab.dataset.layer));
    tab.addEventListener("keydown", (event) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
      if (!step) return;
      const next = tabs[(i + step + tabs.length) % tabs.length];
      next.focus();
      show(next.dataset.layer);
    });
  });

  buttons.forEach((btn) => btn.addEventListener("click", () => {
    show(btn.dataset.layer);
    // On phones the mockup is below the list: bring it into view.
    if (!wide.matches) {
      const box = phone.getBoundingClientRect();
      if (box.top < 0 || box.bottom > window.innerHeight) {
        phone.scrollIntoView({ block: "center", behavior: reducedMotion.matches ? "auto" : "smooth" });
      }
    }
  }));

  // Desktop: the layer crossing the middle of the screen becomes active.
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      if (!wide.matches) return;
      entries.forEach((entry) => {
        if (entry.isIntersecting) show(entry.target.dataset.layer);
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    layers.forEach((li) => io.observe(li));
  }

  window.addEventListener("resize", scrollPhone);
  if (document.fonts) document.fonts.ready.then(scrollPhone);
  show(current);
}

/* === M3: your situation → the trainer's answer === */
function initM3() {
  const root = document.getElementById("m3");
  if (!root) return null;

  const chips = [...root.querySelectorAll(".chip[data-answer]")];
  const ask = root.querySelector(".m3__ask");
  const question = root.querySelector(".m3__q");
  const answerMsg = root.querySelector(".m3__answer");
  const answer = root.querySelector(".m3__a");
  const typing = root.querySelector(".typing");
  let turn = 0;

  async function pick(chip, text) {
    const id = ++turn;
    chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
    question.textContent = text || chip.textContent;
    send(ask);

    answerMsg.hidden = true;
    typing.hidden = reducedMotion.matches;
    await wait(850);
    if (id !== turn) return;

    typing.hidden = true;
    answer.textContent = chip.dataset.answer;
    answerMsg.hidden = false;
    arrive(answerMsg);
  }

  chips.forEach((chip) => chip.addEventListener("click", () => pick(chip)));

  return {
    pick(key, text) {
      const chip = chips.find((c) => c.dataset.key === key);
      if (chip) pick(chip, text);
    },
  };
}

/* === Reply chips: send your message and jump to the answer === */
// Everything is on the page anyway: the chips only speed things up.
function initReplies(m3) {
  document.querySelectorAll(".chip[data-goto]").forEach((chip) => {
    chip.addEventListener("click", () => {
      const section = document.getElementById(chip.dataset.goto);
      if (!section) return;
      const text = chip.textContent.trim();
      let target = section;

      document.querySelectorAll(`.chip[data-goto="${chip.dataset.goto}"]`).forEach((c) => c.classList.add("is-sent"));

      if (chip.dataset.pick && m3) {
        target = document.getElementById("m3");
        m3.pick(chip.dataset.pick, text);
      } else {
        const slot = section.querySelector("[data-ask]");
        if (slot) {
          const msg = slot.querySelector(".msg");
          msg.querySelector("p").textContent = text;
          slot.hidden = false;
          send(msg);
          target = slot;
        }
      }

      target.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: chip.dataset.pick ? "center" : "start" });
      const heading = section.querySelector("h2");
      if (heading) heading.focus({ preventScroll: true });
    });
  });
}

renderPrices();
wireLinks();
initStartBar();
initReveal();
initM1();
initM2();
initReplies(initM3());
