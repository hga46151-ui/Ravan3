/* Script for register.html (sign up / log in).
   Loaded alongside base.js, which still handles the shared
   header menu and back-to-top button on this page. */
(function () {
  /* Where to go after signing in: ?next=cart.html (same-site pages only) */
  function nextUrl() {
    var m = /[?&]next=([^&#]+)/.exec(window.location.search);
    var n = m ? decodeURIComponent(m[1]) : "";
    return /^[a-z0-9_-]+\.html$/i.test(n) ? n : "panel.html";
  }
  function goNext() {
    window.location.href = nextUrl();
  }
  var hasShop = typeof window.Shop !== "undefined";

  /* ---------- Status dialog: "creating account…" → "success" (5 s) ---------- */
  var STATUS_MIN_LOADING = 1600; /* ms the "please wait" box stays visible */
  var STATUS_SUCCESS_MS = 5000; /* ms the success box stays before redirect */
  var statusOverlay = null;
  var statusTimer = null;
  var statusLastFocus = null;

  function buildStatus() {
    if (statusOverlay) return statusOverlay;
    var o = document.createElement("div");
    o.className = "status-overlay";
    o.setAttribute("role", "alertdialog");
    o.setAttribute("aria-modal", "true");
    o.setAttribute("aria-live", "assertive");
    o.innerHTML =
      '<div class="status-card is-loading">' +
      '<div class="status-icon" aria-hidden="true">' +
      '<span class="status-spinner"></span>' +
      '<svg class="status-check" viewBox="0 0 52 52">' +
      '<circle class="status-check-ring" cx="26" cy="26" r="23"></circle>' +
      '<path class="status-check-tick" d="M15 27.5l7.5 7.5L37.5 19"></path>' +
      "</svg></div>" +
      '<h3 class="status-title"></h3>' +
      '<p class="status-text"></p>' +
      '<div class="status-bar" aria-hidden="true"><i></i></div>' +
      '<button type="button" class="btn btn-primary status-go">ادامه</button>' +
      "</div>";
    document.body.appendChild(o);
    o.querySelector(".status-go").addEventListener("click", function () {
      clearTimeout(statusTimer);
      goNext();
    });
    statusOverlay = o;
    return o;
  }

  function showStatus(state, title, text) {
    var o = buildStatus();
    var card = o.querySelector(".status-card");
    card.classList.toggle("is-loading", state === "loading");
    card.classList.toggle("is-success", state === "success");
    o.querySelector(".status-title").textContent = title;
    o.querySelector(".status-text").textContent = text;
    if (state === "success") {
      var bar = o.querySelector(".status-bar i");
      bar.style.animation = "none";
      void bar.offsetWidth; /* restart the countdown bar */
      bar.style.animation =
        "statusBar " + STATUS_SUCCESS_MS + "ms linear forwards";
    }
    if (!o.classList.contains("show")) {
      statusLastFocus = document.activeElement;
      o.classList.add("show");
      document.body.classList.add("status-open");
    }
    if (state === "success") {
      var go = o.querySelector(".status-go");
      if (go && go.focus) go.focus();
    }
  }

  function hideStatus() {
    if (!statusOverlay) return;
    statusOverlay.classList.remove("show");
    document.body.classList.remove("status-open");
    if (statusLastFocus && statusLastFocus.focus) statusLastFocus.focus();
  }

  /* run an auth request behind the dialog; cfg = {loadTitle, loadText, okTitle(user), okText, onFail} */
  function runWithStatus(request, cfg) {
    var t0 = Date.now();
    showStatus("loading", cfg.loadTitle, cfg.loadText);
    request.then(function (res) {
      var wait = Math.max(0, STATUS_MIN_LOADING - (Date.now() - t0));
      setTimeout(function () {
        if (res && res.ok) {
          var u = window.Shop.auth.user();
          var name = u && u.name ? u.name : "";
          showStatus("success", cfg.okTitle(name), cfg.okText(name));
          statusTimer = setTimeout(goNext, STATUS_SUCCESS_MS);
        } else {
          hideStatus();
          cfg.onFail(res);
        }
      }, wait);
    });
  }
  /* Already signed in? Go straight to the panel. */
  if (hasShop && window.Shop.auth.user()) {
    goNext();
    return;
  }

  const tabRegister = document.getElementById("tabRegister");
  const tabLogin = document.getElementById("tabLogin");
  const registerPane = document.getElementById("registerPane");
  const loginPane = document.getElementById("loginPane");

  if (tabRegister && tabLogin && registerPane && loginPane) {
    const showPane = function (which) {
      const toRegister = which === "register";
      tabRegister.classList.toggle("active", toRegister);
      tabLogin.classList.toggle("active", !toRegister);
      tabRegister.setAttribute("aria-selected", String(toRegister));
      tabLogin.setAttribute("aria-selected", String(!toRegister));
      registerPane.classList.toggle("hidden", !toRegister);
      loginPane.classList.toggle("hidden", toRegister);
      const newHash = "#" + which;
      if (window.location.hash !== newHash) {
        history.replaceState(null, "", newHash);
      }
    };

    tabRegister.addEventListener("click", function () {
      showPane("register");
    });
    tabLogin.addEventListener("click", function () {
      showPane("login");
    });
    document.querySelectorAll("[data-switch-to]").forEach(function (button) {
      button.addEventListener("click", function () {
        showPane(button.getAttribute("data-switch-to"));
      });
    });

    if (window.location.hash === "#login") {
      showPane("login");
    }
  }

  document.querySelectorAll(".toggle-pass").forEach(function (button) {
    const input = button.parentElement.querySelector("input");
    if (!input) return;
    button.addEventListener("click", function () {
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.classList.toggle("is-visible", show);
      button.setAttribute(
        "aria-label",
        show ? "پنهان کردن رمز عبور" : "نمایش رمز عبور",
      );
    });
  });

  /* Shows/hides one field's error message and highlights the input
     (or checkbox row) so every invalid field gets visible feedback,
     not just the two password fields. */
  function setFieldError(input, errorEl, show) {
    if (errorEl) errorEl.classList.toggle("visible", show);
    if (!input) return;
    if (input.type === "checkbox") {
      const row = input.closest(".check-row");
      if (row) row.classList.toggle("has-error", show);
    } else {
      input.classList.toggle("has-error", show);
    }
  }

  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    const regName = document.getElementById("regName");
    const regPhone = document.getElementById("regPhone");
    const regEmail = document.getElementById("regEmail");
    const regPass = document.getElementById("regPass");
    const regPassConfirm = document.getElementById("regPassConfirm");
    const regAgree = document.getElementById("regAgree");

    const regNameError = document.getElementById("regNameError");
    const regPhoneError = document.getElementById("regPhoneError");
    const regEmailError = document.getElementById("regEmailError");
    const regPassError = document.getElementById("regPassError");
    const regPassConfirmError = document.getElementById("regPassConfirmError");
    const regAgreeError = document.getElementById("regAgreeError");

    const checks = [
      {
        input: regName,
        error: regNameError,
        isValid: function () {
          return regName.value.trim().length > 0;
        },
      },
      {
        input: regPhone,
        error: regPhoneError,
        isValid: function () {
          return /^09\d{9}$/.test(regPhone.value.trim());
        },
      },
      {
        input: regEmail,
        error: regEmailError,
        isValid: function () {
          return !regEmail.value || regEmail.checkValidity();
        },
      },
      {
        input: regPass,
        error: regPassError,
        isValid: function () {
          return regPass.value.length >= 8;
        },
      },
      {
        input: regPassConfirm,
        error: regPassConfirmError,
        isValid: function () {
          return (
            !!regPassConfirm.value && regPassConfirm.value === regPass.value
          );
        },
      },
      {
        input: regAgree,
        error: regAgreeError,
        isValid: function () {
          return regAgree.checked;
        },
      },
    ];

    checks.forEach(function (check) {
      const evt = check.input.type === "checkbox" ? "change" : "input";
      check.input.addEventListener(evt, function () {
        if (check.isValid()) {
          setFieldError(check.input, check.error, false);
        }
      });
    });
    /* Re-check password-confirm whenever the main password changes too,
       so a fix in one field clears an error that depends on both. */
    regPass.addEventListener("input", function () {
      if (regPassConfirm.value && regPassConfirm.value === regPass.value) {
        setFieldError(regPassConfirm, regPassConfirmError, false);
      }
    });

    registerForm.addEventListener("submit", function (e) {
      e.preventDefault();
      let valid = true;
      checks.forEach(function (check) {
        const ok = check.isValid();
        setFieldError(check.input, check.error, !ok);
        if (!ok) valid = false;
      });

      const successEl = document.getElementById("registerSuccess");
      const errorEl = document.getElementById("registerError");
      successEl.classList.remove("visible");
      errorEl.classList.remove("visible");
      if (!valid) return;
      if (!hasShop) {
        successEl.classList.add("visible");
        return;
      }
      const btn = registerForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      runWithStatus(
        window.Shop.auth.register({
          name: regName.value,
          phone: regPhone.value,
          email: regEmail.value,
          password: regPass.value,
        }),
        {
          loadTitle: "در حال ساخت حساب کاربری هستیم",
          loadText: "لطفاً صبر کنید…",
          okTitle: function () {
            return "ثبت‌نام شما با موفقیت انجام شد";
          },
          okText: function (name) {
            return (
              (name ? name + " عزیز، " : "") +
              "حساب شما آماده است؛ در حال انتقال به پنل کاربری…"
            );
          },
          onFail: function (res) {
            errorEl.textContent =
              (res && res.error) || "خطایی رخ داد. دوباره تلاش کنید.";
            errorEl.classList.add("visible");
            btn.disabled = false;
          },
        },
      );
    });
  }

  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    const loginId = document.getElementById("loginId");
    const loginPass = document.getElementById("loginPass");
    const loginIdError = document.getElementById("loginIdError");
    const loginPassError = document.getElementById("loginPassError");

    [
      { input: loginId, error: loginIdError },
      { input: loginPass, error: loginPassError },
    ].forEach(function (pair) {
      pair.input.addEventListener("input", function () {
        if (pair.input.value.trim()) {
          setFieldError(pair.input, pair.error, false);
        }
      });
    });

    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      let valid = true;

      if (!loginId.value.trim()) {
        setFieldError(loginId, loginIdError, true);
        valid = false;
      }
      if (!loginPass.value) {
        setFieldError(loginPass, loginPassError, true);
        valid = false;
      }

      const successEl = document.getElementById("loginSuccess");
      const errorEl = document.getElementById("loginError");
      successEl.classList.remove("visible");
      errorEl.classList.remove("visible");
      if (!valid) return;
      if (!hasShop) {
        successEl.classList.add("visible");
        return;
      }
      const btn = loginForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      runWithStatus(window.Shop.auth.login(loginId.value, loginPass.value), {
        loadTitle: "در حال انتقال",
        loadText: "لطفاً صبر کنید…",
        okTitle: function (name) {
          return "خوش آمدید" + (name ? "، " + name : "");
        },
        okText: function () {
          return "ورود شما با موفقیت انجام شد؛ در حال انتقال به حساب کاربری…";
        },
        onFail: function (res) {
          errorEl.textContent =
            (res && res.error) || "خطایی رخ داد. دوباره تلاش کنید.";
          errorEl.classList.add("visible");
          btn.disabled = false;
        },
      });
    });
  }

  /* Back-to-home button: same hover-expand + appear-on-scroll behavior
     as the back-to-top button on the main page. */
  const backHome = document.getElementById("backHome");
  if (backHome) {
    let bhCloseTimer = null;

    function openBH() {
      backHome.classList.add("open");
    }
    function closeBH() {
      backHome.classList.remove("open");
      bhCloseTimer = null;
    }

    backHome.addEventListener("mouseenter", function () {
      openBH();
      clearTimeout(bhCloseTimer);
      bhCloseTimer = setTimeout(closeBH, 3000);
    });
    backHome.addEventListener(
      "touchstart",
      function () {
        openBH();
        clearTimeout(bhCloseTimer);
        bhCloseTimer = setTimeout(closeBH, 3000);
      },
      { passive: true },
    );

    function toggleBackHomeVisibility() {
      if (window.scrollY > 120) {
        backHome.classList.add("visible");
      } else {
        backHome.classList.remove("visible");
      }
    }
    window.addEventListener("scroll", toggleBackHomeVisibility, {
      passive: true,
    });
    toggleBackHomeVisibility();
  }
})();
