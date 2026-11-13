/* Report sheets: scoring maths and the two A4 sheets (Nursery & Primary, and J.S.S. Statement of Result).
   One function turns a "payload" (class, pupil, subjects, scores, class totals, settings, grading) into the figures;
   the same payload feeds the on-screen preview, the parent view and the print/PDF output. Sizes are in millimetres so
   every sheet fits one A4 page with a 10 mm margin. Stamp and head's signature areas are left blank on purpose. */
(function () {
  "use strict";
  var U = window.UBK, esc = U.esc;
  var B = (window.UBK_SITE || {}).backend || {};

  /* ---------- maths ---------- */
  function num(v) { return v == null || v === "" ? null : Number(v); }
  function fmt(v) { if (v == null || isNaN(v)) return ""; return Math.abs(v - Math.round(v)) < 0.005 ? String(Math.round(v)) : (Math.round(v * 10) / 10).toFixed(1); }
  function ord(n) { var s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function gradeOf(score, grading) {
    if (score == null) return { grade: "", remark: "" };
    var s = Math.round(score), g = (grading || []).filter(function (x) { return s >= x.min && s <= x.max; })[0];
    return g ? { grade: g.grade, remark: g.remark || "" } : { grade: "", remark: "" };
  }
  /* Everything a sheet shows, worked out from the payload. Position is "dense": equal totals share a position. */
  function compute(p) {
    var by = {}; (p.scores || []).forEach(function (s) { by[s.subject_id] = s; });
    var rows = (p.subjects || []).map(function (sb) {
      var s = by[sb.id] || {}, a = num(s.first_ca), b = num(s.second_ca), e = num(s.exam);
      var has = e != null || a != null || b != null;
      var total = has ? (a || 0) + (b || 0) + (e || 0) : null;
      var all = ((p.class_totals || {})[sb.id] || []).map(Number), pos = null;
      if (total != null && all.length) { var higher = {}; all.forEach(function (t) { if (t > total) higher[t] = 1; }); pos = Object.keys(higher).length + 1; }
      var g = gradeOf(total, p.grading);
      var avg = all.length ? all.reduce(function (x, y) { return x + y; }, 0) / all.length : null;
      return { id: sb.id, name: sb.name, ca1: a, ca2: b, exam: e, total: total, avg: avg, max: all.length ? Math.max.apply(null, all) : null, min: all.length ? Math.min.apply(null, all) : null,
        grade: g.grade, gradeRemark: g.remark, position: pos, remark: s.remark || "", sign: s.tutor_sign || "" };
    });
    var done = rows.filter(function (r) { return r.total != null; });
    var sum = done.reduce(function (t, r) { return t + r.total; }, 0);
    var pct = done.length ? sum / (done.length * 100) * 100 : null;
    var by2 = done.slice().sort(function (x, y) { return y.total - x.total; });
    var gr = {}; done.forEach(function (r) { if (r.grade) gr[r.grade] = (gr[r.grade] || 0) + 1; });
    var go = gradeOf(pct, p.grading);
    var opos = null, ov = (p.overall_totals || []).map(Number);
    if (done.length && ov.length) { var hi = {}; ov.forEach(function (x) { if (x > sum + 1e-9) hi[x] = 1; }); opos = Object.keys(hi).length + 1; }
    return { opos: opos, size: (p.class || {}).size, rows: rows, sum: done.length ? sum : null, count: done.length, pct: pct, grade: go.grade, remark: go.remark, gradeCount: gr,
      best: by2.length > 2 ? by2.slice(0, 2).map(function (r) { return r.name; }) : [], weak: by2.length > 3 ? by2.slice(-2).reverse().map(function (r) { return r.name; }) : [] };
  }
  function longDate(iso) {
    if (!iso) return "";
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso); if (!m) return "";
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getUTCDay()] + ", " + ord(+m[3]) + " " +
      ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][+m[2] - 1] + ", " + m[1];
  }
  function logoSrc() { var i = document.querySelector(".brand-logo"); return i ? i.src : new URL("assets/img/logo.jpg", document.baseURI).href; }
  function sigUrl(path) { return path && B.url ? B.url + "/storage/v1/object/public/signatures/" + path.split("/").map(encodeURIComponent).join("/") : ""; }
  function sessionYears(s) { var m = /^(\d{4})\/(\d{4})$/.exec(s || ""); return m ? [m[1], m[2]] : ["", ""]; }

  /* ---------- pieces ---------- */
  var MOTTO = "Qur'an is our honour";
  function gcls(g) { var c = String(g || "").charAt(0).toUpperCase(); return c === "A" ? "ga" : c === "B" ? "gb" : c === "C" ? "gc" : c === "D" ? "gd" : c ? "gf" : ""; }
  function chip(g) { return g ? '<i class="rs-g ' + gcls(g) + '">' + esc(g) + "</i>" : ""; }
  function cell(label, value, cls) { return '<div class="rs-c ' + (cls || "") + '"><span class="rs-lab">' + esc(label) + '</span><b class="rs-val">' + esc(value == null || value === "" ? "—" : value) + "</b></div>"; }
  function lines(text, n) { return '<div class="rs-lines" style="--n:' + n + '"><span>' + esc(text || "") + "</span></div>"; }
  function signLine(label, img) { return '<div class="rs-sign"><span class="rs-lab">' + esc(label) + '</span><span class="rs-sigbox">' + (img ? '<img src="' + esc(img) + '" alt="">' : "") + "</span></div>"; }
  function fullName(st) { return ((st.first_name || "") + " " + (st.last_name || "")).trim(); }
  function pc(v) { return v == null ? 0 : Math.max(0, Math.min(100, v)); }
  function tot(v) { return v == null ? "" : '<b class="rs-tot" style="--p:' + pc(v) + '%">' + fmt(v) + "</b>"; }
  function band(p, c, kind) {
    var S = p.settings || {}, st = p.student, yrs = sessionYears(S.session_label);
    var title = kind === "jss" ? (S.secondary_name || "") : (S.basic_name || "");
    var sub = kind === "jss" ? (S.college_name || "") : (S.basic_sub || "");
    return '<header class="rs-band"><span class="rs-logobox"><img class="rs-logo" src="' + esc(logoSrc()) + '" alt=""></span><div class="rs-title">' +
      (kind === "jss" && S.arabic_name ? '<p class="rs-ar" dir="rtl" lang="ar">' + esc(S.arabic_name) + "</p>" : "") +
      '<h1 class="rs-slab">' + esc(title) + "</h1>" + (sub ? "<p class='rs-sub'>" + esc(sub) + "</p>" : "") + (S.address ? "<p class='rs-addr'>" + esc(S.address) + "</p>" : "") + "</div>" +
      '<div class="rs-tag"><span>' + esc(((S.term || "") + " Term").trim()) + "</span><em>" + esc(S.session_label || (yrs[0] ? yrs[0] + "/" + yrs[1] : "")) + "</em></div></header>" +
      '<div class="rs-ribbon"><span>' + (kind === "jss" ? "J.S.S. STATEMENT OF RESULT" : "PUPIL'S TERMLY REPORT") + '</span><span class="rs-id">ID: ' + esc(st.student_code || "") + "</span></div>";
  }
  function sexOf(st) { var s = String(st.sex || ""); return /^f/i.test(s) ? "Female" : /^m/i.test(s) ? "Male" : ""; }
  function shortDate(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? (+m[3]) + " " + ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+m[2] - 1] + " " + m[1] : ""; }
  function info(p, c, kind) {
    var S = p.settings || {}, st = p.student, open = num(S.times_school_opened), pres = num(st.time_present);
    var absent = open != null && pres != null ? Math.max(open - pres, 0) : null, pct = open && pres != null ? Math.min(100, Math.round(pres / open * 100)) : null;
    var g = cell("Name of pupil", fullName(st), "c4") + cell("Admission no.", st.admission_no || st.student_code, "c2") + cell("Gender", sexOf(st), "c2") +
      cell("Class", p.class.name, "c2") + cell("No. in class", p.class.size, "c2") + cell("Session", S.session_label, "c2") + cell("Next term begins", shortDate(S.next_term_begins), "c2") +
      cell("School opened", open == null ? "" : open + " days", "c2") + cell("Days present", pres == null ? "" : pres, "c2") + cell("Days absent", absent == null ? "" : absent, "c2") + cell("Attendance", pct == null ? "" : pct + "%", "c2");
    var photo = '<div class="rs-photo">' + (st.photo_url ? '<img src="' + esc(st.photo_url) + '" alt="">' : "<span>PASSPORT<br>PHOTO</span>") + "</div>";
    return '<div class="rs-idrow"><div class="rs-info">' + g + "</div>" + photo + "</div>";
  }
  function summary(c) {
    function t(l, v, x) { return '<div class="rs-t ' + (x || "") + '"><span>' + l + "</span><b>" + v + "</b></div>"; }
    return '<div class="rs-sum">' + t("Obtainable", c.count ? c.count * 100 : "—") + t("Obtained", c.sum == null ? "—" : fmt(c.sum)) + t("Average", c.pct == null ? "—" : fmt(c.pct) + "%", "hi") + t("Grade", c.grade ? esc(c.grade) : "—", "hi") + t("Position", c.opos ? ord(c.opos) + (c.size ? " <small>of " + c.size + "</small>" : "") : "—", "hi") + "</div>";
  }
  /* Grade analysis (how many subjects at each grade), the overall remark and the strongest / weakest subjects. */
  function analysis(p, c) {
    var scale = (p.grading || []).slice().sort(function (a, b) { return b.min - a.min; });
    var chips = scale.map(function (x) { var n = c.gradeCount[x.grade] || 0; return '<span class="rs-ga' + (n ? "" : " z") + '"><i class="rs-g ' + gcls(x.grade) + '">' + esc(x.grade) + "</i><b>" + n + "</b></span>"; }).join("");
    var note = (c.remark ? "<b>Overall:</b> " + esc(c.remark) + ". " : "") + (c.best.length ? "<b>Strongest:</b> " + c.best.map(esc).join(", ") + ". " : "") + (c.weak.length ? "<b>Needs support:</b> " + c.weak.map(esc).join(", ") + "." : "");
    return '<div class="rs-an"><div class="rs-anh"><span class="rs-lab">GRADE ANALYSIS</span><div class="rs-gas">' + chips + '</div></div><p class="rs-ann">' + note + "</p></div>";
  }
  function footer(p) {
    var g = (p.grading || []).slice().sort(function (a, b) { return b.min - a.min; }).map(function (x) { return '<span class="rs-kg"><i class="rs-g ' + gcls(x.grade) + '">' + esc(x.grade) + "</i>" + x.min + "–" + x.max + (x.remark ? " " + esc(x.remark) : "") + "</span>"; }).join("");
    return '<footer class="rs-foot"><p class="rs-mot">' + esc(MOTTO) + "</p></footer>";
  }

  /* ---------- Nursery & Primary ---------- */
  function basicSheet(p, c) {
    var S = p.settings || {}, st = p.student;
    var R = Math.max(18, c.rows.length), rowH = Math.min(6.2, 108 / R), fs = R > 22 ? 2.8 : 3.1;
    var body = "";
    for (var i = 0; i < R; i++) {
      var r = c.rows[i];
      body += '<tr style="height:' + rowH + 'mm">' + (r ? "<td class='l'>" + esc(r.name) + "</td><td>" + fmt(r.ca1 == null && r.ca2 == null ? null : (r.ca1 || 0) + (r.ca2 || 0)) + "</td><td>" + fmt(r.exam) + "</td><td class='tc'>" + tot(r.total) + "</td><td>" + fmt(r.avg) + "</td><td>" + fmt(r.max) + "</td><td>" + fmt(r.min) + "</td><td>" + chip(r.grade) + "</td><td>" + (r.position ? ord(r.position) : "") + "</td><td class='l sm'>" + esc(r.remark || r.gradeRemark) + "</td>" : "<td class='l'>&nbsp;</td><td></td><td></td><td class='tc'></td><td></td><td></td><td></td><td></td><td></td><td></td>") + "</tr>";
    }
    var aff = (S.affective_list || []).map(function (k) {
      var v = String((st.behaviour || {})[k] || "");
      return "<tr><td class='l'>" + esc(k) + "</td>" + [5, 4, 3, 2, 1].map(function (n) { return "<td>" + (v === String(n) ? '<i class="rs-dot on"></i>' : '<i class="rs-dot"></i>') + "</td>"; }).join("") + "</tr>";
    }).join("");
    var head = S.head_title || "Head Mistress";
    return '<section class="rs-page rs-basic">' + band(p, c, "basic") + info(p, c, "basic") +
      '<table class="rs-tbl" style="--fs:' + fs + 'mm"><colgroup><col style="width:44mm"><col style="width:12mm"><col style="width:13mm"><col style="width:17mm"><col style="width:14mm"><col style="width:14mm"><col style="width:14mm"><col style="width:13mm"><col style="width:17mm"><col style="width:36mm"></colgroup>' +
      "<thead><tr><th class='l'>SUBJECTS</th><th>CA</th><th>EXAM</th><th>TOTAL</th><th>CLASS AVG.</th><th>HIGH- EST</th><th>LOW- EST</th><th>GRADE</th><th>POSITION</th><th class='l'>REMARK</th></tr></thead><tbody>" + body + "</tbody></table>" +
      summary(c) + analysis(p, c) +
      '<div class="rs-bottom"><div class="rs-side"><div class="rs-card"><span class="rs-lab">CLASS TEACHER\'S COMMENT</span>' + lines(st.class_teacher_remark, 2) + signLine("Signature", sigUrl((p.teacher || {}).signature_path)) + "</div>" +
      '<div class="rs-card"><span class="rs-lab">' + esc(head.toUpperCase()) + "'S COMMENT</span>" + lines("", 2) + '<div class="rs-sign"><span class="rs-lab">Signature &amp; stamp</span><span class="rs-sigbox tall"></span></div></div></div>' +
      '<table class="rs-aff"><thead><tr><th class="l">AFFECTIVE DOMAIN</th><th>5</th><th>4</th><th>3</th><th>2</th><th>1</th></tr></thead><tbody>' + aff + '</tbody><tfoot><tr><td colspan="6">5 Excellent &middot; 4 Very good &middot; 3 Good &middot; 2 Fair &middot; 1 Poor</td></tr></tfoot></table></div>' +
      footer(p) + "</section>";
  }

  /* ---------- J.S.S. Statement of Result ---------- */
  function jssSheet(p, c) {
    var S = p.settings || {}, st = p.student;
    var R = Math.max(16, c.rows.length), rowH = Math.min(9.5, 128 / R);
    var body = "";
    for (var i = 0; i < R; i++) {
      var r = c.rows[i];
      body += '<tr style="height:' + rowH + 'mm">' + (r ? "<td class='l'>" + esc(r.name) + "</td><td>" + fmt(r.ca1) + "</td><td>" + fmt(r.ca2) + "</td><td>" + fmt(r.exam) + "</td><td class='tc'>" + tot(r.total) + "</td><td>" + fmt(r.avg) + "</td><td>" + chip(r.grade) + "</td><td>" + (r.position ? ord(r.position) : "") + "</td><td class='sm'>" + esc(r.sign) + "</td>" : "<td class='l'>&nbsp;</td><td></td><td></td><td></td><td class='tc'></td><td></td><td></td><td></td><td></td>") + "</tr>";
    }
    function panel(title, items, data, min) {
      items = (items || []).slice(); while (items.length < min) items.push("");
      return '<div class="rs-ph">' + esc(title) + "</div>" + items.map(function (k, i) { return '<div class="rs-pl"><span>' + (i + 1) + ". " + esc(k) + '</span><b>' + esc(k ? (data || {})[k] || "" : "") + "</b></div>"; }).join("");
    }
    return '<section class="rs-page rs-jss">' + band(p, c, "jss") + info(p, c, "jss") +
      '<div class="rs-jbox"><table class="rs-tbl"><colgroup><col style="width:32mm"><col style="width:11mm"><col style="width:11mm"><col style="width:13mm"><col style="width:15mm"><col style="width:13mm"><col style="width:11mm"><col style="width:15mm"><col style="width:13mm"></colgroup>' +
      "<thead><tr><th class='l'>SUBJECTS</th><th>1st C.A</th><th>2nd C.A</th><th>Term's Exam</th><th>Sum of Term Work</th><th>Class Avg.</th><th>Grade</th><th>Position</th><th>Tutor's Sign</th></tr></thead><tbody>" + body + "</tbody></table>" +
      '<div class="rs-panel">' + panel("SKILLS", S.skills_list, st.skills, 9) + panel("BEHAVIOUR", S.behaviour_list, st.behaviour, 15) + "</div></div>" +
      summary(c) + analysis(p, c) +
      '<div class="rs-jbot"><div class="rs-card"><span class="rs-lab">CLASS TEACHER\'S REMARK</span>' + lines(st.class_teacher_remark, 2) + signLine("Sign", sigUrl((p.teacher || {}).signature_path)) + "</div>" +
      '<div class="rs-card"><span class="rs-lab">' + esc(((S.head_title || "Principal") === "Head Master" ? "HEAD MASTER" : "PRINCIPAL").toUpperCase()) + "'S REMARKS</span>" + lines("", 2) + signLine("Sign & stamp", "") + "</div></div>" +
      '<div class="rs-rate"><b>RATING:</b> A Excellent &middot; B Very good &middot; C Good &middot; D Fair &middot; E Poor</div>' + footer(p) + "</section>";
  }

  function sheet(p) {
    var c = compute(p);
    return p.class.section === "secondary" ? jssSheet(p, c) : basicSheet(p, c);
  }
  /* Turn a class workspace (staff view) into one pupil's payload. Class totals are anonymous numbers only. */
  function fromWorkspace(ws, studentId) {
    var totals = {};
    (ws.scores || []).forEach(function (s) { if (s.exam == null) return; (totals[s.subject_id] = totals[s.subject_id] || []).push((+s.first_ca || 0) + (+s.second_ca || 0) + (+s.exam || 0)); });
    var st = (ws.students || []).filter(function (x) { return x.id === studentId; })[0];
    return { settings: ws.settings, grading: ws.grading, class: { id: ws.class.id, name: ws.class.name, level: ws.class.level, section: ws.class.section, size: (ws.students || []).length },
      student: st, subjects: ws.subjects, scores: (ws.scores || []).filter(function (s) { return s.student_id === studentId; }), class_totals: totals, teacher: ws.teacher };
  }

  /* ---------- styles ---------- */
  var CSS = "" +
    ".rs-page{--navy:#302078;--lav:#C5B9DE;--teal:#302078;--gold:#D5A43B;--red:#8a6a1c;width:210mm;height:297mm;padding:7mm 8mm;box-sizing:border-box;background:#fff;color:#1c1b2e;position:relative;overflow:hidden;font-family:Lato,Arial,sans-serif;font-size:3.1mm;line-height:1.2;display:flex;flex-direction:column;gap:2mm;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    ".rs-page:before{content:'';position:absolute;inset:0;background:url(@@LOGO@@) center 58%/118mm no-repeat;opacity:.03;pointer-events:none}" +
    ".rs-page *{box-sizing:border-box}.rs-page p,.rs-page h1{margin:0;max-width:none}.rs-page>*{position:relative}" +
    ".rs-band{display:flex;align-items:center;gap:4mm;background:#302078;color:#fff;border-radius:3mm 3mm 0 0;padding:3mm 4mm;border-bottom:1.2mm solid var(--gold)}" +
    ".rs-logobox{width:23mm;height:23mm;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;flex:none;box-shadow:0 0 0 .8mm var(--gold)}.rs-logo{width:20mm;height:20mm;object-fit:contain;border-radius:50%}" +
    ".rs-title{flex:1;text-align:center;min-width:0}.rs-slab{font:800 6.6mm/1.1 Montserrat,Poppins,Arial,sans-serif;letter-spacing:.25mm;color:#fff;text-transform:uppercase}" +
    ".rs-sub{font:700 3.3mm Montserrat,Arial,sans-serif;color:var(--lav);letter-spacing:.3mm;margin-top:.6mm!important}.rs-addr{font:600 2.9mm Lato,Arial,sans-serif;color:#fff;margin-top:.8mm!important}.rs-ar{font-family:'Noto Naskh Arabic','IBM Plex Sans Arabic',serif;font-size:5mm;font-weight:700;color:var(--gold);line-height:1.4}" +
    ".rs-tag{flex:none;text-align:center;background:rgba(255,255,255,.12);border:.3mm solid rgba(255,255,255,.4);border-radius:2mm;padding:1.6mm 3mm;min-width:27mm}.rs-tag span{display:block;font:800 3.1mm Montserrat,Arial,sans-serif;text-transform:uppercase;letter-spacing:.2mm}.rs-tag em{display:block;font:600 2.8mm Lato,Arial,sans-serif;font-style:normal;color:var(--lav);margin-top:.6mm}" +
    ".rs-ribbon{display:flex;justify-content:space-between;align-items:center;background:var(--lav);color:#241a63;padding:1.1mm 4mm;margin-top:-2mm;border-radius:0 0 3mm 3mm;font:800 3.3mm Montserrat,Arial,sans-serif;letter-spacing:.5mm}.rs-id{font:700 2.8mm Lato,Arial,sans-serif;letter-spacing:.2mm}" +
    ".rs-info{display:grid;grid-template-columns:repeat(8,1fr);gap:1.4mm}.rs-c{grid-column:span 2;background:#faf7ee;border-left:1mm solid var(--gold);border-radius:1.2mm;padding:1mm 2mm;min-width:0;display:flex;flex-direction:column;justify-content:center}.rs-c.c1{grid-column:span 1}.rs-c.c3{grid-column:span 3}.rs-c.c4{grid-column:span 4}.rs-c.c6{grid-column:span 6}.rs-c.c8{grid-column:span 8}" +
    ".rs-lab{font:700 2.6mm Montserrat,Arial,sans-serif;color:#40367f;text-transform:uppercase;letter-spacing:.25mm;white-space:nowrap}.rs-val{font:700 3.6mm Poppins,Lato,Arial,sans-serif;color:#14122b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}" +
    ".rs-tbl{width:100%;border-collapse:collapse;table-layout:fixed;border-radius:2mm;overflow:hidden}.rs-tbl th{background:var(--navy);color:#fff;font:700 2.5mm Montserrat,Arial,sans-serif;line-height:1.15;padding:.6mm .4mm;height:9.5mm;border:.2mm solid #4a3d9a;letter-spacing:.1mm}" +
    ".rs-tbl td{border:.2mm solid #e3d9bd;vertical-align:middle;font-variant-numeric:tabular-nums;text-align:center;padding:0 .5mm;overflow:hidden;font:600 var(--fs,3mm) Poppins,Lato,Arial,sans-serif}.rs-tbl tbody tr:nth-child(even) td{background:#faf7ee}.rs-tbl td.l,.rs-tbl th.l{text-align:left;padding-left:1.6mm}.rs-tbl td.l{font-weight:700}.sm{font-size:2.9mm!important;font-weight:700!important;color:#2a2550}" +
    ".rs-tot{display:block;font-weight:800;background:linear-gradient(90deg,rgba(213,164,59,.28) var(--p),transparent var(--p));padding:.3mm 0;line-height:1.5}" +
    ".rs-g{display:inline-block;font:800 2.8mm/1 Montserrat,Arial,sans-serif;font-style:normal;min-width:5.4mm;padding:.8mm 1mm;border-radius:1.2mm;color:#fff;background:#777}.rs-g.ga{background:#302078}.rs-g.gb{background:#4a3ea0}.rs-g.gc{background:#D5A43B;color:#1f1700}.rs-g.gd{background:#e6c373;color:#1f1700}.rs-g.gf{background:#fff;color:#302078;box-shadow:inset 0 0 0 .3mm #D5A43B}" +
    ".rs-sum{display:grid;grid-template-columns:1.15fr 1fr 1.1fr .8fr 1.15fr;gap:2mm}.rs-t small{font:600 2.4mm Montserrat,Arial,sans-serif;color:#5a5680}.rs-t.hi small{color:#e4dcff}.rs-t{border:.3mm solid #e3d3a4;border-radius:2mm;padding:1mm 2.4mm;display:flex;justify-content:space-between;align-items:center;background:#fff}.rs-t span{font:700 2.6mm Montserrat,Arial,sans-serif;color:#40367f;text-transform:uppercase;letter-spacing:.2mm}.rs-t b{font-variant-numeric:tabular-nums;font:800 5mm Montserrat,Arial,sans-serif;color:var(--navy)}.rs-t.hi{background:var(--navy)}.rs-t.hi span{color:var(--lav)}.rs-t.hi b{color:#fff}" +
    ".rs-idrow{display:flex;gap:2mm;align-items:stretch}.rs-idrow .rs-info{flex:1;min-width:0}.rs-photo{flex:none;width:23mm;border:.35mm dashed #8b84b8;border-radius:2mm;display:flex;align-items:center;justify-content:center;text-align:center;font:700 2.4mm/1.3 Montserrat,Arial,sans-serif;color:#6a60a8;overflow:hidden;background:#faf9fe}.rs-photo img{width:100%;height:100%;object-fit:cover}" +
    ".rs-an{display:grid;grid-template-columns:auto 1fr;gap:3mm;align-items:center;border:.3mm solid #e3d3a4;border-radius:2mm;padding:1.2mm 2.4mm;background:#faf7ee}.rs-anh{display:flex;align-items:center;gap:2mm}.rs-gas{display:flex;gap:1.4mm}.rs-ga{display:inline-flex;align-items:center;gap:.8mm;font:800 2.9mm Lato,Arial,sans-serif;color:#14122b}.rs-ga.z{opacity:.4}.rs-ga .rs-g{font-size:2.5mm;min-width:4.6mm;padding:.6mm .7mm}.rs-ann{font:600 2.7mm/1.35 Lato,Arial,sans-serif;color:#1c1b2e}.rs-ann b{color:var(--navy)}" +
    ".rs-bottom{display:grid;grid-template-columns:1fr 68mm;gap:3mm;flex:1;min-height:0}.rs-side{display:flex;flex-direction:column;gap:2mm;min-width:0}" +
    ".rs-card{border:.3mm solid #e3d3a4;border-radius:2mm;padding:1.4mm 2.4mm 1.6mm;display:flex;flex-direction:column;gap:1mm;flex:1;background:#fff}" +
    ".rs-lines{position:relative;height:calc(var(--n)*5.6mm);background:repeating-linear-gradient(to bottom,transparent 0 5mm,#b9b2d6 5mm 5.25mm,transparent 5.25mm 5.6mm);overflow:hidden}.rs-lines span{display:block;font:600 3mm/5.6mm Lato,Arial,sans-serif}" +
    ".rs-sign{display:flex;align-items:flex-end;gap:2mm;margin-top:auto}.rs-sigbox{flex:1;height:8mm;border-bottom:.3mm solid #1c1b2e;display:flex;align-items:flex-end}.rs-sigbox.tall{height:12mm}.rs-sigbox img{max-height:8mm;max-width:100%}" +
    ".rs-aff{width:100%;border-collapse:collapse;align-self:start;border-radius:2mm;overflow:hidden}.rs-aff th{background:var(--navy);color:#fff;font:700 2.6mm Montserrat,Arial,sans-serif;height:5.4mm;border:.2mm solid #4a3d9a}.rs-aff td{border:.2mm solid #e3d9bd;height:5.6mm;font:600 2.7mm Lato,Arial,sans-serif;text-align:center;padding:0 .5mm}.rs-aff td.l,.rs-aff th.l{text-align:left;padding-left:1.4mm}.rs-aff tbody tr:nth-child(even) td{background:#faf7ee}.rs-aff tfoot td{font-size:2.5mm;color:#40367f;height:5mm;border:0;padding-top:1mm}" +
    ".rs-dot{display:inline-block;width:3mm;height:3mm;border-radius:50%;border:.3mm solid #8b84b8;vertical-align:middle}.rs-dot.on{background:#302078;border-color:#302078;box-shadow:inset 0 0 0 .5mm #fff}" +
    ".rs-jbox{display:flex;gap:2mm;align-items:stretch}.rs-jbox .rs-tbl{width:133mm;flex:none}.rs-panel{flex:1;border:.3mm solid #e3d3a4;border-radius:2mm;overflow:hidden;min-width:0;display:flex;flex-direction:column}" +
    ".rs-ph{background:var(--navy);color:#fff;font:800 2.6mm Montserrat,Arial,sans-serif;text-align:center;padding:.9mm 0;letter-spacing:.3mm}.rs-pl{flex:1;display:flex;justify-content:space-between;gap:1mm;padding:0 1.4mm;align-items:center;border-bottom:.2mm solid #e3d9bd;font:600 2.6mm Poppins,Lato,Arial,sans-serif;line-height:1.3}.rs-pl span{overflow:hidden;line-height:1.4;text-overflow:ellipsis;white-space:nowrap}.rs-pl b{min-width:5.6mm;height:3.6mm;border:.25mm solid var(--navy);border-radius:1mm;text-align:center;font-size:2.6mm;line-height:3.4mm;color:var(--navy)}" +
    ".rs-jbot{display:grid;grid-template-columns:1fr 1fr;gap:3mm}.rs-rate{font:600 2.7mm Lato,Arial,sans-serif;color:#40367f}" +
    ".rs-foot{margin-top:auto;border-top:.5mm solid var(--gold);padding-top:1.2mm;display:flex;flex-direction:column;gap:.8mm}.rs-key{display:flex;flex-wrap:wrap;gap:1mm 2.6mm;align-items:center;font:600 2.6mm Lato,Arial,sans-serif}.rs-key>b{font:800 2.6mm Montserrat,Arial,sans-serif;color:var(--navy);letter-spacing:.2mm}.rs-kg{display:inline-flex;align-items:center;gap:1mm}.rs-kg .rs-g{font-size:2.5mm;min-width:4.4mm;padding:.5mm .6mm}" +
    ".rs-mot{align-self:stretch;width:100%;text-align:center;font:700 3mm Montserrat,Arial,sans-serif;color:var(--navy);letter-spacing:.4mm}" +
    ".rs-wm{position:absolute;inset:0;pointer-events:none;z-index:5}" +
    ".rs-g,.rs-pl b,.rs-dot{vertical-align:middle}.rs-g{display:inline-flex;align-items:center;justify-content:center;line-height:1}.rs-pl b{display:inline-flex;align-items:center;justify-content:center;line-height:1}.rs-tbl td,.rs-tbl th,.rs-aff td,.rs-aff th{vertical-align:middle}.rs-t{min-height:9mm}.rs-stage{width:100%;overflow:hidden;position:relative}.rs-scale{transform-origin:0 0;width:210mm;display:flex;flex-direction:column;gap:6mm}.rs-stage .rs-page{box-shadow:0 2px 14px rgba(0,0,0,.25);flex:none}";
  var PRINT = "@page{size:A4;margin:0}html,body{margin:0;background:#fff}.rs-page{break-after:page;page-break-after:always;box-shadow:none}.rs-page:last-child{break-after:auto;page-break-after:auto}";
  var FONTS = "https://fonts.googleapis.com/css2?family=Lato:wght@400;600;700;800&family=Montserrat:wght@600;700;800&family=Noto+Naskh+Arabic:wght@600;700&display=swap";

  var cssDone = false;
  function ensureCss() { if (cssDone) return; cssDone = true; var s = document.createElement("style"); s.textContent = CSS.replace('@@LOGO@@', logoSrc()); document.head.appendChild(s); }

  /* On-screen preview, scaled to fit the width of the container. opts.watermark draws a diagonal watermark with the pupil's name and ID. */
  function mount(host, payloads, opts) {
    ensureCss(); opts = opts || {};
    var list = Array.isArray(payloads) ? payloads : [payloads];
    host.innerHTML = '<div class="rs-stage"><div class="rs-scale">' + list.map(function (p) {
      return sheet(p).replace(/<\/section>$/, (opts.watermark ? wm(p) : "") + "</section>");
    }).join("") + "</div></div>";
    var stage = host.firstChild, inner = stage.firstChild;
    function fit() {
      var w = 210 * 3.7795, k = Math.min(1, host.clientWidth / w);
      inner.style.transform = "scale(" + k + ")"; stage.style.height = (inner.scrollHeight * k) + "px";
    }
    fit(); if (window.ResizeObserver) new ResizeObserver(fit).observe(host); else window.addEventListener("resize", fit);
    if (opts.guard) {
      stage.classList.add("rs-guarded");
      stage.addEventListener("contextmenu", function (e) { e.preventDefault(); });
      stage.addEventListener("dragstart", function (e) { e.preventDefault(); });
      stage.style.userSelect = "none"; stage.style.webkitUserSelect = "none";
      function blur(on) { inner.style.filter = on ? "blur(14px)" : ""; }
      window.addEventListener("blur", function () { blur(true); }); window.addEventListener("focus", function () { blur(false); });
    }
    return { refit: fit };
  }
  function wm(p) {
    var name = p.student.first_name + " " + p.student.last_name, when = new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
    var svg = "<svg xmlns='http://www.w3.org/2000/svg' width='360' height='240'><g transform='rotate(-28 180 120)' fill='%231d1a5e' fill-opacity='0.2' font-family='Arial' font-weight='700'><text x='10' y='110' font-size='20'>" + esc(name) + " - " + esc(p.student.student_code) + "</text><text x='10' y='136' font-size='14'>Viewed " + esc(when) + "</text></g></svg>";
    return '<div class="rs-wm" style="background-image:url(&quot;data:image/svg+xml;utf8,' + svg.replace(/"/g, "'").replace(/#/g, "%23").replace(/</g, "%3C").replace(/>/g, "%3E") + '&quot;)"></div>';
  }

  /* Print (or save as PDF) one or many sheets, each on its own A4 page. */
  function print(payloads, title) {
    var list = Array.isArray(payloads) ? payloads : [payloads];
    var f = document.createElement("iframe"); f.setAttribute("aria-hidden", "true"); f.style.cssText = "position:fixed;inset-inline-end:0;bottom:0;width:0;height:0;border:0";
    document.body.appendChild(f);
    var d = f.contentDocument; d.open();
    d.write("<!doctype html><html><head><meta charset='utf-8'><title>" + esc(title || "Report sheets") + "</title><link rel='stylesheet' href='" + FONTS + "'><style>" + CSS.replace('@@LOGO@@', logoSrc()) + PRINT + "</style></head><body>" + list.map(sheet).join("") + "</body></html>");
    d.close();
    var imgs = [].slice.call(d.images), done = false;
    function go() { if (done) return; done = true; try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) {} setTimeout(function () { f.remove(); }, 120000); }
    Promise.all(imgs.map(function (i) { return i.complete ? 1 : new Promise(function (r) { i.onload = i.onerror = r; }); })).then(function () { setTimeout(go, 700); });
    setTimeout(go, 4000);
  }

  window.UBK_REPORT = { compute: compute, sheet: sheet, fromWorkspace: fromWorkspace, mount: mount, print: print, gradeOf: gradeOf, fmt: fmt, ord: ord, longDate: longDate, css: CSS };
})();
