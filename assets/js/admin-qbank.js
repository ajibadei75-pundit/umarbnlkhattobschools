/* Question bank (Teacher tools): teachers add questions one at a time (objective with options, or theory) by class, subject and term.
   Administrators can also upload a Word (.docx) exam to add many at once. Exams are built from the bank and trimmed to fit two pages.
   The server rules (row level security) decide who may save what; this file only makes it simple. */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, $$ = U.$$, esc = U.esc, A = window.UBK_ADMIN;
  if (!A) return;
  var TERMS = ["First", "Second", "Third"];
  var KINDS = { objective: "Objective", fill_blank: "Fill in the gap", true_false: "True or false", short_answer: "Short answer", theory: "Theory" };
  var LET = "ABCD";

  /* ---------- read a .docx in the browser (zip + XML, no library) ---------- */
  function inflateRaw(u8) {
    var ds = new DecompressionStream("deflate-raw"), w = ds.writable.getWriter(); w.write(u8); w.close();
    return new Response(ds.readable).arrayBuffer();
  }
  function docxLines(file) {
    if (typeof DecompressionStream === "undefined") return Promise.reject(new Error("This browser cannot open Word files. Use a recent Chrome, Edge, Safari or Firefox."));
    return file.arrayBuffer().then(function (ab) {
      var buf = new Uint8Array(ab), dv = new DataView(ab), e = buf.length - 22;
      while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
      if (e < 0) throw new Error("This is not a Word (.docx) file.");
      var n = dv.getUint16(e + 10, true), p = dv.getUint32(e + 16, true), ent = null, i;
      for (i = 0; i < n; i++) {
        if (dv.getUint32(p, true) !== 0x02014b50) break;
        var nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), name = new TextDecoder().decode(buf.subarray(p + 46, p + 46 + nl));
        if (name === "word/document.xml") ent = { method: dv.getUint16(p + 10, true), csz: dv.getUint32(p + 20, true), lho: dv.getUint32(p + 42, true) };
        p += 46 + nl + el + cl;
      }
      if (!ent) throw new Error("This Word file has no readable text. Save it again as .docx.");
      var start = ent.lho + 30 + dv.getUint16(ent.lho + 26, true) + dv.getUint16(ent.lho + 28, true), data = buf.subarray(start, start + ent.csz);
      return (ent.method === 0 ? Promise.resolve(data.buffer.slice(data.byteOffset, data.byteOffset + data.length)) : inflateRaw(data));
    }).then(function (xmlBuf) {
      var doc = new DOMParser().parseFromString(new TextDecoder().decode(xmlBuf), "application/xml"), ps = doc.getElementsByTagName("w:p"), out = [], cnt = {};
      for (var i = 0; i < ps.length; i++) {
        var node = ps[i], t = "", all = node.getElementsByTagName("*"), num = null;
        for (var j = 0; j < all.length; j++) {
          var ln = all[j].nodeName;
          if (ln === "w:t") t += all[j].textContent; else if (ln === "w:tab") t += " "; else if (ln === "w:br") t += " ";
          else if (ln === "w:numPr" && !num) { var il = all[j].getElementsByTagName("w:ilvl")[0], ni = all[j].getElementsByTagName("w:numId")[0]; num = { lvl: il ? +il.getAttribute("w:val") : 0, id: ni ? ni.getAttribute("w:val") : "0" }; }
        }
        t = t.replace(/\s+/g, " ").trim(); if (!t) continue;
        if (num && !/^\(?(\d+|[A-Da-d])[.)]\s/.test(t)) {
          var key = num.id + ":" + num.lvl; cnt[key] = (cnt[key] || 0) + 1;
          if (num.lvl === 0) { Object.keys(cnt).forEach(function (k) { if (k !== key && k.indexOf(num.id + ":") === 0) cnt[k] = 0; }); t = cnt[key] + ". " + t; }
          else t = "(" + "abcdefgh"[(cnt[key] - 1) % 8] + ") " + t;
        }
        out.push(t);
      }
      return out;
    });
  }

  /* ---------- turn the lines into questions ---------- */
  function parseQuestions(lines) {
    var out = [], cur = null, kd = "", keyMode = false, key = {}, m;
    function inline(q) {
      var mm = q.q.match(/^(.*?)\s*\(?\b[aA][.)]\s+(.+?)\s*\(?\b[bB][.)]\s+(.+?)(?:\s*\(?\b[cC][.)]\s+(.+?))?(?:\s*\(?\b[dD][.)]\s+(.+))?$/);
      if (mm && mm[1] && mm[2] && mm[3]) { q.q = mm[1]; q.options = [mm[2], mm[3], mm[4], mm[5]].filter(Boolean).map(function (x) { return x.trim(); }); }
    }
    lines.forEach(function (t) {
      if (/^(section|part)\s+[a-z0-9]+\b/i.test(t) && t.length < 120 || /^(objective|theory|multiple choice|essay|short answer)s?\b.{0,60}$/i.test(t) && !/^\d/.test(t)) {
        kd = /theor|essay|short/i.test(t) ? "theory" : /object|multiple|choice/i.test(t) ? "objective" : kd; keyMode = false; cur = null; return;
      }
      if (/^(answers?|answer key|marking scheme|key)\b.{0,30}$/i.test(t)) { keyMode = true; cur = null; return; }
      if (keyMode) {
        var re = /(\d+)\s*[.:\-)]\s*\(?([A-Da-d])\)?(?=\s|,|;|$)/g, g, got = 0; while ((g = re.exec(t))) { key[+g[1]] = g[2].toUpperCase(); got++; }
        if (got) return;
      }
      if (cur && (m = /^(?:answer|ans)\s*[:\-.]?\s*\(?([A-Da-d])\)?(?:\s|$)/i.exec(t))) { cur.answer = m[1].toUpperCase(); return; }
      if (cur && (m = /^(?:answer|ans|marking scheme)\s*[:\-]\s*(.+)$/i.exec(t))) { cur.answer = m[1]; return; }
      if ((m = /^(\d+)\s*[.)]\s*(.+)$/.exec(t))) { cur = { n: +m[1], q: m[2], options: [], answer: "", kd: kd }; out.push(cur); inline(cur); return; }
      if (cur && (m = /^\(?([A-Da-d])[.)]\s*(.+)$/.exec(t)) && cur.kd !== "theory" && m[1].toUpperCase() === LET[cur.options.length] && !/\[\d+(\.\d+)?\s*marks?\]/i.test(t)) { cur.options.push(m[2].trim()); return; }
      if (cur) cur.q += (cur.q.length ? "\n" : "") + t;
    });
    var rows = [], bad = [];
    out.forEach(function (c) {
      var mk = /\[(\d+(?:\.\d+)?)\s*marks?\]/gi, tot = 0, x;
      while ((x = mk.exec(c.q))) tot += parseFloat(x[1]);
      var q = c.q.trim(), kind = c.options.length >= 2 ? "objective" : /_{3,}/.test(q) ? "fill_blank" : "theory";
      if (q.length < 3) return;
      if (kind === "objective") {
        var ans = c.answer || key[c.n] || ""; ans = String(ans).toUpperCase().replace(/[^A-D]/g, "").slice(0, 1);
        if (!ans) { bad.push("Question " + c.n + ": no correct answer found (write Answer: B under it, or add an answer key at the end)."); return; }
        rows.push({ kind: "objective", q: q.slice(0, 1500), options: c.options.slice(0, 4), answer: ans, marks: 1 });
      } else rows.push({ kind: kind, q: q.slice(0, 1500), options: [], answer: String(c.answer || "").slice(0, 3000), marks: tot || (kind === "theory" ? 5 : 1) });
    });
    return { rows: rows, problems: bad, found: out.length };
  }

  /* ---------- screen ---------- */
  function sel(id, label, opts, cur, extra) {
    return '<div class="fld"><label for="' + id + '">' + label + '</label><select class="select-lg" id="' + id + '"' + (extra || "") + ">" + opts.map(function (o) { var v = o.v == null ? o : o.v, t = o.t == null ? o : o.t; return '<option value="' + esc(v) + '"' + (v === cur ? " selected" : "") + ">" + esc(t) + "</option>"; }).join("") + "</select></div>";
  }
  A.qbank = function (body, X) {
    var admin = A.can(["super_admin", "school_admin"]), me = A.uid && A.uid(), rows = [], picked = {}, T = [], classes = [], subjectsAll = [], keep = { c: "", s: "", t: "First" };
    body.innerHTML = '<p class="count-line">Loading the question bank...</p>';
    var pre = [
      X.rest("GET", "/rest/v1/question_bank?select=*&order=created_at.desc&limit=1000"),
      admin ? X.rest("GET", "/rest/v1/classes?select=name&order=sort.asc,name.asc").catch(function () { return []; }) : Promise.resolve([]),
      admin ? X.rest("GET", "/rest/v1/subjects?select=name&order=name.asc").catch(function () { return []; }) : Promise.resolve([]),
      admin ? Promise.resolve([]) : X.teaching().catch(function () { return []; })
    ];
    Promise.all(pre).then(function (r) {
      rows = r[0] || []; classes = (r[1] || []).map(function (x) { return x.name; }); subjectsAll = (r[2] || []).map(function (x) { return x.name; }); T = (r[3] || []).filter(function (c) { return X.sbOf(c).length; });
      if (!admin) { classes = T.map(function (c) { return c.name; }); if (!classes.length) { body.innerHTML = '<div class="empty"><h3>No class or subject assigned yet</h3><p>An administrator assigns your class or subjects. Then you can add questions here.</p></div>'; return; } }
      keep.c = classes[0] || ""; draw();
    }, function (e) { body.innerHTML = '<div class="notice"><span>' + esc(A.nice(e.message)) + "</span></div>"; });

    function subjectsFor(cn) { if (admin) return subjectsAll; var c = T.filter(function (x) { return x.name === cn; })[0]; return c ? X.sbOf(c).map(function (s) { return s.name; }) : []; }
    function classCtl(id, cur) { return classes.length ? sel(id, "Class", classes, cur) : '<div class="fld"><label for="' + id + '">Class</label><input class="input" id="' + id + '" maxlength="60" placeholder="e.g. Primary 3" value="' + esc(cur || "") + '"></div>'; }
    function subjectCtl(id, cur, cn) { var l = subjectsFor(cn); return admin || !l.length ? '<div class="fld"><label for="' + id + '">Subject</label><input class="input" id="' + id + '" maxlength="80" list="' + id + '-l" placeholder="e.g. Mathematics" value="' + esc(cur || "") + '"><datalist id="' + id + '-l">' + l.map(function (s) { return '<option value="' + esc(s) + '">'; }).join("") + "</datalist></div>" : sel(id, "Subject", l, cur || l[0]); }

    function draw() {
      var addCard = '<article class="form-card qb2-add"><h3 style="margin:0 0 .2rem">Add a question</h3><p class="count-line">One question at a time is fine. Class, subject and term stay filled after you save, so the next one is quick.</p>' +
        '<form id="qa-form" novalidate><div class="form-grid">' + classCtl("qa-c", keep.c) + '<span id="qa-sw">' + subjectCtl("qa-s", keep.s, keep.c) + "</span>" + sel("qa-t", "Term", TERMS, keep.t) +
        '<div class="fld"><label>Type</label><div class="qb2-seg" role="group" aria-label="Question type"><button type="button" class="btn btn-primary btn-sm" data-ty="objective" aria-pressed="true">Objective</button><button type="button" class="btn btn-soft btn-sm" data-ty="theory" aria-pressed="false">Theory</button></div></div>' +
        '<div class="fld full"><label for="qa-q">Question</label><textarea class="input" id="qa-q" rows="3" maxlength="1500" placeholder="Type the question"></textarea></div>' +
        '<div class="full qb2-opts" id="qa-opts">' + [0, 1, 2, 3].map(function (i) { return '<label class="qb2-opt"><input type="radio" name="qa-ok" value="' + LET[i] + '" aria-label="Option ' + LET[i] + ' is correct"><span>' + LET[i] + '</span><input class="input" id="qa-o' + i + '" maxlength="300" placeholder="Option ' + LET[i] + '"></label>'; }).join("") + '<p class="count-line">Tick the circle beside the correct option.</p></div>' +
        '<div class="fld full" id="qa-th" hidden><label for="qa-ms">Marking points (optional, one per line)</label><textarea class="input" id="qa-ms" rows="3" maxlength="3000"></textarea></div>' +
        '<div class="fld"><label for="qa-m">Marks</label><input class="input" id="qa-m" type="number" min="0.5" max="50" step="0.5" value="1"></div></div>' +
        '<div class="form-actions" style="margin-top:1rem"><button class="btn btn-primary" type="submit" id="qa-save">Save question</button></div><p class="result" id="qa-res" role="status"></p></form></article>';
      var upCard = admin ? '<article class="form-card" style="margin-top:1rem"><h3 style="margin:0 0 .2rem">Upload a Word exam (administrator)</h3><p class="count-line">Upload a .docx exam to add all its questions at once. Number each question (1. 2. 3.), put options on lines starting A. B. C. D., and write Answer: B under it, or put an answer key at the end. Theory marks like [5 marks] are read.</p>' +
        '<div class="form-grid">' + classCtl("up-c", keep.c) + '<span id="up-sw">' + subjectCtl("up-s", keep.s, keep.c) + "</span>" + sel("up-t", "Term", TERMS, keep.t) + '<div class="fld"><label for="up-f">Word file (.docx)</label><input class="input" id="up-f" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"></div></div>' +
        '<div id="up-out"></div></article>' : "";
      var classesInBank = {}, subjInBank = {}; rows.forEach(function (x) { classesInBank[x.class_name] = 1; subjInBank[x.subject] = 1; });
      function ops(o) { return '<option value="">All</option>' + Object.keys(o).sort().map(function (k) { return "<option>" + esc(k) + "</option>"; }).join(""); }
      var listCard = '<article class="form-card" style="margin-top:1rem"><h3 style="margin:0 0 .6rem">Your questions</h3><div class="qb-filters"><div class="fld"><label for="qb-c">Class</label><select class="select-lg" id="qb-c">' + ops(classesInBank) + '</select></div><div class="fld"><label for="qb-s">Subject</label><select class="select-lg" id="qb-s">' + ops(subjInBank) + '</select></div>' +
        '<div class="fld"><label for="qb-tm">Term</label><select class="select-lg" id="qb-tm"><option value="">All</option>' + TERMS.map(function (t) { return "<option>" + t + "</option>"; }).join("") + '</select></div><div class="fld"><label for="qb-k">Type</label><select class="select-lg" id="qb-k"><option value="">All</option>' + Object.keys(KINDS).map(function (k) { return '<option value="' + k + '">' + KINDS[k] + "</option>"; }).join("") + '</select></div></div><div id="qb-list"></div></article>';
      var buildCard = '<article class="form-card qb-build" style="margin-top:1rem"><h3 style="margin:0 0 .2rem">Make an exam paper</h3><p class="count-line">Picks questions for the class, subject and term you choose, and keeps the paper within two pages. Tick questions in the list above to use only those.</p><div class="form-grid">' + classCtl("bd-c", keep.c) + '<span id="bd-sw">' + subjectCtl("bd-s", keep.s, keep.c) + "</span>" + sel("bd-t", "Term", TERMS, keep.t) +
        '<div class="fld"><label for="bd-d">Time allowed</label><input class="input" id="bd-d" value="1 hour"></div><div class="fld"><label for="bd-no">Objective questions</label><input class="input" id="bd-no" type="number" min="0" max="50" value="20"></div><div class="fld"><label for="bd-nt">Theory questions</label><input class="input" id="bd-nt" type="number" min="0" max="15" value="3"></div></div>' +
        '<div class="form-actions" style="margin-top:1rem"><button type="button" class="btn btn-primary" id="bd-go">Make exam paper</button><span class="count-line" id="qb-n">0 ticked</span></div><p class="result" id="bd-res" role="status"></p></article><div id="ai-out"></div>';
      body.innerHTML = '<div class="qb2">' + addCard + upCard + listCard + buildCard + "</div>";
      wire();
    }

    function view() {
      var c = $("#qb-c").value, sj = $("#qb-s").value, tm = $("#qb-tm").value, k = $("#qb-k").value;
      var list = rows.filter(function (x) { return (!c || x.class_name === c) && (!sj || x.subject === sj) && (!tm || x.term === tm) && (!k || x.kind === k); });
      $("#qb-list").innerHTML = list.length ? '<div class="ad-table-wrap"><table class="ad-table"><thead><tr><th></th><th>Question</th><th>Class</th><th>Term</th><th>Marks</th><th></th></tr></thead><tbody>' + list.slice(0, 300).map(function (x) {
        var mine = x.owner === me || admin;
        return '<tr data-id="' + esc(x.id) + '"><td><input type="checkbox" data-pk aria-label="Use this question"' + (picked[x.id] ? " checked" : "") + '></td><td class="qb-q"><strong>' + esc(x.q.slice(0, 150)) + (x.q.length > 150 ? "..." : "") + "</strong><small>" + esc(KINDS[x.kind] || x.kind) + " · " + esc(x.subject) + (x.kind === "objective" && x.answer ? " · answer " + esc(x.answer) : "") + (x.shared ? " · shared" : "") + "</small></td><td>" + esc(x.class_name) + "</td><td>" + esc(x.term || "-") + "</td><td>" + esc(x.marks) + '</td><td class="ad-acts">' +
          (mine ? '<button type="button" class="btn btn-soft btn-sm" data-sh="1">' + (x.shared ? "Unshare" : "Share") + '</button><button type="button" class="btn btn-soft btn-sm" data-dl="1">Delete</button>' : "") + "</td></tr>";
      }).join("") + "</tbody></table></div>" + (list.length > 300 ? '<p class="count-line">Showing the first 300. Narrow the filters to see the rest.</p>' : "") : '<div class="empty"><h3>No questions here yet</h3><p>Add a question above' + (admin ? ", or upload a Word exam." : ".") + "</p></div>";
      $$("[data-pk]", $("#qb-list")).forEach(function (b) { b.addEventListener("change", function () { var id = b.closest("tr").getAttribute("data-id"); if (b.checked) picked[id] = 1; else delete picked[id]; $("#qb-n").textContent = Object.keys(picked).length + " ticked"; }); });
      $$("[data-dl]", $("#qb-list")).forEach(function (b) { b.addEventListener("click", function () { if (!confirm("Delete this question?")) return; var id = b.closest("tr").getAttribute("data-id"); X.rest("DELETE", "/rest/v1/question_bank?id=eq." + encodeURIComponent(id)).then(function () { rows = rows.filter(function (x) { return x.id !== id; }); delete picked[id]; view(); }, function (e) { X.say($("#bd-res"), false, A.nice(e.message)); }); }); });
      $$("[data-sh]", $("#qb-list")).forEach(function (b) { b.addEventListener("click", function () { var id = b.closest("tr").getAttribute("data-id"), x = rows.filter(function (y) { return y.id === id; })[0]; X.rest("PATCH", "/rest/v1/question_bank?id=eq." + encodeURIComponent(id), { shared: !x.shared }, { Prefer: "return=minimal" }).then(function () { x.shared = !x.shared; view(); }, function (e) { X.say($("#bd-res"), false, A.nice(e.message)); }); }); });
    }

    function linkClassSubject(cId, sWrap, sId) {
      var c = $("#" + cId); if (!c) return;
      c.addEventListener("change", function () { var cur = ($("#" + sId) || {}).value; $("#" + sWrap).innerHTML = subjectCtl(sId, cur, c.value); });
    }
    function wire() {
      view(); ["qb-c", "qb-s", "qb-tm", "qb-k"].forEach(function (id) { $("#" + id).addEventListener("change", view); });
      linkClassSubject("qa-c", "qa-sw", "qa-s"); linkClassSubject("bd-c", "bd-sw", "bd-s"); if (admin) linkClassSubject("up-c", "up-sw", "up-s");
      var type = "objective";
      $$("[data-ty]", body).forEach(function (b) { b.addEventListener("click", function () {
        type = b.getAttribute("data-ty"); $$("[data-ty]", body).forEach(function (x) { var on = x === b; x.className = "btn btn-sm " + (on ? "btn-primary" : "btn-soft"); x.setAttribute("aria-pressed", on); });
        $("#qa-opts").hidden = type !== "objective"; $("#qa-th").hidden = type !== "theory"; $("#qa-m").value = type === "objective" ? 1 : 5;
      }); });
      $("#qa-form").addEventListener("submit", function (e) {
        e.preventDefault(); var res = $("#qa-res"), q = $("#qa-q").value.trim(), cn = $("#qa-c").value.trim(), sj = $("#qa-s").value.trim(), tm = $("#qa-t").value;
        var row = { class_name: cn, subject: sj, term: tm, topic: "", kind: type, q: q, options: [], answer: "", marks: parseFloat($("#qa-m").value) || 1 };
        if (!cn || !sj) return X.say(res, false, "Choose the class and the subject.");
        if (q.length < 3) return X.say(res, false, "Type the question.");
        if (type === "objective") {
          row.options = [0, 1, 2, 3].map(function (i) { return $("#qa-o" + i).value.trim(); });
          var ok = $("input[name=qa-ok]:checked", body); row.answer = ok ? ok.value : "";
          if (row.options.some(function (x) { return !x; })) return X.say(res, false, "Fill in all four options.");
          if (!row.answer) return X.say(res, false, "Tick the circle beside the correct option.");
        } else row.answer = $("#qa-ms").value.trim();
        keep = { c: cn, s: sj, t: tm }; $("#qa-save").disabled = true;
        X.rest("POST", "/rest/v1/question_bank", row, { Prefer: "return=representation" }).then(function (j) {
          rows.unshift(j[0]); $("#qa-q").value = ""; [0, 1, 2, 3].forEach(function (i) { $("#qa-o" + i).value = ""; }); $$("input[name=qa-ok]", body).forEach(function (r2) { r2.checked = false; }); $("#qa-ms").value = "";
          X.say(res, true, "Saved. " + rows.filter(function (x) { return x.class_name === cn && x.subject === sj && x.term === tm; }).length + " questions now for " + cn + ", " + sj + ", " + tm + " term."); view(); $("#qa-q").focus();
        }, function (er) { X.say(res, false, A.nice(er.message)); }).then(function () { $("#qa-save").disabled = false; });
      });
      if (admin) wireUpload();
      $("#bd-go").addEventListener("click", build);
    }

    function wireUpload() {
      $("#up-f").addEventListener("change", function () {
        var f = this.files[0], out = $("#up-out"); if (!f) return; out.innerHTML = '<p class="count-line">Reading the file...</p>';
        docxLines(f).then(function (lines) {
          var r = parseQuestions(lines), ob = r.rows.filter(function (x) { return x.kind === "objective"; }).length;
          if (!r.rows.length) { out.innerHTML = '<div class="notice"><span>No questions were found. Check that each question starts with a number (1. 2. 3.).</span></div>'; return; }
          out.innerHTML = '<p class="notice is-info"><span data-icon="alert"></span><span>Found ' + r.rows.length + " questions: " + ob + " objective and " + (r.rows.length - ob) + " other." + (r.problems.length ? " " + r.problems.length + " skipped (see below)." : "") + " Check the first few, then import.</span></p>" +
            '<ol class="qb2-prev">' + r.rows.slice(0, 5).map(function (x) { return "<li><strong>" + esc(x.q.slice(0, 110)) + "</strong><small>" + esc(KINDS[x.kind]) + (x.kind === "objective" ? " · " + x.options.length + " options · answer " + esc(x.answer) : " · " + x.marks + " marks") + "</small></li>"; }).join("") + "</ol>" +
            (r.problems.length ? '<details><summary>Skipped questions</summary><ul>' + r.problems.slice(0, 40).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></details>" : "") +
            '<div class="form-actions"><button type="button" class="btn btn-primary" id="up-go">Import ' + r.rows.length + ' questions</button></div><p class="result" id="up-res" role="status"></p>';
          $("#up-go").addEventListener("click", function () {
            var cn = $("#up-c").value.trim(), sj = $("#up-s").value.trim(), tm = $("#up-t").value, res = $("#up-res");
            if (!cn || !sj) return X.say(res, false, "Choose the class and subject for these questions first.");
            var recs = r.rows.map(function (x) { return Object.assign({ class_name: cn, subject: sj, term: tm, topic: "" }, x); }), done = 0, b = $("#up-go"); b.disabled = true;
            (function next() {
              if (done >= recs.length) { keep = { c: cn, s: sj, t: tm }; X.say(res, true, "Imported " + done + " questions."); X.rest("GET", "/rest/v1/question_bank?select=*&order=created_at.desc&limit=1000").then(function (n) { rows = n || rows; view(); }); return; }
              X.rest("POST", "/rest/v1/question_bank", recs.slice(done, done + 50), { Prefer: "return=minimal" }).then(function () { done += 50; X.say(res, true, "Importing... " + Math.min(done, recs.length) + " of " + recs.length); next(); }, function (er) { b.disabled = false; X.say(res, false, A.nice(er.message) + " (" + Math.min(done, recs.length) + " were imported before the problem.)"); });
            })();
          });
        }, function (er) { out.innerHTML = '<div class="notice"><span>' + esc(er.message || "That file could not be read.") + "</span></div>"; });
      });
    }

    function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    function build() {
      var res = $("#bd-res"), cn = $("#bd-c").value.trim(), sj = $("#bd-s").value.trim(), tm = $("#bd-t").value, ticked = rows.filter(function (x) { return picked[x.id]; }), pick;
      if (!cn || !sj) return X.say(res, false, "Choose the class and subject.");
      if (ticked.length) pick = ticked;
      else {
        var pool = rows.filter(function (x) { return x.class_name === cn && x.subject === sj && (!x.term || x.term === tm); }), no = +$("#bd-no").value || 0, nt = +$("#bd-nt").value || 0;
        var ob = shuffle(pool.filter(function (x) { return x.kind === "objective"; })).slice(0, no), th = shuffle(pool.filter(function (x) { return x.kind === "theory" || x.kind === "short_answer"; })).slice(0, nt);
        pick = ob.concat(th);
        if (!pick.length) return X.say(res, false, "There are no questions for " + cn + ", " + sj + ", " + tm + " term yet. Add some above first.");
      }
      var f = { class: cn, subject: sj, topic: "", term: tm, duration: $("#bd-d").value.trim(), objective_marks: 1 };
      var r = X.fromBank(pick); r.title = sj + " examination"; X.say(res, true, "Fitting the paper to two pages...");
      X.fit(f, r).then(function (o) {
        X.say(res, true, o.dropped ? o.dropped + " question" + (o.dropped > 1 ? "s were" : " was") + " left out so the paper fits two pages. " + o.used + " questions are in the paper." : o.used + " questions in the paper, within two pages.");
        X.show("exam", f, o.r);
      }, function () { X.show("exam", f, r); });
    }
  };
})();
