/* Parent portal: sign in with Supabase Auth, then one database function (parent_overview) returns ONLY the
   children linked to this account and the notices meant for them. Nothing is read from tables directly.
   The session lives in this browser tab only and ends when it closes. */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, $$ = U.$$, t = U.t, esc = U.esc;
  var B = (window.UBK_SITE || {}).backend || {}, KEY = "ubk-parent", session = null, data = null, failed = false;

  function load() { try { return JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch (e) { return null; } }
  function save(s) { session = s; try { if (s) sessionStorage.setItem(KEY, JSON.stringify(s)); else sessionStorage.removeItem(KEY); } catch (e) {} }
  function hdr(tok) { var h = { apikey: B.key, "Content-Type": "application/json" }; if (tok) h.Authorization = "Bearer " + tok; return h; }
  function authCall(path, body) {
    return fetch(B.url + "/auth/v1/" + path, { method: "POST", headers: hdr(), body: JSON.stringify(body) }).then(function (r) {
      return r.json().then(function (j) { if (!r.ok) { var e = new Error(j.error_description || j.msg || "auth"); e.status = r.status; throw e; } return j; });
    });
  }
  function adopt(j) { save({ access: j.access_token, refresh: j.refresh_token, exp: Date.now() + (j.expires_in || 3600) * 1000 - 30000 }); }
  function fresh() {
    if (!session) return Promise.reject(new Error("signed_out"));
    if (Date.now() < session.exp) return Promise.resolve(session.access);
    return authCall("token?grant_type=refresh_token", { refresh_token: session.refresh }).then(function (j) { adopt(j); return session.access; }, function (e) { save(null); throw e; });
  }
  function overview() {
    return fresh().then(function (tok) { return fetch(B.url + "/rest/v1/rpc/parent_overview", { method: "POST", headers: hdr(tok), body: "{}" }); }).then(function (r) {
      return r.text().then(function (txt) {
        var d = null; try { d = txt ? JSON.parse(txt) : null; } catch (e) {}
        if (!r.ok) { var e = new Error((d && d.message) || "request_failed"); e.status = r.status; throw e; }
        return d;
      });
    });
  }
  function pick(o) { if (!o) return ""; var l = document.documentElement.lang; var v = o[l] || o.en; if (!v) { var k = Object.keys(o)[0]; v = k ? o[k] : ""; } return v; }
  function when(s) { return s ? U.fmt(new Date(s), { day: "numeric", month: "long", year: "numeric" }) : ""; }

  function login(msg, kind) {
    $("#pp-login").hidden = false; $("#pp-app").hidden = true;
    var r = $("#pp-result"); r.className = msg ? "result show " + (kind || "bad") : "result"; r.textContent = msg || "";
  }
  function render() {
    if (!data) return;
    var name = data.parent && data.parent.name;
    $("#pp-hello").textContent = name ? t("par.hello", { name: name }) : t("par.hello.plain");
    var kids = data.children || [], notes = data.notices || [];
    var h = '<h3 class="sec-title" style="font-size:1.2rem;margin-top:1.6rem">' + esc(t("par.children")) + "</h3>";
    h += kids.length ? '<div class="two-col">' + kids.map(function (c) {
      var a = c.admission;
      return '<article class="panel"><h3>' + esc(c.first_name + " " + c.last_name) + '</h3><p class="post-meta"><span class="cat-badge">' + esc(t("filter." + c.level)) + "</span> " +
        (c.class_name ? esc(t("par.class")) + ": " + esc(c.class_name) : '<em>' + esc(t("par.class.tbc")) + "</em>") + "</p>" +
        (c.student_code ? '<p class="count-line" style="margin:.5rem 0 0">' + esc(t("rs.id")) + ": <strong>" + esc(c.student_code) + "</strong></p>" : "") +
        (c.result_ready ? '<p style="margin-top:.8rem"><button type="button" class="btn btn-primary btn-sm" data-res="' + esc(c.id) + '">' + esc(t("rs.view")) + "</button></p>" : (c.class_name ? '<p class="count-line" style="margin:.6rem 0 0">' + esc(t("rs.notyet")) + "</p>" : "")) +
        (a ? '<p style="margin-top:.8rem"><strong>' + esc(t("par.adm")) + '</strong><br><span class="status-pill st-' + esc(a.status) + '">' + esc(t("st." + a.status)) + "</span> <small>" + esc(t("par.ref")) + ": " + esc(a.reference) + "</small>" +
          (a.note ? "<br><small>" + esc(a.note) + "</small>" : "") + "</p>" : "") + "</article>";
    }).join("") + "</div>" : '<div class="empty"><p>' + esc(t("par.nochild")) + "</p></div>";
    h += '<h3 class="sec-title" style="font-size:1.2rem;margin-top:2.2rem">' + esc(t("par.notices")) + "</h3>";
    h += notes.length ? '<div class="pp-notices">' + notes.map(function (n) {
      var b = pick(n.body), paras = Array.isArray(b) ? b : String(b || "").split(/\n{2,}/);
      var aud = (n.audience || []).indexOf("all") > -1 ? t("par.for.all") : n.audience.map(function (x) { return t("filter." + x); }).join(", ");
      return '<article class="panel pp-note"><h4>' + esc(pick(n.title)) + '</h4><p class="post-meta">' + esc(when(n.date)) + " · " + esc(t("par.for")) + ": " + esc(aud) + "</p>" + paras.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "</article>";
    }).join("") + "</div>" : '<div class="empty"><p>' + esc(t("par.nonotice")) + "</p></div>";
    if (kids.length) h += '<div id="pp-pay"></div>';
    $("#pp-body").innerHTML = h;
    if (kids.length) payments(kids);
    $$("[data-res]", $("#pp-body")).forEach(function (b) {
      b.addEventListener("click", function () {
        b.disabled = true;
        fresh().then(function (tok) { return fetch(B.url + "/rest/v1/rpc/parent_result", { method: "POST", headers: hdr(tok), body: JSON.stringify({ p_student: b.getAttribute("data-res") }) }); })
          .then(rd).then(function (p) { b.disabled = false; showSheet(p, "#pp-app"); }, function (e) { b.disabled = false; alert(rmsg(e)); });
      });
    });
  }
  /* ---------- payments: receipts and written requests (no money is taken here) ---------- */
  function jwtSub(tok) { try { return JSON.parse(atob(tok.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).sub; } catch (e) { return ""; } }
  function payments(kids) {
    var host = $("#pp-pay"); if (!host) return;
    function opt(o) { return kids.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.first_name + " " + c.last_name) + "</option>"; }).join(""); }
    host.innerHTML = '<h3 class="sec-title" style="font-size:1.2rem;margin-top:2.2rem">' + esc(t("pay.t")) + '</h3><p class="count-line">' + esc(t("pay.d")) + "</p>" +
      '<div class="two-col"><article class="panel"><h4>' + esc(t("pay.tab.r")) + '</h4><form id="py-r" novalidate><div class="form-grid">' +
      '<div class="fld"><label for="py-c">' + esc(t("pay.child")) + '</label><select class="select-lg" id="py-c">' + opt() + "</select></div>" +
      '<div class="fld"><label for="py-a">' + esc(t("pay.amount")) + '</label><input class="input" id="py-a" inputmode="decimal" maxlength="12"></div>' +
      '<div class="fld"><label for="py-d">' + esc(t("pay.date")) + '</label><input class="input" id="py-d" type="date" max="' + new Date().toISOString().slice(0, 10) + '"></div>' +
      '<div class="fld"><label for="py-m">' + esc(t("pay.method")) + '</label><select class="select-lg" id="py-m">' + ["bank_transfer", "cash", "pos", "other"].map(function (m) { return '<option value="' + m + '">' + esc(t("pay.m." + m)) + "</option>"; }).join("") + "</select></div>" +
      '<div class="fld"><label for="py-ref">' + esc(t("pay.ref")) + '</label><input class="input" id="py-ref" maxlength="80"></div>' +
      '<div class="fld"><label for="py-f">' + esc(t("pay.file")) + '</label><input class="input" id="py-f" type="file" accept="image/png,image/jpeg,application/pdf"><small class="count-line">' + esc(t("pay.file.h")) + "</small></div></div>" +
      '<div class="form-actions" style="margin-top:1rem"><button class="btn btn-primary btn-sm" type="submit" id="py-go">' + esc(t("pay.send")) + '</button></div><div class="result" id="py-res" role="status"></div></form></article>' +
      '<article class="panel"><h4>' + esc(t("pay.tab.q")) + '</h4><form id="py-q" novalidate><div class="form-grid"><div class="fld"><label for="pq-c">' + esc(t("pay.child")) + '</label><select class="select-lg" id="pq-c">' + opt() + "</select></div>" +
      '<div class="fld"><label for="pq-s">' + esc(t("pay.subject")) + '</label><input class="input" id="pq-s" maxlength="120"></div><div class="fld full"><label for="pq-m">' + esc(t("pay.msg")) + '</label><textarea class="input" id="pq-m" rows="4" maxlength="1500"></textarea></div></div>' +
      '<div class="form-actions" style="margin-top:1rem"><button class="btn btn-primary btn-sm" type="submit" id="pq-go">' + esc(t("pay.send")) + '</button></div><div class="result" id="pq-res" role="status"></div></form></article></div>' +
      '<h4 style="margin-top:1.4rem">' + esc(t("pay.hist")) + '</h4><div id="py-list" aria-live="polite"></div>';
    function say(id, ok, m) { var r = $(id); r.className = "result show " + (ok ? "ok" : "bad"); r.textContent = m; }
    function err(e) { var m = (e && e.message) || ""; return /rate_limited/.test(m) ? t("pay.err.rate") : t("pay.err.gen"); }
    function money(v) { return "\u20A6" + Number(v).toLocaleString(document.documentElement.lang === "ar" ? "ar" : "en-NG", { maximumFractionDigits: 2 }); }
    function loadList() {
      fresh().then(function (tok) { return fetch(B.url + "/rest/v1/rpc/parent_finance", { method: "POST", headers: hdr(tok), body: "{}" }); }).then(rd).then(function (rows) {
        $("#py-list").innerHTML = rows.length ? rows.map(function (x) {
          return '<article class="panel" style="margin:.5rem 0"><p style="margin:0"><strong>' + esc(x.kind === "receipt" ? t("pay.receipt") + ": " + money(x.amount) : t("pay.request") + ": " + x.subject) + '</strong> <span class="status-pill st-' + (x.status === "approved" ? "offered" : x.status === "rejected" ? "declined" : "under_review") + '">' + esc(t("pay.st." + x.status)) + "</span></p>" +
            '<p class="post-meta">' + esc(x.student) + " \u00B7 " + esc(when(x.created_at)) + "</p>" + (x.admin_note ? "<p>" + esc(t("pay.note")) + ": " + esc(x.admin_note) + "</p>" : "") + "</article>";
        }).join("") : '<div class="empty"><p>' + esc(t("pay.none")) + "</p></div>";
      }, function () { $("#py-list").innerHTML = ""; });
    }
    loadList();
    function submit(body, btn, resId) {
      btn.disabled = true;
      return fresh().then(function (tok) { return fetch(B.url + "/rest/v1/rpc/submit_finance", { method: "POST", headers: hdr(tok), body: JSON.stringify(body) }); }).then(rd)
        .then(function () { say(resId, true, t("pay.sent")); loadList(); return true; }, function (e) { say(resId, false, err(e)); return false; }).then(function (ok) { btn.disabled = false; return ok; });
    }
    $("#py-q").addEventListener("submit", function (e) {
      e.preventDefault(); var sj = $("#pq-s").value.trim(), ms = $("#pq-m").value.trim(); if (!sj || !ms) return say("#pq-res", false, t("pay.err.need"));
      submit({ p_kind: "request", p_student: $("#pq-c").value, p_amount: null, p_paid_on: null, p_method: null, p_reference: null, p_subject: sj, p_message: ms, p_file: null }, $("#pq-go"), "#pq-res").then(function (ok) { if (ok) { $("#pq-s").value = ""; $("#pq-m").value = ""; } });
    });
    $("#py-r").addEventListener("submit", function (e) {
      e.preventDefault(); var amt = parseFloat($("#py-a").value.replace(/,/g, "")), d = $("#py-d").value, f = $("#py-f").files[0];
      if (!(amt > 0) || !d) return say("#py-res", false, t("pay.err.need"));
      if (!f || f.size > 5242880 || ["image/png", "image/jpeg", "application/pdf"].indexOf(f.type) < 0) return say("#py-res", false, t("pay.err.file"));
      var b = $("#py-go"); b.disabled = true;
      fresh().then(function (tok) {
        var path = jwtSub(tok) + "/" + (window.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)) + (f.type === "application/pdf" ? ".pdf" : f.type === "image/png" ? ".png" : ".jpg");
        return fetch(B.url + "/storage/v1/object/receipts/" + path, { method: "POST", headers: { apikey: B.key, Authorization: "Bearer " + tok, "Content-Type": f.type }, body: f }).then(function (r) { if (!r.ok) throw new Error("upload"); return path; });
      }).then(function (path) {
        return submit({ p_kind: "receipt", p_student: $("#py-c").value, p_amount: amt, p_paid_on: d, p_method: $("#py-m").value, p_reference: $("#py-ref").value.trim() || null, p_subject: null, p_message: null, p_file: path }, b, "#py-res");
      }, function () { say("#py-res", false, t("pay.err.gen")); }).then(function (ok) { b.disabled = false; if (ok) { $("#py-a").value = ""; $("#py-f").value = ""; $("#py-ref").value = ""; } });
    });
  }

  /* ---------- result sheet viewer (parent and public lookup) ---------- */
  function rd(r) { return r.text().then(function (txt) { var j; try { j = JSON.parse(txt); } catch (e) { j = null; } if (!r.ok) { var e = new Error((j && (j.message || j.error)) || "error"); e.status = r.status; throw e; } return j; }); }
  function rmsg(e) { var m = (e && e.message) || ""; return /rate_limited/.test(m) ? t("rs.e.rate") : /not_released/.test(m) ? t("rs.e.rel") : /not_found|forbidden/.test(m) ? t("rs.e.nf") : t("par.net"); }
  var backTo = null;
  function showSheet(p, from) {
    backTo = from; ["#pp-app", "#pp-login", "#pp-lookup"].forEach(function (x) { $(x).hidden = true; });
    $("#pp-view").hidden = false; $("#pp-vt").textContent = p.student.first_name + " " + p.student.last_name;
    window.UBK_REPORT.mount($("#pp-sheet"), p, { watermark: true, guard: true }); window.scrollTo(0, 0);
  }
  function closeSheet() {
    $("#pp-view").hidden = true; $("#pp-sheet").innerHTML = ""; $("#pp-lookup").hidden = false;
    if (backTo === "#pp-app" && session) $("#pp-app").hidden = false; else { $("#pp-login").hidden = !!session; $("#pp-app").hidden = !session; }
  }
  function start() {
    overview().then(function (d) { data = d; $("#pp-login").hidden = true; $("#pp-app").hidden = false; render(); },
      function (e) {
        if (/not_parent/.test(e.message)) { save(null); login(t("par.notparent")); return; }
        if (e.status === 401 || e.message === "signed_out") { save(null); login(""); return; }
        $("#pp-login").hidden = true; $("#pp-app").hidden = false; $("#pp-hello").textContent = t("pg.parent");
        $("#pp-body").innerHTML = '<div class="notice"><span>' + esc(t("par.err")) + '</span></div><button type="button" class="btn btn-soft btn-sm" id="pp-retry">' + esc(t("par.retry")) + "</button>";
        $("#pp-retry").addEventListener("click", start);
      });
  }
  U.init(function () {
    $("#pp-vback").addEventListener("click", closeSheet);
    $("#lk-form").addEventListener("submit", function (e) {
      e.preventDefault(); var r = $("#lk-res"), code = $("#lk-code").value.trim(), nm = $("#lk-name").value.trim(), cl = $("#lk-class").value.trim();
      function say(m, k) { r.className = "result show " + (k || "bad"); r.textContent = m; }
      if (!code || !nm || !cl) return say(t("rs.lk.need"));
      $("#lk-go").disabled = true; r.className = "result";
      fetch(B.url + "/rest/v1/rpc/public_result", { method: "POST", headers: hdr(), body: JSON.stringify({ p_code: code, p_name: nm, p_class: cl }) }).then(rd)
        .then(function (p) { showSheet(p, "#pp-login"); }, function (er) { say(rmsg(er)); }).then(function () { $("#lk-go").disabled = false; });
    });
    if (!B.url || !B.key) { $("#pp-cfg").hidden = false; $("#pp-go").disabled = true; return; }
    $("#pp-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var em = $("#pp-email").value.trim(), pw = $("#pp-pass").value; if (!em || !pw) { login(t("par.enter")); return; }
      $("#pp-go").disabled = true;
      authCall("token?grant_type=password", { email: em, password: pw }).then(function (j) { adopt(j); $("#pp-pass").value = ""; start(); },
        function (err) { login(err.status === 400 || err.status === 401 ? t("par.bad") : t("par.net")); }).then(function () { $("#pp-go").disabled = false; });
    });
    $("#pp-out").addEventListener("click", function () {
      var tok = session && session.access; save(null); data = null;
      if (tok) fetch(B.url + "/auth/v1/logout", { method: "POST", headers: hdr(tok) }).catch(function () {});
      login("");
    });
    session = load(); if (session) start();
  });
  U.onLang(render);
})();
