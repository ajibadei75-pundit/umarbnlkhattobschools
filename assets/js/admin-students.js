/* Dashboard: Student register. One searchable database of every pupil with admission number, class and status.
   Add one pupil, import a list (paste or CSV), move pupils between classes, export or print. Used by Pupils and parents. */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, $$ = U.$$, esc = U.esc, A = window.UBK_ADMIN;
  if (!A) return;
  var ROOT = (document.currentScript && document.currentScript.src || "").replace(/assets\/js\/[^\/]*$/, "") || "../";
  var PAGE = 50, st = { q: "", cls: "", status: "active", sex: "", sort: "class", dir: 1, page: 0, pick: {} }, ctx, host;

  function say(el, ok, m) { if (el) { el.className = "result show " + (ok ? "ok" : "bad"); el.textContent = m; } }
  function full(p) { return p.first_name + " " + p.last_name; }
  function sexOf(p) { return p.sex === "male" ? "M" : p.sex === "female" ? "F" : ""; }
  function clsName(id) { var c = ctx.classes.filter(function (x) { return x.id === id; })[0]; return c ? c.name : ""; }
  function clsRank(id) { for (var i = 0; i < ctx.classes.length; i++) if (ctx.classes[i].id === id) return i; return 999; }
  function opts(sel, blank) { return (blank ? '<option value="">' + blank + "</option>" : "") + ctx.classes.map(function (c) { return '<option value="' + esc(c.id) + '"' + (sel === c.id ? " selected" : "") + ">" + esc(c.name) + "</option>"; }).join(""); }
  function rows() {
    var q = st.q.toLowerCase(), r = ctx.pupils.filter(function (p) {
      return (!st.cls || (st.cls === "none" ? !p.class_id : p.class_id === st.cls)) && (st.status === "all" || (st.status === "active") === !!p.active) && (!st.sex || sexOf(p) === st.sex) &&
        (!q || (full(p) + " " + (p.admission_no || "") + " " + (p.student_code || "")).toLowerCase().indexOf(q) > -1);
    });
    var key = { class: function (p) { return clsRank(p.class_id) * 1e6 + 0; }, adm: function (p) { return (p.admission_no || "~").toLowerCase(); }, name: function (p) { return (p.last_name + " " + p.first_name).toLowerCase(); }, code: function (p) { return p.student_code || ""; } }[st.sort];
    return r.sort(function (a, b) { var x = key(a), y = key(b); if (x === y) { x = (a.last_name + a.first_name).toLowerCase(); y = (b.last_name + b.first_name).toLowerCase(); } return (x < y ? -1 : x > y ? 1 : 0) * st.dir; });
  }
  function chips() {
    var n = {}; ctx.pupils.forEach(function (p) { if (p.active) n[p.class_id || ""] = (n[p.class_id || ""] || 0) + 1; });
    var all = ctx.pupils.filter(function (p) { return p.active; }).length;
    return '<button type="button" class="reg-chip' + (st.cls ? "" : " on") + '" data-c="">All <b>' + all + "</b></button>" + ctx.classes.map(function (c) { return '<button type="button" class="reg-chip' + (st.cls === c.id ? " on" : "") + '" data-c="' + esc(c.id) + '">' + esc(c.name) + " <b>" + (n[c.id] || 0) + "</b></button>"; }).join("") + (n[""] ? '<button type="button" class="reg-chip' + (st.cls === "none" ? " on" : "") + '" data-c="none">No class <b>' + n[""] + "</b></button>" : "");
  }
  function table() {
    var r = rows(), pages = Math.max(1, Math.ceil(r.length / PAGE)); if (st.page >= pages) st.page = pages - 1;
    var view = r.slice(st.page * PAGE, st.page * PAGE + PAGE), th = function (k, l) { return '<th scope="col"><button type="button" class="reg-sort" data-s="' + k + '" aria-label="Sort by ' + l + '">' + l + (st.sort === k ? (st.dir > 0 ? " ▲" : " ▼") : "") + "</button></th>"; };
    var allOn = view.length && view.every(function (p) { return st.pick[p.id]; });
    return '<p class="count-line" id="rg-n">' + r.length + " pupil" + (r.length === 1 ? "" : "s") + " shown</p>" + (view.length ?
      '<div class="ad-table-wrap"><table class="ad-table reg-table"><thead><tr><th><input type="checkbox" id="rg-all" aria-label="Select all on this page"' + (allOn ? " checked" : "") + "></th><th>No.</th>" + th("adm", "Admission no.") + th("name", "Name") + "<th>Sex</th>" + th("class", "Class") + th("code", "Student ID") + "<th>Status</th></tr></thead><tbody>" +
      view.map(function (p, i) {
        return '<tr data-p="' + esc(p.id) + '"><td><input type="checkbox" data-pk aria-label="Select ' + esc(full(p)) + '"' + (st.pick[p.id] ? " checked" : "") + "></td><td>" + (st.page * PAGE + i + 1) + "</td><td>" + (p.admission_no ? "<strong>" + esc(p.admission_no) + "</strong>" : '<small class="reg-miss">Not set</small>') + '</td><td><button type="button" class="reg-name" data-e="' + esc(p.id) + '">' + esc(full(p)) + "</button></td><td>" + sexOf(p) + "</td><td>" + esc(clsName(p.class_id) || "Not assigned") + "</td><td>" + esc(p.student_code || "") + "</td><td>" + (p.active ? "Active" : '<span class="reg-off">Inactive</span>') + "</td></tr>";
      }).join("") + "</tbody></table></div>" + (pages > 1 ? '<div class="reg-pager"><button type="button" class="btn btn-soft btn-sm" data-pg="-1"' + (st.page ? "" : " disabled") + '>Previous</button><span>Page ' + (st.page + 1) + " of " + pages + '</span><button type="button" class="btn btn-soft btn-sm" data-pg="1"' + (st.page < pages - 1 ? "" : " disabled") + ">Next</button></div>" : "")
      : '<div class="empty"><h3>No pupils found</h3><p>' + (ctx.pupils.length ? "Change the search or filters." : "Use Add a pupil or Import a list to start the register.") + "</p></div>");
  }
  function paint() {
    $("#rg-chips").innerHTML = chips(); $("#rg-tbl").innerHTML = table();
    var nPick = Object.keys(st.pick).length; $("#rg-bulk").hidden = !nPick; $("#rg-bn").textContent = nPick + " selected";
    $$("#rg-chips [data-c]").forEach(function (b) { b.addEventListener("click", function () { st.cls = b.getAttribute("data-c"); st.page = 0; paint(); }); });
    $$("#rg-tbl [data-s]").forEach(function (b) { b.addEventListener("click", function () { var k = b.getAttribute("data-s"); st.dir = st.sort === k ? -st.dir : 1; st.sort = k; paint(); }); });
    $$("#rg-tbl [data-pg]").forEach(function (b) { b.addEventListener("click", function () { st.page += +b.getAttribute("data-pg"); paint(); window.scrollTo(0, 0); }); });
    $$("#rg-tbl [data-e]").forEach(function (b) { b.addEventListener("click", function () { ctx.edit(b.getAttribute("data-e")); }); });
    $$("#rg-tbl [data-pk]").forEach(function (b) { b.addEventListener("change", function () { var id = b.closest("tr").getAttribute("data-p"); if (b.checked) st.pick[id] = 1; else delete st.pick[id]; paint(); }); });
    var all = $("#rg-all"); if (all) all.addEventListener("change", function () { $$("#rg-tbl tbody tr").forEach(function (tr) { var id = tr.getAttribute("data-p"); if (all.checked) st.pick[id] = 1; else delete st.pick[id]; }); paint(); });
  }
  /* ---- export and print ---- */
  function csvCell(v) { v = String(v == null ? "" : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function exportCsv() {
    var lines = [["Admission no", "First name", "Last name", "Class", "Sex", "Student ID", "Status"].join(",")].concat(rows().map(function (p) { return [p.admission_no, p.first_name, p.last_name, clsName(p.class_id), sexOf(p), p.student_code, p.active ? "Active" : "Inactive"].map(csvCell).join(","); }));
    U.download("student-register.csv", "text/csv;charset=utf-8", "﻿" + lines.join("\r\n"));
  }
  function printIt() {
    var S = U.site(), r = rows(), cn = st.cls && st.cls !== "none" ? clsName(st.cls) : "All classes";
    U.printHTML('<div class="ai-print"><div class="ai-head"><img src="' + ROOT + 'assets/img/logo.jpg" alt="" width="64" height="64"><div><h2>Umar BN L Khattob Nursery &amp; Primary School</h2><p>Qur\'an is our honour' + (S.address ? "<br>" + esc(S.address) : "") + '</p></div></div><h3>Student register: ' + esc(cn) + " (" + r.length + ')</h3><table class="reg-print"><thead><tr><th>No.</th><th>Admission no.</th><th>Name</th><th>Sex</th><th>Class</th><th>Student ID</th></tr></thead><tbody>' +
      r.map(function (p, i) { return "<tr><td>" + (i + 1) + "</td><td>" + esc(p.admission_no || "") + "</td><td>" + esc(full(p)) + "</td><td>" + sexOf(p) + "</td><td>" + esc(clsName(p.class_id)) + "</td><td>" + esc(p.student_code || "") + "</td></tr>"; }).join("") + "</tbody></table></div>");
  }

  /* ---- dialogs ---- */
  function dlg(title, html) { $("#ad-dlg-t").textContent = title; $("#ad-dlg-b").innerHTML = html; U.openDialog($("#ad-dlg")); }
  function importRpc(list, dry) { return A.api("POST", "/rest/v1/rpc/admin_import_students", { p_rows: list, p_dry: !!dry }); }
  function niceErr(e) { var m = e.message || ""; if (/forbidden/.test(m)) return "Only administrators can add pupils."; if (/invalid:rows/.test(m)) return "Send at most 500 pupils at a time."; return A.nice(m); }
  function addOne() {
    dlg("Add a pupil", '<form id="ad1" novalidate><div class="form-grid"><div class="fld"><label for="a1-fn">First name</label><input class="input" id="a1-fn" maxlength="60"></div><div class="fld"><label for="a1-ln">Last name</label><input class="input" id="a1-ln" maxlength="60"></div>' +
      '<div class="fld"><label for="a1-cl">Class</label><select class="select-lg" id="a1-cl">' + opts(st.cls && st.cls !== "none" ? st.cls : "", "Choose a class...") + '</select></div><div class="fld"><label for="a1-sx">Sex</label><select class="select-lg" id="a1-sx"><option value="">Not set</option><option value="M">Male</option><option value="F">Female</option></select></div>' +
      '<div class="fld full"><label for="a1-no">Admission number</label><input class="input" id="a1-no" maxlength="40" placeholder="Leave empty to number automatically (for example UBK/26/001)"></div></div><div class="form-actions" style="margin-top:1rem"><button class="btn btn-primary" type="submit">Add pupil</button></div><div class="result" id="a1-res" role="status"></div></form>');
    $("#ad1").addEventListener("submit", function (e) {
      e.preventDefault(); var r = $("#a1-res"), c = clsName($("#a1-cl").value); if (!c) return say(r, false, "Choose the class. Add classes under Results and reports.");
      importRpc([{ first_name: $("#a1-fn").value, last_name: $("#a1-ln").value, class_name: c, sex: $("#a1-sx").value, admission_no: $("#a1-no").value }]).then(function (j) {
        if (j.rejected.length) return say(r, false, j.rejected[0].reason + ".");
        $("#ad-dlg").close(); ctx.reload();
      }, function (er) { say(r, false, niceErr(er)); });
    });
  }
  var HEAD = { "admission no": "admission_no", "admission number": "admission_no", "admission": "admission_no", "reg no": "admission_no", "first name": "first_name", "firstname": "first_name", "last name": "last_name", "surname": "last_name", "lastname": "last_name", "class": "class_name", "sex": "sex", "gender": "sex" };
  function parseList(txt) {
    var lines = txt.replace(/^﻿/, "").split(/\r?\n/).filter(function (l) { return l.trim(); }), out = [], cols = ["admission_no", "first_name", "last_name", "class_name", "sex"];
    function split(l) { var d = l.indexOf("\t") > -1 ? "\t" : l.indexOf(";") > -1 && l.indexOf(",") < 0 ? ";" : ","; var a = [], cur = "", q = false; for (var i = 0; i < l.length; i++) { var ch = l[i]; if (ch === '"') { if (q && l[i + 1] === '"') { cur += '"'; i++; } else q = !q; } else if (ch === d && !q) { a.push(cur); cur = ""; } else cur += ch; } a.push(cur); return a.map(function (x) { return x.trim(); }); }
    if (lines.length) { var h = split(lines[0]).map(function (x) { return HEAD[x.toLowerCase()] || ""; }); if (h.filter(Boolean).length >= 3) { cols = h; lines.shift(); } }
    lines.forEach(function (l) { var c = split(l), o = {}; cols.forEach(function (k, i) { if (k) o[k] = c[i] || ""; }); out.push(o); });
    return out;
  }
  function importList() {
    dlg("Import a list of pupils", '<p class="count-line">Paste one pupil per line, or choose a CSV file. Columns in this order: <b>Admission no, First name, Last name, Class, Sex (M or F)</b>. The class name must match an existing class exactly. Leave the admission number empty to number automatically. Up to 500 per import.</p>' +
      '<div class="form-actions"><button type="button" class="btn btn-soft btn-sm" id="im-tpl">Download template</button><button type="button" class="btn btn-soft btn-sm" id="im-pick">Choose CSV file</button></div><input type="file" id="im-file" accept=".csv,.txt,text/csv,text/plain" hidden>' +
      '<div class="fld" style="margin-top:.8rem"><label for="im-t" class="sr-only">List</label><textarea class="input" id="im-t" rows="9" spellcheck="false" placeholder="UBK/26/001, Aisha, Bello, ' + esc((ctx.classes[0] || {}).name || "Primary 1") + ', F"></textarea></div>' +
      '<div class="form-actions" style="margin-top:1rem"><button type="button" class="btn btn-soft" id="im-chk">Check the list</button><button type="button" class="btn btn-primary" id="im-go" disabled>Import</button></div><div class="result" id="im-res" role="status" tabindex="-1"></div><div id="im-bad"></div>');
    var ta = $("#im-t"), go = $("#im-go"), res = $("#im-res"), ok = null;
    $("#im-tpl").addEventListener("click", function () { U.download("student-import-template.csv", "text/csv;charset=utf-8", "Admission no,First name,Last name,Class,Sex\r\n,Aisha,Bello," + ((ctx.classes[0] || {}).name || "Primary 1") + ",F\r\n"); });
    $("#im-pick").addEventListener("click", function () { $("#im-file").click(); });
    $("#im-file").addEventListener("change", function () { var f = this.files[0]; if (!f) return; if (f.size > 400000) return say(res, false, "That file is too large."); var fr = new FileReader(); fr.onload = function () { ta.value = String(fr.result); ok = null; go.disabled = true; }; fr.readAsText(f); });
    ta.addEventListener("input", function () { ok = null; go.disabled = true; });
    $("#im-chk").addEventListener("click", function () {
      var list = parseList(ta.value); if (!list.length) return say(res, false, "Paste the list first.");
      if (list.length > 500) return say(res, false, "That is " + list.length + " lines. Import at most 500 at a time.");
      say(res, true, "Checking..."); importRpc(list, true).then(function (j) {
        ok = list; $("#im-bad").innerHTML = j.rejected.length ? '<ul class="im-bad">' + j.rejected.slice(0, 40).map(function (x) { return "<li>Line " + x.row + ": " + esc(x.reason) + "</li>"; }).join("") + (j.rejected.length > 40 ? "<li>and " + (j.rejected.length - 40) + " more...</li>" : "") + "</ul>" : "";
        say(res, !j.rejected.length, j.added + " ready to import" + (j.rejected.length ? ", " + j.rejected.length + " with problems. Problem lines are skipped; fix them and check again, or import the rest." : ". No problems found.")); go.disabled = !j.added;
      }, function (er) { say(res, false, niceErr(er)); });
    });
    go.addEventListener("click", function () {
      if (!ok) return; go.disabled = true; say(res, true, "Importing...");
      importRpc(ok, false).then(function (j) { say(res, true, j.added + (j.added === 1 ? " pupil" : " pupils") + " added. " + (j.rejected.length ? j.rejected.length + " skipped." : "")); ctx.reload(); }, function (er) { say(res, false, niceErr(er)); go.disabled = false; });
    });
  }
  function bulk(kind) {
    var ids = Object.keys(st.pick); if (!ids.length) return;
    var patch, msg;
    if (kind === "move") { var c = ctx.classes.filter(function (x) { return x.id === $("#rg-mv").value; })[0]; if (!c) return say($("#rg-res"), false, "Choose a class to move to."); patch = { class_id: c.id, level: c.level }; msg = "Move " + ids.length + " pupils to " + c.name + "?"; }
    else { patch = { active: kind === "on" }; msg = (kind === "on" ? "Make " : "Make inactive: ") + ids.length + " pupils" + (kind === "on" ? " active?" : "? They are hidden from parents and class lists."); }
    if (!confirm(msg)) return;
    A.api("PATCH", "/rest/v1/students?id=in.(" + ids.map(encodeURIComponent).join(",") + ")", patch, { Prefer: "return=minimal" }).then(function () { st.pick = {}; ctx.reload(); }, function (er) { say($("#rg-res"), false, niceErr(er)); });
  }

  A.register = function (h, c) {
    host = h; ctx = c; ctx.classes = c.classes; var tot = c.pupils.length;
    host.innerHTML = '<div class="reg-head"><div><h2 class="sec-title" style="font-size:1.15rem;margin:0">Student register</h2><p class="count-line" style="margin:.2rem 0 0">' + tot + " pupil" + (tot === 1 ? "" : "s") + ' on record. Admission numbers are unique and also appear in each class teacher\'s class register.</p></div>' +
      '<div class="form-actions"><button type="button" class="btn btn-primary btn-sm" id="rg-add">Add a pupil</button><button type="button" class="btn btn-soft btn-sm" id="rg-imp">Import a list</button><button type="button" class="btn btn-soft btn-sm" id="rg-exp"' + (tot ? "" : " disabled") + '>Export CSV</button><button type="button" class="btn btn-soft btn-sm" id="rg-prt"' + (tot ? "" : " disabled") + ">Print</button></div></div>" +
      '<div class="reg-chips" id="rg-chips" role="group" aria-label="Filter by class"></div>' +
      '<div class="qb-filters"><div class="fld"><label for="rg-q">Search</label><input class="input" id="rg-q" type="search" placeholder="Name, admission no. or student ID"></div><div class="fld"><label for="rg-st">Status</label><select class="select-lg" id="rg-st"><option value="active">Active</option><option value="inactive">Inactive</option><option value="all">All</option></select></div><div class="fld"><label for="rg-sx">Sex</label><select class="select-lg" id="rg-sx"><option value="">All</option><option value="M">Male</option><option value="F">Female</option></select></div></div>' +
      '<div class="reg-bulk" id="rg-bulk" hidden><b id="rg-bn"></b><select class="select-lg" id="rg-mv" aria-label="Move to class">' + opts("", "Move to class...") + '</select><button type="button" class="btn btn-soft btn-sm" data-b="move">Move</button><button type="button" class="btn btn-soft btn-sm" data-b="off">Make inactive</button><button type="button" class="btn btn-soft btn-sm" data-b="on">Make active</button></div><p class="result" id="rg-res" role="status"></p><div id="rg-tbl"></div>';
    $("#rg-st").value = st.status; $("#rg-q").value = st.q; $("#rg-sx").value = st.sex;
    $("#rg-add").addEventListener("click", addOne); $("#rg-imp").addEventListener("click", importList); $("#rg-exp").addEventListener("click", exportCsv); $("#rg-prt").addEventListener("click", printIt);
    $("#rg-q").addEventListener("input", function () { st.q = this.value.trim(); st.page = 0; paint(); });
    $("#rg-st").addEventListener("change", function () { st.status = this.value; st.page = 0; paint(); }); $("#rg-sx").addEventListener("change", function () { st.sex = this.value; st.page = 0; paint(); });
    $$("[data-b]", host).forEach(function (b) { b.addEventListener("click", function () { bulk(b.getAttribute("data-b")); }); });
    paint();
  };
})();
