(function () {
  "use strict";
  var S = window.Shop;
  if (!S) return;
  var me = S.auth.user();
  if (!me) {
    window.location.replace("register.html?next=panel.html#login");
    return;
  }

  function $(id) {
    return document.getElementById(id);
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function setMsg(node, text, kind) {
    node.textContent = text;
    node.className = "msg full visible " + kind;
  }

  var TABS = ["dashboard", "courses", "orders", "profile"];

  function render() {
    me = S.auth.user();
    if (!me) return;
    var first = (me.name || "").split(" ")[0];
    $("pName").textContent = me.name;
    $("pPhone").textContent = me.phone;
    $("pAvatar").textContent = (me.name || "؟").trim().charAt(0);
    $("welcome").textContent = "سلام " + first + "، خوش آمدید 🌿";

    var orders = S.orders.mine();
    var owned = S.orders.ownedIds();
    var spent = orders.reduce(function (a, o) {
      return a + o.total;
    }, 0);
    $("stCourses").textContent = S.fmtNum(owned.length);
    $("stOrders").textContent = S.fmtNum(orders.length);
    $("stTotal").textContent = S.fmtNum(spent);

    renderSuggest(owned);
    renderCourses(orders, owned);
    renderOrders(orders);
  }

  function renderSuggest(owned) {
    var box = $("suggestList");
    box.textContent = "";
    var rest = S.CATALOG.filter(function (c) {
      return owned.indexOf(c.id) === -1;
    });
    $("suggestCard").hidden = !rest.length;
    rest.forEach(function (c) {
      var row = el("div", "suggest");
      var info = el("div", "suggest-info");
      info.appendChild(el("b", null, c.title));
      info.appendChild(el("span", null, S.fmt(c.price) + " · " + c.format));
      var btn = el("button", "btn btn-primary add-to-cart", "افزودن به سبد");
      btn.type = "button";
      btn.setAttribute("data-add", c.id);
      btn.setAttribute("data-label", "افزودن به سبد");
      row.appendChild(info);
      row.appendChild(btn);
      box.appendChild(row);
    });
    S.ui.refresh();
  }

  function emptyState(text, linkText, href) {
    var d = el("div", "empty-state");
    d.appendChild(el("p", null, text));
    var a = el("a", "btn btn-primary", linkText);
    a.href = href;
    d.appendChild(a);
    return d;
  }

  function renderCourses(orders, owned) {
    var box = $("myCourses");
    box.textContent = "";
    if (!owned.length) {
      box.appendChild(
        emptyState(
          "هنوز در دوره‌ای ثبت‌نام نکرده‌اید.",
          "مشاهده‌ی دوره‌ها",
          "index.html#courses",
        ),
      );
      return;
    }
    var when = {};
    orders
      .slice()
      .reverse()
      .forEach(function (o) {
        o.items.forEach(function (it) {
          if (!when[it.id]) when[it.id] = o.createdAt;
        });
      });
    owned.forEach(function (id, i) {
      var c = S.course(id);
      if (!c) return;
      var card = el("div", "my-course");
      card.style.setProperty("--i", i);
      var tab = el("span", "cart-item-tab");
      tab.style.background = "var(--" + c.color + ")";
      var body = el("div", "my-course-body");
      body.appendChild(el("span", "badge badge-ok", "فعال"));
      body.appendChild(el("h3", null, c.title));
      body.appendChild(el("p", null, c.format + " · " + c.sessions));
      body.appendChild(el("p", null, "تاریخ ثبت‌نام: " + S.fmtDate(when[id])));
      card.appendChild(tab);
      card.appendChild(body);
      box.appendChild(card);
    });
  }

  function renderOrders(orders) {
    var box = $("myOrders");
    box.textContent = "";
    if (!orders.length) {
      box.appendChild(
        emptyState(
          "هنوز سفارشی ثبت نکرده‌اید.",
          "مشاهده‌ی دوره‌ها",
          "index.html#courses",
        ),
      );
      return;
    }
    orders.forEach(function (o, i) {
      var card = el("div", "order");
      card.style.setProperty("--i", i);
      var head = el("div", "order-head");
      var num = el("b", null, "سفارش " + o.number);
      num.setAttribute("dir", "ltr");
      head.appendChild(num);
      head.appendChild(el("span", null, S.fmtDate(o.createdAt)));
      head.appendChild(el("span", "badge badge-ok", "پرداخت شده"));
      card.appendChild(head);
      o.items.forEach(function (it) {
        var line = el("div", "order-line");
        line.appendChild(el("span", null, it.title));
        line.appendChild(el("span", null, S.fmt(it.price)));
        card.appendChild(line);
      });
      var tot = el("div", "order-total");
      tot.appendChild(el("span", null, "جمع کل"));
      tot.appendChild(el("b", null, S.fmt(o.total)));
      card.appendChild(tot);
      box.appendChild(card);
    });
  }

  /* ---------- tabs ---------- */
  function showTab() {
    var h = (window.location.hash || "").replace("#", "");
    if (TABS.indexOf(h) === -1) h = "dashboard";
    TABS.forEach(function (t) {
      $("tab-" + t).classList.toggle("active", t === h);
    });
    document.querySelectorAll(".panel-nav a").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-tab") === h);
    });
    if (h === "profile") fillProfile();
  }
  function fillProfile() {
    $("pfName").value = me.name || "";
    $("pfPhone").value = me.phone || "";
    $("pfEmail").value = me.email || "";
  }

  $("profileForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var r = S.auth.update({
      name: $("pfName").value,
      email: $("pfEmail").value,
    });
    if (r.ok) {
      setMsg($("profileMsg"), "تغییرات ذخیره شد.", "ok");
      render();
    } else setMsg($("profileMsg"), r.error, "err");
  });

  $("passForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var n1 = $("pwNew").value;
    if (n1 !== $("pwNew2").value) {
      setMsg($("passMsg"), "تکرار رمز جدید یکسان نیست.", "err");
      return;
    }
    S.auth.changePassword($("pwOld").value, n1).then(function (r) {
      if (r.ok) {
        setMsg($("passMsg"), "رمز عبور تغییر کرد.", "ok");
        $("passForm").reset();
      } else setMsg($("passMsg"), r.error, "err");
    });
  });

  /* ---------- Logout confirmation dialog ---------- */
  var logoutDlg = null;
  var logoutLastFocus = null;

  function buildLogoutDlg() {
    if (logoutDlg) return logoutDlg;
    var o = document.createElement("div");
    o.className = "confirm-overlay";
    o.setAttribute("role", "alertdialog");
    o.setAttribute("aria-modal", "true");
    o.setAttribute("aria-labelledby", "confirmTitle");
    o.setAttribute("aria-describedby", "confirmText");
    o.innerHTML =
      '<div class="confirm-card">' +
      '<div class="confirm-icon" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>' +
      '<path d="M16 17l5-5-5-5"></path><path d="M21 12H9"></path></svg></div>' +
      '<h3 id="confirmTitle">از حساب کاربری خارج می‌شوید؟</h3>' +
      '<p id="confirmText">مطمئن هستید که می‌خواهید از حساب خود خارج شوید؟ برای ورود دوباره به شماره‌ی موبایل و رمز عبورتان نیاز دارید.</p>' +
      '<div class="confirm-actions">' +
      '<button type="button" class="confirm-no">خیر، می‌مانم</button>' +
      '<button type="button" class="confirm-yes">بله، خارج می‌شوم</button>' +
      "</div></div>";
    document.body.appendChild(o);
    o.querySelector(".confirm-no").addEventListener("click", closeLogoutDlg);
    o.querySelector(".confirm-yes").addEventListener("click", function () {
      S.auth.logout();
      window.location.href = "index.html";
    });
    o.addEventListener("click", function (e) {
      if (e.target === o) closeLogoutDlg();
    });
    o.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closeLogoutDlg();
      } else if (e.key === "Tab") {
        var btns = o.querySelectorAll("button");
        var first = btns[0];
        var last = btns[btns.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
    logoutDlg = o;
    return o;
  }

  function openLogoutDlg() {
    var o = buildLogoutDlg();
    logoutLastFocus = document.activeElement;
    o.classList.add("show");
    document.body.classList.add("confirm-open");
    /* the safe choice ("no") gets the focus */
    setTimeout(function () {
      o.querySelector(".confirm-no").focus();
    }, 50);
  }

  function closeLogoutDlg() {
    if (!logoutDlg) return;
    logoutDlg.classList.remove("show");
    document.body.classList.remove("confirm-open");
    if (logoutLastFocus && logoutLastFocus.focus) logoutLastFocus.focus();
  }

  $("logoutBtn").addEventListener("click", openLogoutDlg);

  window.addEventListener("hashchange", showTab);
  window.addEventListener("shop:change", function () {
    render();
  });

  $("panelRoot").hidden = false;
  render();
  showTab();
})();
