/* Dashboard: Bursar. Record payments, class fee set-up, class balances, receipts (printable), void/correct. */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, $$ = U.$$, esc = U.esc, A = window.UBK_ADMIN;
  if (!A) return;
  var host, view = "record", classes = [], students = [], fees = [], pays = [], bal = [], summary = [];
  var cfg = { session: "", term: "First", cls: "" };
  var SCHOOL = "Umar BN L Khattob Nursery & Primary School";
  var METHODS = { cash: "Cash", bank_transfer: "Bank transfer", pos: "POS", cheque: "Cheque", other: "Other" };

  function defSession() { var d = new Date(), y = d.getFullYear(), m = d.getMonth(); return m >= 8 ? y + "/" + (y + 1) : (y - 1) + "/" + y; }
  try { cfg.session = localStorage.getItem("ubk_bur_session") || ""; cfg.term = localStorage.getItem("ubk_bur_term") || "First"; } catch (e) {}
  if (!cfg.session) cfg.session = defSession();
  function keep() { try { localStorage.setItem("ubk_bur_session", cfg.session); localStorage.setItem("ubk_bur_term", cfg.term); } catch (e) {} }
  function rpc(n, b) { return A.api("POST", "/rest/v1/rpc/" + n, b || {}); }
  function N(v) { return "₦" + Number(v || 0).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
  function say(ok, m) { var el = $("#bu-res"); if (el) { el.className = "result show " + (ok ? "ok" : "bad"); el.textContent = m; } }
  function isAdmin() { return A.can(["super_admin", "school_admin"]); }
  function canWrite() { return A.can(["super_admin", "school_admin", "bursar", "finance_officer"]); }
  function clsName(id) { var c = classes.filter(function (x) { return x.id === id; })[0]; return c ? c.name : ""; }
  function opts(list, sel, val, lab) { return list.map(function (x) { return '<option value="' + esc(x[val]) + '"' + (x[val] === sel ? " selected" : "") + ">" + esc(x[lab]) + "</option>"; }).join(""); }

  /* amount in words (Naira and kobo) */
  function words(n) {
    var o = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"], t = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
    function h(x) { var s = ""; if (x >= 100) { s += o[Math.floor(x / 100)] + " hundred"; x %= 100; if (x) s += " and "; } if (x >= 20) { s += t[Math.floor(x / 10)] + (x % 10 ? "-" + o[x % 10] : ""); } else if (x) s += o[x]; return s; }
    function big(x) { if (!x) return "zero"; var parts = [], u = [[1e9, "billion"], [1e6, "million"], [1e3, "thousand"]]; u.forEach(function (p) { if (x >= p[0]) { parts.push(h(Math.floor(x / p[0])) + " " + p[1]); x %= p[0]; } }); if (x) parts.push((parts.length && x < 100 ? "and " : "") + h(x)); return parts.join(" "); }
    var nair = Math.floor(n), kobo = Math.round((n - nair) * 100), s = big(nair) + " naira";
    if (kobo) s += " and " + big(kobo) + " kobo";
    s = s.charAt(0).toUpperCase() + s.slice(1); return s + " only";
  }

  function loadBase() {
    return Promise.all([
      A.api("GET", "/rest/v1/classes?select=id,name&order=section.desc,sort.asc,name.asc"),
      A.api("GET", "/rest/v1/class_fees?select=*&session=eq." + encodeURIComponent(cfg.session) + "&term=eq." + cfg.term + "&order=item.asc")
    ]).then(function (r) { classes = r[0] || []; fees = r[1] || []; if (!cfg.cls && classes.length) cfg.cls = classes[0].id; });
  }
  function open(h) {
    host = h; host.innerHTML = '<p class="count-line">Loading...</p>';
    loadBase().then(draw, function (e) { host.innerHTML = '<div class="notice"><span>' + esc(A.nice(e.message)) + "</span></div>"; });
  }
  function draw() {
    var tabs = [["record", "Record payment"], ["classes", "Class payments"], ["history", "Receipts"], ["statement", "Pupil statement"], ["fees", "Fee set-up"], ["link", "Finance link"], ["import", "Import old records"]];
    if (!isAdmin()) tabs = tabs.filter(function (t) { return t[0] !== "link"; });
    if (!canWrite()) tabs = tabs.filter(function (t) { return t[0] === "classes" || t[0] === "history" || t[0] === "statement"; });
    if (!A.importView) tabs = tabs.filter(function (t) { return t[0] !== "import"; });
    if (tabs.every(function (t) { return t[0] !== view; })) view = tabs[0][0];
    host.innerHTML = '<h2 class="sec-title" style="font-size:1.2rem">Bursar: fees and receipts</h2>' +
      '<div class="toolbar"><label class="count-line" style="margin:0">Session <input class="input" id="bu-ses" value="' + esc(cfg.session) + '" style="width:8.5rem;display:inline-block" maxlength="20" aria-label="Session"></label>' +
      '<select class="select-lg" id="bu-term" style="width:auto" aria-label="Term">' + ["First", "Second", "Third"].map(function (t) { return '<option value="' + t + '"' + (t === cfg.term ? " selected" : "") + ">" + t + " term</option>"; }).join("") + "</select></div>" +
      '<div class="activity-tabs" role="tablist" style="margin:.4rem 0 1rem">' + tabs.map(function (t) { return '<button type="button" role="tab" class="btn btn-sm ' + (t[0] === view ? "btn-primary" : "btn-soft") + '" data-v="' + t[0] + '">' + t[1] + "</button>"; }).join(" ") + "</div>" +
      '<div id="bu-sum" class="bu-sum" aria-live="polite"></div><p class="count-line bu-help" id="bu-help"></p><div id="bu-body"></div><p class="result" id="bu-res" role="status"></p>';
    $("#bu-ses").addEventListener("change", function () { cfg.session = this.value.trim() || defSession(); keep(); open(host); });
    $("#bu-term").addEventListener("change", function () { cfg.term = this.value; keep(); open(host); });
    $$("[data-v]", host).forEach(function (b) { b.addEventListener("click", function () { view = b.getAttribute("data-v"); draw(); }); });
    $("#bu-help").textContent = HELP[view] || ""; summary_(); linkBtn(); ({ record: vRecord, classes: vClasses, history: vHistory, statement: vStatement, fees: vFees, link: vLink, import: vImport })[view]();
  }

  /* ---------- record a payment ---------- */
  function vRecord() {
    var b = $("#bu-body");
    b.innerHTML = '<div class="form-card"><div class="grid-2" style="display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(210px,1fr))">' +
      '<div class="fld"><label for="rc-cl">Class</label><select class="select-lg" id="rc-cl">' + opts(classes, cfg.cls, "id", "name") + "</select></div>" +
      '<div class="fld"><label for="rc-st">Pupil</label><select class="select-lg" id="rc-st"><option value="">Choose pupil</option></select></div>' +
      '<div class="fld"><label for="rc-item">Payment for</label><input class="input" id="rc-item" list="rc-items" value="School fees" maxlength="60"><datalist id="rc-items">' + fees.map(function (f) { return '<option value="' + esc(f.item) + '">'; }).join("") + '</datalist></div>' +
      '<div class="fld"><label for="rc-by">Paid by (parent or person paying)</label><input class="input" id="rc-by" maxlength="120" autocomplete="off" placeholder="e.g. Mrs Aisha Bello"></div>' +
      '<div class="fld"><label for="rc-amt">Amount paid (₦)</label><input class="input" id="rc-amt" type="number" inputmode="decimal" min="1" step="0.01"></div>' +
      '<div class="fld"><label for="rc-m">Method</label><select class="select-lg" id="rc-m">' + Object.keys(METHODS).map(function (k) { return '<option value="' + k + '">' + METHODS[k] + "</option>"; }).join("") + "</select></div>" +
      '<div class="fld"><label for="rc-ref">Reference (optional)</label><input class="input" id="rc-ref" maxlength="80" placeholder="Transfer or teller no."></div>' +
      '<div class="fld"><label for="rc-date">Date paid</label><input class="input" id="rc-date" type="date" max="' + new Date().toISOString().slice(0, 10) + '" value="' + new Date().toISOString().slice(0, 10) + '"></div>' +
      '<div class="fld"><label for="rc-note">Note (optional)</label><input class="input" id="rc-note" maxlength="300"></div></div>' +
      '<p class="count-line" id="rc-bal" style="margin:.8rem 0 0"></p>' +
      '<div class="form-actions" style="margin-top:1rem"><button type="button" class="btn btn-primary" id="rc-go">Save and issue receipt</button></div></div><div id="rc-out"></div>';
    function pupils() {
      cfg.cls = $("#rc-cl").value;
      rpc("class_balances", { p_class: cfg.cls, p_session: cfg.session, p_term: cfg.term }).then(function (r) {
        bal = r || []; $("#rc-st").innerHTML = '<option value="">Choose pupil</option>' + bal.map(function (s) { return '<option value="' + esc(s.student_id) + '">' + esc(s.full_name) + (s.admission_no ? " (" + esc(s.admission_no) + ")" : "") + "</option>"; }).join("");
        showBal();
      }, function (e) { say(false, A.nice(e.message)); });
    }
    function showBal() {
      var s = bal.filter(function (x) { return x.student_id === $("#rc-st").value; })[0];
      $("#rc-bal").textContent = s ? (s.due > 0 ? "Fees set for this term: " + N(s.due) + ". Paid so far: " + N(s.paid) + ". Balance: " + N(s.balance) + "." : "No fees are set for this class and term yet (Fee set-up). Paid so far: " + N(s.paid) + ".") : "";
      if (s && s.balance > 0 && !$("#rc-amt").value) $("#rc-amt").value = s.balance;
    }
    $("#rc-cl").addEventListener("change", pupils); $("#rc-st").addEventListener("change", showBal); pupils();
    $("#rc-go").addEventListener("click", function () {
      var sid = $("#rc-st").value, amt = parseFloat($("#rc-amt").value);
      if (!sid) return say(false, "Choose the pupil."); if (!(amt > 0)) return say(false, "Enter the amount paid.");
      var s = bal.filter(function (x) { return x.student_id === sid; })[0];
      if (s && s.due > 0 && amt > s.balance && !confirm("This is more than the balance of " + N(s.balance) + ". Record it anyway?")) return;
      $("#rc-go").disabled = true;
      A.api("POST", "/rest/v1/payments", { student_id: sid, session: cfg.session, term: cfg.term, item: $("#rc-item").value.trim() || "School fees", amount: amt, method: $("#rc-m").value, reference: $("#rc-ref").value.trim() || null, paid_on: $("#rc-date").value || undefined, note: $("#rc-note").value.trim() || null, paid_by: $("#rc-by").value.trim() || null }, { Prefer: "return=representation" }).then(function (r) {
        var p = r && r[0]; say(true, "Saved. Receipt " + (p && p.receipt_no) + ".");
        var nm = s ? s.full_name : "", before = s ? s.paid : 0, due = s ? s.due : 0;
        receiptCard($("#rc-out"), p, { name: nm, adm: s && s.admission_no, cls: clsName(cfg.cls), due: due, paidTotal: before + amt });
        $("#rc-amt").value = ""; $("#rc-ref").value = ""; $("#rc-note").value = ""; $("#rc-by").value = ""; pupils();
      }, function (e) { say(false, A.nice(e.message)); }).then(function () { $("#rc-go").disabled = false; });
    });
  }

  /* ---------- receipt ---------- */
  var LOGO_URL = ((document.currentScript && document.currentScript.src) || "").replace(/assets\/js\/[^\/]*$/, "") + "assets/img/logo.jpg", LOGO64 = "";
  (function () { try { fetch(LOGO_URL).then(function (r) { return r.blob(); }).then(function (b) { var fr = new FileReader(); fr.onload = function () { LOGO64 = String(fr.result); }; fr.readAsDataURL(b); }).catch(function () {}); } catch (e) {} })();
  function stamp(p) {
    try { var d = p.created_at ? new Date(p.created_at) : new Date(); return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) + ", " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true }); } catch (e) { return p.paid_on || ""; }
  }
  function receiptHTML(p, x, copy) {
    var S = (U.site && U.site()) || {}, ph = (S.phones || [])[0] || "", bal = x.due ? x.due - x.paidTotal : null, logo = LOGO64 || esc(LOGO_URL);
    function row(k, v) { return "<tr><th>" + k + "</th><td>" + v + "</td></tr>"; }
    return '<div class="rc2"><div class="rc2-wm" style="background-image:url(' + logo + ')"></div><div class="rc2-h"><img src="' + logo + '" alt="School logo" width="58" height="58"><div class="rc2-nm"><b>' + esc(SCHOOL) + "</b><small>Qur'an is our honour</small>" + (S.address || ph ? "<small>" + esc([S.address, ph].filter(Boolean).join("  |  ")) + "</small>" : "") + '</div><div class="rc2-no"><small>OFFICIAL RECEIPT</small><b>' + esc(p.receipt_no) + "</b><small>" + esc(p.paid_on) + "</small></div></div>" +
      (copy ? '<div class="rc2-copy">' + esc(copy) + "</div>" : "") +
      (p.status === "voided" ? '<div class="rcpt-void">VOID</div>' : "") +
      '<table class="rc2-t">' + row("Received from", "<b>" + esc(x.name) + "</b>" + (x.adm ? " <span>(" + esc(x.adm) + ")</span>" : "")) + row("Class", esc(x.cls || "")) + (p.paid_by ? row("Paid by", "<b>" + esc(p.paid_by) + "</b>") : "") + row("Date and time", esc(stamp(p))) +
      row("Session and term", esc(p.session) + ", " + esc(p.term) + " term") + row("Payment for", esc(p.item)) +
      row("Method", esc(METHODS[p.method] || p.method) + (p.reference ? ", Ref " + esc(p.reference) : "")) + "</table>" +
      '<div class="rc2-amt"><span>AMOUNT PAID</span><b>' + N(p.amount) + "</b><small>" + esc(words(Number(p.amount))) + "</small></div>" +
      (x.due ? '<div class="rc2-sum"><div><span>Term fees</span><b>' + N(x.due) + "</b></div><div><span>This payment</span><b>" + N(p.amount) + "</b></div><div><span>Total paid so far</span><b>" + N(x.paidTotal) + '</b></div><div class="' + (bal > 0 ? "due" : "ok") + '"><span>' + (bal > 0 ? "Amount remaining" : "Fully paid") + "</span><b>" + N(Math.max(bal, 0)) + "</b></div></div>" : '<div class="rc2-sum rc2-two"><div><span>This payment</span><b>' + N(p.amount) + "</b></div><div><span>Total paid so far</span><b>" + N(x.paidTotal) + "</b></div></div>") +
      '<div class="rc2-f"><div><span></span>Bursar signature and stamp</div><div><span></span>Parent or payer</div></div><small class="rc2-n">Valid only when signed and stamped. Fees paid are not refundable unless the school agrees in writing.</small></div>';
  }
  function receiptPrint(p, x) { U.printHTML('<div class="rc2-sheet">' + receiptHTML(p, x, "PARENT'S COPY") + '<div class="rc2-cut">cut here</div>' + receiptHTML(p, x, "SCHOOL COPY") + "</div>"); }
  function receiptCard(out, p, x) {
    out.innerHTML = '<div class="form-card" style="margin-top:1rem"><div class="form-actions" style="margin-bottom:.8rem"><button type="button" class="btn btn-primary btn-sm" id="rc-pr">Print receipt</button></div>' + receiptHTML(p, x) + "</div>";
    $("#rc-pr").addEventListener("click", function () { receiptPrint(p, x); });
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- class payments ---------- */
  function vClasses() {
    var b = $("#bu-body"); b.innerHTML = '<p class="count-line">Loading...</p>';
    rpc("payment_summary", { p_session: cfg.session, p_term: cfg.term }).then(function (r) {
      summary = r || []; var tE = 0, tP = 0, tPu = 0; summary.forEach(function (c) { tE += +c.expected; tP += +c.paid; tPu += c.pupils; });
      b.innerHTML = '<div class="ad-stats"><div class="stat"><b>' + N(tE) + "</b><span>Expected</span></div><div class=\"stat\"><b>" + N(tP) + "</b><span>Collected</span></div><div class=\"stat\"><b>" + N(Math.max(tE - tP, 0)) + "</b><span>Outstanding</span></div><div class=\"stat\"><b>" + (tE ? Math.round(tP / tE * 100) : 0) + "%</b><span>Collection rate</span></div></div>" +
        '<div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>Class</th><th>Pupils</th><th>Expected</th><th>Collected</th><th>Outstanding</th><th>Paid in full</th><th>Owing</th><th></th></tr></thead><tbody>' + summary.map(function (c) {
          var pct = +c.expected ? Math.min(100, Math.round(c.paid / c.expected * 100)) : 0;
          return "<tr><td><strong>" + esc(c.class_name) + "</strong></td><td>" + c.pupils + "</td><td>" + N(c.expected) + "</td><td>" + N(c.paid) + ' <small>(' + pct + "%)</small></td><td>" + N(Math.max(c.expected - c.paid, 0)) + "</td><td>" + c.fully_paid + "</td><td>" + c.owing + '</td><td><button type="button" class="btn btn-soft btn-sm" data-cl="' + esc(c.class_id) + '">Pupils</button></td></tr>';
        }).join("") + '</tbody></table></div><div id="bu-cl"></div>';
      $$("[data-cl]", b).forEach(function (x) { x.addEventListener("click", function () { classDetail(x.getAttribute("data-cl")); }); });
    }, function (e) { b.innerHTML = '<div class="notice"><span>' + esc(A.nice(e.message)) + "</span></div>"; });
  }
  function classDetail(id) {
    var out = $("#bu-cl"); out.innerHTML = '<p class="count-line">Loading...</p>';
    rpc("class_balances", { p_class: id, p_session: cfg.session, p_term: cfg.term }).then(function (r) {
      r = r || []; var owing = r.filter(function (s) { return s.due > 0 && s.paid < s.due; });
      out.innerHTML = '<h3 style="font-size:1.05rem;margin:1.2rem 0 .4rem">' + esc(clsName(id)) + ": " + owing.length + ' pupil(s) owing</h3><div class="form-actions" style="margin-bottom:.6rem"><button type="button" class="btn btn-soft btn-sm" id="cd-csv">Download CSV</button><button type="button" class="btn btn-soft btn-sm" id="cd-pr">Print list</button></div>' +
        '<div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>Pupil</th><th>ID</th><th>Fees</th><th>Paid</th><th>Balance</th></tr></thead><tbody>' + r.map(function (s) { return "<tr><td>" + esc(s.full_name) + "</td><td>" + esc(s.admission_no || "") + "</td><td>" + N(s.due) + "</td><td>" + N(s.paid) + "</td><td>" + (s.due > 0 ? (s.balance > 0 ? "<b>" + N(s.balance) + "</b>" : "Cleared") : "-") + "</td></tr>"; }).join("") + "</tbody></table></div>";
      $("#cd-csv").addEventListener("click", function () { csv("class-" + clsName(id) + ".csv", ["Pupil", "ID", "Fees", "Paid", "Balance"], r.map(function (s) { return [s.full_name, s.admission_no, s.due, s.paid, s.balance]; })); });
      $("#cd-pr").addEventListener("click", function () { U.printHTML("<h2>" + esc(SCHOOL) + "</h2><h3>" + esc(clsName(id)) + " · " + esc(cfg.session) + " " + esc(cfg.term) + " term</h3><table class=\"ad-table\"><tbody>" + r.map(function (s) { return "<tr><td>" + esc(s.full_name) + "</td><td>" + N(s.due) + "</td><td>" + N(s.paid) + "</td><td>" + N(s.balance) + "</td></tr>"; }).join("") + "</tbody></table>"); });
      out.scrollIntoView({ behavior: "smooth", block: "start" });
    }, function (e) { out.innerHTML = '<div class="notice"><span>' + esc(A.nice(e.message)) + "</span></div>"; });
  }
  function csv(name, head, rows) {
    var q = function (v) { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    U.download(name, "text/csv;charset=utf-8", "﻿" + head.join(",") + "\n" + rows.map(function (r) { return r.map(q).join(","); }).join("\n"));
  }

  /* ---------- receipts history (also correct / void) ---------- */
  function vHistory() {
    var b = $("#bu-body"); b.innerHTML = '<p class="count-line">Loading...</p>';
    rpc("payments_list", { p_session: cfg.session, p_term: cfg.term }).then(function (r) {
      pays = r || []; drawHist();
    }, function (e) { b.innerHTML = '<div class="notice"><span>' + esc(A.nice(e.message)) + "</span></div>"; });
  }
  function nm(p) { return p.student_name || ""; }
  function drawHist() {
    var b = $("#bu-body"), q = ($("#hs-q") && $("#hs-q").value || "").toLowerCase();
    var list = pays.filter(function (p) { return !q || (nm(p) + " " + p.receipt_no + " " + (p.reference || "")).toLowerCase().indexOf(q) > -1; });
    var tot = list.filter(function (p) { return p.status === "valid"; }).reduce(function (a, p) { return a + Number(p.amount); }, 0);
    b.innerHTML = '<div class="toolbar"><div class="field-search"><span data-icon="search"></span><input id="hs-q" class="input" type="search" placeholder="Search pupil, receipt no., reference" value="' + esc(q) + '" aria-label="Search receipts"></div><span style="flex:1"></span><button type="button" class="btn btn-soft btn-sm" id="hs-csv">Download CSV</button></div>' +
      '<p class="count-line">' + list.length + " receipt(s) · valid total " + N(tot) + "</p>" +
      '<div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>Receipt</th><th>Date</th><th>Pupil</th><th>Class</th><th>For</th><th>Amount</th><th>Method</th><th></th></tr></thead><tbody>' + list.map(function (p) {
        return "<tr" + (p.status === "voided" ? ' style="opacity:.55;text-decoration:line-through"' : "") + "><td>" + esc(p.receipt_no) + "</td><td>" + esc(p.paid_on) + "</td><td>" + esc(nm(p)) + "</td><td>" + esc(p.class_name || "") + "</td><td>" + esc(p.item) + "</td><td>" + N(p.amount) + "</td><td>" + esc(METHODS[p.method] || p.method) + '</td><td style="white-space:nowrap"><button type="button" class="btn btn-soft btn-sm" data-pr="' + esc(p.id) + '">Receipt</button>' +
          (p.status === "valid" && canWrite() ? ' <button type="button" class="btn btn-soft btn-sm" data-vo="' + esc(p.id) + '">Void</button>' : "") + (isAdmin() && p.status === "valid" ? ' <button type="button" class="btn btn-soft btn-sm" data-ed="' + esc(p.id) + '">Edit</button>' : "") + "</td></tr>";
      }).join("") + '</tbody></table></div><div id="hs-out"></div>';
    $("#hs-q").addEventListener("input", function () { clearTimeout(drawHist.t); drawHist.t = setTimeout(function () { var v = $("#hs-q").value; drawHist(); var e = $("#hs-q"); e.focus(); e.setSelectionRange(v.length, v.length); }, 250); });
    $("#hs-csv").addEventListener("click", function () { csv("receipts-" + cfg.session.replace("/", "-") + "-" + cfg.term + ".csv", ["Receipt", "Date", "Pupil", "Class", "For", "Amount", "Method", "Reference", "Status"], list.map(function (p) { return [p.receipt_no, p.paid_on, nm(p), p.class_name, p.item, p.amount, p.method, p.reference, p.status]; })); });
    $$("[data-pr]", b).forEach(function (x) { x.addEventListener("click", function () {
      var p = byId(x.getAttribute("data-pr")), tot = pays.filter(function (y) { return y.student_id === p.student_id && y.status === "valid" && y.created_at <= p.created_at; }).reduce(function (a, y) { return a + Number(y.amount); }, 0), base = { name: nm(p), adm: p.admission_no, cls: p.class_name, due: 0, paidTotal: tot };
      receiptCard($("#hs-out"), p, base);
      if (p.class_id) rpc("class_balances", { p_class: p.class_id, p_session: p.session, p_term: p.term }).then(function (r) { var q = (r || []).filter(function (z) { return z.student_id === p.student_id; })[0]; if (q && q.due > 0) { base.due = +q.due; receiptCard($("#hs-out"), p, base); } }, function () {});
    }); });
    $$("[data-vo]", b).forEach(function (x) { x.addEventListener("click", function () { var r = prompt("Why is this receipt being voided? (required)"); if (!r) return; rpc("void_payment", { p_id: x.getAttribute("data-vo"), p_reason: r }).then(function (s) { if (s === "ok") { say(true, "Receipt voided."); vHistory(); } else say(false, s === "reason" ? "A reason is required." : "Could not void this receipt."); }, function (e) { say(false, A.nice(e.message)); }); }); });
    $$("[data-ed]", b).forEach(function (x) { x.addEventListener("click", function () { editPay(byId(x.getAttribute("data-ed"))); }); });
  }
  function byId(id) { return pays.filter(function (p) { return p.id === id; })[0]; }
  function editPay(p) {
    var out = $("#hs-out");
    out.innerHTML = '<div class="form-card" style="margin-top:1rem"><h3 style="font-size:1.1rem;margin:0 0 1rem">Correct ' + esc(p.receipt_no) + ' (' + esc(nm(p)) + ')</h3><div style="display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">' +
      '<div class="fld"><label for="ed-amt">Amount (₦)</label><input class="input" id="ed-amt" type="number" min="1" step="0.01" value="' + esc(p.amount) + '"></div>' +
      '<div class="fld"><label for="ed-item">Payment for</label><input class="input" id="ed-item" maxlength="60" value="' + esc(p.item) + '"></div>' +
      '<div class="fld"><label for="ed-m">Method</label><select class="select-lg" id="ed-m">' + Object.keys(METHODS).map(function (k) { return '<option value="' + k + '"' + (k === p.method ? " selected" : "") + ">" + METHODS[k] + "</option>"; }).join("") + "</select></div>" +
      '<div class="fld"><label for="ed-ref">Reference</label><input class="input" id="ed-ref" maxlength="80" value="' + esc(p.reference || "") + '"></div>' +
      '<div class="fld"><label for="ed-date">Date paid</label><input class="input" id="ed-date" type="date" max="' + new Date().toISOString().slice(0, 10) + '" value="' + esc(p.paid_on) + '"></div>' +
      '<div class="fld"><label for="ed-note">Note</label><input class="input" id="ed-note" maxlength="300" value="' + esc(p.note || "") + '"></div></div>' +
      '<div class="form-actions" style="margin-top:1rem"><button type="button" class="btn btn-primary btn-sm" id="ed-save">Save correction</button><button type="button" class="btn btn-soft btn-sm" id="ed-x">Cancel</button></div></div>';
    out.scrollIntoView({ behavior: "smooth", block: "start" });
    $("#ed-x").addEventListener("click", function () { out.innerHTML = ""; });
    $("#ed-save").addEventListener("click", function () {
      var a = parseFloat($("#ed-amt").value); if (!(a > 0)) return say(false, "Enter a valid amount.");
      A.api("PATCH", "/rest/v1/payments?id=eq." + encodeURIComponent(p.id), { amount: a, item: $("#ed-item").value.trim() || "School fees", method: $("#ed-m").value, reference: $("#ed-ref").value.trim() || null, paid_on: $("#ed-date").value || p.paid_on, note: $("#ed-note").value.trim() || null }).then(function () { say(true, "Corrected. The change is recorded in the audit log."); vHistory(); }, function (e) { say(false, A.nice(e.message)); });
    });
  }

  /* ---------- fee set-up ---------- */
  function vFees() {
    var b = $("#bu-body");
    A.api("GET", "/rest/v1/class_fees?select=*&session=eq." + encodeURIComponent(cfg.session) + "&term=eq." + cfg.term + "&class_id=eq." + cfg.cls + "&order=item.asc").then(function (r) {
      fees = r || []; var tot = fees.reduce(function (a, f) { return a + Number(f.amount); }, 0);
      b.innerHTML = '<div class="toolbar"><select class="select-lg" id="fe-cl" style="width:auto" aria-label="Class">' + opts(classes, cfg.cls, "id", "name") + '</select></div>' +
        '<div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>Item</th><th>Amount</th><th></th></tr></thead><tbody>' + (fees.length ? fees.map(function (f) { return "<tr><td>" + esc(f.item) + "</td><td>" + N(f.amount) + '</td><td><button type="button" class="btn btn-soft btn-sm" data-del="' + esc(f.id) + '">Remove</button></td></tr>'; }).join("") + "<tr><td><b>Total per pupil</b></td><td><b>" + N(tot) + "</b></td><td></td></tr>" : '<tr><td colspan="3">No fees set for this class, session and term.</td></tr>') + "</tbody></table></div>" +
        '<div class="form-card" style="margin-top:1rem"><div style="display:grid;gap:.8rem;grid-template-columns:repeat(auto-fit,minmax(180px,1fr))"><div class="fld"><label for="fe-item">Item</label><input class="input" id="fe-item" maxlength="60" value="School fees"></div><div class="fld"><label for="fe-amt">Amount (₦)</label><input class="input" id="fe-amt" type="number" min="1" step="0.01" inputmode="decimal"></div></div>' +
        '<div class="form-actions" style="margin-top:.8rem"><button type="button" class="btn btn-primary btn-sm" id="fe-add">Add fee</button>' + (fees.length ? '<button type="button" class="btn btn-soft btn-sm" id="fe-copy">Copy these fees to all classes</button>' : "") + "</div></div>";
      $("#fe-cl").addEventListener("change", function () { cfg.cls = this.value; vFees(); });
      $("#fe-add").addEventListener("click", function () {
        var amt = parseFloat($("#fe-amt").value), item = $("#fe-item").value.trim(); if (!item || !(amt > 0)) return say(false, "Enter the item and amount.");
        A.api("POST", "/rest/v1/class_fees", { class_id: cfg.cls, session: cfg.session, term: cfg.term, item: item, amount: amt }).then(function () { say(true, "Fee added."); vFees(); }, function (e) { say(false, /duplicate|unique/i.test(e.message) ? "That item already exists for this class. Remove it first to change the amount." : A.nice(e.message)); });
      });
      $$("[data-del]", b).forEach(function (x) { x.addEventListener("click", function () { if (!confirm("Remove this fee?")) return; A.api("DELETE", "/rest/v1/class_fees?id=eq." + encodeURIComponent(x.getAttribute("data-del"))).then(function () { vFees(); }, function (e) { say(false, A.nice(e.message)); }); }); });
      var cp = $("#fe-copy"); if (cp) cp.addEventListener("click", function () {
        if (!confirm("Copy these fees to every other class for this session and term? Items that already exist are skipped.")) return;
        var rows = []; classes.forEach(function (c) { if (c.id !== cfg.cls) fees.forEach(function (f) { rows.push({ class_id: c.id, session: cfg.session, term: cfg.term, item: f.item, amount: f.amount }); }); });
        A.api("POST", "/rest/v1/class_fees?on_conflict=class_id,session,term,item", rows, { Prefer: "resolution=ignore-duplicates,return=minimal" }).then(function () { say(true, "Copied to " + (classes.length - 1) + " classes."); }, function (e) { say(false, A.nice(e.message)); });
      });
    }, function (e) { b.innerHTML = '<div class="notice"><span>' + esc(A.nice(e.message)) + "</span></div>"; });
  }
  function vImport() { A.importView($("#bu-body"), { session: cfg.session, term: cfg.term }); }

  /* ---------- explanations, totals, statement, finance link ---------- */
  var HELP = {
    record: "Record money a parent has paid. A receipt number is made for you and you can print it for the parent.",
    classes: "See, for one class, what each pupil owes this term, what has been paid, and what is still outstanding.",
    history: "Every receipt issued. Search, print again, correct a mistake, or void a receipt (a reason is required and kept).",
    statement: "Search a pupil to see all fees due and payments made, term by term. Print it or save it as a spreadsheet for the parent.",
    fees: "Set the fee items and amounts for each class and term. These decide what pupils owe.",
    link: "Add a link to your school's bursary or payment information website. It shows as a button for the bursar, and for parents.",
    import: "Bring in payment records you already have from before."
  };
  function summary_() {
    var el = $("#bu-sum"); if (!el) return; el.innerHTML = "";
    var q = "session=eq." + encodeURIComponent(cfg.session) + "&term=eq." + encodeURIComponent(cfg.term);
    Promise.all([A.api("GET", "/rest/v1/payments?select=amount,paid_on,status&" + q + "&limit=5000"), A.api("GET", "/rest/v1/class_fees?select=class_id,amount&" + q), rpc("class_pupil_counts", {})]).then(function (r) {
      var pays_ = (r[0] || []).filter(function (x) { return x.status === "valid"; }), got = pays_.reduce(function (s, x) { return s + Number(x.amount); }, 0), today = new Date().toISOString().slice(0, 10),
        tod = pays_.filter(function (x) { return x.paid_on === today; }).reduce(function (s, x) { return s + Number(x.amount); }, 0), per = {}, cnt = r[2] || {};
      (r[1] || []).forEach(function (f) { per[f.class_id] = (per[f.class_id] || 0) + Number(f.amount); });
      var exp = Object.keys(per).reduce(function (s, c) { return s + per[c] * ((cnt[c] || {}).active || 0); }, 0), out = Math.max(0, exp - got), pct = exp ? Math.min(100, Math.round(got / exp * 100)) : 0;
      function tile(l, v, s) { return '<div class="bu-t"><small>' + l + "</small><strong>" + v + "</strong>" + (s ? "<span>" + s + "</span>" : "") + "</div>"; }
      el.innerHTML = tile("Collected", N(got), pays_.length + " receipt" + (pays_.length === 1 ? "" : "s")) + tile("Today", N(tod), "received today") + tile("Expected", N(exp), exp ? "from active pupils" : "Set fees to see this") + tile("Outstanding", N(out), exp ? pct + "% paid" : "") +
        (exp ? '<div class="bu-bar" role="img" aria-label="' + pct + ' percent of expected fees collected"><i style="width:' + pct + '%"></i></div>' : "");
    }, function () {});
  }
  function lineCsv(a) { return a.map(function (v) { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(","); }
  function stmtHTML(s) {
    var logo = LOGO64 || esc(LOGO_URL), st = s.student, T = s.terms || [], P = s.payments || [], valid = P.filter(function (x) { return x.status === "valid"; }), due = T.reduce(function (a, x) { return a + Number(x.due); }, 0), paid = T.reduce(function (a, x) { return a + Number(x.paid); }, 0);
    return '<div class="stm"><div class="stm-h"><img src="' + logo + '" alt="" width="54" height="54"><div><h2>' + esc(SCHOOL) + "</h2><p>Student fee statement</p></div></div>" +
      '<dl class="stm-i"><div><dt>Pupil</dt><dd>' + esc(st.name) + "</dd></div><div><dt>Class</dt><dd>" + esc(st.class || "-") + "</dd></div><div><dt>Admission no.</dt><dd>" + esc(st.adm || "-") + "</dd></div><div><dt>Student ID</dt><dd>" + esc(st.code || "-") + "</dd></div><div><dt>Printed</dt><dd>" + new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) + "</dd></div></dl>" +
      "<h3>Fees by term</h3>" + (T.length ? '<table class="stm-t"><thead><tr><th>Session</th><th>Term</th><th>Fees due</th><th>Paid</th><th>Balance</th></tr></thead><tbody>' + T.map(function (x) { var b = Number(x.due) - Number(x.paid); return "<tr><td>" + esc(x.session) + "</td><td>" + esc(x.term) + "</td><td>" + N(x.due) + "</td><td>" + N(x.paid) + "</td><td><b>" + (b > 0 ? N(b) : b < 0 ? N(-b) + " credit" : "Paid") + "</b></td></tr>"; }).join("") + "</tbody><tfoot><tr><th colspan='2'>Total</th><th>" + N(due) + "</th><th>" + N(paid) + "</th><th>" + N(Math.max(0, due - paid)) + "</th></tr></tfoot></table>" : "<p>No fees have been set for this pupil's class yet.</p>") +
      "<h3>Payments received</h3>" + (P.length ? '<table class="stm-t stm-p"><thead><tr><th>Receipt</th><th>Date</th><th>Term</th><th>Item</th><th>Method</th><th>Amount</th></tr></thead><tbody>' + P.map(function (x) { var v = x.status !== "valid"; return "<tr" + (v ? ' class="stm-v"' : "") + "><td>" + esc(x.receipt) + "</td><td>" + esc(x.date) + "</td><td>" + esc(x.session + " " + x.term) + "</td><td>" + esc(x.item) + (v ? " (voided)" : "") + "</td><td>" + esc(METHODS[x.method] || x.method) + "</td><td>" + N(x.amount) + "</td></tr>"; }).join("") + "</tbody><tfoot><tr><th colspan='5'>Total received</th><th>" + N(valid.reduce(function (a, x) { return a + Number(x.amount); }, 0)) + "</th></tr></tfoot></table>" : "<p>No payments recorded yet.</p>") +
      '<p class="stm-n">This statement lists payments recorded by the school office. Fees due use the class fee list for each term.</p></div>';
  }
  function vStatement() {
    var b = $("#bu-body"); b.innerHTML = '<div class="toolbar"><div class="field-search"><span data-icon="search"></span><input id="sm-q" class="input" type="search" placeholder="Search by name or admission number" autocomplete="off" aria-label="Search pupil"></div></div><div id="sm-list"></div><div id="sm-out"></div>';
    var tm; $("#sm-q").addEventListener("input", function () { clearTimeout(tm); var q = this.value.trim().replace(/[(),*%]/g, ""); if (q.length < 2) { $("#sm-list").innerHTML = ""; return; } tm = setTimeout(function () {
      A.api("GET", "/rest/v1/students?select=id,first_name,last_name,admission_no,class_name&or=(first_name.ilike.*" + encodeURIComponent(q) + "*,last_name.ilike.*" + encodeURIComponent(q) + "*,admission_no.ilike.*" + encodeURIComponent(q) + "*)&order=last_name.asc&limit=12").then(function (r) {
        $("#sm-list").innerHTML = (r || []).length ? '<ul class="sm-res">' + r.map(function (x) { return '<li><button type="button" class="btn btn-soft" data-sm="' + esc(x.id) + '"><b>' + esc(x.last_name + " " + x.first_name) + "</b><small>" + esc((x.class_name || "No class") + (x.admission_no ? " - " + x.admission_no : "")) + "</small></button></li>"; }).join("") + "</ul>" : '<p class="count-line">No pupil found.</p>';
        $$("[data-sm]", b).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.getAttribute("data-sm")); }); });
      }, function (e) { say(false, A.nice(e.message)); });
    }, 250); });
    function show(id) {
      $("#sm-out").innerHTML = '<p class="count-line">Loading...</p>';
      rpc("student_statement", { p_student: id }).then(function (s) {
        $("#sm-list").innerHTML = ""; $("#sm-out").innerHTML = '<div class="form-actions" style="margin:1rem 0"><button type="button" class="btn btn-primary" id="sm-pr">Print statement</button><button type="button" class="btn btn-soft" id="sm-csv">Save as spreadsheet</button></div><div class="stm-wrap">' + stmtHTML(s) + "</div>";
        $("#sm-pr").addEventListener("click", function () { U.printHTML(stmtHTML(s)); });
        $("#sm-csv").addEventListener("click", function () {
          var L = [["Pupil", s.student.name], ["Class", s.student.class], ["Admission no", s.student.adm], [], ["Session", "Term", "Fees due", "Paid", "Balance"]].concat((s.terms || []).map(function (x) { return [x.session, x.term, x.due, x.paid, Number(x.due) - Number(x.paid)]; })).concat([[], ["Receipt", "Date", "Session", "Term", "Item", "Method", "Amount", "Status"]]).concat((s.payments || []).map(function (x) { return [x.receipt, x.date, x.session, x.term, x.item, x.method, x.amount, x.status]; }));
          U.download("statement-" + String(s.student.name).replace(/\s+/g, "-").toLowerCase() + ".csv", "text/csv;charset=utf-8", "\ufeff" + L.map(lineCsv).join("\r\n"));
        });
      }, function (e) { $("#sm-out").innerHTML = ""; say(false, A.nice(e.message)); });
    }
  }
  /* external finance / bursary website link, controlled here */
  function safeUrl(u) { try { var x = new URL(u); return x.protocol === "https:" || x.protocol === "http:" ? x.href : ""; } catch (e) { return ""; } }
  function vLink() {
    var b = $("#bu-body"); b.innerHTML = '<p class="count-line">Loading...</p>';
    A.api("GET", "/rest/v1/site_settings?select=value&key=eq.finance_link").then(function (r) {
      var v = (r && r[0] && r[0].value) || {};
      b.innerHTML = '<form class="form-card" id="fl-form" novalidate><div class="form-grid"><div class="fld full"><label for="fl-u">Website address</label><input class="input" id="fl-u" type="url" inputmode="url" placeholder="https://..." maxlength="300" value="' + esc(v.url || "") + '"></div><div class="fld"><label for="fl-l">Button name</label><input class="input" id="fl-l" maxlength="40" placeholder="Open bursary website" value="' + esc(v.label || "") + '"></div><div class="fld full"><label for="fl-n">Short note for parents (optional)</label><input class="input" id="fl-n" maxlength="160" value="' + esc(v.note || "") + '"></div><div class="fld full"><label class="check"><input type="checkbox" id="fl-p"' + (v.parents === false ? "" : " checked") + '> Also show this link to parents in their portal</label></div></div><div class="form-actions"><button class="btn btn-primary" type="submit">Save link</button><button class="btn btn-soft" type="button" id="fl-rm">Remove link</button></div></form><p class="count-line">This site does not take payments. The link only opens your own page, which must be a real address you control.</p>';
      function save(val) { return A.api("POST", "/rest/v1/site_settings?on_conflict=key", { key: "finance_link", value: val }, { Prefer: "resolution=merge-duplicates,return=minimal" }); }
      $("#fl-form").addEventListener("submit", function (e) { e.preventDefault(); var u = safeUrl($("#fl-u").value.trim()); if (!u) return say(false, "Enter a full website address starting with https://"); save({ url: u, label: $("#fl-l").value.trim() || "Open bursary website", note: $("#fl-n").value.trim(), parents: $("#fl-p").checked }).then(function () { say(true, "Link saved."); linkBtn(); }, function (er) { say(false, A.nice(er.message)); }); });
      $("#fl-rm").addEventListener("click", function () { if (!confirm("Remove the finance link?")) return; save({}).then(function () { $("#fl-u").value = ""; say(true, "Link removed."); linkBtn(); }, function (er) { say(false, A.nice(er.message)); }); });
    }, function (e) { b.innerHTML = '<div class="notice"><span>' + esc(A.nice(e.message)) + "</span></div>"; });
  }
  function linkBtn() {
    var old = $("#bu-ext"); if (old) old.remove();
    A.api("GET", "/rest/v1/site_settings?select=value&key=eq.finance_link").then(function (r) { var v = (r && r[0] && r[0].value) || {}, u = safeUrl(v.url || ""); if (!u) return; var a = document.createElement("a"); a.id = "bu-ext"; a.className = "btn btn-soft btn-sm"; a.href = u; a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = (v.label || "Open bursary website") + " \u2197"; var h = $("#bu-sum"); if (h) h.parentNode.insertBefore(a, h); }, function () {});
  }
  A.bursar = open; A.receiptHTML = receiptHTML;
})();
