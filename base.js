/* base.js — shared by every page: mobile menu, floating buttons, back-to-top, sparkles and scroll reveal */

(function () {
  const burger = document.getElementById("burgerBtn");
  const menu = document.getElementById("navLinks");

  if (burger && menu) {
    const mq = window.matchMedia("(max-width: 880px)");

    const openMenu = function () {
      burger.classList.add("active");
      menu.classList.add("open");
      burger.setAttribute("aria-expanded", "true");
    };
    const closeMenu = function () {
      burger.classList.remove("active");
      menu.classList.remove("open");
      burger.setAttribute("aria-expanded", "false");
    };
    const toggleMenu = function () {
      if (menu.classList.contains("open")) {
        closeMenu();
      } else {
        openMenu();
      }
    };

    let hoverCloseTimer = null;

    const cancelHoverClose = function () {
      clearTimeout(hoverCloseTimer);
      hoverCloseTimer = null;
    };
    const scheduleHoverClose = function () {
      cancelHoverClose();
      hoverCloseTimer = setTimeout(function () {
        closeMenu();
        hoverCloseTimer = null;
      }, 3000);
    };

    burger.addEventListener("click", function () {
      cancelHoverClose();
      toggleMenu();
    });
    /* Hover only for a real mouse. On touch screens a tap also fires
       "mouseenter", which used to open the menu and then the click closed
       it again, so the burger looked dead on phones. */
    const mouseOnly = function (fn) {
      return function (e) {
        if (e.pointerType === "mouse") fn();
      };
    };
    const hoverOpen = function () {
      cancelHoverClose();
      openMenu();
    };
    burger.addEventListener("pointerenter", mouseOnly(hoverOpen));
    burger.addEventListener("pointerleave", mouseOnly(scheduleHoverClose));
    menu.addEventListener("pointerenter", mouseOnly(hoverOpen));
    menu.addEventListener("pointerleave", mouseOnly(scheduleHoverClose));

    menu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });
    document.addEventListener("click", function (e) {
      if (
        mq.matches &&
        menu.classList.contains("open") &&
        !menu.contains(e.target) &&
        !burger.contains(e.target)
      ) {
        cancelHoverClose();
        closeMenu();
      }
    });
  }

  const fab = document.getElementById("fabAuth");
  if (fab) {
    let fabCloseTimer = null;

    function openFab() {
      fab.classList.add("open");
    }
    function closeFab() {
      fab.classList.remove("open");
      fabCloseTimer = null;
    }

    fab.addEventListener("mouseenter", function () {
      openFab();
      clearTimeout(fabCloseTimer);
      fabCloseTimer = setTimeout(closeFab, 3000);
    });

    /* Touch devices have no hover: tapping opens the label the same way. */
    fab.addEventListener(
      "touchstart",
      function () {
        openFab();
        clearTimeout(fabCloseTimer);
        fabCloseTimer = setTimeout(closeFab, 3000);
      },
      { passive: true },
    );

    /* Keep the original periodic hint whenever the visitor is signed out.
       A signed-in user sees no automatic prompt; after logout the prompt resumes. */
    window.addEventListener("load", function () {
      function isSignedIn() {
        var auth = window.Shop && window.Shop.auth;
        return !!(auth && typeof auth.user === "function" && auth.user());
      }

      setInterval(function () {
        /* Re-check on every cycle so login/logout changes take effect. */
        if (isSignedIn()) {
          closeFab();
          clearTimeout(fabCloseTimer);
          return;
        }
        openFab();
        clearTimeout(fabCloseTimer);
        fabCloseTimer = setTimeout(closeFab, 2000);
      }, 10000);
    });
  }

  const backToTop = document.getElementById("backToTop");
  if (backToTop) {
    let btCloseTimer = null;

    function openBT() {
      backToTop.classList.add("open");
    }
    function closeBT() {
      backToTop.classList.remove("open");
      btCloseTimer = null;
    }

    backToTop.addEventListener("mouseenter", function () {
      openBT();
      clearTimeout(btCloseTimer);
      btCloseTimer = setTimeout(closeBT, 3000);
    });
    backToTop.addEventListener(
      "touchstart",
      function () {
        openBT();
        clearTimeout(btCloseTimer);
        btCloseTimer = setTimeout(closeBT, 3000);
      },
      { passive: true },
    );

    function toggleBackToTopVisibility() {
      if (window.scrollY > 120) {
        backToTop.classList.add("visible");
      } else {
        backToTop.classList.remove("visible");
      }
    }
    window.addEventListener("scroll", toggleBackToTopVisibility, {
      passive: true,
    });
    toggleBackToTopVisibility();

    backToTop.addEventListener("click", function (e) {
      e.preventDefault();
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  /* ---------- Enchanted layer ---------- */
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!calm) {
    /* Pointer sparkles (mouse only, throttled) */
    if (window.matchMedia("(pointer: fine)").matches) {
      let last = 0;
      window.addEventListener(
        "pointermove",
        function (e) {
          const now = performance.now();
          if (now - last < 70) return;
          last = now;
          const sp = document.createElement("span");
          sp.className = "sparkle";
          sp.style.left = e.clientX + "px";
          sp.style.top = e.clientY + "px";
          sp.style.setProperty("--dx", Math.random() * 30 - 15 + "px");
          sp.style.setProperty("--dy", 14 + Math.random() * 26 + "px");
          document.body.appendChild(sp);
          setTimeout(function () {
            sp.remove();
          }, 900);
        },
        { passive: true },
      );
    }

    /* Glow that follows the pointer on cards */
    document
      .querySelectorAll(".expertise-item, .course-card")
      .forEach(function (card) {
        card.addEventListener("pointermove", function (e) {
          const r = card.getBoundingClientRect();
          card.style.setProperty("--mx", e.clientX - r.left + "px");
          card.style.setProperty("--my", e.clientY - r.top + "px");
        });
      });

    /* Reveal on scroll */
    const targets = document.querySelectorAll(
      ".section-head, .avatar-frame, .about-body, .credential-list li, .expertise-item, .course-card, .quote-wrap blockquote, .contact-info .info-row, #contactForm, .auth-panel, .auth-form-side",
    );
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) {
              en.target.classList.add("in");
              io.unobserve(en.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
      );
      targets.forEach(function (el, i) {
        el.classList.add("reveal");
        el.style.setProperty("--rd", (i % 3) * 0.1 + "s");
        io.observe(el);
      });
    }
  }
})();

/* ---------- Header: scrolled shadow, active link, same-page scrolling ---------- */
(function () {
  const header = document.querySelector("header");
  const links = Array.from(
    document.querySelectorAll("#navLinks a[data-nav], .tab-link[data-nav]"),
  );
  if (!header) return;

  const file = (
    location.pathname.split("/").pop() || "index.html"
  ).toLowerCase();
  const onHome = file === "index.html" || file === "";
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* shadow once the page has been scrolled a little */
  function onScroll() {
    header.classList.toggle("scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* mark the account / cart buttons on their own pages */
  const mark = function (id, on) {
    const el = document.getElementById(id);
    if (el && on) {
      el.classList.add("is-active");
      el.setAttribute("aria-current", "page");
    }
  };
  mark("toolUser", file === "panel.html" || file === "register.html");
  mark("toolCart", file === "cart.html");

  /* the links only highlight on the home page (sections follow the scroll) */
  const sections = {};
  links.forEach(function (a) {
    const key = a.getAttribute("data-nav");
    if (key !== "home") sections[key] = document.getElementById(key);
  });
  function setActive(key) {
    links.forEach(function (a) {
      const on = a.getAttribute("data-nav") === key;
      a.classList.toggle("active", on);
      if (on)
        a.setAttribute(
          "aria-current",
          onHome && key === "home" ? "page" : "location",
        );
      else a.removeAttribute("aria-current");
    });
  }
  if (onHome) {
    const spy = function () {
      let current = "home";
      Object.keys(sections).forEach(function (key) {
        const el = sections[key];
        if (el && el.getBoundingClientRect().top <= 140) current = key;
      });
      setActive(current);
    };
    window.addEventListener("scroll", spy, { passive: true });
    window.addEventListener("resize", spy);
    spy();

    /* links to this same page scroll smoothly instead of reloading */
    links
      .concat(Array.from(document.querySelectorAll(".brand")))
      .forEach(function (a) {
        a.addEventListener("click", function (e) {
          const href = a.getAttribute("href") || "";
          const m = /^index\.html(?:#(.+))?$/.exec(href);
          if (!m) return;
          e.preventDefault();
          const target = m[1] ? document.getElementById(m[1]) : null;
          const top = target
            ? target.getBoundingClientRect().top +
              window.scrollY -
              ((document.documentElement.dataset.dock || "top") === "top"
                ? 76
                : 16)
            : 0;
          window.scrollTo({
            top: Math.max(0, top),
            behavior: calm ? "auto" : "smooth",
          });
          history.replaceState(null, "", m[1] ? "#" + m[1] : location.pathname);
        });
      });
  }

  /* Esc closes the mobile menu */
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    const burger = document.getElementById("burgerBtn");
    const menu = document.getElementById("navLinks");
    if (burger && menu && menu.classList.contains("open")) {
      burger.classList.remove("active");
      menu.classList.remove("open");
      burger.setAttribute("aria-expanded", "false");
      burger.focus();
    }
  });
})();

/* Performance: pause CSS animations in sections that are far off-screen,
   so phones don't keep animating things nobody can see. */
(function () {
  if (!("IntersectionObserver" in window)) return;
  var blocks = document.querySelectorAll(
    "main > section, body > section, footer",
  );
  if (!blocks.length) return;
  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        e.target.classList.toggle("is-offscreen", !e.isIntersecting);
      });
    },
    { rootMargin: "250px 0px 250px 0px" },
  );
  blocks.forEach(function (b) {
    io.observe(b);
  });
})();

/* ---------- Draggable navbar (desktop): top / bottom / left / right ----------
   Hold the small dotted grip at the end of the bar and drag it towards the left,
   right or bottom edge of the screen (or the top edge to go back).
   Arrow keys on the focused grip do the same for keyboard users.
   The choice is stored in localStorage and applied by a one-line script in
   each page's <head> so there is no flash on load. Phones and tablets keep
   their bottom tab bar: the grip is hidden below 1101px and so is every dock rule. */
(function () {
  const nav = document.querySelector("header .nav");
  if (!nav) return;

  const root = document.documentElement;
  const KEY = "navDock";
  const DOCKS = ["top", "bottom", "left", "right"];
  const NAMES = { top: "بالا", bottom: "پایین", left: "چپ", right: "راست" };
  const desktop = window.matchMedia("(min-width: 1101px)");
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)");

  const current = function () {
    return root.dataset.dock || "top";
  };

  function setDock(dock) {
    if (DOCKS.indexOf(dock) < 0 || dock === current()) return;
    const change = function () {
      if (dock === "top") delete root.dataset.dock;
      else root.dataset.dock = dock;
    };
    try {
      if (dock === "top") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, dock);
    } catch (e) {}

    /* smooth morph where the browser supports it */
    if (document.startViewTransition && !calm.matches) {
      const header = nav.parentElement;
      header.style.viewTransitionName = "site-nav";
      document.startViewTransition(change).finished.finally(function () {
        header.style.viewTransitionName = "";
      });
    } else {
      change();
    }
  }

  /* the grip */
  const grip = document.createElement("button");
  grip.type = "button";
  grip.id = "navGrip";
  grip.className = "nav-grip";
  grip.title = "برای جابه‌جایی نوبار بکشید";
  grip.setAttribute(
    "aria-label",
    "جابه‌جایی نوبار: بکشید، یا با کلیدهای جهت‌دار جای آن را تغییر دهید",
  );
  nav.appendChild(grip);

  let drag = null;

  /* which side of the screen the pointer is on: left/right 18%, top/bottom 22% */
  function zoneAt(x, y) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (x < w * 0.18) return "left";
    if (x > w * 0.82) return "right";
    if (y > h * 0.78) return "bottom";
    if (y < h * 0.22) return "top";
    return null;
  }

  function finish(cancel) {
    if (!drag) return;
    const d = drag;
    drag = null;
    try {
      grip.releasePointerCapture(d.id);
    } catch (e) {}
    root.classList.remove("nav-dragging");
    if (!cancel && d.active && d.zone) setDock(d.zone);
  }

  grip.addEventListener("pointerdown", function (e) {
    if (!desktop.matches) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    drag = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      active: false,
      zone: null,
    };
    grip.setPointerCapture(e.pointerId);
  });

  grip.addEventListener("pointermove", function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.active) {
      /* a few pixels of movement before it counts as a drag */
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
      drag.active = true;
      root.classList.add("nav-dragging");
    }
    drag.zone = zoneAt(e.clientX, e.clientY);
  });

  grip.addEventListener("pointerup", function () {
    finish(false);
  });
  grip.addEventListener("pointercancel", function () {
    finish(true);
  });
  grip.addEventListener("lostpointercapture", function () {
    finish(true);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && drag) finish(true);
  });

  /* keyboard: arrows move the bar to that side of the screen */
  grip.addEventListener("keydown", function (e) {
    const map = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowDown: "bottom",
      ArrowUp: "top",
    };
    if (!map[e.key]) return;
    e.preventDefault();
    setDock(map[e.key]);
  });

  /* leaving desktop width while dragging: drop the drag */
  desktop.addEventListener("change", function () {
    finish(true);
  });
})();

/* ---------- One-time hint for the draggable navbar (desktop) ----------
   A small bubble with the tutorial text hint appears next to the grip a moment after
   the first visit. It goes away when the visitor clicks "فهمیدم", presses Escape,
   scrolls, grabs the grip, or after 15 seconds, and is never shown again
   (localStorage key "navHintSeen"). It is also skipped when the bar was already
   moved, on phones/tablets, and no large tutorial image is downloaded. */
(function () {
  const grip = document.getElementById("navGrip");
  if (!grip) return;

  const KEY = "navHintSeen";
  const root = document.documentElement;
  const desktop = window.matchMedia("(min-width: 1101px)");

  try {
    if (localStorage.getItem(KEY)) return;
  } catch (e) {}
  if (root.dataset.dock) return;

  let hint = null;
  let startTimer = null;
  let autoTimer = null;

  function remember() {
    try {
      localStorage.setItem(KEY, "1");
    } catch (e) {}
  }

  function place() {
    if (!hint) return;
    const r = grip.getBoundingClientRect();
    const w = hint.offsetWidth;
    const left = Math.min(
      Math.max(12, r.left - 14),
      window.innerWidth - w - 12,
    );
    hint.style.left = left + "px";
    hint.style.top = r.bottom + 16 + "px";
    hint.style.setProperty("--arrow-x", r.left + r.width / 2 - left + "px");
  }

  function onScroll() {
    if (window.scrollY > 80) dismiss();
  }

  function onKey(e) {
    if (e.key === "Escape") dismiss();
  }

  function onResize() {
    if (!desktop.matches) close();
    else place();
  }

  /* remove the bubble (without remembering) */
  function close() {
    clearTimeout(startTimer);
    clearTimeout(autoTimer);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onResize);
    document.removeEventListener("keydown", onKey);
    grip.classList.remove("nav-grip-hint");
    if (hint) {
      hint.remove();
      hint = null;
    }
  }

  /* remove the bubble and never show it again */
  function dismiss() {
    close();
    remember();
  }

  function show() {
    if (hint || !desktop.matches || root.dataset.dock) return;

    hint = document.createElement("div");
    hint.className = "nav-hint";
    hint.setAttribute("role", "note");

    const text = document.createElement("p");
    text.textContent =
      "نوبار را با این نقطه‌ها بگیرید و به بالا، پایین، چپ یا راست صفحه بکشید.";
    hint.appendChild(text);

    const ok = document.createElement("button");
    ok.type = "button";
    ok.textContent = "فهمیدم";
    ok.addEventListener("click", dismiss);
    hint.appendChild(ok);

    document.body.appendChild(hint);
    grip.classList.add("nav-grip-hint");
    place();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("keydown", onKey);
    autoTimer = setTimeout(dismiss, 15000);
  }

  /* the visitor found the grip on their own */
  grip.addEventListener("pointerdown", dismiss);
  grip.addEventListener("keydown", dismiss);

  function start() {
    startTimer = setTimeout(show, 2500);
  }
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
})();
