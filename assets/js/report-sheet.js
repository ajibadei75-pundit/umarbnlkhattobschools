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
      return { id: sb.id, name: sb.name, ca1: a, ca2: b, exam: e, total: total, max: all.length ? Math.max.apply(null, all) : null, min: all.length ? Math.min.apply(null, all) : null,
        grade: g.grade, gradeRemark: g.remark, position: pos, remark: s.remark || "", sign: s.tutor_sign || "" };
    });
    var done = rows.filter(function (r) { return r.total != null; });
    var sum = done.reduce(function (t, r) { return t + r.total; }, 0);
    var pct = done.length ? sum / (done.length * 100) * 100 : null;
    return { rows: rows, sum: done.length ? sum : null, count: done.length, pct: pct, grade: gradeOf(pct, p.grading).grade };
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
  function fld(label, value, cls) { return '<div class="rs-f ' + (cls || "") + '"><span class="rs-lab">' + esc(label) + '</span><b class="rs-val">' + esc(value == null ? "" : value) + "</b></div>"; }
  function lines(text, n) { return '<div class="rs-lines" style="--n:' + n + '"><span>' + esc(text || "") + "</span></div>"; }
  function signLine(label, img) { return '<div class="rs-sign"><span class="rs-lab">' + esc(label) + '</span><span class="rs-sigbox">' + (img ? '<img src="' + esc(img) + '" alt="">' : "") + "</span></div>"; }
  function fullName(st) { return ((st.first_name || "") + " " + (st.last_name || "")).trim(); }

  /* ---------- Nursery & Primary ---------- */
  function basicSheet(p, c) {
    var S = p.settings || {}, st = p.student, yrs = sessionYears(S.session_label);
    var R = Math.max(21, c.rows.length), rowH = Math.min(6.1, 128 / R), fs = R > 24 ? 2.8 : 3.1;
    var body = "";
    for (var i = 0; i < R; i++) {
      var r = c.rows[i];
      body += '<tr style="height:' + rowH + 'mm">' + (r ? "<td class='l'>" + esc(r.name) + "</td><td>" + fmt(r.ca1 == null && r.ca2 == null ? null : (r.ca1 || 0) + (r.ca2 || 0)) + "</td><td>" + fmt(r.exam) + "</td><td><b>" + fmt(r.total) + "</b></td><td>" + fmt(r.max) + "</td><td>" + fmt(r.min) + "</td><td><b>" + esc(r.grade) + "</b></td><td>" + (r.position ? ord(r.position) : "") + "</td><td class='l sm'>" + esc(r.remark || r.gradeRemark) + "</td>" : "<td class='l'>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>") + "</tr>";
    }
    var aff = (S.affective_list || []).map(function (k) {
      var v = String((st.behaviour || {})[k] || "");
      return "<tr><td class='l'>" + esc(k) + "</td>" + [5, 4, 3, 2, 1].map(function (n) { return "<td>" + (v === String(n) ? "&#10003;" : "") + "</td>"; }).join("") + "</tr>";
    }).join("");
    var head = S.head_title || "Head Mistress";
    return '<section class="rs-page rs-basic">' +
      '<header class="rs-bh"><img class="rs-logo" src="' + esc(logoSrc()) + '" alt=""><div class="rs-title"><h1 class="rs-slab">' + esc(S.basic_name || "") + "</h1><p class='rs-sub'>" + esc(S.basic_sub || "") + "</p><p class='rs-addr'>" + esc(S.address || "") + "</p></div><p class='rs-id'>ID: " + esc(st.student_code) + "</p></header>" +
      '<div class="rs-frame1"><span class="rs-termtab">' + esc((S.term || "____").toUpperCase()) + " TERM</span>" +
      '<div class="rs-row">' + fld("NAME:", fullName(st), "grow") + fld("FROM:", yrs[0], "w26") + fld("TO:", yrs[1], "w26") + "</div>" +
      '<div class="rs-row">' + fld("MAX. ATTENDANCE:", S.times_school_opened, "grow") + fld("TIME PRESENT:", st.time_present, "grow") + "</div>" +
      '<div class="rs-row">' + fld("CLASS:", p.class.name, "grow") + fld("NO. IN CLASS:", p.class.size, "w36") + fld("GRADE:", c.grade, "w24") + "</div></div>" +
      '<div class="rs-frame2"><div class="rs-row">' + fld("WEIGHT:", st.weight, "grow") + fld("HEIGHT:", st.height, "grow") + "</div>" +
      '<table class="rs-tbl" style="--fs:' + fs + 'mm"><colgroup><col style="width:49mm"><col style="width:14mm"><col style="width:12mm"><col style="width:14mm"><col style="width:15mm"><col style="width:15mm"><col style="width:12mm"><col style="width:15mm"><col style="width:33mm"></colgroup>' +
      "<thead><tr><th>SUBJECTS</th><th>CA</th><th>EXAM</th><th>TOTAL SCORE</th><th>MAX. IN CLASS</th><th>MIN. IN CLASS</th><th>GRADE</th><th>POSITION</th><th>REMARK</th></tr></thead><tbody>" + body +
      "</tbody></table>" +
      '<div class="rs-totals"><span>TOTAL MARK OBTAINABLE: <b>' + (c.count ? c.count * 100 : "") + "</b></span><span>TOTAL MARK OBTAINED: <b>" + fmt(c.sum) + "</b></span><span>PERCENTAGE: <b>" + (c.pct == null ? "" : fmt(c.pct) + "%") + "</b></span></div>" +
      '<div class="rs-bottom"><div class="rs-side"><div class="rs-lab">CLASS TEACHER\'S COMMENT:</div>' + lines(st.class_teacher_remark, 2) + signLine("SIGNATURE:", sigUrl((p.teacher || {}).signature_path)) +
      '<div class="rs-lab">' + esc(head.toUpperCase()) + "'S COMMENT:</div>" + lines("", 3) +
      '<div class="rs-sign"><span class="rs-lab">SIGNATURE &amp; STAMP:</span><span class="rs-sigbox tall"></span></div>' +
      '<div class="rs-next"><span class="rs-lab">NEXT TERM BEGINS:</span> <b>' + esc(longDate(S.next_term_begins)) + "</b></div></div>" +
      '<table class="rs-aff"><thead><tr><th class="l">AFFECTIVE DOMAIN</th><th>5</th><th>4</th><th>3</th><th>2</th><th>1</th></tr></thead><tbody>' + aff + "</tbody></table></div></div></section>";
  }

  /* ---------- J.S.S. Statement of Result ---------- */
  function jssSheet(p, c) {
    var S = p.settings || {}, st = p.student;
    var R = Math.max(16, c.rows.length), rowH = Math.min(10.5, 156 / R);
    var body = "";
    for (var i = 0; i < R; i++) {
      var r = c.rows[i];
      body += '<tr style="height:' + rowH + 'mm">' + (r ? "<td class='l'>" + esc(r.name) + "</td><td>" + fmt(r.ca1) + "</td><td>" + fmt(r.ca2) + "</td><td>" + fmt(r.exam) + "</td><td><b>" + fmt(r.total) + "</b></td><td><b>" + esc(r.grade) + "</b></td><td>" + (r.position ? ord(r.position) : "") + "</td><td>" + (r.total != null ? 100 : "") + "</td><td class='sm'>" + esc(r.sign) + "</td>" : "<td class='l'>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>") + "</tr>";
    }
    function panel(title, items, data) {
      return '<div class="rs-ph">' + esc(title) + "</div>" + items.map(function (k, i) { return '<div class="rs-pl"><span>' + (i + 1) + ". " + esc(k) + '</span><b>' + esc((data || {})[k] || "") + "</b></div>"; }).join("");
    }
    return '<section class="rs-page rs-jss">' +
      '<header class="rs-jh"><img class="rs-logo" src="' + esc(logoSrc()) + '" alt=""><div class="rs-title"><p class="rs-ar" dir="rtl" lang="ar">' + esc(S.arabic_name || "") + '</p><h1 class="rs-slab sm">' + esc(S.secondary_name || "") + "</h1><p class='rs-sub'>" + esc(S.college_name || "") + "</p><p class='rs-addr'>" + esc(S.address || "") + "</p></div><p class='rs-id'>ID: " + esc(st.student_code) + "</p></header>" +
      '<div class="rs-pill">J.S.S STATEMENT OF RESULT</div>' +
      '<div class="rs-dots"><div>' + fld("Name of Student:", fullName(st), "grow") + fld("Grade:", c.grade, "w30") + "</div>" +
      "<div>" + fld("Class:", p.class.name, "grow") + fld("Sex:", st.sex === "F" ? "Female" : st.sex === "M" ? "Male" : "", "w34") + fld("No. in Class:", p.class.size, "w36") + "</div>" +
      "<div>" + fld("Time School Opened:", S.times_school_opened, "w52") + fld("Time Present:", st.time_present, "w42") + fld("Next Term Begins:", longDate(S.next_term_begins), "grow") + "</div></div>" +
      '<div class="rs-jbox"><table class="rs-tbl"><colgroup><col style="width:32mm"><col style="width:11mm"><col style="width:11mm"><col style="width:13mm"><col style="width:15mm"><col style="width:11mm"><col style="width:13mm"><col style="width:14mm"><col style="width:14mm"></colgroup>' +
      "<thead><tr><th>SUBJECTS</th><th>1st C.A</th><th>2nd C.A</th><th>Term's Exam</th><th>Sum of Term Work</th><th>Grade</th><th>Posi- tion</th><th>Expected Score</th><th>Tutor's Sign</th></tr></thead><tbody>" + body + "</tbody></table>" +
      '<div class="rs-panel">' + panel("SKILLS", S.skills_list || [], st.skills) + panel("BEHAVIOUR", S.behaviour_list || [], st.behaviour) + "</div></div>" +
      '<div class="rs-totals"><span>TOTAL MARK OBTAINABLE: <b>' + (c.count ? c.count * 100 : "") + "</b></span><span>TOTAL MARK OBTAINED: <b>" + fmt(c.sum) + "</b></span><span>PERCENTAGE: <b>" + (c.pct == null ? "" : fmt(c.pct) + "%") + "</b></span></div>" +
      '<div class="rs-jbot"><div class="rs-jrem"><span class="rs-lab">CLASS TEACHER\'S REMARK:</span>' + lines(st.class_teacher_remark, 2) + signLine("SIGN:", sigUrl((p.teacher || {}).signature_path)) + "</div>" +
      '<div class="rs-jrem"><span class="rs-lab">' + esc(((S.head_title || "Principal") === "Head Master" ? "HEAD MASTER" : "PRINCIPAL").toUpperCase()) + "'S REMARKS:</span>" + lines("", 2) + signLine("SIGN:", "") + "</div></div>" +
      '<div class="rs-key"><b>KEY TO RATING:</b> A - Excellent &nbsp; B - Very Good &nbsp; C - Good &nbsp; D - Fair &nbsp; E - Poor &nbsp;|&nbsp; <b>GRADES:</b> ' + (p.grading || []).slice().reverse().map(function (g) { return esc(g.grade) + " " + g.min + "-" + g.max; }).join(" &nbsp; ") + "</div></section>";
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
    ".rs-page{width:210mm;height:297mm;padding:8mm 9mm;box-sizing:border-box;background:#fff;color:#000;position:relative;overflow:hidden;font-family:'Times New Roman',Times,serif;font-size:3.2mm;line-height:1.2;display:flex;flex-direction:column;gap:1.6mm}" +
    ".rs-page *{box-sizing:border-box}.rs-page p,.rs-page h1{margin:0}" +
    ".rs-bh,.rs-jh{display:flex;align-items:center;gap:3mm;position:relative}.rs-logo{width:22mm;height:22mm;object-fit:contain;flex:none}.rs-id{position:absolute;right:0;top:0;font:600 2.4mm Lato,Arial,sans-serif;color:#333}" +
    ".rs-title{flex:1;text-align:center}.rs-slab{font-family:'Alfa Slab One','Rockwell Extra Bold','Arial Black',Georgia,serif;font-weight:900;font-size:8.6mm;line-height:1.05;color:#1d1a5e;letter-spacing:.2mm}.rs-slab.sm{font-size:6.2mm}" +
    ".rs-sub{font:800 3.8mm Montserrat,Arial,sans-serif;color:#1d1a5e;letter-spacing:.3mm}.rs-addr{font:600 3mm Lato,Arial,sans-serif}.rs-ar{font-family:'Noto Naskh Arabic','Reem Kufi',serif;font-size:5.4mm;font-weight:700;color:#1d1a5e;line-height:1.5}" +
    ".rs-frame1,.rs-frame2{border:.5mm solid #1d1a5e;border-radius:3mm;padding:2.4mm 3mm;display:flex;flex-direction:column;gap:1.6mm;position:relative}.rs-frame1{margin-top:2.4mm}.rs-frame2{flex:1;min-height:0}" +
    ".rs-termtab{position:absolute;left:50%;top:-3.2mm;transform:translateX(-50%);background:#fff;padding:0 4mm;font:800 4mm Montserrat,Arial,sans-serif;color:#1d1a5e;letter-spacing:.4mm;white-space:nowrap}" +
    ".rs-pill{align-self:center;background:#c9d6cf;border-radius:6mm;padding:1mm 10mm;font:800 4.4mm Montserrat,Arial,sans-serif;letter-spacing:.3mm}" +
    ".rs-row,.rs-dots>div{display:flex;gap:3mm}.rs-dots{display:flex;flex-direction:column;gap:1.4mm}" +
    ".rs-f{display:flex;align-items:baseline;gap:1.5mm;border-bottom:.3mm solid #000;min-width:0;min-height:5.6mm;padding-bottom:.2mm}" +
    ".grow{flex:1 1 0}.w24{width:24mm}.w26{width:26mm}.w30{width:30mm}.w34{width:34mm}.w36{width:36mm}.w42{width:42mm}.w52{width:52mm}" +
    ".rs-lab{font-weight:700;font-size:2.9mm;white-space:nowrap}.rs-val{font:700 3.5mm Lato,Arial,sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0}" +
    ".rs-tbl{width:100%;border-collapse:collapse;table-layout:fixed}.rs-tbl th,.rs-tbl td,.rs-aff th,.rs-aff td{border:.3mm solid #000;text-align:center;padding:0 .5mm;overflow:hidden}" +
    ".rs-tbl th{font:700 2.3mm Lato,Arial,sans-serif;background:#efeef8;line-height:1.1;padding:.6mm .3mm;height:9mm}.rs-tbl td{font-family:Lato,Arial,sans-serif;font-weight:600;font-size:var(--fs,3mm)}.rs-tbl td.l,.rs-aff td.l,.rs-aff th.l{text-align:left;padding-left:1.2mm}.sm{font-size:2.4mm!important}" +
    ".rs-totals{display:flex;justify-content:space-between;gap:2mm;font:700 2.9mm Montserrat,Arial,sans-serif;border:.3mm solid #000;padding:1mm 2mm;background:#f4f4f4}.rs-totals b{font-family:Lato,Arial,sans-serif;font-size:3.4mm}" +
    ".rs-bottom{display:grid;grid-template-columns:1fr 66mm;gap:4mm;flex:1;min-height:0}.rs-aff{width:100%;border-collapse:collapse;align-self:start}.rs-aff th{background:#efeef8;font:700 2.5mm Lato,Arial,sans-serif;height:5mm}.rs-aff td{height:5mm;font:600 2.7mm Lato,Arial,sans-serif;padding:0 .5mm}" +
    ".rs-side{display:flex;flex-direction:column;gap:1.2mm;min-width:0}" +
    ".rs-lines{position:relative;height:calc(var(--n)*5.8mm);background:repeating-linear-gradient(to bottom,transparent 0 5.2mm,#000 5.2mm 5.5mm,transparent 5.5mm 5.8mm);overflow:hidden}.rs-lines span{display:block;font:600 3mm/5.8mm Lato,Arial,sans-serif}" +
    ".rs-sign{display:flex;align-items:flex-end;gap:2mm}.rs-sigbox{flex:1;height:8mm;border-bottom:.3mm solid #000;display:flex;align-items:flex-end}.rs-sigbox.tall{height:12mm}.rs-sigbox img{max-height:8mm;max-width:100%}" +
    ".rs-next{margin-top:auto;padding-top:1mm}.rs-next b{font-family:Lato,Arial,sans-serif}" +
    ".rs-jbox{display:flex;gap:2mm;align-items:stretch}.rs-jbox .rs-tbl{width:134mm;flex:none}.rs-panel{flex:1;border:.3mm solid #000;min-width:0;display:flex;flex-direction:column}" +
    ".rs-ph{background:#c9d6cf;font:800 2.8mm Montserrat,Arial,sans-serif;text-align:center;padding:.7mm 0;border-bottom:.3mm solid #000}.rs-pl{flex:1;display:flex;justify-content:space-between;gap:1mm;padding:0 1.2mm;align-items:center;border-bottom:.2mm solid #999;font:600 2.35mm Lato,Arial,sans-serif;line-height:1}.rs-pl span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rs-pl b{min-width:6mm;height:3.6mm;border:.25mm solid #000;text-align:center;font-size:2.6mm;line-height:3.5mm}" +
    ".rs-jbot{display:grid;grid-template-columns:1fr 1fr;gap:5mm}.rs-jrem{display:flex;flex-direction:column;gap:1mm}" +
    ".rs-key{border:.3mm solid #000;padding:1mm 2mm;font-size:2.6mm;margin-top:auto}" +
    ".rs-wm{position:absolute;inset:0;pointer-events:none;z-index:5}" +
    ".rs-stage{width:100%;overflow:hidden;position:relative}.rs-scale{transform-origin:0 0;width:210mm;display:flex;flex-direction:column;gap:6mm}.rs-stage .rs-page{box-shadow:0 2px 14px rgba(0,0,0,.25);flex:none}";
  var PRINT = "@page{size:A4;margin:0}html,body{margin:0;background:#fff}.rs-page{break-after:page;page-break-after:always;box-shadow:none}.rs-page:last-child{break-after:auto;page-break-after:auto}";
  var FONTS = "https://fonts.googleapis.com/css2?family=Lato:wght@400;700&family=Montserrat:wght@700;800&family=Alfa+Slab+One&family=Noto+Naskh+Arabic:wght@600;700&display=swap";

  var cssDone = false;
  function ensureCss() { if (cssDone) return; cssDone = true; var s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); }

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
    d.write("<!doctype html><html><head><meta charset='utf-8'><title>" + esc(title || "Report sheets") + "</title><link rel='stylesheet' href='" + FONTS + "'><style>" + CSS + PRINT + "</style></head><body>" + list.map(sheet).join("") + "</body></html>");
    d.close();
    var imgs = [].slice.call(d.images), done = false;
    function go() { if (done) return; done = true; try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) {} setTimeout(function () { f.remove(); }, 120000); }
    Promise.all(imgs.map(function (i) { return i.complete ? 1 : new Promise(function (r) { i.onload = i.onerror = r; }); })).then(function () { setTimeout(go, 700); });
    setTimeout(go, 4000);
  }

  window.UBK_REPORT = { compute: compute, sheet: sheet, fromWorkspace: fromWorkspace, mount: mount, print: print, gradeOf: gradeOf, fmt: fmt, ord: ord, longDate: longDate, css: CSS };
})();
