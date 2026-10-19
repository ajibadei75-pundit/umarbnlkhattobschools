/* Dashboard: "Results and reports" for administrators.
   Four parts: Progress and approvals, Classes and subjects, Teachers, Report settings and grading.
   Section rules (Nursery/Primary vs J.S.S.) are enforced by the database; this screen only offers what is allowed. */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, $$ = U.$$, esc = U.esc;
  var A = window.UBK_ADMIN, R = window.UBK_REPORT;
  if (!A) return;
  var ST = { draft: "In progress", submitted: "Waiting for approval", approved: "Approved", rejected: "Sent back" };
  var LV = { nursery: "Nursery", primary: "Primary", secondary: "J.S.S." };
  var host, sub = "progress";

  function api(m, p, b, x) { return A.api(m, p, b, x); }
  function rpc(n, b) { return api("POST", "/rest/v1/rpc/" + n, b || {}); }
  function nice(e) { var m = (e && e.message) || ""; if (/duplicate|unique/.test(m)) return "That already exists."; if (/forbidden/.test(m)) return "You do not have permission for that."; return A.nice(m); }
  function pill(s) { return '<span class="status-pill st-' + (s === "approved" ? "offered" : s === "rejected" ? "declined" : s === "submitted" ? "under_review" : "") + '">' + esc(ST[s] || s) + "</span>"; }
  function note(el, ok, msg) { if (!el) return; el.className = "result show " + (ok ? "ok" : "bad"); el.textContent = msg; }
  function lines(v) { return (v || []).join("\n"); }
  function split(t) { return String(t || "").split("\n").map(function (x) { return x.trim(); }).filter(Boolean); }

  function results(h) {
    host = h;
    var tabs = [["progress", "Progress and approvals"], ["classes", "Classes and subjects"], ["teachers", "Teachers"], ["settings", "Report settings"]];
    host.innerHTML = '<h2 class="sec-title" style="font-size:1.2rem">Results and reports</h2>' +
      '<div class="level-tabs rw-tabs" role="tablist" aria-label="Results sections">' + tabs.map(function (x) { return '<button type="button" role="tab" data-s="' + x[0] + '" aria-selected="' + (x[0] === sub) + '">' + esc(x[1]) + "</button>"; }).join("") + '</div><div id="rs-body"></div>';
    $$(".rw-tabs button", host).forEach(function (b) { b.addEventListener("click", function () { sub = b.getAttribute("data-s"); results(host); }); });
    var body = $("#rs-body"); body.innerHTML = '<p class="count-line">Loading...</p>';
    ({ progress: progress, classes: classes, teachers: teachers, settings: settings })[sub](body);
  }
  function fail(body, e) { body.innerHTML = '<div class="notice"><span>' + esc(nice(e)) + "</span></div>"; }

  /* ---------- progress and approvals ---------- */
  function progress(body) {
    rpc("admin_class_progress").then(function (list) {
      if (!list.length) { body.innerHTML = '<div class="empty"><h3>No classes yet</h3><p>Open "Classes and subjects" and add the first class.</p></div>'; return; }
      var rows = list.map(function (c) {
        var pc = c.expected ? Math.round(c.entered / c.expected * 100) : 0;
        return '<tr data-c="' + esc(c.id) + '"><td><strong>' + esc(c.name) + "</strong><small style=\"display:block;color:var(--text-muted)\">" + (c.section === "secondary" ? "J.S.S. sheet" : "Nursery & Primary sheet") + "</small></td><td>" + c.students + "</td><td>" + esc(c.teacher || "Not assigned") + "</td>" +
          '<td><div class="rw-meter" role="img" aria-label="' + pc + '% of exam scores entered"><span style="width:' + pc + '%"></span></div><small>' + c.entered + " of " + c.expected + "</small></td><td>" + pill(c.status) + (c.status === "rejected" && c.note ? "<small style=\"display:block\">" + esc(c.note) + "</small>" : "") + "</td>" +
          '<td class="ad-acts"><button type="button" class="btn btn-soft btn-sm" data-act="open">Open</button>' +
          (c.status === "submitted" ? '<button type="button" class="btn btn-primary btn-sm" data-act="approve">Approve</button><button type="button" class="btn btn-soft btn-sm" data-act="reject">Send back</button>' : "") +
          (c.status === "approved" ? '<button type="button" class="btn btn-primary btn-sm" data-act="print">Print class</button><button type="button" class="btn btn-soft btn-sm" data-act="reopen">Reopen</button>' : "") + "</td></tr>";
      }).join("");
      var okB = list.filter(function (c) { return c.status === "approved" && c.section === "basic"; }).length, okS = list.filter(function (c) { return c.status === "approved" && c.section === "secondary"; }).length;
      body.innerHTML = '<div class="toolbar"><p class="count-line" style="margin:0">Only approved classes can be printed. Approving locks the class.</p><span style="flex:1"></span>' +
        '<button type="button" class="btn btn-soft btn-sm" data-all="basic"' + (okB ? "" : " disabled") + '>Print all Nursery &amp; Primary (' + okB + ')</button><button type="button" class="btn btn-soft btn-sm" data-all="secondary"' + (okS ? "" : " disabled") + '>Print all J.S.S. (' + okS + ')</button></div>' +
        '<div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>Class</th><th>Pupils</th><th>Class teacher</th><th>Exam scores</th><th>Status</th><th>Actions</th></tr></thead><tbody>' + rows + '</tbody></table></div><p class="result" id="rs-res" role="status"></p>';
      var res = $("#rs-res");
      function again() { results(host); }
      $$("[data-act]", body).forEach(function (b) {
        b.addEventListener("click", function () {
          var id = b.closest("tr").getAttribute("data-c"), act = b.getAttribute("data-act");
          if (act === "open") return A.openClass(host, id, again);
          if (act === "print") return printClasses([id], res);
          var st = act === "approve" ? "approved" : act === "reopen" ? "draft" : "rejected", n = null;
          if (act === "reject") { n = prompt("What should the teacher fix? (shown to the teacher)"); if (n == null) return; n = n.trim(); if (!n) return note(res, false, "Please write a short note for the teacher."); }
          if (act === "approve" && !confirm("Approve and lock this class? Teachers will not be able to change scores until it is reopened.")) return;
          b.disabled = true; rpc("review_class", { p_class: id, p_status: st, p_note: n }).then(again, function (e) { b.disabled = false; note(res, false, nice(e)); });
        });
      });
      $$("[data-all]", body).forEach(function (b) {
        b.addEventListener("click", function () {
          var sec = b.getAttribute("data-all");
          printClasses(list.filter(function (c) { return c.status === "approved" && c.section === sec; }).map(function (c) { return c.id; }), res);
        });
      });
    }, function (e) { fail(body, e); });
  }
  function printClasses(ids, res) {
    if (!R) return note(res, false, "Report sheets are not available on this page.");
    note(res, true, "Preparing " + ids.length + " class" + (ids.length === 1 ? "" : "es") + "...");
    Promise.all(ids.map(function (id) { return rpc("class_workspace", { p_class: id }); })).then(function (all) {
      var payloads = [];
      all.forEach(function (ws) { ws.students.forEach(function (s) { payloads.push(R.fromWorkspace(ws, s.id)); }); });
      if (!payloads.length) return note(res, false, "There are no pupils to print.");
      note(res, true, payloads.length + " sheet" + (payloads.length === 1 ? "" : "s") + " ready. Choose \"Save as PDF\" in the print window to keep a copy.");
      R.print(payloads, "Report sheets");
    }, function (e) { note(res, false, nice(e)); });
  }

  /* ---------- classes and subjects ---------- */
  function classes(body) {
    Promise.all([api("GET", "/rest/v1/classes?select=*&order=section.desc,sort.asc,name.asc"), api("GET", "/rest/v1/subjects?select=*&order=name.asc"), api("GET", "/rest/v1/class_subjects?select=class_id,subject_id&limit=5000")]).then(function (r) {
      var cl = r[0], sb = r[1], cs = r[2], on = {};
      cs.forEach(function (x) { on[x.class_id + "|" + x.subject_id] = 1; });
      body.innerHTML = '<div class="two-col"><article class="panel"><h3>Add a class</h3><form id="cl-add" novalidate><div class="form-grid"><div class="fld"><label for="cl-n">Class name</label><input class="input" id="cl-n" maxlength="40" placeholder="e.g. Primary 3 or JSS 1"></div>' +
        '<div class="fld"><label for="cl-l">Level</label><select class="select-lg" id="cl-l"><option value="nursery">Nursery</option><option value="primary">Primary</option><option value="secondary">J.S.S. (secondary)</option></select></div></div>' +
        '<label class="check"><input type="checkbox" id="cl-all" checked> Offer all subjects of its section</label><div class="form-actions"><button class="btn btn-primary" type="submit">Add class</button></div><p class="result" id="cl-res" role="status"></p></form></article>' +
        '<article class="panel"><h3>Add a subject</h3><form id="sb-add" novalidate><div class="form-grid"><div class="fld"><label for="sb-n">Subject name</label><input class="input" id="sb-n" maxlength="60"></div>' +
        '<div class="fld"><label for="sb-s">Section</label><select class="select-lg" id="sb-s"><option value="basic">Nursery &amp; Primary</option><option value="secondary">J.S.S.</option></select></div></div><div class="form-actions"><button class="btn btn-primary" type="submit">Add subject</button></div><p class="result" id="sb-res" role="status"></p></form></article></div>' +
        '<h3 class="rw-h">Classes, subjects offered, and pupils</h3>' + (cl.length ? cl.map(function (c) {
          var mine = sb.filter(function (s) { return s.section === c.section; });
          return '<details class="panel" style="margin:.6rem 0"><summary><strong>' + esc(c.name) + "</strong> · " + esc(LV[c.level]) + " · " + (c.section === "secondary" ? "J.S.S. sheet" : "Nursery & Primary sheet") + "</summary>" +
            '<p class="count-line">Tick the subjects this class offers (' + (c.section === "secondary" ? "J.S.S." : "Nursery & Primary") + ' subjects only).</p><div class="rw-rates">' + mine.map(function (s) {
              return '<label class="check"><input type="checkbox" data-cs="' + esc(c.id) + '" value="' + esc(s.id) + '"' + (on[c.id + "|" + s.id] ? " checked" : "") + "> " + esc(s.name) + "</label>";
            }).join("") + '</div><h4 style="margin:1rem 0 .3rem">Add pupils</h4><p class="count-line">One pupil per line: Full name, Sex (M or F).</p><textarea class="input" rows="4" data-st="' + esc(c.id) + '" placeholder="Aisha Garba, F&#10;Musa Bello, M"></textarea>' +
            '<div class="form-actions"><button type="button" class="btn btn-soft btn-sm" data-addst="' + esc(c.id) + '">Add pupils</button></div><p class="result" data-res="' + esc(c.id) + '" role="status"></p></details>';
        }).join("") : '<div class="empty"><h3>No classes yet</h3><p>Add your first class above.</p></div>') +
        '<h3 class="rw-h">Subject list</h3><div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>Subject</th><th>Section</th><th></th></tr></thead><tbody>' + sb.map(function (s) {
          return "<tr><td>" + esc(s.name) + "</td><td>" + (s.section === "secondary" ? "J.S.S." : "Nursery & Primary") + '</td><td><button type="button" class="btn btn-soft btn-sm" data-delsub="' + esc(s.id) + '">Remove</button></td></tr>';
        }).join("") + "</tbody></table></div><p class=\"result\" id=\"sl-res\" role=\"status\"></p>";
      $("#cl-add").addEventListener("submit", function (e) {
        e.preventDefault(); var n = $("#cl-n").value.trim(), r = $("#cl-res"); if (!n) return note(r, false, "Enter the class name.");
        rpc("admin_create_class", { p_name: n, p_level: $("#cl-l").value, p_offer_all: $("#cl-all").checked }).then(function () { results(host); }, function (er) { note(r, false, nice(er)); });
      });
      $("#sb-add").addEventListener("submit", function (e) {
        e.preventDefault(); var n = $("#sb-n").value.trim(), r = $("#sb-res"); if (!n) return note(r, false, "Enter the subject name.");
        api("POST", "/rest/v1/subjects", { name: n, section: $("#sb-s").value }, { Prefer: "return=minimal" }).then(function () { results(host); }, function (er) { note(r, false, nice(er)); });
      });
      $$("[data-cs]", body).forEach(function (cb) {
        cb.addEventListener("change", function () {
          var c = cb.getAttribute("data-cs"), s = cb.value, r = $("#sl-res");
          var p = cb.checked ? api("POST", "/rest/v1/class_subjects", { class_id: c, subject_id: s }, { Prefer: "return=minimal" }) : api("DELETE", "/rest/v1/class_subjects?class_id=eq." + encodeURIComponent(c) + "&subject_id=eq." + encodeURIComponent(s));
          p.then(function () { note(r, true, "Saved."); }, function (er) { cb.checked = !cb.checked; note(r, false, /score|foreign|violates/.test(er.message || "") ? "This subject already has scores in this class, so it cannot be removed." : nice(er)); });
        });
      });
      $$("[data-addst]", body).forEach(function (b) {
        b.addEventListener("click", function () {
          var id = b.getAttribute("data-addst"), ta = $('[data-st="' + id + '"]'), r = $('[data-res="' + id + '"]'); if (!ta.value.trim()) return note(r, false, "Type at least one pupil.");
          b.disabled = true; rpc("admin_add_students", { p_class: id, p_lines: ta.value }).then(function (j) { b.disabled = false; ta.value = ""; note(r, true, "Added " + ((j && j.added) != null ? j.added : "the") + " pupil(s)." + (j && j.skipped && j.skipped.length ? " Skipped: " + j.skipped.join("; ") : "")); }, function (er) { b.disabled = false; note(r, false, nice(er)); });
        });
      });
      $$("[data-delsub]", body).forEach(function (b) {
        b.addEventListener("click", function () {
          if (!confirm("Remove this subject? It is also removed from every class.")) return;
          api("DELETE", "/rest/v1/subjects?id=eq." + encodeURIComponent(b.getAttribute("data-delsub"))).then(function () { results(host); }, function (er) { note($("#sl-res"), false, /score|foreign|violates/.test(er.message || "") ? "This subject has scores recorded, so it cannot be removed." : nice(er)); });
        });
      });
    }, function (e) { fail(body, e); });
  }

  /* ---------- teachers ---------- */
  function teachers(body) {
    Promise.all([rpc("admin_list_teachers"), api("GET", "/rest/v1/classes?select=id,name,section&order=section.desc,sort.asc,name.asc"), api("GET", "/rest/v1/class_teachers?select=class_id,teacher_user_id"),
      api("GET", "/rest/v1/subject_teachers?select=class_id,subject_id,teacher_user_id"), api("GET", "/rest/v1/class_subjects?select=class_id,subject_id,subjects(name)&limit=5000")]).then(function (r) {
      var tl = r[0], cl = r[1], ct = r[2], st = r[3], cs = r[4], ctOf = {}, stOf = {};
      ct.forEach(function (x) { ctOf[x.class_id] = x.teacher_user_id; }); st.forEach(function (x) { stOf[x.class_id + "|" + x.subject_id] = x.teacher_user_id; });
      function opts(sel) { return '<option value="">Not assigned</option>' + tl.map(function (t) { return '<option value="' + esc(t.user_id) + '"' + (sel === t.user_id ? " selected" : "") + ">" + esc(t.name || t.email) + "</option>"; }).join(""); }
      if (!tl.length) { body.innerHTML = '<div class="empty"><h3>No teachers yet</h3><p>Create staff accounts with the role "teacher" in "Users and roles". They appear here.</p></div>'; return; }
      body.innerHTML = '<h3 class="rw-h" style="margin-top:0">Teachers</h3><div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>Name</th><th>Email</th><th>Classes</th><th>Signature</th></tr></thead><tbody>' + tl.map(function (t) {
        return "<tr><td>" + esc(t.name) + "</td><td>" + esc(t.email) + "</td><td>" + esc((t.classes || []).join(", ") || "None") + "</td><td>" + (t.signature ? "Uploaded" : "Not yet") + "</td></tr>";
      }).join("") + '</tbody></table></div><h3 class="rw-h">Assign teachers</h3><p class="count-line">Nursery &amp; Primary: one class teacher enters everything. J.S.S.: the class teacher writes remarks; each subject can have its own subject teacher.</p>' +
        cl.map(function (c) {
          var subj = cs.filter(function (x) { return x.class_id === c.id; });
          return '<details class="panel" style="margin:.6rem 0"><summary><strong>' + esc(c.name) + "</strong> · " + esc(ctOf[c.id] ? (tl.filter(function (t) { return t.user_id === ctOf[c.id]; })[0] || {}).name || "Assigned" : "No class teacher") + "</summary>" +
            '<div class="fld" style="max-width:340px"><label>Class teacher</label><select class="select-lg" data-ct="' + esc(c.id) + '">' + opts(ctOf[c.id]) + "</select></div>" +
            (c.section === "secondary" ? '<h4 style="margin:1rem 0 .4rem">Subject teachers</h4><div class="rw-rates">' + (subj.length ? subj.map(function (x) {
              return '<label class="rw-rate"><span>' + esc((x.subjects || {}).name || "") + '</span><select class="select-lg" data-stc="' + esc(c.id) + '" data-sid="' + esc(x.subject_id) + '">' + opts(stOf[c.id + "|" + x.subject_id]) + "</select></label>";
            }).join("") : '<p class="count-line">No subjects offered yet. Tick them under "Classes and subjects".</p>') + "</div>" : "") + "</details>";
        }).join("") + '<p class="result" id="tc-res" role="status"></p>';
      var res = $("#tc-res");
      $$("[data-ct]", body).forEach(function (s) {
        s.addEventListener("change", function () {
          var c = s.getAttribute("data-ct"), p = s.value
            ? api("POST", "/rest/v1/class_teachers?on_conflict=class_id", { class_id: c, teacher_user_id: s.value }, { Prefer: "resolution=merge-duplicates,return=minimal" })
            : api("DELETE", "/rest/v1/class_teachers?class_id=eq." + encodeURIComponent(c));
          p.then(function () { note(res, true, "Class teacher saved."); }, function (e) { note(res, false, nice(e)); });
        });
      });
      $$("[data-stc]", body).forEach(function (s) {
        s.addEventListener("change", function () {
          var c = s.getAttribute("data-stc"), sid = s.getAttribute("data-sid"), q = "class_id=eq." + encodeURIComponent(c) + "&subject_id=eq." + encodeURIComponent(sid);
          var p = s.value ? api("DELETE", "/rest/v1/subject_teachers?" + q).then(function () { return api("POST", "/rest/v1/subject_teachers", { class_id: c, subject_id: sid, teacher_user_id: s.value }, { Prefer: "return=minimal" }); }) : api("DELETE", "/rest/v1/subject_teachers?" + q);
          p.then(function () { note(res, true, "Subject teacher saved."); }, function (e) { note(res, false, nice(e)); });
        });
      });
    }, function (e) { fail(body, e); });
  }

  /* ---------- report settings and grading ---------- */
  function settings(body) {
    Promise.all([api("GET", "/rest/v1/report_settings?id=eq.1&select=*"), api("GET", "/rest/v1/grading_scale?select=*&order=min_score.desc")]).then(function (r) {
      var s = (r[0] || [])[0] || {}, g = r[1] || [];
      function f(id, label, v, extra) { return '<div class="fld"><label for="' + id + '">' + label + '</label><input class="input" id="' + id + '" value="' + esc(v == null ? "" : v) + '" ' + (extra || "") + "></div>"; }
      body.innerHTML = '<form id="rs-form" novalidate><div class="two-col"><article class="panel"><h3>Term details (printed on every sheet)</h3><div class="form-grid">' +
        '<div class="fld"><label for="rs-term">Term</label><select class="select-lg" id="rs-term">' + ["First", "Second", "Third"].map(function (t) { return "<option" + (s.term === t ? " selected" : "") + ">" + t + "</option>"; }).join("") + "</select></div>" +
        f("rs-sess", "Session (e.g. 2026/2027)", s.session_label, 'placeholder="2026/2027" maxlength="9"') + f("rs-next", "Next term begins", s.next_term_begins, 'type="date"') + f("rs-open", "Times school opened", s.times_school_opened, 'type="number" min="0" max="400"') +
        '<div class="fld"><label for="rs-head">Head of school title</label><select class="select-lg" id="rs-head">' + ["Head Mistress", "Head Master", "Principal"].map(function (t) { return "<option" + (s.head_title === t ? " selected" : "") + ">" + t + "</option>"; }).join("") + "</select></div></div></article>" +
        '<article class="panel"><h3>Sheet headings</h3><div class="form-grid">' + f("rs-bn", "Nursery &amp; Primary title", s.basic_name, 'maxlength="60"') + f("rs-bs", "Nursery &amp; Primary subtitle", s.basic_sub, 'maxlength="60"') +
        f("rs-sn", "J.S.S. title", s.secondary_name, 'maxlength="60"') + f("rs-cn", "J.S.S. second line", s.college_name, 'maxlength="60"') + f("rs-ar", "Arabic line (J.S.S.)", s.arabic_name, 'dir="rtl" lang="ar" maxlength="60"') + f("rs-ad", "Address", s.address, 'maxlength="80"') + "</div></article></div>" +
        '<div class="two-col"><article class="panel"><h3>Affective domain (Nursery &amp; Primary, rated 1 to 5)</h3><textarea class="input" id="rs-af" rows="8">' + esc(lines(s.affective_list)) + '</textarea><p class="count-line">One item per line.</p></article>' +
        '<article class="panel"><h3>Skills (J.S.S., rated A to E)</h3><textarea class="input" id="rs-sk" rows="8">' + esc(lines(s.skills_list)) + '</textarea><p class="count-line">One item per line. The sheet has room for 9.</p></article></div>' +
        '<article class="panel" style="margin-top:1rem"><h3>Behaviour (J.S.S., rated A to E)</h3><textarea class="input" id="rs-bh" rows="8">' + esc(lines(s.behaviour_list)) + '</textarea><p class="count-line">One item per line. The sheet has room for 15.</p></article>' +
        '<div class="form-actions"><button class="btn btn-primary" type="submit">Save report settings</button></div><p class="result" id="rs-res" role="status"></p></form>' +
        '<article class="panel" style="margin-top:1.2rem"><h3>Grading scale</h3><p class="count-line">One grade per line: lowest, highest, grade, remark. Example: 75, 100, A, Excellent. Ranges must cover 0 to 100 without overlap.</p><textarea class="input" id="gs-t" rows="7">' +
        esc(g.map(function (x) { return [x.min_score, x.max_score, x.grade, x.remark || ""].join(", "); }).join("\n")) + '</textarea><div class="form-actions"><button class="btn btn-soft" type="button" id="gs-save">Save grading scale</button></div><p class="result" id="gs-res" role="status"></p></article>';
      $("#rs-form").addEventListener("submit", function (e) {
        e.preventDefault(); var res = $("#rs-res"), sess = $("#rs-sess").value.trim();
        if (sess && !/^\d{4}\/\d{4}$/.test(sess)) return note(res, false, "Write the session like 2026/2027.");
        var sk = split($("#rs-sk").value), bh = split($("#rs-bh").value);
        if (sk.length > 9) return note(res, false, "The J.S.S. sheet has room for 9 skills.");
        if (bh.length > 15) return note(res, false, "The J.S.S. sheet has room for 15 behaviour items.");
        var o = $("#rs-open").value;
        var patch = { term: $("#rs-term").value, session_label: sess || null, next_term_begins: $("#rs-next").value || null, times_school_opened: o === "" ? null : +o, head_title: $("#rs-head").value,
          basic_name: $("#rs-bn").value.trim(), basic_sub: $("#rs-bs").value.trim(), secondary_name: $("#rs-sn").value.trim(), college_name: $("#rs-cn").value.trim(), arabic_name: $("#rs-ar").value.trim(), address: $("#rs-ad").value.trim(),
          affective_list: split($("#rs-af").value), skills_list: sk, behaviour_list: bh };
        api("PATCH", "/rest/v1/report_settings?id=eq.1", patch, { Prefer: "return=minimal" }).then(function () { note(res, true, "Saved. New sheets use these details straight away."); }, function (er) { note(res, false, nice(er)); });
      });
      $("#gs-save").addEventListener("click", function () {
        var res = $("#gs-res"), rows = [], bad = "";
        split($("#gs-t").value).forEach(function (l) { var p = l.split(",").map(function (x) { return x.trim(); }); if (p.length < 3 || isNaN(+p[0]) || isNaN(+p[1]) || !p[2]) bad = "Check this line: " + l; else rows.push({ min_score: +p[0], max_score: +p[1], grade: p[2], remark: p.slice(3).join(", ") || null }); });
        if (bad) return note(res, false, bad);
        if (!rows.length) return note(res, false, "Add at least one grade.");
        rows.sort(function (a, b) { return a.min_score - b.min_score; });
        var exp = 0; for (var i = 0; i < rows.length; i++) { if (rows[i].min_score !== exp || rows[i].max_score < rows[i].min_score) return note(res, false, "Ranges must run from 0 to 100 with no gap or overlap (problem near " + rows[i].grade + ")."); exp = rows[i].max_score + 1; }
        if (exp !== 101) return note(res, false, "Ranges must end at 100.");
        if (!confirm("Replace the grading scale? Existing sheets will use the new grades.")) return;
        api("DELETE", "/rest/v1/grading_scale?id=not.is.null").then(function () { return api("POST", "/rest/v1/grading_scale", rows, { Prefer: "return=minimal" }); }).then(function () { note(res, true, "Grading scale saved."); }, function (er) { note(res, false, nice(er) + " Reload this page and check the scale."); });
      });
    }, function (e) { fail(body, e); });
  }

  A.results = results;
})();
