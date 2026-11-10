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

    window.addEventListener("load", function () {
      if (mq.matches) {
        setTimeout(function () {
          openMenu();
          setTimeout(closeMenu, 3000);
        }, 500);
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

    /* Independent of hover/click: automatically opens every 10 seconds
       and stays open for 2 seconds before closing again. */
    setInterval(function () {
      openFab();
      clearTimeout(fabCloseTimer);
      fabCloseTimer = setTimeout(closeFab, 2000);
    }, 10000);
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
  const links = Array.from(document.querySelectorAll("#navLinks a[data-nav]"));
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
            ? target.getBoundingClientRect().top + window.scrollY - 76
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
