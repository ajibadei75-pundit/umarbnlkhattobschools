/* Contact page: school details from site settings, an honest contact form (it never claims a message was
   delivered; it opens WhatsApp or the email app, or tells the visitor nothing was sent), admissions block, FAQ. */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, $$ = U.$$, t = U.t, esc = U.esc, icon = U.icon;
  var started = Date.now(), MAX_PER_HOUR = 5, faqQ = "";

  function site() { return U.site(); }
  function waNum() { return String(site().whatsapp || "").replace(/\D/g, ""); }
  function channels() { var c = []; if (waNum()) c.push("wa"); if (site().email) c.push("mail"); return c; }

  /* ---------- school details ---------- */
  function info() {
    var s = site(), tbc = '<p class="tbc">' + esc(t("con.tbc")) + "</p>", cards = [];
    function card(ic, label, body, tone) { cards.push('<div class="info-card reveal in"><span class="ico"' + (tone ? ' style="--accent:' + tone + '"' : "") + ">" + icon(ic) + "</span><div><h3>" + esc(label) + "</h3>" + body + "</div></div>"); }
    card("mappin", t("con.address"), s.address ? "<p>" + esc(s.address) + "</p>" : tbc);
    card("phone", t("con.phone"), s.phones && s.phones.length ? s.phones.map(function (p) { return '<p><a href="tel:' + esc(p.replace(/[^+\d]/g, "")) + '">' + esc(p) + "</a></p>"; }).join("") : tbc);
    card("mail", t("con.email"), s.email ? '<p><a href="mailto:' + esc(s.email) + '">' + esc(s.email) + "</a></p>" : tbc);
    card("chat", t("con.whatsapp"), waNum() ? '<p>+' + esc(waNum()) + '</p><a class="btn btn-soft btn-sm" target="_blank" rel="noopener" href="https://wa.me/' + waNum() + '">' + esc(t("con.chat")) + "</a>" : tbc);
    card("clock", t("con.hours"), s.hours && s.hours.length ? '<ul class="hours">' + s.hours.map(function (h) { return "<li><span>" + esc(h.days) + "</span><strong>" + esc(h.time) + "</strong></li>"; }).join("") + "</ul>" : tbc);
    card("mappin", t("con.map"), s.mapUrl ? '<a class="btn btn-soft btn-sm" target="_blank" rel="noopener" href="' + esc(s.mapUrl) + '">' + esc(t("con.open.map")) + "</a>" : tbc);
    $("#info-list").innerHTML = cards.join("");
  }

  /* ---------- form ---------- */
  function via() {
    var ch = channels(), wrap = $("#via-wrap"), row = $("#via-row"), cur = ($("input[name=via]:checked") || {}).value;
    $("#form-unset").hidden = ch.length > 0;
    wrap.hidden = ch.length < 2;
    row.innerHTML = ch.map(function (c, i) {
      return '<label><input type="radio" name="via" value="' + c + '"' + ((cur ? cur === c : i === 0) ? " checked" : "") + ">" + esc(t(c === "wa" ? "con.whatsapp" : "con.email")) + "</label>";
    }).join("");
    $$("input[name=via]").forEach(function (r) { r.addEventListener("change", sendLabel); });
    sendLabel();
  }
  function chosen() { var r = $("input[name=via]:checked"); return r ? r.value : channels()[0] || ""; }
  function sendLabel() { var c = chosen(); $("#f-send").textContent = t(c === "wa" ? "f.send.wa" : c === "mail" ? "f.send.mail" : "f.send"); }
  function recent() {
    var now = Date.now(), arr = [];
    try { arr = JSON.parse(U.store.get("ubk-rl", "[]")).filter(function (x) { return now - x < 3600000; }); } catch (e) {}
    return arr;
  }
  function field(id, bad) {
    var f = $("#f-" + id), box = f.closest(".fld"); if (!box) return;
    box.classList.toggle("invalid", bad); f.setAttribute("aria-invalid", String(bad));
    if (bad) f.setAttribute("aria-describedby", "err-" + id); else f.removeAttribute("aria-describedby");
  }
  function validate() {
    var v = { name: $("#f-name").value.trim(), phone: $("#f-phone").value.trim(), email: $("#f-email").value.trim(), subject: $("#f-subject").value, message: $("#f-message").value.trim(), consent: $("#f-consent").checked };
    var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email), phoneOk = /^\+?[\d\s()-]{7,20}$/.test(v.phone), bad = [];
    function flag(id, b) { field(id, b); if (b) bad.push(id); }
    flag("name", v.name.length < 2);
    flag("email", !!v.email && !emailOk);
    flag("phone", !!v.phone && !phoneOk);
    var noContact = !v.email && !v.phone; $("#err-contact").style.display = noContact ? "block" : "none"; if (noContact) bad.push("phone");
    flag("subject", !v.subject);
    flag("message", v.message.length < 10);
    flag("consent", !v.consent);
    return { v: v, bad: bad };
  }
  function show(kind, html) {
    var r = $("#f-result"); r.className = "result show " + kind; r.innerHTML = html;
    r.focus({ preventScroll: true }); r.scrollIntoView({ block: "nearest", behavior: U.reduceMotion ? "auto" : "smooth" });
  }
  function compose(v) {
    var subj = t("f.s." + v.subject);
    return t("school") + "\n" + subj + "\n\n" + t("f.name") + ": " + v.name + (v.phone ? "\n" + t("con.phone") + ": " + v.phone : "") + (v.email ? "\n" + t("con.email") + ": " + v.email : "") + "\n\n" + v.message;
  }
  function submit(e) {
    e.preventDefault();
    if ($("#f-site").value) return;                                   /* honeypot: bots fill the hidden field */
    var res = validate();
    if (res.bad.length) { show("bad", esc(t("e.fix"))); var el = $("#f-" + res.bad[0]); if (el) el.focus(); return; }
    if (Date.now() - started < 3000) { show("bad", esc(t("e.slow"))); return; }   /* too fast to be a person */
    if (recent().length >= MAX_PER_HOUR) { show("bad", esc(t("e.rate"))); return; }
    var text = compose(res.v), c = chosen();
    function note() { var a = recent(); a.push(Date.now()); U.store.set("ubk-rl", JSON.stringify(a)); }
    if (c === "wa") { note(); show("ok", esc(t("r.wa"))); window.open("https://wa.me/" + waNum() + "?text=" + encodeURIComponent(text), "_blank", "noopener"); }
    else if (c === "mail") { note(); show("ok", esc(t("r.mail"))); window.location.href = "mailto:" + site().email + "?subject=" + encodeURIComponent(t("f.s." + res.v.subject)) + "&body=" + encodeURIComponent(text); }
    else {
      show("bad", esc(t("r.none")) + '<br><button type="button" class="btn btn-soft btn-sm" id="f-copy">' + icon("copy") + esc(t("f.copy")) + "</button>");
      $("#f-copy").addEventListener("click", function () { U.copyText(text).then(function () { $("#f-copy").lastChild.textContent = t("copied"); }, function () {}); });
    }
  }

  /* ---------- FAQ ---------- */
  function faq() {
    var list = (U.data().faqs || []).filter(function (f) { return !faqQ || (f.q + " " + f.a).toLowerCase().indexOf(faqQ) > -1; });
    var open = location.hash.indexOf("#faq-") === 0 ? location.hash.slice(5) : null;
    $("#faq-list").innerHTML = list.map(function (f) {
      return '<details class="faq-item" id="faq-' + esc(f.id) + '"' + (open === f.id ? " open" : "") + "><summary>" + esc(f.q) + icon("chevron", 2) + '</summary><div class="ans"><p>' + esc(f.a) + "</p></div></details>";
    }).join("");
    $("#faq-empty").hidden = list.length > 0;
  }
  function hash() {
    var h = location.hash;
    if (h.indexOf("#faq-") === 0) { var d = document.getElementById(h.slice(1)); if (d) { d.open = true; d.scrollIntoView({ block: "center" }); } }
  }

  U.init(function () {
    $("#contact-form").addEventListener("submit", submit);
    $("#f-message").addEventListener("input", function (e) { $("#f-count").textContent = t("f.count", { n: e.target.value.length }); });
    $("#faq-q").addEventListener("input", function (e) { faqQ = e.target.value.trim().toLowerCase(); faq(); });
    $("#visit-cta").addEventListener("click", function () {
      $("#f-subject").value = "admissions";
      $("#contact-form").scrollIntoView({ behavior: U.reduceMotion ? "auto" : "smooth", block: "center" });
      setTimeout(function () { $("#f-name").focus({ preventScroll: true }); }, 350);
    });
    window.addEventListener("hashchange", hash);
  });
  U.onLang(function () { info(); via(); faq(); $("#f-count").textContent = t("f.count", { n: $("#f-message").value.length }); });
  U.onLang(function once() { if (!once.d) { once.d = 1; hash(); } });
  /* expose for the settings screen later and for tests: re-render after the school fills in site details */
  U.rerender = function () { info(); via(); };
})();
