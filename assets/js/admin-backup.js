/* Backup and restore (admin) and import from the previous website (bursar and admin).
   Backup = a JSON file the person downloads and keeps. Restore only ADDS what is missing; it never overwrites or deletes.
   Fees and payments are re-imported through the same checked importer used for the previous website, so they are matched
   to pupils, never duplicated, and keep their old receipt numbers. */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, $$ = U.$$, esc = U.esc, A = window.UBK_ADMIN;
  if (!A) return;
  var SCOPES = [
    ["finance", "Fees and payments", "Class fees and every receipt. Bursar and administrators."],
    ["school", "Pupils, classes and results", "Classes, subjects, pupils, scores, attendance, report settings and grading, school resources list."],
    ["site", "Website content", "News, events, FAQs, leadership, gallery and Learning Centre lists, site settings."],
    ["all", "Everything above", "All of the above in one file."]
  ];
  var KEY = "ubk_last_backup";
  function rpc(n, b) { return A.api("POST", "/rest/v1/rpc/" + n, b || {}); }
  function isAdmin() { return A.can(["super_admin", "school_admin"]); }
  function say(el, ok, m) { if (el) { el.className = "result show " + (ok ? "ok" : "bad"); el.textContent = m; } }
  function stamp() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function last() { try { return localStorage.getItem(KEY) || ""; } catch (e) { return ""; } }
  function daysAgo(s) { if (!s) return null; var t = Date.parse(s); return isNaN(t) ? null : Math.floor((Date.now() - t) / 864e5); }
  function readFile(file, cb) {
    var r = new FileReader(); r.onload = function () { try { cb(null, JSON.parse(String(r.result).replace(/^﻿/, ""))); } catch (e) { cb("That file is not valid JSON."); } }; r.onerror = function () { cb("The file could not be read."); }; r.readAsText(file);
  }

  /* ---------- flexible reading of the previous website's JSON ---------- */
  function pick(o, keys) { for (var i = 0; i < keys.length; i++) { var k = keys[i]; if (o[k] != null && o[k] !== "") return o[k]; var low = Object.keys(o).filter(function (x) { return x.toLowerCase().replace(/[\s_-]/g, "") === k.replace(/[\s_-]/g, ""); })[0]; if (low && o[low] != null && o[low] !== "") return o[low]; } return ""; }
  function list(root, names) { if (Array.isArray(root)) return root; for (var i = 0; i < names.length; i++) { var k = Object.keys(root || {}).filter(function (x) { return x.toLowerCase() === names[i]; })[0]; if (k && Array.isArray(root[k])) return root[k]; } return []; }
  function money(v) { var n = parseFloat(String(v).replace(/[^\d.\-]/g, "")); return isNaN(n) ? 0 : n; }
  function termOf(v, d) { var s = String(v || "").toLowerCase(); if (/third|3/.test(s)) return "Third"; if (/second|2/.test(s)) return "Second"; if (/first|1/.test(s)) return "First"; return d; }
  function methodOf(v) { var s = String(v || "").toLowerCase(); return /cash/.test(s) ? "cash" : /transfer|bank|online|deposit/.test(s) ? "bank_transfer" : /pos|card/.test(s) ? "pos" : /cheque|check/.test(s) ? "cheque" : "other"; }
  function dateOf(v) {
    if (!v) return ""; var s = String(v).trim(), m;
    if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s))) return m[1] + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[3]).slice(-2);
    if ((m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/.exec(s))) return m[3] + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[1]).slice(-2);
    var t = Date.parse(s); return isNaN(t) ? "" : new Date(t).toISOString().slice(0, 10);
  }
  function mapPayment(o, d) {
    var first = pick(o, ["first_name", "firstname"]), lastn = pick(o, ["last_name", "lastname", "surname"]);
    var nm = pick(o, ["student_name", "pupil_name", "pupil", "full_name", "fullname", "name", "student"]) || (first || lastn ? (lastn + " " + first).trim() : "");
    var st = String(pick(o, ["status", "state"])).toLowerCase();
    return { adm: String(pick(o, ["admission_no", "admission_number", "adm_no", "reg_no", "regno", "student_code", "student_id", "pupil_id", "id_no"])), name: String(nm), "class": String(pick(o, ["class", "class_name", "classname", "grade"])),
      session: String(pick(o, ["session", "academic_session", "year"]) || d.session), term: termOf(pick(o, ["term", "semester"]), d.term), item: String(pick(o, ["item", "payment_for", "description", "fee", "fee_type", "purpose", "category"]) || "School fees").slice(0, 60),
      amount: money(pick(o, ["amount", "amount_paid", "paid", "total", "credit"])), method: methodOf(pick(o, ["method", "payment_method", "mode", "channel"])), reference: String(pick(o, ["reference", "ref", "teller", "transaction_id", "txn"])).slice(0, 80),
      paid_on: dateOf(pick(o, ["paid_on", "date_paid", "payment_date", "date", "paid_at", "created_at"])), receipt: String(pick(o, ["receipt", "receipt_no", "receipt_number", "receiptno"])), voided: /void|cancel|revers/.test(st) || o.voided === true };
  }
  var WHY = { amount: "amount missing or not a number", date: "date missing, invalid or in the future", session_or_term: "session or term missing", pupil_not_found: "pupil not found (check admission number or name)", several_pupils: "more than one pupil matches" };

  /* ---------- import from the previous website ---------- */
  function importView(host, opt) {
    opt = opt || {};
    var cls = [], parsed = null;
    host.innerHTML = '<article class="panel"><h3>Import from the previous website</h3><p class="count-line">Choose the JSON file from the old website. You see a preview first, and pupils are matched by admission number, then name. Existing receipts are skipped, so importing twice is safe.</p>' +
      '<div class="toolbar" style="flex-wrap:wrap"><input type="file" id="im-f" accept=".json,application/json" class="input" aria-label="JSON file">' +
      '<label class="count-line" style="margin:0">Session if missing <input class="input" id="im-ses" value="' + esc(opt.session || "") + '" style="width:8.5rem;display:inline-block" maxlength="20"></label>' +
      '<select class="select-lg" id="im-term" style="width:auto" aria-label="Term if missing">' + ["First", "Second", "Third"].map(function (t) { return '<option value="' + t + '"' + (t === (opt.term || "First") ? " selected" : "") + ">" + t + " term</option>"; }).join("") + "</select></div>" +
      '<div id="im-out"></div></article>';
    var out = $("#im-out", host);
    A.api("GET", "/rest/v1/classes?select=id,name").then(function (r) { cls = r || []; });
    $("#im-f", host).addEventListener("change", function () {
      var f = this.files[0]; if (!f) return; if (f.size > 25 * 1048576) return (out.innerHTML = '<p class="result show bad">That file is over 25 MB. Split it and import in parts.</p>');
      readFile(f, function (err, root) {
        if (err) { out.innerHTML = '<p class="result show bad">' + esc(err) + "</p>"; return; }
        var d = { session: $("#im-ses", host).value.trim(), term: $("#im-term", host).value };
        var pays = list(root, ["payments", "receipts", "transactions", "fees_paid"]).map(function (o) { return mapPayment(o || {}, d); });
        var fees = list(root, ["class_fees", "fees", "fee_structure", "feestructure"]).filter(function (o) { return !Array.isArray(root) && o && (pick(o, ["class", "class_name", "classname"]) || o.class_id); });
        parsed = { pays: pays, fees: fees, d: d };
        if (!pays.length && !fees.length) { out.innerHTML = '<p class="result show bad">No payments or fees were found. The file should be a list of payments, or an object with a "payments" list (and optionally a "fees" list).</p>'; return; }
        check();
      });
    });
    function check() {
      out.innerHTML = '<p class="count-line">Checking ' + parsed.pays.length + " payment(s) and " + parsed.fees.length + " fee line(s)...</p>";
      var chunks = [], i; for (i = 0; i < parsed.pays.length; i += 400) chunks.push(parsed.pays.slice(i, i + 400));
      var tot = { ok: 0, duplicates: 0, rejected: [] };
      chunks.reduce(function (p, ch, ci) { return p.then(function () { return rpc("import_payments", { p_rows: ch, p_dry: true }).then(function (r) { tot.ok += r.ok; tot.duplicates += r.duplicates; (r.rejected || []).forEach(function (x) { x.n += ci * 400; tot.rejected.push(x); }); }); }); }, Promise.resolve()).then(function () { show(tot); }, function (e) { out.innerHTML = '<p class="result show bad">' + esc(A.nice(e.message)) + "</p>"; });
    }
    function show(tot) {
      var sum = parsed.pays.reduce(function (a, p) { return a + p.amount; }, 0);
      out.innerHTML = '<div class="ad-stats"><div class="stat"><b>' + tot.ok + "</b><span>Ready to import</span></div><div class=\"stat\"><b>" + tot.duplicates + "</b><span>Already here (skipped)</span></div><div class=\"stat\"><b>" + tot.rejected.length + "</b><span>Need attention</span></div><div class=\"stat\"><b>" + parsed.fees.length + "</b><span>Fee lines</span></div></div>" +
        (tot.rejected.length ? '<details open style="margin:.8rem 0"><summary><b>Rows that cannot be imported</b></summary><div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>Row</th><th>Pupil</th><th>Amount</th><th>Problem</th></tr></thead><tbody>' + tot.rejected.slice(0, 100).map(function (x) { var p = parsed.pays[x.n - 1] || {}; return "<tr><td>" + x.n + "</td><td>" + esc(p.name || p.adm || "") + "</td><td>" + esc(p.amount) + "</td><td>" + esc(WHY[x.why] || x.why) + "</td></tr>"; }).join("") + "</tbody></table></div>" + (tot.rejected.length > 100 ? '<p class="count-line">Showing the first 100.</p>' : "") + "</details>" : "") +
        '<div class="form-actions" style="margin-top:1rem"><button type="button" class="btn btn-primary" id="im-go"' + (tot.ok || parsed.fees.length ? "" : " disabled") + ">Import " + tot.ok + " payment(s)" + (parsed.fees.length ? " and " + parsed.fees.length + " fee line(s)" : "") + '</button><button type="button" class="btn btn-soft" id="im-bad"' + (tot.rejected.length ? "" : " hidden") + '>Download rows with problems</button></div><p class="result" id="im-res" role="status"></p>';
      $("#im-bad", host).addEventListener("click", function () { U.download("rows-to-fix.json", "application/json", JSON.stringify(tot.rejected.map(function (x) { return { problem: WHY[x.why] || x.why, row: parsed.pays[x.n - 1] }; }), null, 2)); });
      $("#im-go", host).addEventListener("click", function () {
        var b = this, res = $("#im-res", host); b.disabled = true; say(res, true, "Importing...");
        var chunks = [], i; for (i = 0; i < parsed.pays.length; i += 400) chunks.push(parsed.pays.slice(i, i + 400));
        var done = 0, skipped = 0;
        chunks.reduce(function (p, ch) { return p.then(function () { return rpc("import_payments", { p_rows: ch, p_dry: false }).then(function (r) { done += r.ok; skipped += r.duplicates; }); }); }, Promise.resolve()).then(function () {
          if (!parsed.fees.length) return 0;
          var rows = []; parsed.fees.forEach(function (o) { var c = cls.filter(function (x) { return x.name.toLowerCase() === String(pick(o, ["class", "class_name", "classname"])).toLowerCase(); })[0]; var a = money(pick(o, ["amount", "fee", "price"])); if (c && a > 0) rows.push({ class_id: c.id, session: String(pick(o, ["session"]) || parsed.d.session), term: termOf(pick(o, ["term"]), parsed.d.term), item: String(pick(o, ["item", "name", "description", "fee_type"]) || "School fees").slice(0, 60), amount: a }); });
          return rows.length ? A.api("POST", "/rest/v1/class_fees?on_conflict=class_id,session,term,item", rows, { Prefer: "resolution=ignore-duplicates,return=minimal" }).then(function () { return rows.length; }) : 0;
        }).then(function (nf) { say(res, true, "Done. " + done + " payment(s) imported, " + skipped + " skipped as already here" + (nf ? ", " + nf + " fee line(s) added" : "") + ". Open Receipts to see them."); }, function (e) { b.disabled = false; say(res, false, A.nice(e.message)); });
      });
    }
  }

  /* ---------- backup and restore ---------- */
  function backupView(host, scopes) {
    var rows = SCOPES.filter(function (s) { return scopes.indexOf(s[0]) >= 0; });
    var d = daysAgo(last());
    host.innerHTML = '<article class="panel"><h3>Backup</h3><p class="count-line">Download a backup file weekly and keep a copy off the website. ' + (d == null ? "<b>No backup has been downloaded from this browser yet.</b>" : d > 7 ? "<b>Your last backup was " + d + " days ago. Please download a new one.</b>" : "Your last backup from this browser was " + (d ? d + " day(s) ago" : "today") + ".") + "</p>" +
      '<div class="cards-3" style="display:grid;gap:.8rem;grid-template-columns:repeat(auto-fit,minmax(185px,1fr))">' + rows.map(function (s) { return '<div class="form-card" style="margin:0"><b>' + esc(s[1]) + '</b><p class="count-line" style="margin:.3rem 0 .8rem">' + esc(s[2]) + '</p><button type="button" class="btn btn-primary btn-sm" data-bk="' + s[0] + '">Download backup</button></div>'; }).join("") + '</div><p class="result" id="bk-res" role="status"></p>' +
      '<p class="count-line">Logins, parent contacts and signatures are never included.</p></article>' +
      (isAdmin() ? '<article class="panel" style="margin-top:1rem"><h3>Restore from a backup</h3><p class="count-line">Restore only <b>adds what is missing</b>. It never changes or deletes anything.</p><input type="file" id="rs-f" accept=".json,application/json" class="input" aria-label="Backup file"><div id="rs-out"></div></article>' : "");
    $$("[data-bk]", host).forEach(function (b) {
      b.addEventListener("click", function () {
        var sc = b.getAttribute("data-bk"), res = $("#bk-res", host); b.disabled = true; say(res, true, "Preparing the backup...");
        rpc("backup_export", { p_scope: sc }).then(function (j) {
          U.download("ubk-backup-" + sc + "-" + stamp() + ".json", "application/json", JSON.stringify(j, null, 1));
          try { localStorage.setItem(KEY, new Date().toISOString()); } catch (e) {}
          var n = Object.keys(j).filter(function (k) { return Array.isArray(j[k]); }).reduce(function (a, k) { return a + j[k].length; }, 0);
          say(res, true, "Downloaded. The file holds " + n + " record(s).");
        }, function (e) { say(res, false, A.nice(e.message)); }).then(function () { b.disabled = false; });
      });
    });
    var rf = $("#rs-f", host); if (!rf) return;
    rf.addEventListener("change", function () {
      var f = this.files[0], out = $("#rs-out", host); if (!f) return;
      readFile(f, function (err, j) {
        if (err) return (out.innerHTML = '<p class="result show bad">' + esc(err) + "</p>");
        if (!j || j.app !== "ubk-school") return (out.innerHTML = '<p class="result show bad">This is not a backup made by this website.</p>');
        var names = Object.keys(j).filter(function (k) { return Array.isArray(j[k]) && j[k].length; });
        out.innerHTML = '<p class="count-line">Backup of ' + esc(j.scope || "") + " taken " + esc(String(j.taken_at || "").slice(0, 10)) + ": " + names.map(function (k) { return esc(k) + " (" + j[k].length + ")"; }).join(", ") + '.</p><div class="form-actions"><button type="button" class="btn btn-primary" id="rs-go">Restore missing records</button></div><p class="result" id="rs-res" role="status"></p>';
        $("#rs-go", host).addEventListener("click", function () {
          var b = this, res = $("#rs-res", host); b.disabled = true; say(res, true, "Restoring...");
          var data = {}; Object.keys(j).forEach(function (k) { if (k !== "payments") data[k] = j[k]; });
          rpc("backup_restore", { p_data: data }).then(function (r) {
            var parts = Object.keys(r).map(function (k) { return k + ": " + (r[k].error ? "problem (" + r[k].error + ")" : r[k].added + " added of " + r[k].in_file); });
            var pays = Array.isArray(j.payments) ? j.payments.map(function (p) { return { adm: p.adm, name: p.name, "class": p["class"], session: p.session, term: p.term, item: p.item, amount: p.amount, method: p.method, reference: p.reference, paid_on: p.paid_on, receipt: p.receipt, voided: p.voided }; }) : [];
            var chunks = [], i; for (i = 0; i < pays.length; i += 400) chunks.push(pays.slice(i, i + 400));
            var added = 0;
            return chunks.reduce(function (p, ch) { return p.then(function () { return rpc("import_payments", { p_rows: ch, p_dry: false }).then(function (x) { added += x.ok; }); }); }, Promise.resolve()).then(function () {
              if (pays.length) parts.push("payments: " + added + " added of " + pays.length);
              say(res, true, parts.length ? "Done. " + parts.join("; ") + "." : "Nothing to restore in this file.");
            });
          }, function (e) { say(res, false, A.nice(e.message)); }).then(function () { b.disabled = false; });
        });
      });
    });
  }

  A.backupTab = function (host) {
    var sc = isAdmin() ? ["all", "finance", "school", "site"] : ["finance"];
    host.innerHTML = '<h2 class="sec-title" style="font-size:1.2rem">Backup and restore</h2><div id="bk-a"></div><div id="bk-b" style="margin-top:1rem"></div>';
    backupView($("#bk-a", host), sc);
    importView($("#bk-b", host), {});
  };
  A.importView = importView;
})();
