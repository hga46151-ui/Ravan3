(function () {
  "use strict";
  var S = window.Shop;
  if (!S) return;

  function $(id) {
    return document.getElementById(id);
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  var paying = false;

  function render() {
    var items = S.cart.items();
    var me = S.auth.user();
    var list = $("cartList");
    list.textContent = "";
    var layout = $("cartLayout");

    if (!items.length) {
      layout.style.display = "block";
      $("cartBox").hidden = true;
      $("cartSub").textContent = "";
      var d = el("div", "cart-empty-state");
      if (!me) {
        /* not registered yet: ask them to sign up first */
        d.appendChild(
          el("p", "cart-empty-lead", "برای شروع، ابتدا ثبت‌نام کنید."),
        );
        d.appendChild(
          el(
            "p",
            null,
            "با ساخت حساب کاربری می‌توانید دوره‌ها را به سبد اضافه کنید و خرید را کامل کنید.",
          ),
        );
        var acts = el("div", "cart-empty-actions");
        var reg = el("a", "btn btn-primary", "ثبت‌نام");
        reg.href = "register.html";
        var log = el("a", "btn btn-ghost", "ورود به حساب");
        log.href = "register.html#login";
        acts.appendChild(reg);
        acts.appendChild(log);
        d.appendChild(acts);
      } else {
        d.appendChild(el("p", null, "سبد خرید شما خالی است."));
        var a = el("a", "btn btn-primary", "مشاهده‌ی دوره‌ها");
        a.href = "index.html#courses";
        d.appendChild(a);
      }
      list.appendChild(d);
      return;
    }
    layout.style.display = "";
    $("cartBox").hidden = false;
    $("cartSub").textContent = S.fmtNum(items.length) + " دوره در سبد شما";

    items.forEach(function (c, i) {
      var row = el("div", "cart-row");
      row.style.setProperty("--i", i);
      var tab = el("span", "cart-row-tab");
      tab.style.background = "var(--" + c.color + ")";
      tab.style.alignSelf = "stretch";
      var body = el("div", "cart-row-body");
      body.appendChild(el("h3", null, c.title));
      body.appendChild(el("span", null, c.format + " · " + c.sessions));
      var price = el("b", "cart-row-price", S.fmt(c.price));
      var rm = el("button", "cart-item-remove");
      rm.type = "button";
      rm.setAttribute("aria-label", "حذف «" + c.title + "»");
      rm.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"></path></svg>';
      rm.addEventListener("click", function () {
        row.classList.add("leaving");
        setTimeout(function () {
          S.cart.remove(c.id);
        }, 280);
      });
      row.appendChild(tab);
      row.appendChild(body);
      row.appendChild(price);
      row.appendChild(rm);
      list.appendChild(row);
    });

    $("sumCount").textContent = S.fmtNum(items.length);
    $("sumTotal").textContent = S.fmt(S.cart.total());
    $("loginHint").hidden = !!me;
    $("demoNote").hidden = !S.CONFIG.DEMO_PAYMENT;
    $("payBtn").textContent = me
      ? "پرداخت و ثبت‌نام در دوره‌ها"
      : "ورود برای پرداخت";
  }

  $("payBtn").addEventListener("click", function () {
    if (paying) return;
    if (!S.auth.user()) {
      window.location.href = "register.html?next=cart.html#login";
      return;
    }
    var btn = $("payBtn");
    paying = true;
    btn.disabled = true;
    btn.textContent = "در حال پردازش…";
    S.pay().then(function (r) {
      if (!r || !r.ok) {
        paying = false;
        btn.disabled = false;
        render();
        S.ui.toast((r && r.error) || "پرداخت انجام نشد.", "warn");
        return;
      }
      var res = S.orders.create();
      paying = false;
      btn.disabled = false;
      if (!res.ok) {
        S.ui.toast(res.error, "warn");
        render();
        return;
      }
      done(res.order);
    });
  });

  function done(order) {
    $("cartView").hidden = true;
    var v = $("doneView");
    v.hidden = false;
    v.textContent = "";
    var card = el("div", "success-card");
    var mark = el("div", "success-mark");
    mark.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>';
    card.appendChild(mark);
    card.appendChild(el("h2", null, "ثبت‌نام شما انجام شد"));
    var p = el("p", null, "شماره‌ی سفارش: ");
    var num = el("b", null, order.number);
    num.setAttribute("dir", "ltr");
    p.appendChild(num);
    card.appendChild(p);
    card.appendChild(el("p", null, "مبلغ: " + S.fmt(order.total)));
    var act = el("div", "success-actions");
    var a1 = el("a", "btn btn-primary", "دوره‌های من");
    a1.href = "panel.html#courses";
    var a2 = el("a", "btn btn-ghost", "بازگشت به صفحه‌ی اصلی");
    a2.href = "index.html";
    act.appendChild(a1);
    act.appendChild(a2);
    card.appendChild(act);
    v.appendChild(card);
    window.scrollTo({ top: 0 });
  }

  window.addEventListener("shop:change", function () {
    if (!paying && !$("cartView").hidden) render();
  });
  render();
})();
