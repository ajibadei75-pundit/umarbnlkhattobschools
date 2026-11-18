/* Dashboard: class workspace for teachers (and administrators who open a class).
   Scores grid (class teacher for Nursery/Primary; subject teachers for J.S.S.), pupil details, report preview and
   "Submit for printing". Every rule is enforced by the database; this screen only makes it easy and clear. */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, $$ = U.$$, esc = U.esc;
  var A = window.UBK_ADMIN, R = window.UBK_REPORT, B = (window.UBK_SITE || {}).backend || {};
  if (!A || !R) return;
  var ST = { draft: "In progress", submitted: "Waiting for approval", approved: "Approved", rejected: "Sent back" };
  var host, ws = null, tab = "scores", subjectId = null, draft = {}, dirty = {}, pupilId = null, back = null, listCache = null;

  function pill(s) { return '<span class="status-pill st-' + (s === "approved" ? "offered" : s === "rejected" ? "declined" : s === "submitted" ? "under_review" : "") + '">' + esc(ST[s] || s) + "</span>"; }
  function rpc(n, b) { return A.api("POST", "/rest/v1/rpc/" + n, b || {}); }
  function nice(e) {
    var m = e.message || "";
    if (/locked/.test(m)) return "This class has been approved and is locked. Ask an administrator to reopen it.";
    if (/forbidden/.test(m)) return "You do not have permission for that.";
    if (/invalid:rating/.test(m)) return "One of the ratings is not allowed.";
    if (/check constraint|violates/.test(m)) return "A score is outside the allowed range (each 0 to 100, and the total cannot be more than 100).";
    return A.nice(m);
  }
  function toast(msg, ok) {
    var t = $("#rw-toast"); if (!t) { t = document.createElement("div"); t.id = "rw-toast"; t.setAttribute("role", "status"); t.setAttribute("aria-live", "polite"); document.body.appendChild(t); }
    t.className = "rw-toast " + (ok === false ? "bad" : "ok") + " show"; t.textContent = msg; clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove("show"); }, 5200);
  }
  function toJpeg(file) {
    return new Promise(function (ok, no) {
      if (!file || !/^image\//.test(file.type)) return no(new Error("Choose a photo (JPG or PNG)."));
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var W = 180, H = 240, c = document.createElement("canvas"); c.width = W; c.height = H; var g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
        var r = Math.max(W / img.width, H / img.height), w = img.width * r, h = img.height * r; g.drawImage(img, (W - w) / 2, (H - h) * 0.3, w, h); URL.revokeObjectURL(url);
        var q = .82, d = c.toDataURL("image/jpeg", q); while (d.length > 60000 && q > .35) { q -= .1; d = c.toDataURL("image/jpeg", q); }
        d.length > 65000 ? no(new Error("That photo is too large.")) : ok(d);
      };
      img.onerror = function () { URL.revokeObjectURL(url); no(new Error("Could not read that photo.")); }; img.src = url;
    });
  }
  function rolesLine() {
    var parts = []; if (ws.access === "admin") parts.push("Administrator"); if (ws.is_class_teacher) parts.push("Class teacher");
    var names = (ws.subjects || []).filter(function (x) { return (ws.assigned || []).indexOf(x.id) > -1; }).map(function (x) { return x.name; });
    if (names.length) parts.push("Subject teacher: " + names.join(", ")); return parts.length ? "Your role here: " + parts.join(" and ") : "";
  }
  function nameOf(s) { return s.first_name + " " + s.last_name; }
  function dirtyCount() { var n = 0; Object.keys(dirty).forEach(function (k) { n += Object.keys(dirty[k]).length; }); return n; }
  window.addEventListener("beforeunload", function (e) { if (dirtyCount()) { e.preventDefault(); e.returnValue = ""; } });

  /* ---------- class list ---------- */
  function teach(h) {
    host = h; ws = null;
    host.innerHTML = '<p class="count-line">Loading...</p>';
    Promise.all([rpc("my_classes"), rpc("my_teaching").catch(function () { return []; })]).then(function (rs) {
      var list = rs[0], T = {}; (rs[1] || []).forEach(function (t) { T[t.id] = t; }); listCache = list;
      var ct = list.filter(function (c) { return c.access === "class_teacher"; }), sj = list.filter(function (c) { return c.access !== "admin" && (T[c.id] || { own: [] }).own.length; });
      var who = ct.length && sj.length ? "Class teacher and subject teacher" : ct.length ? "Class teacher" : sj.length ? "Subject teacher" : "";
      host.innerHTML = '<h2 class="sec-title" style="font-size:1.2rem">My classes</h2>' + (who ? '<p class="count-line"><span class="cat-badge">' + who + "</span> " + (ct.length ? "You manage the register, pupil details and comments of " + ct.map(function (c) { return esc(c.name); }).join(", ") + ". " : "") + (sj.length ? "You enter scores only for the subjects assigned to you." : "") + "</p>" : "") + (list.length ? '<div class="two-col">' + list.map(function (c) {
        var t = T[c.id] || { own: [], subjects: [] }, isCt = c.access === "class_teacher", adm = c.access === "admin", mine = isCt && c.section === "basic" ? t.subjects : t.own;
        var badges = (adm ? '<span class="cat-badge">Administrator</span> ' : "") + (isCt ? '<span class="cat-badge">Class teacher</span> ' : "") + (t.own.length && !adm ? '<span class="cat-badge">Subject teacher</span> ' : "");
        return '<article class="panel"><h3>' + esc(c.name) + '</h3><p class="post-meta">' + badges + pill(c.status) + " · " + c.students + ' pupils</p>' +
          (mine.length && !adm ? '<p class="count-line" style="margin:.3rem 0 0">' + (isCt && c.section === "basic" ? "All subjects: " : "Your subjects: ") + mine.map(function (x) { return esc(x.name); }).join(", ") + "</p>" : "") +
          (c.status === "rejected" && c.note ? '<p class="notice is-info" style="margin:.6rem 0"><span>Sent back: ' + esc(c.note) + "</span></p>" : "") +
          '<p style="margin-top:.8rem;display:flex;gap:.4rem;flex-wrap:wrap"><button type="button" class="btn btn-primary btn-sm" data-open="' + esc(c.id) + '">Open class</button>' +
          (isCt ? '<button type="button" class="btn btn-soft btn-sm" data-att="1">Attendance</button>' : "") +
          (mine.length ? '<button type="button" class="btn btn-soft btn-sm" data-note="' + esc(c.id) + '">Lesson note</button>' : "") + "</p></article>";
      }).join("") + "</div>" : '<div class="empty"><h3>No class assigned yet</h3><p>An administrator will assign your class or subjects. Then they appear here.</p></div>');
      $$("[data-open]", host).forEach(function (b) { b.addEventListener("click", function () { openClass(host, b.getAttribute("data-open"), function () { teach(host); }); }); });
      $$("[data-att]", host).forEach(function (b) { b.addEventListener("click", function () { var t = $('#ad-tabs [data-tab="attendance"]'); if (t) t.click(); }); });
      $$("[data-note]", host).forEach(function (b) { b.addEventListener("click", function () { if (A.aiPrefill) A.aiPrefill({ cls: b.getAttribute("data-note") }); var t = $('#ad-tabs [data-tab="aitools"]'); if (t) t.click(); }); });
    }, function (e) { host.innerHTML = '<div class="notice"><span>' + esc(nice(e)) + "</span></div>"; });
  }

  /* ---------- workspace ---------- */
  function openClass(h, id, backFn) {
    host = h; back = backFn; draft = {}; dirty = {}; tab = "scores"; pupilId = null;
    host.innerHTML = '<p class="count-line">Loading class...</p>';
    return reload(id);
  }
  function reload(id) {
    id = id || ws.class.id;
    return rpc("class_workspace", { p_class: id }).then(function (w) {
      ws = w; var ed = ws.editable || [];
      if (!subjectId || !ws.subjects.some(function (s) { return s.id === subjectId; })) subjectId = (ws.subjects.filter(function (s) { return ed.indexOf(s.id) > -1; })[0] || ws.subjects[0] || {}).id || null;
      if (!pupilId || !ws.students.some(function (s) { return s.id === pupilId; })) pupilId = (ws.students[0] || {}).id || null;
      draw();
    }, function (e) { host.innerHTML = '<div class="notice"><span>' + esc(nice(e)) + '</span></div><p><button type="button" class="btn btn-soft btn-sm" id="rw-back">Back</button></p>'; var b = $("#rw-back"); if (b) b.addEventListener("click", back); });
  }
  function isBasic() { return ws.class.section === "basic"; }
  function canDetails() { return ws.access === "admin" || ws.access === "class_teacher"; }
  function draw() {
    var tabs = [["scores", "Scores"], ["register", "Class register"]]; if (canDetails()) { tabs.push(["pupils", "Pupils and comments"]); tabs.push(["submit", "Preview and submit"]); }
    host.innerHTML = '<div class="rw-top"><button type="button" class="btn btn-soft btn-sm" id="rw-back">&larr; Back</button><div><h2 style="font-size:1.35rem;margin:0">' + esc(ws.class.name) + '</h2><p class="count-line" style="margin:.1rem 0 0">' +
      pill(ws.approval.status) + " · " + ws.students.length + " pupils · " + (isBasic() ? "Nursery and Primary sheet" : "J.S.S. sheet") + "</p>" + (rolesLine() ? '<p class="count-line" style="margin:.2rem 0 0"><b>' + esc(rolesLine()) + "</b></p>" : "") + "</div></div>" +
      (ws.locked ? '<p class="notice is-info"><span data-icon="alert"></span><span>This class is approved and locked. Scores and details can no longer be changed. Ask an administrator to reopen it.</span></p>' : "") +
      (ws.approval.status === "rejected" && ws.approval.note ? '<p class="notice"><span data-icon="alert"></span><span>Sent back by the administrator: ' + esc(ws.approval.note) + "</span></p>" : "") +
      '<div class="level-tabs rw-tabs" role="tablist" aria-label="Class sections">' + tabs.map(function (x) { return '<button type="button" role="tab" data-t="' + x[0] + '" aria-selected="' + (x[0] === tab) + '">' + esc(x[1]) + "</button>"; }).join("") + '</div><div id="rw-body"></div>';
    U.injectIcons && U.injectIcons(host);
    $("#rw-back").addEventListener("click", function () { if (dirtyCount() && !confirm("You have unsaved scores. Leave without saving?")) return; dirty = {}; back(); });
    $$(".rw-tabs button", host).forEach(function (b) { b.addEventListener("click", function () { tab = b.getAttribute("data-t"); draw(); }); });
    ({ scores: scores, register: register, pupils: pupils, submit: submit })[tab]();
  }

  /* ---------- class register: every pupil with admission number ---------- */
  function register() {
    var body = $("#rw-body"), L = ws.students;
    if (!L.length) { body.innerHTML = '<div class="empty"><h3>No pupils in this class yet</h3><p>An administrator adds pupils under Pupils and parents, Student register.</p></div>'; return; }
    var m = L.filter(function (x) { return x.sex === "male"; }).length, f = L.filter(function (x) { return x.sex === "female"; }).length;
    body.innerHTML = '<div class="reg-head"><p class="count-line" style="margin:0">' + L.length + " pupils" + (m || f ? " · " + m + " boys · " + f + " girls" : "") + '</p><div class="form-actions"><button type="button" class="btn btn-soft btn-sm" id="cr-csv">Export CSV</button><button type="button" class="btn btn-soft btn-sm" id="cr-prt">Print</button></div></div>' +
      '<div class="ad-table-wrap"><table class="ad-table reg-table"><thead><tr><th>No.</th><th>Admission no.</th><th>Name</th><th>Sex</th><th>Student ID</th></tr></thead><tbody>' + L.map(function (x, i) {
        return "<tr><td>" + (i + 1) + "</td><td>" + (x.admission_no ? "<strong>" + esc(x.admission_no) + "</strong>" : "<small>Not set</small>") + "</td><td>" + esc(x.last_name + " " + x.first_name) + "</td><td>" + (x.sex === "male" ? "M" : x.sex === "female" ? "F" : "") + "</td><td>" + esc(x.student_code || "") + "</td></tr>";
      }).join("") + "</tbody></table></div>";
    var cell = function (v) { v = String(v == null ? "" : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    $("#cr-csv").addEventListener("click", function () { U.download("class-register-" + ws.class.name.replace(/\W+/g, "-").toLowerCase() + ".csv", "text/csv;charset=utf-8", "\ufeff" + ["Admission no,Surname,First name,Sex,Student ID"].concat(L.map(function (x) { return [x.admission_no, x.last_name, x.first_name, x.sex, x.student_code].map(cell).join(","); })).join("\r\n")); });
    $("#cr-prt").addEventListener("click", function () {
      U.printHTML('<div class="ai-print"><div class="ai-head"><div><h2>Umar BN L Khattob Nursery &amp; Primary School</h2><p>Class register: ' + esc(ws.class.name) + (ws.teacher && ws.teacher.name ? " · Class teacher: " + esc(ws.teacher.name) : "") + '</p></div></div><table class="reg-print"><thead><tr><th>No.</th><th>Admission no.</th><th>Name</th><th>Sex</th></tr></thead><tbody>' + L.map(function (x, i) { return "<tr><td>" + (i + 1) + "</td><td>" + esc(x.admission_no || "") + "</td><td>" + esc(x.last_name + " " + x.first_name) + "</td><td>" + (x.sex === "male" ? "M" : x.sex === "female" ? "F" : "") + "</td></tr>"; }).join("") + "</tbody></table></div>");
    });
  }

  /* ---------- scores ---------- */
  function scoreOf(subj, stu) { return ws.scores.filter(function (s) { return s.subject_id === subj && s.student_id === stu; })[0]; }
  function cur(subj, stu) {
    var d = (draft[subj] || {})[stu]; if (d) return d;
    var s = scoreOf(subj, stu) || {};
    return { first_ca: s.first_ca, second_ca: s.second_ca, exam: s.exam, remark: s.remark || "", tutor_sign: s.tutor_sign || "" };
  }
  function nv(x) { return x == null || x === "" ? null : Number(x); }
  function rowError(r) {
    var v = [nv(r.first_ca), nv(r.second_ca), nv(r.exam)], bad = v.some(function (x) { return x != null && (isNaN(x) || x < 0 || x > 100); });
    if (bad) return "Each score must be from 0 to 100.";
    if (v.reduce(function (t, x) { return t + (x || 0); }, 0) > 100) return "The total cannot be more than 100.";
    return "";
  }
  function scores() {
    var body = $("#rw-body"), basic = isBasic(), ed = ws.editable || [], editable = ed.indexOf(subjectId) > -1 && !ws.locked;
    if (!ws.subjects.length) { body.innerHTML = '<div class="empty"><h3>No subjects for this class yet</h3><p>An administrator needs to choose the subjects this class offers.</p></div>'; return; }
    var opts = ws.subjects.map(function (s) { return '<option value="' + esc(s.id) + '"' + (s.id === subjectId ? " selected" : "") + ">" + esc(s.name) + (ed.indexOf(s.id) > -1 ? "" : " (view only)") + "</option>"; }).join("");
    var cols = basic ? ["CA", "Exam"] : ["1st C.A", "2nd C.A", "Term's exam"];
    body.innerHTML = '<div class="toolbar"><div class="fld" style="min-width:230px"><label for="rw-sub">Subject</label><select class="select-lg" id="rw-sub">' + opts + '</select></div><span style="flex:1"></span><p class="count-line" id="rw-prog" style="margin:0"></p></div>' +
      (editable ? "" : '<p class="notice is-info"><span>' + (ws.locked ? "Locked." : "You can view this subject but not change it.") + "</span></p>") +
      '<div class="ad-table-wrap"><table class="ad-table rw-grid"><thead><tr><th>Pupil</th>' + cols.map(function (c) { return "<th>" + c + "</th>"; }).join("") + '<th>Total</th><th>Grade</th><th>Remark</th>' + (basic ? "" : "<th>Tutor's sign</th>") + '</tr></thead><tbody id="rw-rows"></tbody></table></div>' +
      '<div class="rw-savebar" id="rw-save" hidden><span id="rw-dirty"></span><span style="flex:1"></span><button type="button" class="btn btn-soft btn-sm" id="rw-discard">Discard</button><button type="button" class="btn btn-primary btn-sm" id="rw-do">Save scores</button></div>';
    $("#rw-sub").addEventListener("change", function () { subjectId = this.value; scores(); });
    var rows = $("#rw-rows"), fields = basic ? ["first_ca", "exam"] : ["first_ca", "second_ca", "exam"];
    rows.innerHTML = ws.students.map(function (s) {
      var r = cur(subjectId, s.id);
      return '<tr data-s="' + esc(s.id) + '"><td class="rw-name"><strong>' + esc(nameOf(s)) + "</strong><small>" + esc(s.student_code) + "</small></td>" +
        fields.map(function (f) { return '<td><input class="rw-in" inputmode="decimal" data-f="' + f + '" value="' + (r[f] == null ? "" : esc(R.fmt(Number(r[f])))) + '"' + (editable ? "" : " disabled") + ' aria-label="' + esc(nameOf(s)) + " " + f.replace("_", " ") + '"></td>'; }).join("") +
        '<td class="rw-tot"></td><td class="rw-gr"></td><td><input class="rw-tx" data-f="remark" maxlength="40" value="' + esc(r.remark) + '"' + (editable ? "" : " disabled") + ' aria-label="Remark for ' + esc(nameOf(s)) + '"></td>' +
        (basic ? "" : '<td><input class="rw-tx sm" data-f="tutor_sign" maxlength="40" value="' + esc(r.tutor_sign) + '"' + (editable ? "" : " disabled") + ' aria-label="Tutor sign for ' + esc(nameOf(s)) + '"></td>') + "</tr>";
    }).join("");
    function refresh(tr) {
      var id = tr.getAttribute("data-s"), r = cur(subjectId, id), err = rowError(r), has = r.first_ca != null || r.second_ca != null || r.exam != null;
      var t = has ? (nv(r.first_ca) || 0) + (nv(r.second_ca) || 0) + (nv(r.exam) || 0) : null;
      tr.querySelector(".rw-tot").textContent = t == null ? "" : R.fmt(t); tr.querySelector(".rw-gr").textContent = t == null || err ? "" : R.gradeOf(t, ws.grading).grade;
      tr.classList.toggle("rw-bad", !!err); tr.title = err;
      return err;
    }
    function summary() {
      var n = dirtyCount(), bad = $$(".rw-bad", rows).length;
      $("#rw-save").hidden = !n; $("#rw-dirty").textContent = n + " pupil" + (n === 1 ? "" : "s") + " with unsaved changes" + (bad ? " · fix " + bad + " highlighted row" + (bad === 1 ? "" : "s") : "");
      $("#rw-do").disabled = !!bad;
      var done = ws.students.filter(function (s) { var r = cur(subjectId, s.id); return r.exam != null && r.exam !== ""; }).length;
      $("#rw-prog").textContent = done + " of " + ws.students.length + " pupils have an exam score";
    }
    $$("tr", rows).forEach(function (tr) { refresh(tr); });
    summary();
    $$("input", rows).forEach(function (inp) {
      inp.addEventListener("input", function () {
        var tr = inp.closest("tr"), id = tr.getAttribute("data-s");
        var r = Object.assign({}, cur(subjectId, id)); r[inp.getAttribute("data-f")] = inp.value.trim().replace(",", ".");
        (draft[subjectId] = draft[subjectId] || {})[id] = r; (dirty[subjectId] = dirty[subjectId] || {})[id] = 1; refresh(tr); summary();
      });
      inp.addEventListener("keydown", function (e) {
        var k = e.key; if (k !== "Enter" && k !== "ArrowDown" && k !== "ArrowUp") return;
        e.preventDefault(); var tr = inp.closest("tr"), nx = k === "ArrowUp" ? tr.previousElementSibling : tr.nextElementSibling;
        if (nx) { var t = nx.querySelector('[data-f="' + inp.getAttribute("data-f") + '"]'); if (t) { t.focus(); t.select(); } }
      });
    });
    $("#rw-discard").addEventListener("click", function () { delete draft[subjectId]; delete dirty[subjectId]; scores(); });
    $("#rw-do").addEventListener("click", function () { saveScores(this); });
  }
  function saveScores(btn) {
    var subj = subjectId, ids = Object.keys(dirty[subj] || {}); if (!ids.length) return;
    var rows = ids.map(function (id) { var r = draft[subj][id], old = scoreOf(subj, id); return { student_id: id, first_ca: r.first_ca, second_ca: r.second_ca, exam: r.exam, remark: r.remark, tutor_sign: r.tutor_sign, version: old ? old.updated_at : null }; });
    btn.disabled = true; btn.textContent = "Saving...";
    rpc("save_scores", { p_class: ws.class.id, p_subject: subj, p_rows: rows }).then(function (res) {
      var sv = {}; res.saved.forEach(function (x) { sv[x.student_id] = x.updated_at; });
      res.saved.forEach(function (x) {
        var r = draft[subj][x.student_id], old = scoreOf(subj, x.student_id);
        var n = { student_id: x.student_id, subject_id: subj, first_ca: nv(r.first_ca), second_ca: nv(r.second_ca), exam: nv(r.exam), remark: r.remark || null, tutor_sign: r.tutor_sign || null, updated_at: x.updated_at };
        if (old) Object.assign(old, n); else ws.scores.push(n);
        delete draft[subj][x.student_id]; delete dirty[subj][x.student_id];
      });
      res.conflicts.forEach(function (c) {
        var old = scoreOf(subj, c.student_id), n = { student_id: c.student_id, subject_id: subj, first_ca: c.first_ca, second_ca: c.second_ca, exam: c.exam, remark: c.remark, tutor_sign: c.tutor_sign, updated_at: c.updated_at };
        if (old) Object.assign(old, n); else ws.scores.push(n);
        delete draft[subj][c.student_id]; delete dirty[subj][c.student_id];
      });
      if (res.conflicts.length) {
        var names = res.conflicts.map(function (c) { var s = ws.students.filter(function (x) { return x.id === c.student_id; })[0]; return s ? nameOf(s) : ""; }).join(", ");
        toast("Not saved for " + names + ": someone else saved newer scores first. Their values are now shown. Check them and re-enter if needed.", false);
      } else toast("Scores saved.", true);
      scores();
    }, function (e) { toast(nice(e), false); btn.disabled = false; btn.textContent = "Save scores"; });
  }

  /* ---------- pupils ---------- */
  function detailsDone(s) {
    var rated = Object.keys(isBasic() ? (s.behaviour || {}) : Object.assign({}, s.skills, s.behaviour)).length;
    return s.time_present != null && !!s.class_teacher_remark && rated > 0;
  }
  function scoresDone(s) { return ws.subjects.every(function (sb) { var r = scoreOf(sb.id, s.id); return r && r.exam != null; }); }
  function pupils() {
    var body = $("#rw-body");
    if (!ws.students.length) { body.innerHTML = '<div class="empty"><h3>No pupils in this class yet</h3><p>An administrator adds pupils under Pupils and parents.</p></div>'; return; }
    var s = ws.students.filter(function (x) { return x.id === pupilId; })[0] || ws.students[0], i = ws.students.indexOf(s), disabled = ws.locked ? " disabled" : "";
    var complete = ws.students.filter(function (x) { return detailsDone(x) && scoresDone(x); }).length;
    function rating(group, label, vals, v) {
      return '<label class="rw-rate"><span>' + esc(label) + '</span><select class="select-lg" data-g="' + group + '" data-k="' + esc(label) + '"' + disabled + '><option value="">-</option>' + vals.map(function (x) { return '<option' + (String(v) === x ? " selected" : "") + ">" + x + "</option>"; }).join("") + "</select></label>";
    }
    var S = ws.settings, ratings = isBasic()
      ? '<h3 class="rw-h">Affective domain (5 is best, 1 is lowest)</h3><div class="rw-rates">' + (S.affective_list || []).map(function (k) { return rating("behaviour", k, ["5", "4", "3", "2", "1"], (s.behaviour || {})[k]); }).join("") + "</div>"
      : '<h3 class="rw-h">Skills (A is best, E is lowest)</h3><div class="rw-rates">' + (S.skills_list || []).map(function (k) { return rating("skills", k, ["A", "B", "C", "D", "E"], (s.skills || {})[k]); }).join("") + '</div><h3 class="rw-h">Behaviour</h3><div class="rw-rates">' + (S.behaviour_list || []).map(function (k) { return rating("behaviour", k, ["A", "B", "C", "D", "E"], (s.behaviour || {})[k]); }).join("") + "</div>";
    body.innerHTML = '<div class="toolbar"><button type="button" class="btn btn-soft btn-sm" id="pu-prev"' + (i ? "" : " disabled") + '>&larr; Previous</button><div class="fld" style="flex:1;min-width:210px"><label for="pu-sel" class="sr-only">Pupil</label><select class="select-lg" id="pu-sel">' +
      ws.students.map(function (x) { return '<option value="' + esc(x.id) + '"' + (x.id === s.id ? " selected" : "") + ">" + (detailsDone(x) && scoresDone(x) ? "✓ " : "○ ") + esc(nameOf(x)) + "</option>"; }).join("") + '</select></div><button type="button" class="btn btn-soft btn-sm" id="pu-next"' + (i < ws.students.length - 1 ? "" : " disabled") + '>Next &rarr;</button></div>' +
      (ws.locked ? "" : '<details class="panel" style="margin:.6rem 0"><summary><b>Fill "times present" from the register</b></summary><p class="count-line">Each school day marked present or late counts 2 (morning and afternoon). Weekends and holidays are not counted.</p><div class="toolbar"><div class="fld"><label for="pu-from">Term begins</label><input class="input" id="pu-from" type="date"></div><div class="fld"><label for="pu-to">Term ends</label><input class="input" id="pu-to" type="date"></div><button type="button" class="btn btn-primary btn-sm" id="pu-fill">Fill for the whole class</button></div><p class="result" id="pu-fill-res" role="status"></p></details>') +
      '<div class="rw-meter" role="img" aria-label="' + complete + " of " + ws.students.length + ' pupils complete"><span style="width:' + Math.round(complete / ws.students.length * 100) + '%"></span></div><p class="count-line">' + complete + " of " + ws.students.length + " pupils complete (✓ = scores and details done)</p>" +
      '<form id="pu-form" novalidate><div class="form-grid"><div class="fld"><label for="pf-tp">No. of times present</label><input class="input" id="pf-tp" type="number" min="0" max="400" value="' + (s.time_present == null ? "" : s.time_present) + '"' + disabled + '></div>' +
      '<div class="fld"><label for="pf-wt">Weight (e.g. 21 kg)</label><input class="input" id="pf-wt" maxlength="12" value="' + esc(s.weight || "") + '"' + disabled + '></div><div class="fld"><label for="pf-ht">Height (e.g. 118 cm)</label><input class="input" id="pf-ht" maxlength="12" value="' + esc(s.height || "") + '"' + disabled + '></div></div>' +
      '<div class="pf-photo"><span class="pf-img">' + (s.photo ? '<img src="' + esc(s.photo) + '" alt="Photo of ' + esc(nameOf(s)) + '">' : "<em>No photo</em>") + '</span><div><label for="pf-pic"><b>Passport photo for the report sheet</b></label><input class="input" id="pf-pic" type="file" accept="image/*"' + disabled + '><p class="count-line" style="margin:.3rem 0">Face the camera, plain background. It is shrunk to a small passport size automatically.</p>' + (s.photo && !ws.locked ? '<button type="button" class="btn btn-soft btn-sm" id="pf-rm">Remove photo</button>' : "") + '<p class="result" id="pf-pres" role="status"></p></div></div>' +
      ratings + '<div class="fld" style="margin-top:1rem"><label for="pf-cm">Class teacher\'s comment</label><textarea class="textarea" id="pf-cm" maxlength="300" style="min-height:90px"' + disabled + ">" + esc(s.class_teacher_remark || "") + '</textarea></div>' +
      '<div class="form-actions" style="margin-top:1rem"><button type="submit" class="btn btn-primary"' + disabled + '>Save details</button><button type="button" class="btn btn-soft" id="pu-prev-sheet">Preview this sheet</button></div><div class="result" id="pf-res" role="status"></div></form>';
    var pic = $("#pf-pic"), rm = $("#pf-rm"), pres = $("#pf-pres");
    function setPhoto(v, msg) { return rpc("set_student_photo", { p_student: s.id, p_photo: v }).then(function () { s.photo = v; toast(msg, true); pupils(); }, function (er) { pres.className = "result show bad"; pres.textContent = /invalid:photo/.test(er.message || "") ? "That photo is not allowed." : nice(er); }); }
    if (pic) pic.addEventListener("change", function () { var f = pic.files[0]; if (!f) return; pres.className = "result show ok"; pres.textContent = "Saving photo..."; toJpeg(f).then(function (d) { return setPhoto(d, "Photo saved."); }, function (er) { pres.className = "result show bad"; pres.textContent = er.message; }); });
    if (rm) rm.addEventListener("click", function () { setPhoto(null, "Photo removed."); });
    $("#pu-sel").addEventListener("change", function () { pupilId = this.value; pupils(); });
    $("#pu-prev").addEventListener("click", function () { pupilId = ws.students[i - 1].id; pupils(); });
    var fl = $("#pu-fill"); if (fl) fl.addEventListener("click", function () {
      var a = $("#pu-from").value, z = $("#pu-to").value, r = $("#pu-fill-res"); if (!a || !z) { r.className = "result show bad"; r.textContent = "Pick the day the term begins and ends."; return; }
      fl.disabled = true; rpc("fill_times_present", { p_class: ws.class.id, p_from: a, p_to: z }).then(function (rows) { rows.forEach(function (x) { var st = ws.students.filter(function (y) { return y.id === x.id; })[0]; if (st) st.time_present = x.time_present; }); toast("Times present filled for " + rows.length + " pupils.", true); pupils(); }, function (er) { fl.disabled = false; r.className = "result show bad"; r.textContent = /invalid:dates/.test(er.message || "") ? "Check the dates." : nice(er); });
    });
    $("#pu-next").addEventListener("click", function () { pupilId = ws.students[i + 1].id; pupils(); });
    $("#pu-prev-sheet").addEventListener("click", function () { previewSheets([s.id]); });
    $("#pu-form").addEventListener("submit", function (e) {
      e.preventDefault(); var res = $("#pf-res"), g = { skills: {}, behaviour: {} };
      $$("select[data-g]", host).forEach(function (sel) { if (sel.value) g[sel.getAttribute("data-g")][sel.getAttribute("data-k")] = sel.value; });
      var patch = { time_present: $("#pf-tp").value, weight: $("#pf-wt").value, height: $("#pf-ht").value, class_teacher_remark: $("#pf-cm").value, behaviour: g.behaviour };
      if (!isBasic()) patch.skills = g.skills;
      rpc("save_student_details", { p_student: s.id, p_patch: patch }).then(function () {
        s.time_present = patch.time_present === "" ? null : +patch.time_present; s.weight = patch.weight || null; s.height = patch.height || null; s.class_teacher_remark = patch.class_teacher_remark || null; s.behaviour = patch.behaviour; if (patch.skills) s.skills = patch.skills;
        toast("Details saved.", true); pupils();
      }, function (er) { res.className = "result show bad"; res.textContent = nice(er); });
    });
  }

  /* ---------- preview / submit ---------- */
  function previewSheets(ids) {
    $("#ad-dlg-t").textContent = "Report sheet preview";
    $("#ad-dlg-b").innerHTML = '<div class="rw-prev"></div><div class="form-actions" style="margin-top:1rem"><button type="button" class="btn btn-primary" id="rp-print">Print or save as PDF</button></div>';
    var payloads = ids.map(function (id) { return R.fromWorkspace(ws, id); });
    U.openDialog($("#ad-dlg"));
    R.mount($("#ad-dlg-b .rw-prev"), payloads);
    $("#rp-print").addEventListener("click", function () { R.print(payloads, ws.class.name + " report sheets"); });
  }
  function submit() {
    var body = $("#rw-body"), missS = 0, missD = 0, exp = ws.students.length * ws.subjects.length;
    ws.students.forEach(function (s) { if (!detailsDone(s)) missD++; ws.subjects.forEach(function (sb) { var r = scoreOf(sb.id, s.id); if (!r || r.exam == null) missS++; }); });
    var mine = ws.access === "class_teacher", sig = ws.teacher && ws.teacher.signature_path, can = !ws.locked && ws.approval.status !== "submitted";
    function item(ok, text) { return '<li class="' + (ok ? "ok" : "todo") + '"><span aria-hidden="true">' + (ok ? "✓" : "○") + "</span> " + esc(text) + "</li>"; }
    body.innerHTML = '<div class="two-col"><article class="panel"><h3>Before you submit</h3><ul class="rw-check">' +
      item(missS === 0 && exp > 0, missS === 0 && exp > 0 ? "All scores entered" : missS + " of " + exp + " scores still missing") +
      item(missD === 0 && ws.students.length > 0, missD === 0 && ws.students.length > 0 ? "All pupil details and comments done" : missD + " pupil" + (missD === 1 ? "" : "s") + " still need details or a comment") +
      item(!!sig, sig ? "Your signature is uploaded" : "Upload your signature (optional but recommended)") + '</ul>' +
      '<p class="count-line">Status: ' + pill(ws.approval.status) + '</p><div class="form-actions">' +
      '<button type="button" class="btn btn-soft" id="sb-prev">Preview all sheets</button>' +
      '<button type="button" class="btn btn-primary" id="sb-go"' + (can ? "" : " disabled") + ">" + (ws.approval.status === "submitted" ? "Submitted" : "Submit for printing") + '</button></div><div class="result" id="sb-res" role="status"></div></article>' +
      (mine ? '<article class="panel"><h3>Your signature</h3><p class="count-line">A clear PNG or JPG of your signature on a white or transparent background (up to 300 KB). It prints on the class teacher\'s sign line. The school stamp and the head\'s signature stay blank for you to add by hand.</p>' +
        (sig ? '<p><img class="rw-sig" src="' + esc(B.url + "/storage/v1/object/public/signatures/" + sig) + '" alt="Your signature"></p>' : "") +
        '<div class="fld"><label for="sg-file">Choose image</label><input class="input" id="sg-file" type="file" accept="image/png,image/jpeg"></div><div class="result" id="sg-res" role="status"></div></article>' : "") + "</div>";
    $("#sb-prev").addEventListener("click", function () { if (!ws.students.length) { toast("There are no pupils in this class yet.", false); return; } previewSheets(ws.students.map(function (s) { return s.id; })); });
    $("#sb-go").addEventListener("click", function () {
      var warn = missS || missD ? "Some scores or details are still missing. Submit anyway?" : "Submit this class for printing? You will not be able to edit after it is approved.";
      if (!confirm(warn)) return;
      rpc("submit_class", { p_class: ws.class.id }).then(function () { toast("Submitted. The administrator will review it.", true); return reload(); }, function (e) { var r = $("#sb-res"); r.className = "result show bad"; r.textContent = nice(e); });
    });
    var f = $("#sg-file"); if (f) f.addEventListener("change", function () { uploadSignature(f.files[0]); });
  }
  function uploadSignature(file) {
    var res = $("#sg-res"); if (!file) return;
    if (!/^image\/(png|jpeg)$/.test(file.type) || file.size > 300 * 1024) { res.className = "result show bad"; res.textContent = "Choose a PNG or JPG of 300 KB or less."; return; }
    var uid = A.uid(), path = uid + "/sig-" + Date.now() + (file.type === "image/png" ? ".png" : ".jpg");
    A.fresh().then(function (tok) {
      return fetch(B.url + "/storage/v1/object/signatures/" + path, { method: "POST", headers: { apikey: B.key, Authorization: "Bearer " + tok, "Content-Type": file.type }, body: file });
    }).then(function (r) { if (!r.ok) throw new Error("upload_failed"); return rpc("set_my_signature", { p_path: path }); })
      .then(function () { toast("Signature saved.", true); return reload(); }, function (e) { res.className = "result show bad"; res.textContent = "Could not upload the signature. " + nice(e); });
  }

  A.teach = teach; A.openClass = openClass;
})();
