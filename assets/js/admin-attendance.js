/* Dashboard: Attendance. Class teachers tick the register; administrators and viewers see who is absent, by day and over time. */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, $$ = U.$$, esc = U.esc, A = window.UBK_ADMIN;
  if (!A) return;
  var host, day = today(), mine = [], rows = [], cls = "", mode = "";
  function today() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function addDays(s, n) { var d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function rpc(n, b) { return A.api("POST", "/rest/v1/rpc/" + n, b || {}); }
  function say(ok, m) { var el = $("#at-res"); if (el) { el.className = "result show " + (ok ? "ok" : "bad"); el.textContent = m; } }
  function nice(e) { var m = e && e.message || ""; return /too_old/.test(m) ? "Attendance older than 7 days can only be changed by an administrator." : /weekend/.test(m) ? "Weekends are not school days." : /invalid:day/.test(m) ? "You cannot mark a future date." : A.nice(m); }
  function isStaffView() { return A.can(["super_admin", "school_admin", "viewer"]); }
  function isAdm() { return A.can(["super_admin", "school_admin"]); }
  function nm(d) { return new Date(d + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }

  function open(h) {
    host = h; host.innerHTML = '<p class="count-line">Loading...</p>';
    mode = isStaffView() ? (mode || "overview") : "mark";
    if (mode === "overview") return overview();
    if (isAdm()) {
      A.api("GET", "/rest/v1/classes?select=id,name&order=section.desc,sort.asc,name.asc").then(function (c) { mine = c || []; if (!cls || !mine.some(function (x) { return x.id === cls; })) cls = (mine[0] || {}).id || ""; sheet(); }, function (e) { host.innerHTML = '<div class="notice"><span>' + esc(nice(e)) + "</span></div>"; });
      return;
    }
    rpc("my_classes").then(function (l) {
      mine = (l || []).filter(function (c) { return c.access === "class_teacher"; });
      if (!cls || !mine.some(function (c) { return c.id === cls; })) cls = (mine[0] || {}).id || "";
      sheet();
    }, function (e) { host.innerHTML = '<div class="notice"><span>' + esc(nice(e)) + "</span></div>"; });
  }
  function head(title) {
    var tabs = isAdm() ? '<div class="activity-tabs" style="margin:.2rem 0 1rem"><button type="button" class="btn btn-sm ' + (mode === "overview" ? "btn-primary" : "btn-soft") + '" data-m="overview">Overview</button> <button type="button" class="btn btn-sm ' + (mode === "mark" ? "btn-primary" : "btn-soft") + '" data-m="mark">Mark or correct a register</button></div>' : "";
    return '<h2 class="sec-title" style="font-size:1.2rem">' + title + "</h2>" + tabs;
  }
  function bindTabs() { $$("[data-m]", host).forEach(function (b) { b.addEventListener("click", function () { mode = b.getAttribute("data-m"); open(host); }); }); }

  /* ---------- register (tick sheet) ---------- */
  function sheet() {
    host.innerHTML = head("Attendance register") + '<div class="toolbar"><select class="select-lg" id="at-cl" style="width:auto" aria-label="Class">' + mine.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === cls ? " selected" : "") + ">" + esc(c.name) + "</option>"; }).join("") + '</select>' +
      '<button type="button" class="btn btn-soft btn-sm" id="at-prev" aria-label="Previous day">&larr;</button><input class="input" id="at-day" type="date" style="width:auto" max="' + today() + '" value="' + day + '" aria-label="Date"><button type="button" class="btn btn-soft btn-sm" id="at-next" aria-label="Next day">&rarr;</button></div><div id="at-body"></div><p class="result" id="at-res" role="status"></p>';
    bindTabs();
    $("#at-cl").addEventListener("change", function () { cls = this.value; load(); });
    $("#at-day").addEventListener("change", function () { day = this.value || today(); load(); });
    $("#at-prev").addEventListener("click", function () { day = addDays(day, -1); $("#at-day").value = day; load(); });
    $("#at-next").addEventListener("click", function () { if (day < today()) { day = addDays(day, 1); $("#at-day").value = day; load(); } });
    load();
  }
  function load() {
    var b = $("#at-body"); if (!cls) { b.innerHTML = '<div class="empty"><h3>No class to mark</h3><p>You are not set as the class teacher of any class yet. An administrator can assign you.</p></div>'; return; }
    b.innerHTML = '<p class="count-line">Loading...</p>';
    rpc("attendance_sheet", { p_class: cls, p_day: day }).then(function (r) { rows = r || []; draw(); }, function (e) { b.innerHTML = '<div class="notice"><span>' + esc(nice(e)) + "</span></div>"; });
  }
  function draw() {
    var b = $("#at-body"), marked = rows.some(function (r) { return r.status; });
    b.innerHTML = '<p class="count-line">' + esc(nm(day)) + " · " + rows.length + " pupils · " + (marked ? "already marked (you can change it)" : "not marked yet") + "</p>" +
      (rows.length ? '<div class="form-actions" style="margin-bottom:.6rem"><button type="button" class="btn btn-soft btn-sm" id="at-all">Tick everyone present</button><button type="button" class="btn btn-soft btn-sm" id="at-none">Clear all</button></div><div class="at-list">' + rows.map(function (r, i) {
        var st = r.status || "present";
        return '<div class="at-row"><label class="at-tick"><input type="checkbox" data-p="' + i + '"' + (st === "present" ? " checked" : "") + '> <span><b>' + esc(r.name) + "</b>" + (r.admission_no ? " <small>" + esc(r.admission_no) + "</small>" : "") + '</span></label><select class="select-lg at-why" data-w="' + i + '" aria-label="Reason for ' + esc(r.name) + '"' + (st === "present" ? " hidden" : "") + ">" + [["absent", "Absent"], ["late", "Late"], ["excused", "Excused"]].map(function (o) { return '<option value="' + o[0] + '"' + (st === o[0] ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select></div>";
      }).join("") + '</div><div class="form-actions" style="margin-top:1rem;position:sticky;bottom:.6rem"><button type="button" class="btn btn-primary" id="at-save">Save register</button><span class="count-line" id="at-sum" style="margin:0"></span></div>' : '<div class="empty"><p>No pupils in this class yet.</p></div>');
    if (!rows.length) return;
    function sum() { var p = $$("[data-p]:checked", b).length; $("#at-sum").textContent = p + " present · " + (rows.length - p) + " not present"; }
    $$("[data-p]", b).forEach(function (c) { c.addEventListener("change", function () { var w = $('[data-w="' + c.getAttribute("data-p") + '"]', b); w.hidden = c.checked; sum(); }); });
    $("#at-all").addEventListener("click", function () { $$("[data-p]", b).forEach(function (c) { c.checked = true; $('[data-w="' + c.getAttribute("data-p") + '"]', b).hidden = true; }); sum(); });
    $("#at-none").addEventListener("click", function () { $$("[data-p]", b).forEach(function (c) { c.checked = false; $('[data-w="' + c.getAttribute("data-p") + '"]', b).hidden = false; }); sum(); });
    $("#at-save").addEventListener("click", function () {
      var out = rows.map(function (r, i) { return { student_id: r.student_id, status: $('[data-p="' + i + '"]', b).checked ? "present" : $('[data-w="' + i + '"]', b).value }; });
      $("#at-save").disabled = true;
      rpc("save_attendance", { p_class: cls, p_day: day, p_rows: out }).then(function (n) { say(true, "Saved for " + n + " pupils."); load(); }, function (e) { say(false, nice(e)); }).then(function () { var s = $("#at-save"); if (s) s.disabled = false; });
    });
    sum();
  }

  /* ---------- overview (admin, viewer) ---------- */
  function overview() {
    host.innerHTML = head("Attendance overview") + '<div class="toolbar"><button type="button" class="btn btn-soft btn-sm" id="ov-prev" aria-label="Previous day">&larr;</button><input class="input" id="ov-day" type="date" style="width:auto" max="' + today() + '" value="' + day + '" aria-label="Date"><button type="button" class="btn btn-soft btn-sm" id="ov-next" aria-label="Next day">&rarr;</button><span style="flex:1"></span><select class="select-lg" id="ov-r" style="width:auto" aria-label="Period"><option value="7">Last 7 days</option><option value="30" selected>Last 30 days</option><option value="90">Last 90 days</option></select></div><div id="ov-body"><p class="count-line">Loading...</p></div><p class="result" id="at-res" role="status"></p>';
    bindTabs();
    function go() {
      var days = parseInt($("#ov-r").value, 10);
      Promise.all([rpc("attendance_day", { p_day: day }), rpc("attendance_range", { p_from: addDays(day, -days + 1), p_to: day })]).then(function (r) { paint(r[0] || [], r[1] || {}, days); }, function (e) { $("#ov-body").innerHTML = '<div class="notice"><span>' + esc(nice(e)) + "</span></div>"; });
    }
    $("#ov-day").addEventListener("change", function () { day = this.value || today(); go(); }); $("#ov-r").addEventListener("change", go);
    $("#ov-prev").addEventListener("click", function () { day = addDays(day, -1); $("#ov-day").value = day; go(); });
    $("#ov-next").addEventListener("click", function () { if (day < today()) { day = addDays(day, 1); $("#ov-day").value = day; go(); } });
    go();
  }
  function paint(list, range, days) {
    var tp = 0, tm = 0, ta = 0, tl = 0, tn = 0, unmarked = [];
    list.forEach(function (c) { tp += c.present; tm += c.marked; ta += c.absent; tl += c.late; tn += c.pupils; if (c.pupils && !c.marked) unmarked.push(c.name); });
    var rate = tm ? Math.round((tp + tl) / tm * 100) : 0;
    $("#ov-body").innerHTML = '<div class="ad-stats"><div class="stat"><b>' + tn + "</b><span>Pupils</span></div><div class=\"stat\"><b>" + tp + "</b><span>Present</span></div><div class=\"stat\"><b>" + ta + "</b><span>Absent</span></div><div class=\"stat\"><b>" + tl + "</b><span>Late</span></div><div class=\"stat\"><b>" + rate + "%</b><span>Attendance</span></div></div>" +
      (unmarked.length ? '<p class="notice is-info" style="margin-top:1rem"><span data-icon="alert"></span><span>Register not yet taken: ' + esc(unmarked.join(", ")) + ".</span></p>" : "") +
      '<h3 style="font-size:1.05rem;margin:1.2rem 0 .4rem">' + esc(nm(day)) + '</h3><div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>Class</th><th>Class teacher</th><th>Present</th><th>Late</th><th>Absent</th><th>Who is absent</th><th></th></tr></thead><tbody>' + list.map(function (c) {
        return "<tr><td><strong>" + esc(c.name) + "</strong></td><td>" + esc(c.teacher || "-") + "</td><td>" + (c.marked ? c.present : "-") + "</td><td>" + (c.marked ? c.late : "-") + "</td><td>" + (c.marked ? "<b>" + c.absent + "</b>" : "-") + "</td><td>" + (c.marked ? (c.absentees.length ? esc(c.absentees.join(", ")) : "None") : "<small>Not marked</small>") + "</td><td>" + (isAdm() ? '<button type="button" class="btn btn-soft btn-sm" data-ed="' + esc(c.class_id) + '">Edit</button>' : "") + "</td></tr>";
      }).join("") + "</tbody></table></div>" +
      '<h3 style="font-size:1.05rem;margin:1.4rem 0 .4rem">Last ' + days + ' days by class</h3><div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>Class</th><th>Days marked</th><th>Present</th><th>Late</th><th>Absent</th><th>Excused</th><th>Attendance</th></tr></thead><tbody>' + (range.classes || []).map(function (c) { var t = c.present + c.late + c.absent + c.excused; return "<tr><td>" + esc(c.name) + "</td><td>" + c.days + "</td><td>" + c.present + "</td><td>" + c.late + "</td><td>" + c.absent + "</td><td>" + c.excused + "</td><td>" + (t ? Math.round((c.present + c.late) / t * 100) + "%" : "-") + "</td></tr>"; }).join("") + "</tbody></table></div>" +
      ((range.pupils || []).length ? '<h3 style="font-size:1.05rem;margin:1.4rem 0 .4rem">Most absences</h3><div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>Pupil</th><th>Class</th><th>Absent</th><th>Late</th><th>Days marked</th></tr></thead><tbody>' + range.pupils.map(function (p) { return "<tr><td>" + esc(p.name) + "</td><td>" + esc(p.class) + "</td><td><b>" + p.absent + "</b></td><td>" + p.late + "</td><td>" + p.marked + "</td></tr>"; }).join("") + "</tbody></table></div>" : "");
    $$("[data-ed]", host).forEach(function (b) { b.addEventListener("click", function () { cls = b.getAttribute("data-ed"); mode = "mark"; open(host); }); });
  }
  A.attendance = open;
})();
