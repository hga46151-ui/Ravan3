/* =====================================================================
   shop.js — accounts, cart and orders (front-end only)

   Everything is kept in the visitor's own browser (localStorage), so it
   works on plain static hosting. Every function that reads or writes
   data lives in the three small objects below (auth / cart / orders),
   so connecting a real server later means replacing the bodies of those
   functions with fetch() calls — the pages themselves will not change.

   IMPORTANT: this is NOT secure storage and NOT a real payment.
   Real sign-in and payment need a server (see CONFIG.DEMO_PAYMENT).
   ===================================================================== */
(function () {
  "use strict";

  var CONFIG = {
    /* true  → "pay" creates an order locally and shows a demo notice.
       false → hide the notice and wire pay() to your payment gateway. */
    DEMO_PAYMENT: true,
  };

  /* Keep in sync with the course cards in index.html */
  var CATALOG = [
    {
      id: "anxiety",
      title: "مدیریت اضطراب و استرس روزمره",
      price: 2400000,
      format: "آنلاین · زنده",
      sessions: "۶ جلسه، هفته‌ای یک بار",
      level: "سطح: مقدماتی",
      color: "accent",
    },
    {
      id: "couples",
      title: "ارتباط مؤثر برای زوج‌ها",
      price: 3200000,
      format: "آنلاین · زنده",
      sessions: "۸ جلسه، هفته‌ای یک بار",
      level: "سطح: زوج‌ها",
      color: "sage",
    },
    {
      id: "parenting",
      title: "فرزندپروری آگاهانه",
      price: 1900000,
      format: "آنلاین · ضبط‌شده",
      sessions: "۵ جلسه، در دسترس همیشگی",
      level: "سطح: والدین",
      color: "brick",
    },
    {
      id: "cbt",
      title: "شناخت‌درمانی برای شروع‌کنندگان",
      price: 1600000,
      format: "آنلاین · زنده",
      sessions: "۴ جلسه، هفته‌ای یک بار",
      level: "سطح: مقدماتی",
      color: "accent",
    },
  ];

  /* ---------- storage (falls back to memory if the browser blocks it) ---------- */
  var KEYS = {
    users: "kh_users",
    session: "kh_session",
    cart: "kh_cart",
    orders: "kh_orders",
  };
  /* Storage layers: localStorage → sessionStorage → window.name.
     The last one survives page changes even when the browser blocks
     web storage (some privacy modes / embedded browsers). */
  var memory = {};
  var NAME_TAG = "khshop:";
  function nameLoad() {
    try {
      if (window.name.indexOf(NAME_TAG) === 0) {
        return JSON.parse(window.name.slice(NAME_TAG.length));
      }
    } catch (e) {}
    return {};
  }
  function nameSave(obj) {
    try {
      window.name = NAME_TAG + JSON.stringify(obj);
    } catch (e) {}
  }
  function read(key, fallback) {
    var stores = ["localStorage", "sessionStorage"];
    for (var i = 0; i < stores.length; i++) {
      try {
        var raw = window[stores[i]].getItem(key);
        if (raw) return JSON.parse(raw);
      } catch (e) {}
    }
    var nm = nameLoad();
    if (key in nm) return nm[key];
    return key in memory ? memory[key] : fallback;
  }
  function write(key, value) {
    memory[key] = value;
    var ok = false;
    var stores = ["localStorage", "sessionStorage"];
    for (var i = 0; i < stores.length && !ok; i++) {
      try {
        window[stores[i]].setItem(key, JSON.stringify(value));
        ok = true;
      } catch (e) {}
    }
    if (!ok) {
      var nm = nameLoad();
      nm[key] = value;
      nameSave(nm);
    }
  }
  function emit() {
    window.dispatchEvent(new CustomEvent("shop:change"));
  }
  window.addEventListener("storage", function (e) {
    if (e.key && e.key.indexOf("kh_") === 0) emit();
  });

  /* ---------- helpers ---------- */
  function toLatin(s) {
    return String(s == null ? "" : s)
      .replace(/[۰-۹]/g, function (d) {
        return String(d.charCodeAt(0) - 1776);
      })
      .replace(/[٠-٩]/g, function (d) {
        return String(d.charCodeAt(0) - 1632);
      });
  }
  function normPhone(s) {
    var p = toLatin(s).replace(/[\s\-()]/g, "");
    p = p.replace(/^(\+98|0098|98)(?=9)/, "0");
    return p;
  }
  function validPhone(s) {
    return /^09\d{9}$/.test(normPhone(s));
  }
  function fmt(n) {
    return Number(n).toLocaleString("fa-IR") + " تومان";
  }
  function fmtNum(n) {
    return Number(n).toLocaleString("fa-IR");
  }
  function fmtDate(iso) {
    try {
      return new Intl.DateTimeFormat("fa-IR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(iso));
    } catch (e) {
      return iso;
    }
  }
  function course(id) {
    for (var i = 0; i < CATALOG.length; i++) {
      if (CATALOG[i].id === id) return CATALOG[i];
    }
    return null;
  }
  function uid(prefix) {
    return (
      prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
    );
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ---------- password hashing (PBKDF2 when available) ---------- */
  function hex(buf) {
    return Array.prototype.map
      .call(new Uint8Array(buf), function (b) {
        return ("0" + b.toString(16)).slice(-2);
      })
      .join("");
  }
  function makeSalt() {
    var a = new Uint8Array(16);
    if (window.crypto && crypto.getRandomValues) {
      crypto.getRandomValues(a);
    } else {
      for (var i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256);
    }
    return hex(a);
  }
  function hashPassword(password, salt) {
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      var enc = new TextEncoder();
      return crypto.subtle
        .importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"])
        .then(function (key) {
          return crypto.subtle.deriveBits(
            {
              name: "PBKDF2",
              salt: enc.encode(salt),
              iterations: 100000,
              hash: "SHA-256",
            },
            key,
            256,
          );
        })
        .then(hex);
    }
    var h = 5381;
    var s = salt + password;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return Promise.resolve("x" + (h >>> 0).toString(16));
  }

  /* ---------- auth ---------- */
  function publicUser(u) {
    return u
      ? { id: u.id, name: u.name, phone: u.phone, email: u.email || "" }
      : null;
  }
  var auth = {
    user: function () {
      var id = read(KEYS.session, null);
      if (!id) return null;
      var users = read(KEYS.users, []);
      for (var i = 0; i < users.length; i++) {
        if (users[i].id === id) return publicUser(users[i]);
      }
      return null;
    },
    register: function (data) {
      var name = String(data.name || "").trim();
      var phone = normPhone(data.phone);
      var email = String(data.email || "")
        .trim()
        .toLowerCase();
      var users = read(KEYS.users, []);
      if (!name)
        return Promise.resolve({ ok: false, error: "نام را وارد کنید." });
      if (!validPhone(phone)) {
        return Promise.resolve({
          ok: false,
          error: "شماره موبایل معتبر نیست.",
        });
      }
      for (var i = 0; i < users.length; i++) {
        if (users[i].phone === phone || (email && users[i].email === email)) {
          return Promise.resolve({
            ok: false,
            error: "با این شماره یا ایمیل قبلاً ثبت‌نام شده است. وارد شوید.",
          });
        }
      }
      var salt = makeSalt();
      return hashPassword(String(data.password || ""), salt).then(function (h) {
        var user = {
          id: uid("u"),
          name: name,
          phone: phone,
          email: email,
          salt: salt,
          hash: h,
          createdAt: new Date().toISOString(),
        };
        users.push(user);
        write(KEYS.users, users);
        write(KEYS.session, user.id);
        emit();
        return { ok: true, user: publicUser(user) };
      });
    },
    login: function (identifier, password) {
      var id = String(identifier || "").trim();
      var isEmail = id.indexOf("@") !== -1;
      var key = isEmail ? id.toLowerCase() : normPhone(id);
      var users = read(KEYS.users, []);
      var found = null;
      for (var i = 0; i < users.length; i++) {
        if (isEmail ? users[i].email === key : users[i].phone === key) {
          found = users[i];
          break;
        }
      }
      var bad = { ok: false, error: "شماره/ایمیل یا رمز عبور درست نیست." };
      if (!found) return Promise.resolve(bad);
      return hashPassword(String(password || ""), found.salt).then(
        function (h) {
          if (h !== found.hash) return bad;
          write(KEYS.session, found.id);
          emit();
          return { ok: true, user: publicUser(found) };
        },
      );
    },
    logout: function () {
      write(KEYS.session, null);
      emit();
    },
    update: function (fields) {
      var me = auth.user();
      if (!me) return { ok: false, error: "ابتدا وارد شوید." };
      var name = String(fields.name || "").trim();
      var email = String(fields.email || "")
        .trim()
        .toLowerCase();
      if (!name) return { ok: false, error: "نام را وارد کنید." };
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { ok: false, error: "ایمیل معتبر نیست." };
      }
      var users = read(KEYS.users, []);
      for (var i = 0; i < users.length; i++) {
        if (users[i].id !== me.id && email && users[i].email === email) {
          return { ok: false, error: "این ایمیل برای حساب دیگری ثبت شده است." };
        }
      }
      for (var j = 0; j < users.length; j++) {
        if (users[j].id === me.id) {
          users[j].name = name;
          users[j].email = email;
        }
      }
      write(KEYS.users, users);
      emit();
      return { ok: true };
    },
    changePassword: function (oldPass, newPass) {
      var me = auth.user();
      if (!me) return Promise.resolve({ ok: false, error: "ابتدا وارد شوید." });
      if (String(newPass || "").length < 8) {
        return Promise.resolve({
          ok: false,
          error: "رمز جدید باید حداقل ۸ کاراکتر باشد.",
        });
      }
      var users = read(KEYS.users, []);
      var rec = null;
      for (var i = 0; i < users.length; i++) {
        if (users[i].id === me.id) rec = users[i];
      }
      if (!rec) return Promise.resolve({ ok: false, error: "حساب پیدا نشد." });
      return hashPassword(String(oldPass || ""), rec.salt).then(function (h) {
        if (h !== rec.hash) {
          return { ok: false, error: "رمز فعلی درست نیست." };
        }
        var salt = makeSalt();
        return hashPassword(String(newPass), salt).then(function (nh) {
          rec.salt = salt;
          rec.hash = nh;
          write(KEYS.users, users);
          return { ok: true };
        });
      });
    },
  };

  /* ---------- orders ---------- */
  var orders = {
    mine: function () {
      var me = auth.user();
      if (!me) return [];
      return read(KEYS.orders, [])
        .filter(function (o) {
          return o.userId === me.id;
        })
        .sort(function (a, b) {
          return a.createdAt < b.createdAt ? 1 : -1;
        });
    },
    ownedIds: function () {
      var ids = [];
      orders.mine().forEach(function (o) {
        o.items.forEach(function (it) {
          if (ids.indexOf(it.id) === -1) ids.push(it.id);
        });
      });
      return ids;
    },
    /* Called after a successful payment. */
    create: function () {
      var me = auth.user();
      if (!me) return { ok: false, error: "ابتدا وارد شوید." };
      var owned = orders.ownedIds();
      var items = cart.items().filter(function (c) {
        return owned.indexOf(c.id) === -1;
      });
      if (!items.length) return { ok: false, error: "سبد خرید خالی است." };
      var total = 0;
      var snapshot = items.map(function (c) {
        total += c.price;
        return { id: c.id, title: c.title, price: c.price };
      });
      var all = read(KEYS.orders, []);
      var order = {
        id: uid("o"),
        number: "KH-" + String(Math.floor(100000 + Math.random() * 900000)),
        userId: me.id,
        items: snapshot,
        total: total,
        status: "paid",
        createdAt: new Date().toISOString(),
      };
      all.push(order);
      write(KEYS.orders, all);
      cart.clear();
      emit();
      return { ok: true, order: order };
    },
  };

  /* ---------- cart ---------- */
  var cart = {
    ids: function () {
      var raw = read(KEYS.cart, []);
      return raw.filter(function (id, i) {
        return course(id) && raw.indexOf(id) === i;
      });
    },
    items: function () {
      return cart.ids().map(course);
    },
    has: function (id) {
      return cart.ids().indexOf(id) !== -1;
    },
    count: function () {
      return cart.ids().length;
    },
    total: function () {
      return cart.items().reduce(function (s, c) {
        return s + c.price;
      }, 0);
    },
    add: function (id) {
      if (!course(id)) return { ok: false, reason: "unknown" };
      if (orders.ownedIds().indexOf(id) !== -1) {
        return { ok: false, reason: "owned" };
      }
      var ids = cart.ids();
      if (ids.indexOf(id) !== -1) return { ok: false, reason: "in-cart" };
      ids.push(id);
      write(KEYS.cart, ids);
      emit();
      return { ok: true };
    },
    remove: function (id) {
      write(
        KEYS.cart,
        cart.ids().filter(function (x) {
          return x !== id;
        }),
      );
      emit();
    },
    clear: function () {
      write(KEYS.cart, []);
      emit();
    },
  };

  /* Payment hook: replace the body with a call to your gateway.
     It must resolve with { ok: true } once the money is received. */
  function pay() {
    if (CONFIG.DEMO_PAYMENT) {
      return new Promise(function (resolve) {
        setTimeout(function () {
          resolve({ ok: true });
        }, 1400);
      });
    }
    return Promise.resolve({
      ok: false,
      error: "درگاه پرداخت هنوز متصل نشده است.",
    });
  }

  /* =====================================================================
     UI shared by every page: header buttons, cart drawer, toast
     ===================================================================== */
  var ICONS = {
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"></circle><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"></path></svg>',
    cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4h2.2l2 11.2a1.6 1.6 0 0 0 1.6 1.3h8.4a1.6 1.6 0 0 0 1.6-1.2L20.4 8H6.1"></path><circle cx="9.5" cy="20" r="1.3"></circle><circle cx="17" cy="20" r="1.3"></circle></svg>',
    close:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>',
    trash:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1.5 1.5 0 0 0 1.5 1.4h7A1.5 1.5 0 0 0 17 19l1-12M9 7V4.5h6V7"></path></svg>',
    check:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>',
  };
  function icon(name) {
    var t = document.createElement("template");
    t.innerHTML = ICONS[name];
    return t.content.firstChild;
  }

  var ui = {};
  var refs = {};
  var lastFocus = null;

  ui.toast = function (message, kind) {
    var t = refs.toast;
    if (!t) return;
    t.className = "shop-toast" + (kind ? " " + kind : "");
    t.querySelector(".shop-toast-text").textContent = message;
    void t.offsetWidth;
    t.classList.add("show");
    clearTimeout(ui._toastTimer);
    ui._toastTimer = setTimeout(function () {
      t.classList.remove("show");
    }, 2600);
  };

  ui.openDrawer = function () {
    if (!refs.drawer) return;
    lastFocus = document.activeElement;
    renderDrawer();
    refs.overlay.classList.add("open");
    refs.drawer.classList.add("open");
    refs.drawer.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("shop-lock");
    setTimeout(function () {
      refs.drawer.querySelector(".cart-close").focus();
    }, 50);
  };
  ui.closeDrawer = function () {
    if (!refs.drawer) return;
    refs.overlay.classList.remove("open");
    refs.drawer.classList.remove("open");
    refs.drawer.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("shop-lock");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  };

  function renderDrawer() {
    var list = refs.drawer.querySelector(".cart-items");
    var foot = refs.drawer.querySelector(".cart-foot");
    var items = cart.items();
    list.textContent = "";
    if (!items.length) {
      var empty = el("div", "cart-empty");
      var art = el("div", "cart-empty-art");
      art.appendChild(icon("cart"));
      empty.appendChild(art);
      empty.appendChild(el("p", "cart-empty-title", "سبد خرید شما خالی است"));
      empty.appendChild(
        el(
          "p",
          "cart-empty-sub",
          "از بخش دوره‌ها، دوره‌ی دلخواه را اضافه کنید.",
        ),
      );
      var link = el("a", "btn btn-ghost", "مشاهده دوره‌ها");
      link.href =
        location.pathname.indexOf("index.html") !== -1 ||
        /\/$/.test(location.pathname)
          ? "#courses"
          : "index.html#courses";
      link.addEventListener("click", ui.closeDrawer);
      empty.appendChild(link);
      list.appendChild(empty);
      foot.hidden = true;
      return;
    }
    foot.hidden = false;
    items.forEach(function (c, i) {
      var row = el("div", "cart-item");
      row.style.setProperty("--i", i);
      var tab = el("span", "cart-item-tab");
      tab.style.background = "var(--" + c.color + ")";
      var body = el("div", "cart-item-body");
      body.appendChild(el("b", "cart-item-title", c.title));
      body.appendChild(
        el("span", "cart-item-meta", c.format + " · " + c.sessions),
      );
      body.appendChild(el("span", "cart-item-price", fmt(c.price)));
      var rm = el("button", "cart-item-remove");
      rm.type = "button";
      rm.setAttribute("aria-label", "حذف " + c.title + " از سبد");
      rm.appendChild(icon("trash"));
      rm.addEventListener("click", function () {
        row.classList.add("leaving");
        setTimeout(function () {
          cart.remove(c.id);
        }, 280);
      });
      row.appendChild(tab);
      row.appendChild(body);
      row.appendChild(rm);
      list.appendChild(row);
    });
    foot.querySelector(".cart-total-value").textContent = fmt(cart.total());
  }

  function build() {
    /* header buttons */
    var nav = document.querySelector(".nav");
    var staticCart = document.getElementById("toolCart");
    if (staticCart) {
      /* the buttons are written in each page's header: just wire them up */
      refs.userBtn = document.getElementById("toolUser");
      refs.cartBtn = staticCart;
      refs.badge = staticCart.querySelector(".cart-badge");
      staticCart.addEventListener("click", ui.openDrawer);
    } else if (nav) {
      var tools = el("div", "nav-actions");
      var u = el("a", "tool-btn");
      u.id = "toolUser";
      u.href = "register.html#login";
      u.appendChild(icon("user"));
      u.appendChild(el("span", "tool-label", "ورود | ثبت‌نام"));
      var c = el("button", "tool-btn");
      c.id = "toolCart";
      c.type = "button";
      c.setAttribute("aria-label", "سبد خرید");
      c.appendChild(icon("cart"));
      var badge = el("span", "cart-badge", "0");
      badge.hidden = true;
      c.appendChild(badge);
      c.addEventListener("click", ui.openDrawer);
      tools.appendChild(u);
      tools.appendChild(c);
      nav.appendChild(tools);
      refs.userBtn = u;
      refs.cartBtn = c;
      refs.badge = badge;
    }

    /* drawer */
    var overlay = el("div", "cart-overlay");
    overlay.addEventListener("click", ui.closeDrawer);
    var drawer = el("aside", "cart-drawer");
    drawer.setAttribute("role", "dialog");
    drawer.setAttribute("aria-modal", "true");
    drawer.setAttribute("aria-label", "سبد خرید");
    drawer.setAttribute("aria-hidden", "true");
    var head = el("div", "cart-head");
    head.appendChild(el("h2", "cart-title", "سبد خرید"));
    var close = el("button", "cart-close");
    close.type = "button";
    close.setAttribute("aria-label", "بستن سبد خرید");
    close.appendChild(icon("close"));
    close.addEventListener("click", ui.closeDrawer);
    head.appendChild(close);
    var items = el("div", "cart-items");
    var foot = el("div", "cart-foot");
    var totalRow = el("div", "cart-total");
    totalRow.appendChild(el("span", null, "جمع کل"));
    totalRow.appendChild(el("b", "cart-total-value", ""));
    var go = el("a", "btn btn-primary", "مشاهده سبد و تکمیل خرید");
    go.href = "cart.html";
    foot.appendChild(totalRow);
    foot.appendChild(go);
    drawer.appendChild(head);
    drawer.appendChild(items);
    drawer.appendChild(foot);
    document.body.appendChild(overlay);
    document.body.appendChild(drawer);
    refs.overlay = overlay;
    refs.drawer = drawer;
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") ui.closeDrawer();
    });

    /* toast */
    var toast = el("div", "shop-toast");
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    var ti = el("span", "shop-toast-icon");
    ti.appendChild(icon("check"));
    toast.appendChild(ti);
    toast.appendChild(el("span", "shop-toast-text", ""));
    document.body.appendChild(toast);
    refs.toast = toast;

    /* add-to-cart buttons anywhere on the page */
    document.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest("[data-add]") : null;
      if (!btn) return;
      e.preventDefault();
      var id = btn.getAttribute("data-add");
      if (btn.classList.contains("is-owned")) return;
      if (btn.classList.contains("is-in-cart")) {
        ui.openDrawer();
        return;
      }
      var res = cart.add(id);
      var c = course(id);
      if (res.ok) {
        ui.toast("«" + c.title + "» به سبد خرید اضافه شد");
      } else if (res.reason === "owned") {
        ui.toast("این دوره را قبلاً خریده‌اید", "warn");
      }
    });
  }

  function refresh() {
    var n = cart.count();
    if (refs.badge) {
      var prev = Number(refs.badge.textContent.replace(/\D/g, "")) || 0;
      refs.badge.textContent = fmtNum(n);
      refs.badge.hidden = n === 0;
      if (n !== prev && n > 0) {
        refs.badge.classList.remove("bump");
        void refs.badge.offsetWidth;
        refs.badge.classList.add("bump");
      }
    }
    var me = auth.user();
    if (refs.userBtn) {
      var label = refs.userBtn.querySelector(".tool-label");
      if (me) {
        refs.userBtn.href = "panel.html";
        label.textContent = me.name.split(" ")[0] || "پنل کاربری";
        refs.userBtn.setAttribute("aria-label", "پنل کاربری");
      } else {
        refs.userBtn.href = "register.html#login";
        label.textContent = "ورود | ثبت‌نام";
        refs.userBtn.removeAttribute("aria-label");
      }
    }
    var fab = document.getElementById("fabAuth");
    if (fab) {
      fab.href = me ? "panel.html" : "register.html";
      var fl = fab.querySelector(".fab-auth-label");
      if (fl) fl.textContent = me ? "پنل کاربری" : "ثبت‌نام / ورود";
      fab.setAttribute("aria-label", me ? "پنل کاربری" : "ثبت‌نام یا ورود");
    }
    var owned = orders.ownedIds();
    document.querySelectorAll("[data-add]").forEach(function (b) {
      var id = b.getAttribute("data-add");
      b.classList.remove("is-owned", "is-in-cart");
      b.disabled = false;
      if (owned.indexOf(id) !== -1) {
        b.classList.add("is-owned");
        b.textContent = "خریداری شده ✓";
        b.setAttribute("aria-disabled", "true");
      } else if (cart.has(id)) {
        b.classList.add("is-in-cart");
        b.textContent = "در سبد خرید ✓";
        b.removeAttribute("aria-disabled");
      } else {
        b.textContent = b.getAttribute("data-label") || "افزودن به سبد";
        b.removeAttribute("aria-disabled");
      }
    });
    if (refs.drawer && refs.drawer.classList.contains("open")) renderDrawer();
  }
  ui.refresh = refresh;

  window.Shop = {
    CONFIG: CONFIG,
    CATALOG: CATALOG,
    course: course,
    fmt: fmt,
    fmtNum: fmtNum,
    fmtDate: fmtDate,
    normPhone: normPhone,
    validPhone: validPhone,
    toLatin: toLatin,
    auth: auth,
    cart: cart,
    orders: orders,
    pay: pay,
    ui: ui,
  };

  function init() {
    build();
    refresh();
    window.addEventListener("shop:change", refresh);
    document.documentElement.classList.add("shop-ready");
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
