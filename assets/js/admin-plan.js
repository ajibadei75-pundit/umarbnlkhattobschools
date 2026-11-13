/* Staff portals: timetable, weekly topics, lesson notes per period with approval, notifications and class reminders. */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, $$ = U.$$, esc = U.esc, A = window.UBK_ADMIN;
  if (!A) return;
  A.tabs = A.tabs || {};
  var DAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], TERMS = ["First", "Second", "Third"], NP = 9;
  var DEF = [["08:00", "08:40"], ["08:40", "09:20"], ["09:20", "10:00"], ["10:00", "10:30"], ["10:30", "11:10"], ["11:10", "11:50"], ["11:50", "12:30"], ["12:30", "13:10"], ["13:10", "13:50"]];
  var info = null;
  function rpc(n, b) { return A.api("POST", "/rest/v1/rpc/" + n, b || {}); }
  function isAdm() { return A.can(["super_admin", "school_admin"]); }
  function pad(n) { return ("0" + n).slice(-2); }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function say(el, ok, m) { if (el) { el.className = "result show " + (ok ? "ok" : "bad"); el.textContent = m; } }
  function classesList() { return A.api("GET", "/rest/v1/classes?select=id,name&order=section.desc,sort.asc,name.asc"); }
  function termInfo() {
    if (info) return Promise.resolve(info);
    return A.api("GET", "/rest/v1/site_settings?key=eq.session&select=value").then(function (r) {
      var v = (r && r[0] && r[0].value) || {}, now = ymd(new Date()), t = (v.terms || []).filter(function (x) { return x.start <= now && now <= x.end; })[0] || (v.terms || [])[0], wk = 1;
      if (t) wk = Math.max(1, Math.min(14, Math.floor((new Date(now) - new Date(t.start)) / 6048e5) + 1));
      info = { session: v.label || "", term: t ? t.term : "First", week: wk }; return info;
    }, function () { info = { session: "", term: "First", week: 1 }; return info; });
  }
  function sessionField(i) { return '<div class="fld"><label for="pl-ses">Session</label><input class="input" id="pl-ses" value="' + esc(i.session) + '" placeholder="2026/2027"></div><div class="fld"><label for="pl-term">Term</label><select class="select-lg" id="pl-term">' + TERMS.map(function (t) { return '<option' + (t === i.term ? " selected" : "") + ">" + t + "</option>"; }).join("") + "</select></div>"; }

  /* ---------------- timetable ---------------- */
  var tt = { cls: "", classes: [], subs: [] };
  A.tabs.timetable = function (host) {
    host.innerHTML = '<p class="count-line">Loading...</p>';
    if (isAdm()) return classesList().then(function (c) { tt.classes = c || []; tt.cls = tt.cls || (c[0] || {}).id || ""; adminTT(host); });
    rpc("tt_view", {}).then(function (rows) { teacherTT(host, rows || []); }, function (e) { host.innerHTML = '<div class="notice"><span>' + esc(A.nice(e.message)) + "</span></div>"; });
  };
  function adminTT(host) {
    host.innerHTML = '<h2 class="sec-title" style="font-size:1.2rem">Timetable</h2><p class="count-line">Pick a class, choose the subject for each period, then save. Teachers see their own periods and get a reminder before each one.</p>' +
      '<div class="toolbar"><select class="select-lg" id="tt-cl" style="width:auto" aria-label="Class">' + tt.classes.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === tt.cls ? " selected" : "") + ">" + esc(c.name) + "</option>"; }).join("") + '</select></div><div id="tt-body"><p class="count-line">Loading...</p></div>';
    $("#tt-cl").addEventListener("change", function () { tt.cls = this.value; loadTT(); }); loadTT();
  }
  function loadTT() {
    if (!tt.cls) { $("#tt-body").innerHTML = '<div class="empty"><p>No classes yet.</p></div>'; return; }
    Promise.all([A.api("GET", "/rest/v1/class_subjects?class_id=eq." + tt.cls + "&select=subject_id,subjects(name)"), rpc("tt_view", { p_class: tt.cls })]).then(function (r) {
      tt.subs = (r[0] || []).map(function (x) { return { id: x.subject_id, name: (x.subjects || {}).name || "" }; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
      var map = {}, times = DEF.slice(); (r[1] || []).forEach(function (x) { map[x.day + "-" + x.period] = x; if (x.start) times[x.period - 1] = [x.start, x.end]; });
      var opts = function (sel) { return '<option value="">-</option>' + tt.subs.map(function (s) { return '<option value="s:' + esc(s.id) + '"' + (sel === "s:" + s.id ? " selected" : "") + ">" + esc(s.name) + "</option>"; }).join("") + ["Break", "Assembly", "Games", "Quran / Islamiyyah"].map(function (l) { return '<option value="l:' + l + '"' + (sel === "l:" + l ? " selected" : "") + ">" + l + "</option>"; }).join(""); };
      var h = '<div class="ad-table-wrap"><table class="ad-table tt-grid"><thead><tr><th>Period</th>' + [1, 2, 3, 4, 5].map(function (d) { return "<th>" + DAYS[d] + "</th>"; }).join("") + "</tr></thead><tbody>";
      for (var p = 1; p <= NP; p++) {
        h += '<tr><th><b>' + p + '</b><div class="tt-time"><input class="input" type="time" data-ts="' + p + '" value="' + times[p - 1][0] + '" aria-label="Period ' + p + ' starts"><input class="input" type="time" data-te="' + p + '" value="' + times[p - 1][1] + '" aria-label="Period ' + p + ' ends"></div></th>';
        for (var d = 1; d <= 5; d++) { var x = map[d + "-" + p], sel = x ? (x.subject_id ? "s:" + x.subject_id : "l:" + (x.subject || "")) : ""; h += '<td><select class="select-lg" data-c="' + d + "-" + p + '" aria-label="' + DAYS[d] + " period " + p + '">' + opts(sel) + "</select></td>"; }
        h += "</tr>";
      }
      $("#tt-body").innerHTML = h + '</tbody></table></div><div class="form-actions" style="margin-top:1rem"><button type="button" class="btn btn-primary" id="tt-save">Save timetable</button></div><p class="result" id="tt-res" role="status"></p>';
      $("#tt-save").addEventListener("click", function () {
        var rows = []; $$("[data-c]").forEach(function (s) {
          if (!s.value) return; var k = s.getAttribute("data-c").split("-"), d = +k[0], p = +k[1], o = { day: d, period: p, start: $('[data-ts="' + p + '"]').value, end: $('[data-te="' + p + '"]').value };
          if (s.value.charAt(0) === "s") o.subject_id = s.value.slice(2); else o.label = s.value.slice(2); rows.push(o);
        });
        this.disabled = true; var b = this; rpc("tt_set", { p_class: tt.cls, p_rows: rows }).then(function () { say($("#tt-res"), true, "Timetable saved. Teachers will see it now."); }, function (e) { say($("#tt-res"), false, A.nice(e.message)); }).then(function () { b.disabled = false; });
      });
    }, function (e) { $("#tt-body").innerHTML = '<div class="notice"><span>' + esc(A.nice(e.message)) + "</span></div>"; });
  }
  function teacherTT(host, rows) {
    var today = new Date().getDay(), byC = {};
    function table(list, who) {
      var ds = [1, 2, 3, 4, 5], ps = {}; list.forEach(function (x) { ps[x.period] = x.start; });
      var pl = Object.keys(ps).map(Number).sort(function (a, b) { return a - b; });
      return '<div class="ad-table-wrap"><table class="ad-table tt-grid"><thead><tr><th>Time</th>' + ds.map(function (d) { return '<th class="' + (d === today ? "tt-today" : "") + '">' + DAYS[d].slice(0, 3) + "</th>"; }).join("") + "</tr></thead><tbody>" + pl.map(function (p) {
        return "<tr><th>" + esc(ps[p] || "P" + p) + "</th>" + ds.map(function (d) { var x = list.filter(function (y) { return y.day === d && y.period === p; })[0]; return '<td class="' + (d === today ? "tt-today" : "") + (x && x.mine ? " tt-mine" : "") + '">' + (x ? "<b>" + esc(x.subject || "") + "</b>" + (who ? "<small>" + esc(x.teacher || "") + "</small>" : "<small>" + esc(x.class) + "</small>") : "") + "</td>"; }).join("") + "</tr>";
      }).join("") + "</tbody></table></div>";
    }
    var mine = rows.filter(function (x) { return x.mine; }); rows.forEach(function (x) { (byC[x.class] = byC[x.class] || []).push(x); });
    var h = '<h2 class="sec-title" style="font-size:1.2rem">My timetable</h2>';
    h += mine.length ? table(mine, false) : '<div class="empty"><h3>No lessons yet</h3><p>The administrator has not put you on the timetable yet.</p></div>';
    Object.keys(byC).forEach(function (c) { if (byC[c].some(function (x) { return !x.mine; })) h += '<h3 style="font-size:1.05rem;margin:1.4rem 0 .4rem">' + esc(c) + " class timetable</h3>" + table(byC[c], true); });
    host.innerHTML = h + '<p class="count-line" style="margin-top:1rem">Your own lessons are shaded. You will get a flash reminder before each lesson while this page is open.</p>';
  }

  /* ---------------- weekly topics (administrator) ---------------- */
  var tp = { cls: "", sub: "", classes: [], subs: [] };
  A.tabs.topics = function (host) {
    host.innerHTML = '<p class="count-line">Loading...</p>';
    Promise.all([classesList(), termInfo()]).then(function (r) { tp.classes = r[0] || []; tp.cls = tp.cls || (tp.classes[0] || {}).id || ""; drawTopics(host, r[1]); });
  };
  function drawTopics(host, i) {
    host.innerHTML = '<h2 class="sec-title" style="font-size:1.2rem">Weekly topics</h2><p class="count-line">Set the topic for each week, subject by subject. The teacher is told straight away and writes the lesson note for it.</p>' +
      '<div class="form-grid"><div class="fld"><label for="tp-cl">Class</label><select class="select-lg" id="tp-cl">' + tp.classes.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === tp.cls ? " selected" : "") + ">" + esc(c.name) + "</option>"; }).join("") + '</select></div><div class="fld"><label for="tp-su">Subject</label><select class="select-lg" id="tp-su"></select></div>' + sessionField(i) + '</div><div id="tp-body"></div>';
    function subs() { A.api("GET", "/rest/v1/class_subjects?class_id=eq." + tp.cls + "&select=subject_id,subjects(name)").then(function (r) { tp.subs = (r || []).map(function (x) { return { id: x.subject_id, name: (x.subjects || {}).name || "" }; }).sort(function (a, b) { return a.name.localeCompare(b.name); }); if (!tp.subs.some(function (s) { return s.id === tp.sub; })) tp.sub = (tp.subs[0] || {}).id || ""; $("#tp-su").innerHTML = tp.subs.map(function (s) { return '<option value="' + esc(s.id) + '"' + (s.id === tp.sub ? " selected" : "") + ">" + esc(s.name) + "</option>"; }).join(""); weeks(); }); }
    function weeks() {
      var b = $("#tp-body"); if (!tp.sub) { b.innerHTML = '<div class="empty"><p>This class has no subjects yet.</p></div>'; return; }
      rpc("topics_view", { p_class: tp.cls, p_session: $("#pl-ses").value.trim(), p_term: $("#pl-term").value }).then(function (r) {
        var m = {}; (r || []).filter(function (x) { return x.subject_id === tp.sub; }).forEach(function (x) { m[x.week] = x; });
        var h = '<div class="tp-list">'; for (var w = 1; w <= 13; w++) h += '<div class="tp-row"><b>Week ' + w + '</b><input class="input" data-w="' + w + '" maxlength="140" placeholder="Topic" value="' + esc((m[w] || {}).topic || "") + '" aria-label="Week ' + w + ' topic"><input class="input" data-tn="' + w + '" maxlength="300" placeholder="Note to teacher (optional)" value="' + esc((m[w] || {}).notes || "") + '" aria-label="Week ' + w + ' note"></div>';
        b.innerHTML = h + '</div><div class="form-actions" style="margin-top:1rem"><button type="button" class="btn btn-primary" id="tp-save">Save topics</button></div><p class="result" id="tp-res" role="status"></p>';
        $("#tp-save").addEventListener("click", function () {
          var ses = $("#pl-ses").value.trim(); if (!ses) return say($("#tp-res"), false, "Enter the session, for example 2026/2027."); var btn = this, jobs = [];
          $$("[data-w]").forEach(function (inp) { var w = +inp.getAttribute("data-w"), n = $('[data-tn="' + w + '"]').value.trim(), old = m[w] || {}; if (inp.value.trim() === (old.topic || "") && n === (old.notes || "")) return; jobs.push(rpc("topic_save", { p_class: tp.cls, p_subject: tp.sub, p_session: ses, p_term: $("#pl-term").value, p_week: w, p_topic: inp.value, p_notes: n })); });
          if (!jobs.length) return say($("#tp-res"), true, "Nothing changed.");
          btn.disabled = true; Promise.all(jobs).then(function () { say($("#tp-res"), true, "Saved " + jobs.length + " week" + (jobs.length > 1 ? "s" : "") + ". The teachers have been notified."); weeks(); }, function (e) { say($("#tp-res"), false, A.nice(e.message)); }).then(function () { btn.disabled = false; });
        });
      });
    }
    $("#tp-cl").addEventListener("change", function () { tp.cls = this.value; subs(); }); $("#tp-su").addEventListener("change", function () { tp.sub = this.value; weeks(); });
    $("#pl-ses").addEventListener("change", weeks); $("#pl-term").addEventListener("change", weeks); subs();
  }

  /* ---------------- lesson notes per period (teacher) and approvals (administrator) ---------------- */
  var ST = { draft: "Draft", submitted: "Waiting for approval", approved: "Approved", changes: "Changes asked" };
  function pill(s) { return '<span class="status-pill pl-' + s + '">' + esc(ST[s] || s) + "</span>"; }
  var ls = { week: 0 };
  A.tabs.lessons = function (host) {
    host.innerHTML = '<p class="count-line">Loading...</p>';
    termInfo().then(function (i) { if (!ls.week) ls.week = i.week; return Promise.all([rpc("tt_view", {}), rpc("topics_view", { p_class: null, p_session: i.session, p_term: i.term }), rpc("ln_list", {})]); }).then(function (r) {
      var rows = (r[0] || []).filter(function (x) { return x.mine && x.subject_id; }), tops = r[1] || [], notes = r[2] || [];
      var h = '<h2 class="sec-title" style="font-size:1.2rem">Lesson notes by period</h2><p class="count-line">' + esc(info.session + " " + info.term + " term") + ". Each lesson on your timetable shows the topic set by the administrator. Write the note, send it for approval, then print it once it is approved.</p>" +
        '<div class="toolbar"><label for="ls-wk" class="count-line" style="margin:0">Week</label><select class="select-lg" id="ls-wk" style="width:auto">' + Array.apply(null, Array(13)).map(function (_, k) { return '<option value="' + (k + 1) + '"' + (k + 1 === ls.week ? " selected" : "") + ">Week " + (k + 1) + "</option>"; }).join("") + "</select></div>";
      if (!rows.length) h += '<div class="empty"><h3>No lessons on your timetable</h3><p>Once the administrator adds you to the timetable, your periods appear here.</p></div>';
      h += '<div class="pl-cards">' + rows.map(function (x) {
        var tpc = tops.filter(function (y) { return y.class_id === x.class_id && y.subject_id === x.subject_id && y.week === ls.week; })[0],
          n = notes.filter(function (y) { return y.class_id === x.class_id && y.subject_id === x.subject_id && y.week === ls.week && y.day === x.day && y.period === x.period; })[0],
          st = n ? n.status : "none";
        return '<article class="panel pl-card"><div class="pl-top"><b>' + esc(x.subject) + " · " + esc(x.class) + "</b>" + (n ? pill(st) : '<span class="status-pill">No note yet</span>') + '</div><p class="count-line" style="margin:.2rem 0">' + DAYS[x.day] + ", period " + x.period + (x.start ? " (" + esc(x.start) + "-" + esc(x.end) + ")" : "") + "</p>" +
          (tpc ? "<p><b>Topic:</b> " + esc(tpc.topic) + (tpc.notes ? '<br><small>' + esc(tpc.notes) + "</small>" : "") + "</p>" : '<p class="count-line"><em>No topic set for this week yet.</em></p>') +
          (n && n.admin_note ? '<p class="notice is-info"><span data-icon="alert"></span><span>Administrator: ' + esc(n.admin_note) + "</span></p>" : "") +
          '<button type="button" class="btn ' + (tpc || n ? "btn-primary" : "btn-soft") + ' btn-sm" data-lo="' + rows.indexOf(x) + '"' + (tpc || n ? "" : " disabled") + ">" + (n ? "Open note" : "Write note") + "</button></article>";
      }).join("") + "</div>";
      host.innerHTML = h; $("#ls-wk") && $("#ls-wk").addEventListener("change", function () { ls.week = +this.value; A.tabs.lessons(host); });
      $$("[data-lo]", host).forEach(function (b) {
        b.addEventListener("click", function () {
          var x = rows[+b.getAttribute("data-lo")];
          var tpc = tops.filter(function (y) { return y.class_id === x.class_id && y.subject_id === x.subject_id && y.week === ls.week; })[0];
          editor({ row: x, topic: tpc, note: notes.filter(function (y) { return y.class_id === x.class_id && y.subject_id === x.subject_id && y.week === ls.week && y.day === x.day && y.period === x.period; })[0], week: ls.week }, function () { A.tabs.lessons(host); });
        });
      });
    }, function (e) { host.innerHTML = '<div class="notice"><span>' + esc(A.nice(e.message)) + "</span></div>"; });
  };
  var af = "pending";
  A.tabs.approvals = function (host) {
    host.innerHTML = '<p class="count-line">Loading...</p>';
    rpc("ln_list", { p_status: af === "all" ? null : af === "pending" ? "submitted" : af }).then(function (list) {
      host.innerHTML = '<h2 class="sec-title" style="font-size:1.2rem">Lesson note approvals</h2><p class="count-line">Read each note, change anything you like, then approve it. Teachers can only print a note after you approve it.</p><div class="toolbar"><select class="select-lg" id="ap-f" style="width:auto" aria-label="Show">' +
        [["pending", "Waiting for approval"], ["changes", "Changes asked"], ["approved", "Approved"], ["all", "All"]].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === af ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select></div>" +
        ((list || []).length ? '<div class="pl-cards">' + list.map(function (n, i) { return '<article class="panel pl-card"><div class="pl-top"><b>' + esc(n.subject) + " · " + esc(n.class) + "</b>" + pill(n.status) + '</div><p class="count-line" style="margin:.2rem 0">' + esc(n.teacher || "") + " · Week " + n.week + (n.day ? ", " + DAYS[n.day] : "") + "</p><p><b>" + esc(n.topic || "") + '</b></p><button type="button" class="btn btn-primary btn-sm" data-ap="' + i + '">Review</button></article>'; }).join("") + "</div>" : '<div class="empty"><h3>Nothing here</h3><p>No lesson notes in this list.</p></div>');
      $("#ap-f").addEventListener("change", function () { af = this.value; A.tabs.approvals(host); });
      $$("[data-ap]", host).forEach(function (b) { b.addEventListener("click", function () { var n = list[+b.getAttribute("data-ap")]; editor({ adminNote: n, week: n.week }, function () { A.tabs.approvals(host); }); }); });
    }, function (e) { host.innerHTML = '<div class="notice"><span>' + esc(A.nice(e.message)) + "</span></div>"; });
  };
  function editor(o, done) {
    var dlg = $("#ad-dlg"), review = !!o.adminNote, n = review ? o.adminNote : o.note, row = o.row || {}, cls = review ? n.class : row.class, sub = review ? n.subject : row.subject, topic = review ? n.topic : (n ? n.topic : (o.topic || {}).topic),
      f = (n && n.content && n.content.f) || { class: cls, subject: sub, topic: topic, week: String(o.week), duration: "40 minutes", notes: (o.topic || {}).notes || "" };
    var st = n ? n.status : "draft", txt = (n && n.content && n.content.text) || "", locked = !review && st === "submitted";
    $("#ad-dlg-t").textContent = sub + " · " + cls + " · Week " + o.week;
    $("#ad-dlg-b").innerHTML = '<p class="post-meta"><b>' + esc(topic || "") + "</b> " + pill(st) + "</p>" + (n && n.admin_note && !review ? '<p class="notice is-info"><span data-icon="alert"></span><span>Administrator: ' + esc(n.admin_note) + "</span></p>" : "") +
      (locked ? '<p class="count-line">Sent for approval. You can still edit and send again.</p>' : "") +
      (!review ? '<div class="form-actions" style="margin:.4rem 0"><button type="button" class="btn btn-soft btn-sm" id="pn-gen">' + (txt ? "Write again with AI" : "Write the note with AI") + "</button></div>" : "") +
      '<div class="fld full"><label for="pn-tx">Lesson note (you can edit everything)</label><textarea class="textarea" id="pn-tx" style="min-height:340px;font-family:ui-monospace,monospace;font-size:.85rem">' + esc(txt) + "</textarea></div>" +
      (review ? '<div class="fld full"><label for="pn-an">Message to the teacher (optional)</label><textarea class="textarea" id="pn-an" maxlength="400" style="min-height:70px">' + esc(n.admin_note || "") + "</textarea></div>" : "") +
      '<div class="form-actions" style="margin-top:1rem">' + (review ? '<button type="button" class="btn btn-primary" id="pn-ok">Approve</button><button type="button" class="btn btn-soft" id="pn-ch">Ask for changes</button>' : '<button type="button" class="btn btn-soft" id="pn-sv">Save draft</button><button type="button" class="btn btn-primary" id="pn-sub">Send for approval</button>') +
      '<button type="button" class="btn btn-soft" id="pn-pdf"' + (review || st === "approved" ? "" : " disabled") + ">Print / PDF</button></div>" + (!review && st !== "approved" ? '<p class="count-line">Printing opens after the administrator approves this note.</p>' : "") + '<p class="result" id="pn-res" role="status"></p>';
    if (dlg.showModal && !dlg.open) dlg.showModal();
    var res = $("#pn-res");
    function text() { return $("#pn-tx").value; }
    function content() { return { text: text(), f: f }; }
    function save(submit) {
      if (!text().trim()) return say(res, false, "Write or generate the note first.");
      return rpc("ln_save", { p_id: n ? n.id : null, p_class: review ? n.class_id : row.class_id, p_subject: review ? n.subject_id : row.subject_id, p_session: info.session, p_term: info.term, p_week: o.week, p_day: row.day || null, p_period: row.period || null, p_topic: topic, p_content: content(), p_submit: submit }).then(function () { say(res, true, submit ? "Sent to the administrator for approval." : "Draft saved."); setTimeout(function () { dlg.close(); done(); }, 700); }, function (e) { say(res, false, A.nice(e.message)); });
    }
    function review2(status) { return rpc("ln_review", { p_id: n.id, p_status: status, p_note: ($("#pn-an").value || "").trim() || null, p_content: content() }).then(function () { say(res, true, status === "approved" ? "Approved. The teacher has been told." : "Sent back to the teacher."); setTimeout(function () { dlg.close(); done(); }, 700); }, function (e) { say(res, false, A.nice(e.message)); }); }
    var g = $("#pn-gen"); if (g) g.addEventListener("click", function () {
      if (!A.ai) return say(res, false, "The writing assistant is not available."); g.disabled = true; say(res, true, "Writing the note. This can take up to a minute...");
      A.ai.ask(Object.assign({ task: "lesson_note", detail: "full" }, f)).then(function (r) { $("#pn-tx").value = A.ai.lessonText(r, f); say(res, true, "Done. Read it, change what you like, then send it for approval."); }, function (e) { say(res, false, e.message); }).then(function () { g.disabled = false; });
    });
    var b; if ((b = $("#pn-sv"))) b.addEventListener("click", function () { save(false); }); if ((b = $("#pn-sub"))) b.addEventListener("click", function () { save(true); });
    if ((b = $("#pn-ok"))) b.addEventListener("click", function () { review2("approved"); }); if ((b = $("#pn-ch"))) b.addEventListener("click", function () { review2("changes"); });
    if ((b = $("#pn-pdf"))) b.addEventListener("click", function () { if (!A.ai) return; say(res, true, "Making the PDF..."); A.ai.lessonPdf(text(), f).then(function (nm) { say(res, true, "PDF downloaded: " + nm); }, function () { say(res, false, "Could not make the PDF."); }); });
  }

  /* ---------------- notifications, badges and reminders ---------------- */
  var started = false, ttRows = null, ttAt = 0, myCls = [], unread = [];
  function toast(title, body, go) {
    var box = $("#ad-toasts"); if (!box) { box = document.createElement("div"); box.id = "ad-toasts"; box.setAttribute("role", "status"); box.setAttribute("aria-live", "polite"); document.body.appendChild(box); }
    var t = document.createElement("div"); t.className = "ad-toast"; t.innerHTML = "<b>" + esc(title) + "</b>" + (body ? "<span>" + esc(body) + "</span>" : "");
    t.addEventListener("click", function () { t.remove(); if (go) tab(go); }); box.appendChild(t); setTimeout(function () { t.classList.add("out"); setTimeout(function () { t.remove(); }, 400); }, 9000);
    try { if (window.Notification && Notification.permission === "granted" && document.hidden) new Notification(title, { body: body || "", icon: "assets/img/logo.jpg" }); } catch (e) { /* ignore */ }
  }
  function tab(k) { var m = { lessons: isAdm() ? "approvals" : "lessons", notes: isAdm() ? "approvals" : "lessons" }, b = $('#ad-tabs [data-tab="' + (m[k] || k) + '"]'); if (b) b.click(); }
  function badges() {
    var n = unread.filter(function (x) { return x.kind === "topic" || x.kind === "note"; }).length;
    $$("#ad-tabs [data-tab=lessons], #ad-tabs [data-tab=approvals]").forEach(function (b) { var i = b.querySelector(".ad-badge"); if (!n) { if (i) i.remove(); return; } if (!i) { i = document.createElement("i"); i.className = "ad-badge"; b.appendChild(i); } i.textContent = n > 9 ? "9+" : n; });
    var bell = $("#ad-bell .ad-badge"); if (bell) { bell.hidden = !unread.length; bell.textContent = unread.length > 9 ? "9+" : unread.length; }
  }
  function bell() {
    var bar = $(".ad-bar"); if (!bar || $("#ad-bell")) return; var out = $("#ad-out");
    var b = document.createElement("button"); b.type = "button"; b.id = "ad-bell"; b.className = "btn btn-soft btn-sm ad-bell"; b.setAttribute("aria-label", "Notifications"); b.innerHTML = '<span aria-hidden="true">&#128276;</span><i class="ad-badge" hidden>0</i>';
    out.parentNode.insertBefore(b, out); b.addEventListener("click", showAll);
  }
  function showAll() {
    rpc("notif_mine", {}).then(function (list) {
      var dlg = $("#ad-dlg"); $("#ad-dlg-t").textContent = "Notifications";
      $("#ad-dlg-b").innerHTML = ((list || []).length ? '<ul class="nt-list">' + list.map(function (n) { return '<li class="' + (n.read ? "" : "unread") + '"><b>' + esc(n.title) + "</b>" + (n.body ? "<span>" + esc(n.body) + "</span>" : "") + "<small>" + esc(new Date(n.created_at).toLocaleString()) + "</small></li>"; }).join("") + "</ul>" : '<div class="empty"><p>No notifications yet.</p></div>') +
        '<div class="form-actions" style="margin-top:1rem"><button type="button" class="btn btn-soft btn-sm" id="nt-read">Mark all as read</button>' + (window.Notification && Notification.permission === "default" ? '<button type="button" class="btn btn-soft btn-sm" id="nt-on">Allow alerts on this phone</button>' : "") + "</div>";
      if (dlg.showModal && !dlg.open) dlg.showModal();
      $("#nt-read").addEventListener("click", function () { rpc("notif_read", { p_ids: null }).then(function () { unread = []; badges(); dlg.close(); }); });
      var on = $("#nt-on"); if (on) on.addEventListener("click", function () { Notification.requestPermission().then(function () { on.hidden = true; }); });
    });
  }
  function poll(first) {
    rpc("notif_mine", {}).then(function (list) {
      unread = (list || []).filter(function (n) { return !n.read; });
      var seen = []; try { seen = JSON.parse(sessionStorage.getItem("ubk-ns") || "[]"); } catch (e) { /* ignore */ }
      var fresh = unread.filter(function (n) { return seen.indexOf(n.id) < 0; });
      if (first && fresh.length > 3) toast("You have " + fresh.length + " new notifications", "Tap the bell to read them.", null); else fresh.forEach(function (n) { toast(n.title, n.body, n.link); });
      try { sessionStorage.setItem("ubk-ns", JSON.stringify(seen.concat(fresh.map(function (n) { return n.id; })).slice(-100))); } catch (e) { /* ignore */ }
      badges();
    }, function () { /* offline: keep quiet */ });
  }
  function remind() {
    var now = new Date(), d = now.getDay(); if (d < 1 || d > 5) return;
    function go() {
      var mins = now.getHours() * 60 + now.getMinutes(), key = ymd(now), first = {};
      ttRows.filter(function (x) { return x.day === d && x.start; }).forEach(function (x) {
        var m = x.start.split(":"), at = +m[0] * 60 + +m[1], diff = at - mins, id = "ubk-rem-" + key + "-" + x.id; if (diff < -10 || diff > 10) return;
        var cT = myCls.indexOf(x.class_id) > -1, sT = x.mine; if (!sT && !cT) return;
        try { if (localStorage.getItem(id)) return; localStorage.setItem(id, "1"); } catch (e) { /* ignore */ }
        if (sT) toast((diff > 0 ? "In " + diff + " min: " : "Now: ") + x.subject + " · " + x.class, "Period " + x.period + " at " + x.start + ". Open Lesson notes to check your plan.", "lessons");
        else if (cT && !first[x.class_id] && ttRows.filter(function (y) { return y.class_id === x.class_id && y.day === d && y.start < x.start; }).length === 0) { first[x.class_id] = 1; toast("Class reminder: " + x.class, "School day starts at " + x.start + ". Please take the attendance register.", "attendance"); }
      });
    }
    if (ttRows && Date.now() - ttAt < 6e5) return go();
    Promise.all([rpc("tt_view", {}), rpc("my_classes", {})]).then(function (r) { ttRows = r[0] || []; ttAt = Date.now(); myCls = (r[1] || []).filter(function (c) { return c.access === "class_teacher"; }).map(function (c) { return c.id; }); go(); }, function () { /* offline */ });
  }
  A.alerts = function () {
    if (started || A.offline()) return; started = true; bell(); poll(true); remind();
    setInterval(function () { if (!document.hidden) poll(); }, 60000); setInterval(remind, 30000);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) { poll(); remind(); } });
  };
})();
