/* Dashboard: Student PINs. Generates a 6-digit PIN per pupil (stored hashed; shown ONCE here, so print the cards). */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, $$ = U.$$, esc = U.esc, A = window.UBK_ADMIN;
  if (!A) return;
  var host, classes = [], cls = "", rows = [], last = [];
  function rpc(n, b) { return A.api("POST", "/rest/v1/rpc/" + n, b || {}); }
  function say(ok, m) { var el = $("#pn-res"); if (el) { el.className = "result show " + (ok ? "ok" : "bad"); el.textContent = m; } }
  function open(h) {
    host = h; host.innerHTML = '<p class="count-line">Loading...</p>';
    A.api("GET", "/rest/v1/classes?select=id,name&order=section.desc,sort.asc,name.asc").then(function (c) { classes = c || []; if (!cls && classes.length) cls = classes[0].id; load(); }, function (e) { host.innerHTML = '<div class="notice"><span>' + esc(A.nice(e.message)) + "</span></div>"; });
  }
  function load() { if (!cls) return draw(); rpc("admin_pin_overview", { p_class: cls }).then(function (r) { rows = r || []; draw(); }, function (e) { rows = []; draw(); say(false, A.nice(e.message)); }); }
  function draw() {
    host.innerHTML = '<h2 class="sec-title" style="font-size:1.2rem">Student PINs</h2><p class="count-line">Pupils sign in at /student/ with their Student ID and a 6-digit PIN. A PIN is shown only once, right after it is made, so print the cards and hand them out. Making a new PIN replaces the old one.</p>' +
      '<div class="toolbar"><select class="select-lg" id="pn-cl" style="width:auto" aria-label="Class">' + classes.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === cls ? " selected" : "") + ">" + esc(c.name) + "</option>"; }).join("") + '</select><span style="flex:1"></span>' +
      '<button type="button" class="btn btn-primary btn-sm" id="pn-all"' + (rows.length ? "" : " disabled") + '>Make PINs for the whole class</button></div>' +
      (rows.length ? '<div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>Pupil</th><th>Student ID</th><th>PIN</th><th></th></tr></thead><tbody>' + rows.map(function (r) {
        return "<tr><td><strong>" + esc(r.name) + "</strong></td><td>" + esc(r.student_code || "") + "</td><td>" + (r.has_pin ? "Set" : "Not set") + '</td><td><button type="button" class="btn btn-soft btn-sm" data-one="' + esc(r.student_id) + '">New PIN</button></td></tr>';
      }).join("") + "</tbody></table></div>" : '<div class="empty"><p>No pupils in this class yet.</p></div>') + '<p class="result" id="pn-res" role="status"></p><div id="pn-out"></div>';
    $("#pn-cl").addEventListener("change", function () { cls = this.value; load(); });
    $("#pn-all").addEventListener("click", function () { if (confirm("Make new PINs for every pupil in this class? Old PINs stop working.")) make({ p_class: cls }); });
    $$("[data-one]", host).forEach(function (b) { b.addEventListener("click", function () { make({ p_student: b.getAttribute("data-one") }); }); });
  }
  function make(args) {
    rpc("admin_set_student_pins", args).then(function (list) {
      last = list || []; if (!last.length) return say(false, "No pupils found.");
      load(); setTimeout(function () { cards(); }, 400);
    }, function (e) { say(false, A.nice(e.message)); });
  }
  function cards() {
    var out = $("#pn-out"); if (!out) return;
    out.innerHTML = '<div class="form-card" style="margin-top:1.2rem"><h3 style="margin:0 0 .4rem;font-size:1.05rem">New PINs (' + last.length + ')</h3><p class="count-line">Shown only now. Print or download before leaving this page.</p><div class="form-actions" style="margin-bottom:.8rem"><button class="btn btn-primary btn-sm" id="pn-print" type="button">Print cards</button><button class="btn btn-soft btn-sm" id="pn-csv" type="button">Download list (CSV)</button></div><div class="pn-grid">' + last.map(card).join("") + "</div></div>";
    $("#pn-print").addEventListener("click", function () { U.printHTML('<div class="pn-grid pn-print">' + last.map(card).join("") + "</div>"); });
    $("#pn-csv").addEventListener("click", function () {
      var q = function (v) { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
      U.download("student-pins-" + new Date().toISOString().slice(0, 10) + ".csv", "text/csv;charset=utf-8", "﻿Name,Class,Student ID,PIN\n" + last.map(function (r) { return [r.name, r.class, r.student_code, r.pin].map(q).join(","); }).join("\n"));
    });
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function card(r) { return '<div class="pn-card"><b>' + esc(r.name) + "</b><span>" + esc(r.class || "") + '</span><div class="pn-l">Student ID</div><div class="pn-v">' + esc(r.student_code || "") + '</div><div class="pn-l">PIN</div><div class="pn-v">' + esc(r.pin) + '</div><small>Sign in at the school website, Student portal.</small></div>'; }
  A.pins = open;
})();
