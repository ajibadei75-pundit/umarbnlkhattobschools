/* Dashboard: Payments. Parent receipts and written payment requests.
   No money moves here. Parents upload proof of a payment they made elsewhere (bank, cash, POS) or send a written request;
   the finance officer or an administrator approves or rejects it. Files live in a private bucket and open with the staff member's own sign-in. */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, $$ = U.$$, esc = U.esc;
  var A = window.UBK_ADMIN, B = (window.UBK_SITE || {}).backend || {};
  if (!A) return;
  var host, filter = "submitted", all = [];
  var ST = { submitted: "Waiting", approved: "Approved", rejected: "Rejected" };
  var MT = { bank_transfer: "Bank transfer", cash: "Cash", pos: "POS", other: "Other" };

  function rpc(n, b) { return A.api("POST", "/rest/v1/rpc/" + n, b || {}); }
  function say(el, ok, m) { if (!el) return; el.className = "result show " + (ok ? "ok" : "bad"); el.textContent = m; }
  function nice(e) { var m = (e && e.message) || ""; if (/invalid:note/.test(m)) return "Please write a short reason so the parent understands."; if (/forbidden/.test(m)) return "You do not have permission for that."; return A.nice(m); }
  function money(v) { return v == null ? "" : "₦" + Number(v).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
  function day(s) { return s ? U.fmt(new Date(s), { day: "numeric", month: "short", year: "numeric" }) : ""; }
  function pill(s) { return '<span class="status-pill st-' + (s === "approved" ? "offered" : s === "rejected" ? "declined" : "under_review") + '">' + esc(ST[s] || s) + "</span>"; }

  function open(h) {
    host = h; host.innerHTML = '<p class="count-line">Loading...</p>';
    rpc("admin_list_finance").then(function (rows) { all = rows; draw(); }, function (e) { host.innerHTML = '<div class="notice"><span>' + esc(nice(e)) + "</span></div>"; });
  }
  function count(s) { return all.filter(function (x) { return s === "all" || x.status === s; }).length; }
  function draw() {
    var tabs = [["submitted", "Waiting"], ["approved", "Approved"], ["rejected", "Rejected"], ["all", "All"]];
    var rows = all.filter(function (x) { return filter === "all" || x.status === filter; });
    var total = all.filter(function (x) { return x.kind === "receipt" && x.status === "approved"; }).reduce(function (t, x) { return t + Number(x.amount || 0); }, 0);
    host.innerHTML = '<h2 class="sec-title" style="font-size:1.2rem">Payments</h2><p class="count-line">Receipts and requests sent by parents. The school collects money outside this website; approving only records that the proof was checked. Approved receipts total ' + esc(money(total)) + '.</p>' +
      '<div class="level-tabs rw-tabs" role="tablist" aria-label="Payment status">' + tabs.map(function (x) { return '<button type="button" role="tab" data-f="' + x[0] + '" aria-selected="' + (x[0] === filter) + '">' + esc(x[1]) + " (" + count(x[0]) + ")</button>"; }).join("") + "</div>" +
      '<div class="toolbar"><span style="flex:1"></span><button type="button" class="btn btn-soft btn-sm" id="fn-csv"' + (all.length ? "" : " disabled") + '>Download list (CSV)</button></div>' +
      (rows.length ? '<div class="fn-list">' + rows.map(card).join("") + "</div>" : '<div class="empty"><h3>Nothing here</h3><p>' + (filter === "submitted" ? "No receipts or requests are waiting." : "No items in this view.") + "</p></div>") + '<p class="result" id="fn-res" role="status"></p>';
    $$(".rw-tabs button", host).forEach(function (b) { b.addEventListener("click", function () { filter = b.getAttribute("data-f"); draw(); }); });
    $("#fn-csv").addEventListener("click", csv);
    $$("[data-act]", host).forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.closest("[data-id]").getAttribute("data-id"), act = b.getAttribute("data-act"), res = $("#fn-res");
        if (act === "view") return view(b.closest("[data-id]").getAttribute("data-file"), b, res);
        var n = null, st = act === "approve" ? "approved" : act === "reopen" ? "submitted" : "rejected";
        if (act === "reject") { n = prompt("Why is this rejected? (the parent will see this)"); if (n == null) return; n = n.trim(); if (!n) return say(res, false, "Please write a short reason."); }
        if (act === "approve") { n = prompt("Optional note for the parent (leave empty for none)"); if (n == null) return; }
        b.disabled = true; rpc("review_finance", { p_id: id, p_status: st, p_note: n || null }).then(function () { open(host); }, function (e) { b.disabled = false; say(res, false, nice(e)); });
      });
    });
  }
  function card(x) {
    var rec = x.kind === "receipt";
    return '<article class="panel" data-id="' + esc(x.id) + '" data-file="' + esc(x.file_path || "") + '"><div class="ad-bar" style="margin:0 0 .4rem"><h3 style="margin:0;font-size:1.05rem">' + (rec ? "Receipt: " + esc(money(x.amount)) : "Request: " + esc(x.subject)) + "</h3>" + pill(x.status) + "</div>" +
      '<p class="post-meta">' + esc(x.student) + (x.class ? " (" + esc(x.class) + ")" : "") + " · " + esc(x.student_code || "") + " · from " + esc(x.parent) + " · sent " + esc(day(x.created_at)) + "</p>" +
      (rec ? "<p>Paid on " + esc(day(x.paid_on)) + " by " + esc(MT[x.method] || x.method) + (x.reference ? ", reference <strong>" + esc(x.reference) + "</strong>" : "") + ".</p>" : "<p style=\"white-space:pre-wrap\">" + esc(x.message) + "</p>") +
      (x.admin_note ? '<p class="count-line">Note to parent: ' + esc(x.admin_note) + "</p>" : "") +
      '<div class="form-actions" style="flex-wrap:wrap">' + (rec ? '<button type="button" class="btn btn-soft btn-sm" data-act="view">View receipt</button>' : "") +
      (x.status === "submitted" ? '<button type="button" class="btn btn-primary btn-sm" data-act="approve">Approve</button><button type="button" class="btn btn-soft btn-sm" data-act="reject">Reject</button>' : '<button type="button" class="btn btn-soft btn-sm" data-act="reopen">Move back to waiting</button>') + "</div></article>";
  }
  function view(path, btn, res) {
    if (!path) return;
    btn.disabled = true;
    A.fresh().then(function (tok) { return fetch(B.url + "/storage/v1/object/receipts/" + path.split("/").map(encodeURIComponent).join("/"), { headers: { apikey: B.key, Authorization: "Bearer " + tok } }); })
      .then(function (r) { if (!r.ok) throw new Error("file"); return r.blob(); })
      .then(function (b) { var u = URL.createObjectURL(b), w = window.open(u, "_blank", "noopener"); if (!w) say(res, false, "Your browser blocked the new tab. Allow pop-ups for this site and try again."); setTimeout(function () { URL.revokeObjectURL(u); }, 120000); },
        function () { say(res, false, "Could not open the file."); }).then(function () { btn.disabled = false; });
  }
  function csv() {
    function q(v) { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
    var head = ["Type", "Status", "Sent", "Pupil", "Student ID", "Class", "Parent", "Email", "Amount", "Paid on", "Method", "Reference", "Subject", "Note"];
    var rows = all.map(function (x) { return [x.kind, x.status, x.created_at && x.created_at.slice(0, 10), x.student, x.student_code, x.class, x.parent, x.email, x.amount, x.paid_on, x.method, x.reference, x.subject, x.admin_note].map(q).join(","); });
    U.download("payments-" + new Date().toISOString().slice(0, 10) + ".csv", "text/csv;charset=utf-8", "﻿" + head.join(",") + "\n" + rows.join("\n"));
  }
  A.payments = open;
})();
