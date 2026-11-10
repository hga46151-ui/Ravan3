/* index.js — home page only: contact form and banner slider */

(function () {
  const contactForm = document.getElementById("contactForm");
  if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      contactForm.querySelector(".done").style.display = "block";
    });
  }
})();

/* ---------- Banner slider ---------- */
(function () {
  const banner = document.getElementById("banner");
  const track = document.getElementById("bannerTrack");
  const dotsBox = document.getElementById("bannerDots");
  if (!banner || !track || !dotsBox) return;

  const slides = Array.from(track.querySelectorAll(".banner-slide"));
  const n = slides.length;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DELAY = 5500;
  const rtl = getComputedStyle(track).direction === "rtl";
  let current = 0;
  let timer = null;
  let hovering = false;
  let inView = true;
  let dragged = false;

  banner.style.setProperty("--banner-delay", DELAY + "ms");
  if (reduce) banner.classList.add("static");

  const dots = slides.map(function (_, i) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "banner-dot";
    b.setAttribute("role", "tab");
    b.setAttribute("aria-label", "بنر " + (i + 1));
    b.addEventListener("click", function () {
      goTo(i);
      restart();
    });
    dotsBox.appendChild(b);
    return b;
  });

  function width() {
    return track.clientWidth || 1;
  }
  function setActive(i) {
    current = i;
    slides.forEach(function (s, k) {
      s.classList.toggle("is-active", k === i);
    });
    dots.forEach(function (d, k) {
      d.classList.toggle("is-active", k === i);
      d.setAttribute("aria-selected", String(k === i));
    });
  }
  function goTo(i, instant) {
    i = (i + n) % n;
    track.scrollTo({
      left: (rtl ? -1 : 1) * i * width(),
      behavior: instant || reduce ? "auto" : "smooth",
    });
    setActive(i);
  }
  function next() {
    goTo(current + 1);
  }
  function prev() {
    goTo(current - 1);
  }

  /* keep dots in sync with manual scrolling / swiping */
  let raf = 0;
  track.addEventListener(
    "scroll",
    function () {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        const i = Math.round(Math.abs(track.scrollLeft) / width());
        if (i !== current && i >= 0 && i < n) {
          setActive(i);
          restart();
        }
      });
    },
    { passive: true },
  );

  banner.querySelector(".banner-next").addEventListener("click", function () {
    next();
    restart();
  });
  banner.querySelector(".banner-prev").addEventListener("click", function () {
    prev();
    restart();
  });

  /* keyboard: in RTL the left arrow means "next" */
  track.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      rtl ? next() : prev();
      restart();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      rtl ? prev() : next();
      restart();
    }
  });

  /* mouse drag (touch uses native scrolling) */
  track.addEventListener("dragstart", function (e) {
    e.preventDefault();
  });
  let startX = 0;
  let startLeft = 0;
  let startIndex = 0;
  let down = false;
  track.addEventListener("pointerdown", function (e) {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    down = true;
    dragged = false;
    startX = e.clientX;
    startLeft = track.scrollLeft;
    startIndex = current;
    track.classList.add("dragging");
    track.setPointerCapture(e.pointerId);
  });
  track.addEventListener("pointermove", function (e) {
    if (!down) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 5) dragged = true;
    track.scrollLeft = startLeft - dx;
  });
  function endDrag(e) {
    if (!down) return;
    down = false;
    const moved = track.scrollLeft - startLeft;
    track.classList.remove("dragging");
    const dir = rtl ? -1 : 1;
    let i = startIndex;
    if (Math.abs(moved) > width() * 0.15) {
      i = moved * dir > 0 ? startIndex + 1 : startIndex - 1;
    }
    i = Math.max(0, Math.min(n - 1, i));
    goTo(i);
    restart();
  }
  track.addEventListener("pointerup", endDrag);
  track.addEventListener("pointercancel", endDrag);
  track.addEventListener(
    "click",
    function (e) {
      if (dragged) {
        e.preventDefault();
        e.stopPropagation();
        dragged = false;
      }
    },
    true,
  );

  /* autoplay: pauses on hover/focus, when hidden or scrolled away */
  function stop() {
    clearInterval(timer);
    timer = null;
  }
  function start() {
    if (reduce || timer || hovering || !inView || document.hidden) return;
    banner.classList.remove("paused");
    timer = setInterval(next, DELAY);
  }
  function restart() {
    stop();
    /* restart the dot's progress animation */
    const d = dots[current];
    if (d) {
      d.classList.remove("is-active");
      void d.offsetWidth;
      d.classList.add("is-active");
    }
    start();
  }
  banner.addEventListener("pointerenter", function (e) {
    if (e.pointerType === "mouse") {
      hovering = true;
      banner.classList.add("paused");
      stop();
    }
  });
  banner.addEventListener("pointerleave", function (e) {
    if (e.pointerType === "mouse") {
      hovering = false;
      restart();
    }
  });
  document.addEventListener("visibilitychange", function () {
    document.hidden ? stop() : restart();
  });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      function (entries) {
        inView = entries[0].isIntersecting;
        inView ? restart() : stop();
      },
      { threshold: 0.25 },
    ).observe(banner);
  }
  window.addEventListener("resize", function () {
    goTo(current, true);
  });

  setActive(0);
  start();
})();

/* ---------- Course cards: dots under the swipeable row (phones only, see index.css) ---------- */
(function () {
  const list = document.querySelector(".courses-list");
  if (!list) return;
  const cards = Array.from(list.querySelectorAll(".course-card"));
  if (cards.length < 2) return;

  const wrap = document.createElement("div");
  wrap.className = "snap-dots";
  wrap.setAttribute("aria-hidden", "true");
  const dots = cards.map(function (card, i) {
    const b = document.createElement("button");
    b.type = "button";
    b.tabIndex = -1;
    b.addEventListener("click", function () {
      card.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    });
    wrap.appendChild(b);
    return b;
  });
  list.insertAdjacentElement("afterend", wrap);

  /* the card whose centre is closest to the centre of the row is the current one */
  function sync() {
    const box = list.getBoundingClientRect();
    const mid = box.left + box.width / 2;
    let best = 0;
    let bestDist = Infinity;
    cards.forEach(function (card, i) {
      const r = card.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - mid);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    dots.forEach(function (d, i) {
      d.classList.toggle("is-active", i === best);
    });
  }
  let raf = 0;
  list.addEventListener(
    "scroll",
    function () {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(sync);
    },
    { passive: true },
  );
  window.addEventListener("resize", sync);
  sync();
})();

/* ---------- About: "read more" on phones ---------- */
(function () {
  const about = document.querySelector(".about");
  const body = about && about.querySelector(".about-body");
  if (!body) return;
  const mq = window.matchMedia("(max-width: 560px)");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "read-more";
  body.appendChild(btn);
  let touched = false;

  function sync() {
    const collapsed = about.classList.contains("is-collapsed");
    btn.textContent = collapsed ? "ادامه‌ی مطلب" : "بستن";
    btn.setAttribute("aria-expanded", String(!collapsed));
  }
  function apply() {
    /* only phones collapse the text; wider screens always show everything */
    if (mq.matches) {
      if (!touched) about.classList.add("is-collapsed");
    } else {
      about.classList.remove("is-collapsed");
    }
    sync();
  }
  btn.addEventListener("click", function () {
    touched = true;
    about.classList.toggle("is-collapsed");
    sync();
    if (about.classList.contains("is-collapsed")) {
      about.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  });
  if (mq.addEventListener) mq.addEventListener("change", apply);
  else mq.addListener(apply);
  apply();
})();
