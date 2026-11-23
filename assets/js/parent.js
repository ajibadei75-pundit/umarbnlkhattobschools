/* Parent portal: sign in with Supabase Auth, then one database function (parent_overview) returns ONLY the
   children linked to this account and the notices meant for them. Nothing is read from tables directly.
   The session lives in this browser tab only and ends when it closes. */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, $$ = U.$$, t = U.t, esc = U.esc;
  var B = (window.UBK_SITE || {}).backend || {}, KEY = "ubk-parent", session = null, data = null, failed = false;

  function pkeep() { try { return localStorage.getItem("ubk-parent-keep") === "1"; } catch (e) { return false; } }
  function load() { try { return JSON.parse(sessionStorage.getItem(KEY) || (pkeep() ? localStorage.getItem(KEY) : "") || "null"); } catch (e) { return null; } }
  function save(s) {
    session = s; try { if (s) sessionStorage.setItem(KEY, JSON.stringify(s)); else sessionStorage.removeItem(KEY); } catch (e) {}
    try { if (s && pkeep()) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY); } catch (e) {}
  }
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
    return authCall("token?grant_type=refresh_token", { refresh_token: session.refresh }).then(function (j) { adopt(j); return session.access; }, function (e) { if (e.status) save(null); throw e; });
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
  /* ---------- active dashboard: fees, receipts and attendance for each child ---------- */
  var ROOT = (function () { var s = document.currentScript; return s && s.src ? s.src.replace(/assets\/js\/[^\/]*$/, "") : ""; })(), stat = null, snapAt = null;
  function money(v) { return "₦" + Number(v || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 }); }
  function stamp(iso) { try { var d = new Date(iso); return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) + ", " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true }); } catch (e) { return ""; } }
  var finLink = null;
  (function () { try { var B = (window.UBK_SITE || {}).backend || {}; if (!B.url) return; fetch(B.url + "/rest/v1/site_settings?select=value&key=eq.finance_link", { headers: { apikey: B.key } }).then(function (r) { return r.ok ? r.json() : []; }).then(function (r) { var v = r && r[0] && r[0].value; if (v && v.url && v.parents !== false && /^https?:\/\//i.test(v.url)) finLink = v; }).catch(function () {}); } catch (e) {} })();
  function keepIn() { try { return localStorage.getItem("ubk-parent-keep") === "1"; } catch (e) { return false; } }
  function saveSnap() { if (!keepIn() || !data) return; try { localStorage.setItem("ubk-parent-snap", JSON.stringify({ at: new Date().toISOString(), data: data, stat: stat })); } catch (e) { /* storage full */ } }
  function readSnap() { try { return JSON.parse(localStorage.getItem("ubk-parent-snap") || "null"); } catch (e) { return null; } }
  function seenIds() { try { return JSON.parse(localStorage.getItem("ubk-parent-seen") || "[]"); } catch (e) { return []; } }
  var seenOpen = seenIds();
  function curTerm(fees) { var o = { First: 1, Second: 2, Third: 3 }; return (fees || []).filter(function (x) { return +x.due > 0 || +x.paid > 0; }).sort(function (x, y) { return x.session === y.session ? (o[y.term] || 0) - (o[x.term] || 0) : (x.session < y.session ? 1 : -1); })[0] || null; }
  function extraHTML(k) {
    var i = (stat || {})[k.id]; if (!i) return '<p class="count-line">...</p>';
    var a = i.attendance || {}, pct = a.total ? Math.round(100 * a.present / a.total) : null, f = curTerm(i.fees), h = "";
    h += '<div class="pp-blk"><h4>' + esc(t("pp.att")) + "</h4>" + (a.total ? '<div class="pp-bar" role="img" aria-label="' + pct + '%"><i style="width:' + pct + '%"></i></div><p class="pp-nums"><b>' + pct + '%</b> <span>' + esc(t("pp.att.p")) + ": " + a.present + " &middot; " + esc(t("pp.att.a")) + ": " + a.absent + "</span></p>" +
      '<p class="pp-dots" aria-hidden="true">' + (a.recent || []).slice().reverse().map(function (r) { return '<i class="' + (r.status === "present" ? "ok" : "no") + '" title="' + esc(r.day) + '"></i>'; }).join("") + "</p>" : '<p class="count-line">' + esc(t("pp.att.none")) + "</p>") + "</div>";
    h += '<div class="pp-blk"><h4>' + esc(t("pp.fees")) + (f ? " <small>" + esc(f.term + " " + t("pp.term") + ", " + f.session) + "</small>" : "") + "</h4>";
    if (f) { var bal = +f.balance, pc = +f.due > 0 ? Math.min(100, Math.round(100 * f.paid / f.due)) : 100; h += '<div class="pp-bar pay" role="img" aria-label="' + pc + '%"><i style="width:' + pc + '%"></i></div><div class="pp-fig"><div><span>' + esc(t("pp.fees.due")) + "</span><b>" + money(f.due) + "</b></div><div><span>" + esc(t("pp.fees.paid")) + "</span><b>" + money(f.paid) + '</b></div><div class="' + (bal > 0 ? "due" : "ok") + '"><span>' + esc(bal > 0 ? t("pp.fees.bal") : t("pp.fees.clear")) + "</span><b>" + money(Math.max(bal, 0)) + "</b></div></div>"; }
    else h += '<p class="count-line">' + esc(t("pp.fees.none")) + "</p>";
    if (finLink) h += '<p class="pp-ext"><a class="btn btn-soft btn-sm" href="' + esc(finLink.url) + '" target="_blank" rel="noopener noreferrer">' + esc(finLink.label || "Bursary website") + " &#8599;</a>" + (finLink.note ? "<small>" + esc(finLink.note) + "</small>" : "") + "</p>";
    h += "</div>";
    h += '<div class="pp-blk"><h4>' + esc(t("pp.rec")) + "</h4>" + ((i.payments || []).length ? '<ul class="pp-rec">' + i.payments.slice(0, 5).map(function (p, n) {
      return "<li><div><b>" + money(p.amount) + "</b><small>" + esc(p.receipt_no) + " &middot; " + esc(stamp(p.created_at)) + '</small></div><button type="button" class="btn btn-soft btn-sm" data-rc="' + esc(k.id) + "|" + n + '">' + esc(t("pp.rec.print")) + "</button></li>";
    }).join("") + "</ul>" : '<p class="count-line">' + esc(t("pp.rec.none")) + "</p>") + "</div>";
    return h;
  }
  function paintExtras() {
    var kids = (data && data.children) || [];
    kids.forEach(function (k) { var el = $('[data-kx="' + k.id + '"]'); if (el) el.innerHTML = extraHTML(k); });
    $$("[data-rc]").forEach(function (b) { b.addEventListener("click", function () { var a = b.getAttribute("data-rc").split("|"); printReceipt(a[0], +a[1]); }); });
    var due = 0, att = [], seen = seenOpen, fresh = ((data && data.notices) || []).filter(function (n) { return seen.indexOf(n.id) < 0; }).length;
    kids.forEach(function (k) { var i = (stat || {})[k.id]; if (!i) return; var f = curTerm(i.fees); if (f && +f.balance > 0) due += +f.balance; if (i.attendance && i.attendance.total) att.push(Math.round(100 * i.attendance.present / i.attendance.total)); });
    var sm = $("#pp-sum"); if (sm) sm.innerHTML = '<div class="pp-tile' + (due > 0 ? " warn" : "") + '"><span>' + esc(t("pp.sum.fees")) + "</span><b>" + (stat ? money(due) : "...") + '</b></div><div class="pp-tile"><span>' + esc(t("pp.sum.att")) + "</span><b>" + (att.length ? Math.round(att.reduce(function (x, y) { return x + y; }, 0) / att.length) + "%" : "-") + '</b></div><div class="pp-tile' + (fresh ? " new" : "") + '"><span>' + esc(t("pp.sum.new")) + "</span><b>" + fresh + "</b></div>";
  }
  function loadStatus() {
    return fresh().then(function (tok) { return fetch(B.url + "/rest/v1/rpc/parent_children_status", { method: "POST", headers: hdr(tok), body: "{}" }); }).then(rd).then(function (rows) {
      stat = {}; (rows || []).forEach(function (r) { stat[r.id] = r; }); snapAt = null; paintExtras(); saveSnap(); var o = $("#pp-off"); if (o) o.hidden = true;
    }, function (e) { if (!e.status) { var sn = readSnap(); if (sn && sn.stat) { stat = sn.stat; snapAt = sn.at; paintExtras(); offlineNote(); } } });
  }
  function offlineNote() { var o = $("#pp-off"); if (!o) return; o.hidden = false; o.querySelector("span:last-child").textContent = t("pp.off", { date: snapAt ? stamp(snapAt) : "" }); }
  function printReceipt(kid, n) {
    var i = (stat || {})[kid], p = i && i.payments[n], c = ((data && data.children) || []).filter(function (x) { return x.id === kid; })[0]; if (!p || !c) return;
    var f = ((i.fees || []).filter(function (x) { return x.session === p.session && x.term === p.term; })[0]) || null, tot = i.payments.filter(function (x) { return x.session === p.session && x.term === p.term && x.created_at <= p.created_at; }).reduce(function (a, x) { return a + Number(x.amount); }, 0);
    var due = f ? +f.due : 0, bal = due - tot, e = esc, row = function (a, b) { return "<tr><th>" + e(a) + "</th><td>" + b + "</td></tr>"; };
    var html = '<!doctype html><meta charset="utf-8"><title>Receipt ' + e(p.receipt_no) + '</title><style>@page{size:A5;margin:10mm}body{font:13px Poppins,Arial,sans-serif;color:#1d1a33;margin:0}.h{display:flex;gap:12px;align-items:center;background:#302078;color:#fff;padding:12px 16px;border-bottom:4px solid #D5A43B}.h img{width:54px;height:54px;border-radius:50%;background:#fff}.h b{display:block;font-size:15px}.h small{color:#e4dcff}.n{margin-left:auto;text-align:right}.n b{font-size:13px;color:#D5A43B}table{width:100%;border-collapse:collapse;margin:12px 0}th,td{padding:7px 10px;border-bottom:1px solid #e6e1f5;text-align:left}th{width:34%;color:#302078;font-weight:600}.amt{margin:10px 0;border:2px solid #D5A43B;border-radius:10px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center}.amt b{font-size:22px;color:#302078}.s{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px}.s div{border:1px solid #cfc7ea;border-radius:8px;padding:6px 8px}.s span{display:block;font-size:10px;color:#5a5680}.s b{font-size:13px}.s .due b{color:#A52D35}.s .ok b{color:#16A6A3}.f{text-align:center;color:#5a5680;font-size:11px;margin-top:14px}</style>' +
      '<div class="h"><img src="' + e(ROOT + "assets/img/logo.jpg") + '" alt=""><div><b>Umar BN L Khattob Nursery &amp; Primary School</b><small>Qur\'an is our honour</small></div><div class="n"><small>OFFICIAL RECEIPT</small><b>' + e(p.receipt_no) + "</b></div></div>" +
      '<table>' + row(t("pp.date"), e(stamp(p.created_at))) + row("Pupil", "<b>" + e(c.first_name + " " + c.last_name) + "</b>") + row(t("par.class"), e(c.class_name || "")) + (p.paid_by ? row(t("pp.paidby"), "<b>" + e(p.paid_by) + "</b>") : "") + row(t("pp.session") + " / " + t("pp.term"), e(p.session + ", " + p.term)) + row("For", e(p.item || "School fees")) + (p.reference ? row("Reference", e(p.reference)) : "") + "</table>" +
      '<div class="amt"><span>' + e(t("pp.amount")) + "</span><b>" + money(p.amount) + '</b></div><div class="s">' + (due ? "<div><span>" + e(t("pp.fees.due")) + "</span><b>" + money(due) + "</b></div>" : "") + "<div><span>" + e(t("pp.total")) + "</span><b>" + money(tot) + "</b></div>" + (due ? '<div class="' + (bal > 0 ? "due" : "ok") + '"><span>' + e(bal > 0 ? t("pp.remain") : t("pp.fees.clear")) + "</span><b>" + money(Math.max(bal, 0)) + "</b></div>" : "") + '</div><p class="f">Thank you. Keep this receipt safe.</p>';
    var fr = document.createElement("iframe"); fr.setAttribute("aria-hidden", "true"); fr.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0"; document.body.appendChild(fr);
    var d = fr.contentWindow.document; d.open(); d.write(html); d.close();
    setTimeout(function () { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (x) { /* ignore */ } setTimeout(function () { fr.remove(); }, 4000); }, 600);
  }

  function render() {
    if (!data) return;
    var name = data.parent && data.parent.name;
    $("#pp-hello").textContent = name ? t("par.hello", { name: name }) : t("par.hello.plain");
    var kids = data.children || [], notes = data.notices || [];
    var h = '<p class="notice is-info" id="pp-off" role="status" hidden><span data-icon="alert"></span><span></span></p><div class="pp-sum" id="pp-sum"></div><div class="form-actions" style="margin:.4rem 0 0"><button type="button" class="btn btn-soft btn-sm" id="pp-refresh">' + esc(t("pp.refresh")) + '</button></div><h3 class="sec-title" style="font-size:1.2rem;margin-top:1.2rem">' + esc(t("par.children")) + "</h3>";
    h += kids.length ? '<div class="two-col">' + kids.map(function (c) {
      var a = c.admission;
      return '<article class="panel pp-kid"><h3>' + esc(c.first_name + " " + c.last_name) + '</h3><p class="post-meta"><span class="cat-badge">' + esc(t("filter." + c.level)) + "</span> " +
        (c.class_name ? esc(t("par.class")) + ": " + esc(c.class_name) : '<em>' + esc(t("par.class.tbc")) + "</em>") + "</p>" +
        (c.student_code ? '<p class="count-line" style="margin:.5rem 0 0">' + esc(t("rs.id")) + ": <strong>" + esc(c.student_code) + "</strong></p>" : "") +
        (c.result_ready ? '<p style="margin-top:.8rem"><button type="button" class="btn btn-primary btn-sm" data-res="' + esc(c.id) + '">' + esc(t("rs.view")) + "</button></p>" : (c.class_name ? '<p class="count-line" style="margin:.6rem 0 0">' + esc(t("rs.notyet")) + "</p>" : "")) +
        '<div class="pp-extra" data-kx="' + esc(c.id) + '"><p class="count-line">...</p></div>' + (a ? '<p style="margin-top:.8rem"><strong>' + esc(t("par.adm")) + '</strong><br><span class="status-pill st-' + esc(a.status) + '">' + esc(t("st." + a.status)) + "</span> <small>" + esc(t("par.ref")) + ": " + esc(a.reference) + "</small>" +
          (a.note ? "<br><small>" + esc(a.note) + "</small>" : "") + "</p>" : "") + "</article>";
    }).join("") + "</div>" : '<div class="empty"><p>' + esc(t("par.nochild")) + "</p></div>";
    h += '<h3 class="sec-title" style="font-size:1.2rem;margin-top:2.2rem">' + esc(t("par.notices")) + "</h3>";
    h += notes.length ? '<div class="pp-notices">' + notes.map(function (n) {
      var b = pick(n.body), paras = Array.isArray(b) ? b : String(b || "").split(/\n{2,}/);
      var aud = (n.audience || []).indexOf("all") > -1 ? t("par.for.all") : n.audience.map(function (x) { return t("filter." + x); }).join(", "), isNew = seenOpen.indexOf(n.id) < 0;
      return '<article class="panel pp-note"><h4>' + (isNew ? '<span class="cat-badge new-b">' + esc(t("pp.new")) + "</span> " : "") + esc(pick(n.title)) + '</h4><p class="post-meta">' + esc(when(n.date)) + " · " + esc(t("par.for")) + ": " + esc(aud) + "</p>" + paras.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "</article>";
    }).join("") + "</div>" : '<div class="empty"><p>' + esc(t("par.nonotice")) + "</p></div>";
    h += '<div class="panel pp-help"><div><h4>' + esc(t("pp.help")) + '</h4><p>' + esc(t("pp.help.d")) + '</p></div><div class="pp-help-b"><a class="btn btn-primary btn-sm" href="tel:' + esc(((window.UBK_SITE || {}).admissions || {}).tel || "") + '">' + esc(t("pp.call")) + '</a><a class="btn btn-soft btn-sm" target="_blank" rel="noopener" href="https://wa.me/' + esc(((window.UBK_SITE || {}).admissions || {}).whatsapp || "") + '">' + esc(t("pp.wa")) + "</a></div></div>";
    if (kids.length) h += '<div id="pp-pay"></div>';
    $("#pp-body").innerHTML = h;
    if (kids.length) payments(kids);
    paintExtras(); if (snapAt) offlineNote();
    var rf = $("#pp-refresh"); if (rf) rf.addEventListener("click", function () { rf.disabled = true; start(); setTimeout(function () { rf.disabled = false; }, 2500); });
    try { localStorage.setItem("ubk-parent-seen", JSON.stringify(notes.map(function (n) { return n.id; }))); } catch (e) { /* ignore */ }
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
    overview().then(function (d) { data = d; $("#pp-login").hidden = true; $("#pp-app").hidden = false; stat = stat || null; render(); loadStatus(); },
      function (e) {
        var sn = !e.status && session ? readSnap() : null;
        if (sn && sn.data) { data = sn.data; stat = sn.stat; snapAt = sn.at; $("#pp-login").hidden = true; $("#pp-app").hidden = false; render(); return; }
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
      var kp = $("#pp-keep"); if (kp) { try { localStorage.setItem("ubk-parent-keep", kp.checked ? "1" : "0"); } catch (x) { /* ignore */ } }
      $("#pp-go").disabled = true;
      authCall("token?grant_type=password", { email: em, password: pw }).then(function (j) { adopt(j); $("#pp-pass").value = ""; start(); },
        function (err) { login(err.status === 400 || err.status === 401 ? t("par.bad") : t("par.net")); }).then(function () { $("#pp-go").disabled = false; });
    });
    $("#pp-out").addEventListener("click", function () {
      var tok = session && session.access; save(null); data = null; stat = null; try { localStorage.removeItem("ubk-parent-keep"); localStorage.removeItem("ubk-parent-snap"); } catch (x) { /* ignore */ }
      if (tok) fetch(B.url + "/auth/v1/logout", { method: "POST", headers: hdr(tok) }).catch(function () {});
      login("");
    });
    session = load(); if (session) start();
  });
  window.addEventListener("online", function () { if (session && data && snapAt) start(); });
  U.onLang(render);
})();
