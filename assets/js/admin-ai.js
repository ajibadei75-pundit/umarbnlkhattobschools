/* Dashboard: Teacher tools. Lesson notes and exam papers (several formats).
   The server function (teacher-ai) returns a DRAFT. The teacher edits it as plain text, then saves, copies, prints or downloads a PDF
   that carries the school heading. Nothing is shared with pupils or parents from here. Drafts are private to the teacher who saved them. */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, $$ = U.$$, esc = U.esc;
  var A = window.UBK_ADMIN, B = (window.UBK_SITE || {}).backend || {};
  if (!A) return;
  var ROOT = (document.currentScript && document.currentScript.src || "").replace(/assets\/js\/[^\/]*$/, "") || "../";
  var host, sub = "lesson", cur = null, pics = [], picSeq = 0;
  var SCHOOL = "Umar BN L Khattob Nursery & Primary School", MOTTO = "Qur'an is our honour";

  function rest(m, p, b, x) { return A.api(m, p, b, x); }
  function say(el, ok, msg) { if (!el) return; el.className = "result show " + (ok ? "ok" : "bad"); el.textContent = msg; }
  function list(a) { return (a || []).map(function (x, i) { return (i + 1) + ". " + x; }).join("\n"); }
  function bullets(a) { return (a || []).map(function (x) { return "- " + x; }).join("\n"); }
  function aiError(status, body) {
    var e = (body && body.error) || "", st = body && body.status;
    if (status === 429 || e === "daily_limit") return "You have reached today's limit (" + ((body && body.limit) || "") + "). Try again tomorrow.";
    if (status === 503 || e === "ai_not_configured" || e === "image_not_configured") return "The AI assistant is not switched on yet. Ask the administrator to add the AI key.";
    if (status === 403) return "Your account is not allowed to use this tool.";
    if (e === "ai_bad_output") return "The assistant's answer could not be read. Please try again.";
    if (e === "image_blocked") return "A picture could not be made from that description. Describe it in a different way and try again.";
    if (body && body.tried && body.tried.length) {
      var nm = { openai: "OpenAI", gemini: "Google", groq: "Groq", openrouter: "OpenRouter", anthropic: "Claude" }, why = function (t) { var c = t.status; return c === 401 || c === 403 ? "key refused" : c === 404 ? "model not found" : c === 402 ? "no credit" : c === 429 ? "limit reached or busy" : c === 413 ? "request too large" : t.error === "ai_bad_output" ? "answer unreadable" : t.error === "ai_unreachable" ? "no reply" : "error " + (c || ""); };
      return "No AI service could answer: " + body.tried.map(function (t) { return (nm[t.service] || t.service) + " (" + why(t) + (t.detail ? ": " + String(t.detail).slice(0, 90) : "") + ")"; }).join("; ") + ". Wait a minute and try again, or ask the administrator to check these keys in Supabase (Edge Functions, Secrets).";
    }
    if (e === "image_failed" || e === "ai_failed") {
      if (st === 400 || st === 401 || st === 403) return "The AI key was refused. The administrator should check the key in Supabase (Edge Functions, Secrets).";
      if (st === 404 && e === "image_failed") return "The picture maker is not available for this AI key.";
      if (st === 404) return "The AI model is not available for this key. The administrator should set GEMINI_MODEL to gemini-2.5-flash in Supabase secrets.";
      if (st === 429) return "The AI service is busy, or the account has no credit left. Try again in a minute; if it repeats, the administrator should check billing on the AI account.";
    }
    if (e === "bad_source") return "One of the files could not be used. Use a JPEG, PNG or PDF.";
    if (e === "source_too_big") return "The files are too large together. Use fewer or smaller files (about 6 MB in total).";
    if (e === "source_needs_gemini") return "Reading photos and PDFs needs an OpenAI or Google AI key. Ask the administrator to add one.";
    if (status === 400) return "Please fill in class, subject and topic, and ask for at least one question.";
    if (st === 503 || st === 500) return "The AI service is very busy right now. Wait a minute and press the button again.";
    if (e === "ai_unreachable") return "The AI service could not be reached or took too long. Try again, or choose a shorter note.";
    return "The assistant could not answer just now" + (st ? " (code " + st + (body.detail ? ": " + String(body.detail).slice(0, 120) : "") + ")" : "") + ". Please try again in a moment.";
  }
  function call(payload) {
    return A.fresh().then(function (tok) {
      return fetch(B.url + "/functions/v1/teacher-ai", { method: "POST", headers: { apikey: B.key, Authorization: "Bearer " + tok, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) { var e = new Error(aiError(r.status, j)); e.handled = true; throw e; } return j; }); });
  }
  function ask(payload) { return call(payload).then(function (j) { j.result._checked = !!j.checked; j.result._unread = j.unread_links || []; j.result._src = j.sources_used || 0; return j.result; }); }

  /* ---- pictures: shrink to a JPEG so drafts and PDFs stay small ---- */
  function shrink(b64, mime) {
    return new Promise(function (res, rej) {
      var im = new Image();
      im.onload = function () {
        var w = Math.min(900, im.naturalWidth), h = Math.round(im.naturalHeight * w / im.naturalWidth), c = document.createElement("canvas");
        c.width = w; c.height = h; var x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, w, h); x.drawImage(im, 0, 0, w, h);
        res({ url: c.toDataURL("image/jpeg", 0.82), w: w, h: h });
      };
      im.onerror = function () { rej(new Error("bad image")); };
      im.src = "data:" + (mime || "image/png") + ";base64," + b64;
    });
  }

  /* ---- source material: photo, JPEG/PNG, PDF, video links ---- */
  var srcs = [], links = [], SRC_MAX = 4, SRC_BYTES = 8500000, PDF_MAX = 4500000;
  function srcBytes() { return srcs.reduce(function (a, x) { return a + x.data.length; }, 0); }
  function fileB64(file) { return new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { res(String(fr.result).split(",")[1] || ""); }; fr.onerror = rej; fr.readAsDataURL(file); }); }
  function imgSmall(file) {
    return new Promise(function (res, rej) {
      var u = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var k = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight)), w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k)), c = document.createElement("canvas");
        c.width = w; c.height = h; var x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, w, h); x.drawImage(im, 0, 0, w, h); URL.revokeObjectURL(u);
        var d = c.toDataURL("image/jpeg", 0.8); res({ mime: "image/jpeg", data: d.split(",")[1], thumb: d });
      };
      im.onerror = function () { URL.revokeObjectURL(u); rej(new Error("bad image")); };
      im.src = u;
    });
  }
  function srcMsg(ok, m) { say($("#ai-srcmsg"), ok, m); }
  function addFiles(list) {
    var files = [].slice.call(list || []), chain = Promise.resolve();
    files.forEach(function (f) {
      chain = chain.then(function () {
        if (srcs.length >= SRC_MAX) return srcMsg(false, "You can add up to " + SRC_MAX + " files.");
        var pdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name);
        if (pdf) {
          if (f.size > PDF_MAX) return srcMsg(false, f.name + " is larger than 4 MB. Split it or photograph the pages you need.");
          return fileB64(f).then(function (d) { if (srcBytes() + d.length > SRC_BYTES) return srcMsg(false, "Too much material. Remove a file first."); srcs.push({ name: f.name, mime: "application/pdf", data: d }); drawSrc(); });
        }
        if (/^image\//.test(f.type)) return imgSmall(f).then(function (o) { if (srcBytes() + o.data.length > SRC_BYTES) return srcMsg(false, "Too much material. Remove a file first."); srcs.push({ name: f.name || "Photo", mime: o.mime, data: o.data, thumb: o.thumb }); drawSrc(); }, function () { srcMsg(false, f.name + " could not be opened. Use a JPEG or PNG photo."); });
        srcMsg(false, f.name + ": use a JPEG, PNG or PDF.");
      });
    });
    return chain;
  }
  function drawSrc() {
    var ul = $("#ai-srclist"); if (!ul) return;
    ul.innerHTML = srcs.map(function (x, i) { return '<li class="ai-chip">' + (x.thumb ? '<img src="' + x.thumb + '" alt="">' : '<span class="ai-pdf" aria-hidden="true">PDF</span>') + "<span>" + esc(x.name) + '</span><button type="button" data-rs="' + i + '" aria-label="Remove ' + esc(x.name) + '">×</button></li>'; }).join("") +
      links.map(function (u, i) { return '<li class="ai-chip"><span class="ai-pdf" aria-hidden="true">▶</span><span>' + esc(u.replace(/^https:\/\/(www\.)?/, "").slice(0, 46)) + '</span><button type="button" data-rl="' + i + '" aria-label="Remove link">×</button></li>'; }).join("");
    $$("[data-rs]", ul).forEach(function (b) { b.addEventListener("click", function () { srcs.splice(+b.getAttribute("data-rs"), 1); drawSrc(); }); });
    $$("[data-rl]", ul).forEach(function (b) { b.addEventListener("click", function () { links.splice(+b.getAttribute("data-rl"), 1); drawSrc(); }); });
  }
  var resRows = null;
  function resHtml() { return '<div class="fld full ai-src" id="ai-resbox" hidden><label>School resources (optional)</label><p class="count-line">Official syllabus, scheme of work or textbook pages uploaded by the school. Tick up to 3 so the note follows them.</p><div id="ai-reslist" class="ai-reslist"></div></div>'; }
  function resDraw() {
    var box = $("#ai-resbox"), list = $("#ai-reslist"); if (!box || !resRows) return;
    var c = ($("#ai-cl") || {}).value || "", sb = ($("#ai-sb") || {}).value || "", n = function (v) { return String(v || "").toLowerCase().replace(/\s+/g, ""); };
    var keep = resRows.filter(function (r) { return (!r.class_name || !c || n(r.class_name) === n(c)) && (!r.subject || !sb || n(r.subject) === n(sb)); });
    var on = $$("input:checked", list).map(function (x) { return x.value; });
    box.hidden = !keep.length;
    list.innerHTML = keep.map(function (r) { return '<label class="check"><input type="checkbox" value="' + esc(r.id) + '"' + (on.indexOf(r.id) >= 0 ? " checked" : "") + '> ' + esc(r.title) + ' <small>' + esc((r.class_name || "All classes") + " · " + (r.subject || "All subjects")) + "</small></label>"; }).join("");
    $$("input", list).forEach(function (i) { i.addEventListener("change", function () { if ($$("input:checked", list).length > 3) { i.checked = false; } }); });
  }
  function resWire() {
    ["#ai-cl", "#ai-sb"].forEach(function (q) { var el = $(q); if (el) el.addEventListener("input", resDraw); });
    if (resRows) return resDraw();
    A.api("GET", "/rest/v1/school_resources?active=eq.true&select=id,title,class_name,subject&order=title.asc&limit=200").then(function (r) { resRows = r || []; resDraw(); }, function () { resRows = []; });
  }
  function srcHtml() {
    return '<div class="fld full ai-src"><label>Source material (optional)</label><p class="count-line">Snap a textbook page or notes, upload a JPEG, PNG or PDF, or paste a video link. The assistant builds the note or exam from what it reads. YouTube links work best; Facebook, TikTok or Instagram posts are read only when the page is public, so add a few lines in Extra notes as well.</p>' +
      '<div class="form-actions"><button type="button" class="btn btn-soft btn-sm" id="ai-snapb">Take a photo</button><button type="button" class="btn btn-soft btn-sm" id="ai-upb">Upload JPEG, PNG or PDF</button></div>' +
      '<input type="file" id="ai-snap" accept="image/*" capture="environment" hidden><input type="file" id="ai-up" accept="image/jpeg,image/png,image/webp,application/pdf" multiple hidden>' +
      '<div class="ai-linkrow"><input class="input" id="ai-link" type="url" inputmode="url" maxlength="300" placeholder="Paste a video or page link (https://...)" aria-label="Video or page link"><button type="button" class="btn btn-soft btn-sm" id="ai-addlink">Add link</button></div>' +
      '<ul class="ai-chips" id="ai-srclist"></ul><p class="result" id="ai-srcmsg" role="status"></p>' +
      '<div class="fld full" style="margin-top:.8rem"><label for="ai-stx">Paste text or your scheme of work (optional)</label><textarea class="input" id="ai-stx" rows="4" maxlength="12000" placeholder="Paste the scheme of work, textbook text, a curriculum extract or your own notes here..."></textarea></div>' +
      '<div class="form-actions"><button type="button" class="btn btn-soft btn-sm" id="ai-uptb">Upload Word or text file</button></div><input type="file" id="ai-uptf" accept=".docx,.txt,.md,.csv,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden></div>';
  }
  function srcWire() {
    var snap = $("#ai-snap"), up = $("#ai-up");
    $("#ai-snapb").addEventListener("click", function () { snap.click(); });
    $("#ai-upb").addEventListener("click", function () { up.click(); });
    [snap, up].forEach(function (inp) { inp.addEventListener("change", function () { addFiles(inp.files).then(function () { inp.value = ""; }); }); });
    $("#ai-addlink").addEventListener("click", function () {
      var v = $("#ai-link").value.trim();
      if (!/^https:\/\/[^\s]{4,300}$/i.test(v)) return srcMsg(false, "Paste a full link that starts with https://");
      if (links.length >= 3) return srcMsg(false, "You can add up to 3 links.");
      if (links.indexOf(v) < 0) links.push(v); $("#ai-link").value = ""; srcMsg(true, ""); $("#ai-srcmsg").className = "result"; drawSrc();
    });
    $("#ai-uptb").addEventListener("click", function () { $("#ai-uptf").click(); });
    $("#ai-uptf").addEventListener("change", function () {
      var f = this.files[0], inp = this; if (!f) return;
      var get = /\.docx$/i.test(f.name) ? loadDocxRead().then(function () { return window.DocxRead.paragraphs(f); }).then(function (ps) { return ps.map(function (x) { return x.text; }).filter(Boolean).join("\n"); }) : /\.(txt|md|csv)$/i.test(f.name) || /^text\//.test(f.type) ? f.text() : Promise.reject(new Error("type"));
      get.then(function (t) { var ta = $("#ai-stx"), v = (ta.value ? ta.value + "\n\n" : "") + t.trim(); ta.value = v.slice(0, 12000); srcMsg(true, f.name + " added" + (v.length > 12000 ? " (the first 12,000 characters were kept)" : "") + "."); }, function () { srcMsg(false, "Could not read " + f.name + ". Use a Word (.docx) or text (.txt) file."); }).then(function () { inp.value = ""; });
    });
    $("#ai-link").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); $("#ai-addlink").click(); } });
    drawSrc();
  }

  /* ---- text builders ---- */
  function picLines() {
    var on = pics.filter(function (p) { return p.url; });
    return on.length ? ["", "TEACHING PICTURES"].concat(on.map(function (p) { return "[Picture " + p.n + "] " + (p.caption || ""); })).join("\n") : "";
  }
  function fmtDate(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ""); if (!m) return "";
    var d = +m[3], sf = d % 10 === 1 && d !== 11 ? "st" : d % 10 === 2 && d !== 12 ? "nd" : d % 10 === 3 && d !== 13 ? "rd" : "th";
    return d + sf + " of " + ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][+m[2] - 1] + ", " + m[1];
  }
  var ROM = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii", "xiii", "xiv", "xv"];
  function roman(a) { return (a || []).map(function (x, i) { return (ROM[i] || i + 1) + ". " + x; }).join("\n"); }
  function lessonText(r, f) {
    var S = (U.site && U.site()) || {}, ses = ((window.UBK_SITE || {}).session || {}).label, dt = f.date || "";
    var out = [(r.title || f.topic || "Lesson note").toUpperCase(), "Week: " + (f.week || ""), "School: " + SCHOOL, "Class: " + f.class, "Time: " + (r.duration || f.duration || ""), "Subject: " + f.subject, "Topic: " + f.topic, "Reference: " + (f.reference || ""), "Date: " + dt];
    if (r.class_level_note) out.push(r.class_level_note);
    out.push("", "PREVIOUS KNOWLEDGE", r.previous_knowledge || "", "", "BEHAVIOURAL OBJECTIVES", "By the end of the lesson, the pupils should be able to:", roman(r.objectives), "", "INSTRUCTIONAL MATERIALS", bullets(r.materials), "");
    if ((r.key_words || []).length) out.push("KEY WORDS", r.key_words.map(function (k) { return "- " + k.word + ": " + k.meaning; }).join("\n"), "");
    out.push("INTRODUCTION", r.introduction || "", ""); if (r.short_explanation) out.push("SHORT EXPLANATION (TEACHER SAYS)", r.short_explanation, ""); if ((r.resources || []).length) out.push("RESOURCES", r.resources.map(function (x) { return "- " + (x.type ? x.type + ": " : "") + (x.name || "") + (x.how_used ? " (" + x.how_used + ")" : ""); }).join("\n"), ""); if (r.engagement && (r.engagement.hook || r.engagement.activity)) out.push("HOOK AND ACTIVITY", "- Hook: " + (r.engagement.hook || ""), "- Activity: " + (r.engagement.activity || ""), ""); out.push("PRESENTATION", "The teacher presents the lesson as thus:");
    (r.steps || []).forEach(function (s, i) { out.push("Step " + (ROM[i] || i + 1) + ": " + (s.stage || "") + (s.time ? " (" + s.time + ")" : ""), "  Teacher: " + (s.teacher_activity || ""), "  Pupils: " + (s.pupil_activity || ""), ""); });
    var bn = r.board_note;
    if (bn && (bn.sections || []).length) {
      out.push("BOARD NOTE", (bn.title || f.topic || "").toUpperCase());
      bn.sections.forEach(function (sc) { out.push((sc.label || "Note") + ":"); (sc.lines || []).forEach(function (l) { out.push("  " + l); }); });
      out.push("");
    }
    var c = r.class_note;
    if (c) {
      out.push("CLASS NOTE: " + String(c.heading || f.topic || "").toUpperCase(), "(The teacher writes this note on the board for the pupils to copy.)", list(c.explanation), "");
      if ((c.rules || []).length) out.push("RULES AND FORMULAS", bullets(c.rules), "");
      if ((c.worked_examples || []).length) {
        out.push("WORKED EXAMPLES", "");
        c.worked_examples.forEach(function (w, i) { out.push("Example " + (i + 1) + ": " + (w.title || ""), "Question: " + (w.problem || "")); (w.steps || []).forEach(function (st) { out.push("   " + String(st).replace(/^\s+/, "")); }); out.push(/^answer/i.test(w.answer || "") ? w.answer : "Answer: " + (w.answer || ""), ""); });
      }
      if ((c.common_mistakes || []).length) out.push("COMMON MISTAKES TO AVOID", bullets(c.common_mistakes), "");
      if (c.real_life) out.push("IN REAL LIFE", c.real_life, "");
    }
    if (r.source_summary) out.push("SOURCE USED", r.source_summary, "");
    out.push("BOARD SUMMARY", bullets(r.board_summary), "");
    if ((r.practice || []).length) out.push("PRACTICE EXERCISE", r.practice.map(function (q, i) { return (i + 1) + ". " + q.q; }).join("\n"), "");
    if (r.differentiation) out.push("SUPPORT AND EXTENSION", "- Support: " + (r.differentiation.support || ""), "- Extension: " + (r.differentiation.extension || ""), "");
    out.push("EVALUATION", "The teacher evaluates the lesson by asking the pupils to:", list(r.evaluation), "", "CONCLUSION", r.conclusion || "The teacher concludes the lesson by summarising the board summary with the pupils and correcting any mistakes.", "", "ASSIGNMENT", r.assignment || "");
    if (r.home_extension) out.push("", "AT HOME WITH PARENTS", r.home_extension);
    if ((r.practice || []).length) out.push("", "ANSWERS TO THE PRACTICE EXERCISE (TEACHER)", r.practice.map(function (q, i) { return (i + 1) + ". " + q.answer; }).join("\n"));
    return out.join("\n");
  }
  function optLines(opts) {
    var L = opts.map(function (o, j) { return "(" + "abcd"[j] + ") " + String(o).replace(/^\(?[A-Da-d][\).:]\s+/, ""); }), max = Math.max.apply(null, opts.map(function (o) { return String(o).length; }).concat([0]));
    if (L.length <= 2 || max <= 15) return ["    " + L.join("\t")];
    return ["    " + L[0] + "\t" + L[1], "    " + (L[2] || "") + "\t" + (L[3] || "")];
  }
  function examTexts(r, f) {
    var ses = ((window.UBK_SITE || {}).session || {}).label, mk = parseFloat(f.objective_marks) || 1, p = [(r.title || (f.subject + " examination")).toUpperCase(), "Class: " + f.class + "    Subject: " + f.subject + (f.term ? "    Term: " + f.term : "") + (ses ? "    Session: " + ses : "") + (f.duration ? "    Time: " + f.duration : ""), "Name: ______________________________    Date: ______________", "", "INSTRUCTIONS", r.instructions || "", ""];
    var k = [(r.title || f.subject).toUpperCase() + " - MARKING SCHEME", "TEACHER COPY"], sec = 0, L = "ABCDEFGH";
    function head(t) { p.push("SECTION " + L[sec] + ": " + t, ""); k.push("", "SECTION " + L[sec] + ": " + t.replace(/\s*\(.*\)$/, "")); sec++; }
    if ((r.objective || []).length) {
      head("OBJECTIVE (" + mk + " mark each). Choose the correct option (a, b, c or d).");
      var key = [];
      r.objective.forEach(function (q, i) { p.push((i + 1) + ". " + q.q); optLines(q.options || []).forEach(function (l) { p.push(l); }); p.push(""); key.push((i + 1) + ". (" + String(q.answer || "").toLowerCase().replace(/[^a-d]/g, "") + ")"); });
      for (var g = 0; g < key.length; g += 5) k.push(key.slice(g, g + 5).join("\t"));
    }
    if ((r.fill_blank || []).length) { head("FILL IN THE GAPS (" + mk + " mark each)"); r.fill_blank.forEach(function (q, i) { p.push((i + 1) + ". " + q.q, ""); k.push((i + 1) + ". " + (q.answer || "")); }); }
    if ((r.true_false || []).length) { head("TRUE OR FALSE (" + mk + " mark each)"); r.true_false.forEach(function (q, i) { p.push((i + 1) + ". " + q.q + "   ( True / False )", ""); k.push((i + 1) + ". " + (q.answer || "")); }); }
    if (r.matching && (r.matching.left || []).length) {
      head("MATCHING (" + mk + " mark each). " + (r.matching.instruction || "Match each item in Column A with its answer in Column B."));
      p.push("Column A"); r.matching.left.forEach(function (x, i) { p.push((i + 1) + ". " + x); }); p.push("", "Column B"); (r.matching.right || []).forEach(function (x, i) { p.push("   " + "ABCDEFGHIJ"[i] + ". " + x); }); p.push("");
      r.matching.left.forEach(function (x, i) { k.push((i + 1) + ". " + ((r.matching.answers || [])[i] || "")); });
    }
    if ((r.short_answer || []).length) { head("SHORT ANSWERS"); r.short_answer.forEach(function (q, i) { p.push((i + 1) + ". " + q.q + " [" + (q.marks || "") + " marks]", "", ""); k.push((i + 1) + ". " + (q.answer || "") + " (" + (q.marks || "") + " marks)"); }); }
    if ((r.theory || []).length) { head("THEORY"); r.theory.forEach(function (q, i) { p.push((i + 1) + ". " + q.q + " [" + (q.marks || "") + " marks]", ""); k.push((i + 1) + ". (" + (q.marks || "") + " marks)", bullets(q.marking_scheme)); }); }
    if (r.total_marks) { p.push("Total marks: " + r.total_marks); k.push("", "Total marks: " + r.total_marks); }
    return { paper: p.join("\n"), scheme: k.join("\n") };
  }

  /* ---- keeper: every note and paper is saved by itself, on this phone (IndexedDB) and in the teacher's own account ---- */
  var KDB = null, onChange = null, wakeN = 0, wakeLock = null, syncing = false, again = false, syncT = null;
  function ME() { return (A.uid && A.uid()) || "anon"; }
  function newLid() { return "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function kdb() {
    return KDB || (KDB = new Promise(function (res, rej) {
      if (!window.indexedDB) return rej(new Error("noidb"));
      var q = indexedDB.open("ubk-keep", 1);
      q.onupgradeneeded = function () { q.result.createObjectStore("drafts", { keyPath: "lid" }); q.result.createObjectStore("misc", { keyPath: "k" }); };
      q.onsuccess = function () { res(q.result); }; q.onerror = function () { KDB = null; rej(q.error); };
    }));
  }
  function ktx(store, mode, fn) { return kdb().then(function (db) { return new Promise(function (res, rej) { var t = db.transaction(store, mode), st = t.objectStore(store), out = fn(st); t.oncomplete = function () { res(out && typeof out === "object" && "result" in out ? out.result : undefined); }; t.onerror = t.onabort = function () { rej(t.error); }; }); }); }
  function kget(store, key) { return ktx(store, "readonly", function (st) { return st.get(key); }).catch(function () { return null; }); }
  function kall(store) { return ktx(store, "readonly", function (st) { return st.getAll(); }).then(function (r) { return r || []; }, function () { return []; }); }
  function kput(store, v) { return ktx(store, "readwrite", function (st) { st.put(v); }).catch(function () {}); }
  function kdel(store, key) { return ktx(store, "readwrite", function (st) { st.delete(key); }).catch(function () {}); }
  /* read-modify-write in ONE transaction, so an autosave and a sync can never overwrite each other */
  function kmod(store, key, fn) { return kdb().then(function (db) { return new Promise(function (res, rej) { var t = db.transaction(store, "readwrite"), st = t.objectStore(store), g = st.get(key); g.onsuccess = function () { var v = fn(g.result); if (v) st.put(v); }; t.oncomplete = function () { res(); }; t.onerror = t.onabort = function () { rej(t.error); }; }); }).catch(function () {}); }
  function keepDraft(lid, snap, id) {
    return kmod("drafts", lid, function (old) {
      var it = old || { lid: lid, uid: ME(), id: id || null, ver: 0 };
      it.kind = snap.kind; it.title = snap.title; it.inputs = snap.inputs; it.output = snap.output; it.at = Date.now(); it.ver = (it.ver || 0) + 1; it.dirty = true; it.deleted = false; return it;
    }).then(syncSoon);
  }
  function syncOne(it) {
    var ver = it.ver;
    if (it.deleted) return (it.id ? rest("DELETE", "/rest/v1/ai_drafts?id=eq." + encodeURIComponent(it.id)) : Promise.resolve()).then(function () { return kdel("drafts", it.lid); });
    var p = it.id ? rest("PATCH", "/rest/v1/ai_drafts?id=eq." + encodeURIComponent(it.id), { title: it.title, inputs: it.inputs, output: it.output }, { Prefer: "return=minimal" }).then(function () { return it.id; })
      : rest("POST", "/rest/v1/ai_drafts", { kind: it.kind, title: it.title, inputs: it.inputs, output: it.output }, { Prefer: "return=representation" }).then(function (j) { return j && j[0] && j[0].id; });
    return p.then(function (id) { return kmod("drafts", it.lid, function (o) { if (!o) return null; if (id) o.id = id; if (o.ver === ver) o.dirty = false; return o; }); });
  }
  function syncAll() {
    if (syncing) { again = true; return Promise.resolve(); }
    if (!navigator.onLine) return Promise.resolve();
    syncing = true; var me = ME();
    return kall("drafts").then(function (list) {
      var chain = Promise.resolve();
      list.filter(function (x) { return x.uid === me && (x.dirty || x.deleted); }).forEach(function (x) { chain = chain.then(function () { return syncOne(x); }); });
      return chain;
    }).catch(function () { /* offline or refused: stays on the phone and tries again */ }).then(function () { syncing = false; if (again) { again = false; return syncAll(); } }).then(function () { if (onChange && onChange.status) onChange.status(); });
  }
  function syncSoon() { clearTimeout(syncT); syncT = setTimeout(syncAll, 500); }
  window.addEventListener("online", syncAll);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") syncAll(); else if (onChange && onChange.flush) onChange.flush(); });
  window.addEventListener("pagehide", function () { if (onChange && onChange.flush) onChange.flush(); });
  setInterval(syncAll, 45000);
  /* keep the screen on while a note is being written, and write again if the phone slept in the middle */
  function wakeOn() { wakeN++; try { if (navigator.wakeLock && !wakeLock) navigator.wakeLock.request("screen").then(function (l) { wakeLock = l; l.addEventListener("release", function () { wakeLock = null; }); }).catch(function () {}); } catch (e) { /* not supported */ } }
  function wakeOff() { wakeN = Math.max(0, wakeN - 1); if (!wakeN) { try { if (wakeLock) wakeLock.release(); } catch (e) { /* ignore */ } wakeLock = null; } }
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible" && wakeN && !wakeLock) { try { navigator.wakeLock.request("screen").then(function (l) { wakeLock = l; l.addEventListener("release", function () { wakeLock = null; }); }).catch(function () {}); } catch (e) { /* ignore */ } } });
  function whenReady() {
    return new Promise(function (res) { function ok() { return document.visibilityState === "visible" && navigator.onLine; } if (ok()) return setTimeout(res, 1200); var t = setInterval(function () { if (ok()) { clearInterval(t); setTimeout(res, 1200); } }, 700); });
  }
  function askKeep(payload) {
    wakeOn();
    function attempt(n) { return ask(payload).catch(function (er) { if (er.handled || n >= 2) throw er; return whenReady().then(function () { return attempt(n + 1); }); }); }
    return attempt(0).then(function (r) { wakeOff(); return r; }, function (e) { wakeOff(); throw e; });
  }
  /* the form itself: what was typed before pressing Generate is kept too */
  function fkey() { return "form:" + ME() + ":" + sub + ":" + planMode; }
  function formSave(form) {
    var v = {}; $$("input, select, textarea", form).forEach(function (el) { if (el.id && el.type !== "file" && el.type !== "password") v[el.id] = el.type === "checkbox" ? el.checked : el.value; });
    kput("misc", { k: fkey(), v: v, at: Date.now() });
  }
  function formRestore(tch) {
    return kget("misc", fkey()).then(function (rec) {
      if (!rec || !rec.v) return; var v = rec.v;
      if (v["ai-cl"] != null && $("#ai-cl")) { $("#ai-cl").value = v["ai-cl"]; if (tch) $("#ai-cl").dispatchEvent(new Event("change")); }
      Object.keys(v).forEach(function (id) {
        var el = $("#" + id); if (!el || id === "ai-cl" || el.type === "file") return;
        if (el.type === "checkbox") el.checked = !!v[id];
        else if (el.tagName === "SELECT") { if ([].some.call(el.options, function (o) { return o.value === v[id]; })) el.value = v[id]; }
        else el.value = v[id];
      });
      if ($("#ai-pm")) $("#ai-pm").dispatchEvent(new Event("change"));
    });
  }
  function clockNow() { try { return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; } }

  /* ---- two-week plan: several lesson notes, one after another ---- */
  var planMode = "one", examSeed = null, batch = [], batchIdx = 0, planStop = false, planBusy = false;
  var WDAYS = [[0], [0, 3], [0, 2, 4], [0, 1, 3, 4], [0, 1, 2, 3, 4]];
  function planDate(start, wk, j, n) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(start || ""); if (!m) return "";
    var d = new Date(+m[1], +m[2] - 1, +m[3]), dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow + (wk - 1) * 7 + WDAYS[n - 1][j - 1]);
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }
  function planItems(f, W, n, lines, startISO) {
    var T = W * n, items = [], k;
    for (k = 0; k < T; k++) {
      var gi = lines.length ? (lines.length >= T ? k : Math.min(Math.floor(k * lines.length / T), lines.length - 1)) : 0;
      items.push({ k: k, wk: Math.floor(k / n) + 1, j: k % n + 1, gi: gi, topic: lines.length ? lines[gi] : f.topic });
    }
    items.forEach(function (it) { var same = items.filter(function (x) { return x.gi === it.gi; }); it.p = same.indexOf(it) + 1; it.q = same.length; it.iso = planDate(startISO, it.wk, it.j, n); });
    return items;
  }
  function lessonDigest(r, f) {
    var o = [(r.title || f.topic || "Lesson")];
    if ((r.objectives || []).length) o.push("Objectives: " + r.objectives.join("; "));
    if ((r.key_words || []).length) o.push("Key words: " + r.key_words.map(function (k) { return k.word + " (" + k.meaning + ")"; }).join("; "));
    var c = r.class_note; if (c && (c.explanation || []).length) o.push("Class note: " + c.explanation.join(" "));
    if (c && (c.worked_examples || []).length) o.push("Examples: " + c.worked_examples.map(function (w) { return w.problem; }).join(" | "));
    if ((r.board_summary || []).length) o.push("Summary: " + r.board_summary.join("; "));
    return o.join("\n").slice(0, 1400);
  }
  function batchText(b) { return kget("drafts", b.lid).then(function (it) { return (it && it.output && it.output.text) || lessonText(b.r, b.f); }); }
  function drawBatch() {
    var box = $("#ai-plan"); if (!box) return;
    var done = batch.length;
    box.innerHTML = (done ? '<div class="ai-batch" role="group" aria-label="Lessons in this plan">' + batch.map(function (b, i) { return '<button type="button" class="' + (i === batchIdx ? "on" : "") + '" data-bi="' + i + '"><b>' + esc(b.label) + "</b><small>" + esc((b.r.title || b.f.topic || "").slice(0, 40)) + "</small></button>"; }).join("") + "</div>" : "") +
      (done && !planBusy ? '<p class="ai-auto">Every lesson is saved automatically in your account and on this phone.</p><div class="form-actions ai-batch-actions"><button type="button" class="btn btn-primary btn-sm" id="pl-dx">Download all (Word)</button><button type="button" class="btn btn-soft btn-sm" id="pl-exam">Make exam from all lessons</button></div>' : "");
    $$("[data-bi]", box).forEach(function (b) { b.addEventListener("click", function () { openBatch(+b.getAttribute("data-bi")); }); });
    var dx = $("#pl-dx"), ex = $("#pl-exam");
    if (dx) dx.addEventListener("click", function () { if (onChange && onChange.flush) onChange.flush(); setTimeout(function () { Promise.all(batch.map(batchText)).then(function (tx) { doDocx("lesson_note", batch[0].f, tx.join("\n\n\n"), false); }); }, 300); });
    if (ex) ex.addEventListener("click", function () {
      var tp = []; batch.forEach(function (b) { var t = b.f.topic; if (tp.indexOf(t) < 0) tp.push(t); });
      examSeed = { cls: batch[0].f.class, sb: batch[0].f.subject, topic: tp.join(", ").slice(0, 190), title: batch.length + " lessons: " + tp.join(", ").slice(0, 80), ctx: batch.map(function (b) { return lessonDigest(b.r, b.f); }).join("\n---\n").slice(0, 5000) };
      sub = "exam"; cur = null; pics = []; open(host);
    });
  }
  function openBatch(i) {
    if (onChange && onChange.flush) onChange.flush();
    batchIdx = i; var b = batch[i];
    setTimeout(function () { kget("drafts", b.lid).then(function (it) { pics = []; picSeq = 0; show("lesson_note", b.f, b.r, it ? { id: it.id, _lid: b.lid, output: it.output } : null, b.lid); drawBatch(); }); }, 250);
  }
  /* an interrupted plan can be continued: what was asked for is remembered with the lessons already written */
  function planMeta(base, f, items, k) {
    if (base) planMeta.last = { base: base, f: f, items: items };
    var m = planMeta.last; if (!m) return;
    kput("misc", { k: "plan:" + ME(), base: m.base, f: m.f, items: m.items, done: batch.length, lids: batch.map(function (b) { return { lid: b.lid, label: b.label, f: b.f }; }), at: Date.now() });
  }
  function planBanner() {
    if (batch.length) return;
    kget("misc", "plan:" + ME()).then(function (m) {
      var box = $("#ai-plan"); if (!m || !box || m.done >= m.items.length || batch.length) return;
      box.innerHTML = '<div class="notice is-info"><span data-icon="alert"></span><span>Your lesson plan stopped after <b>' + m.done + " of " + m.items.length + '</b> lessons (' + esc(m.f.subject + ", " + m.f.class) + '). The ones already written are saved.</span></div><div class="form-actions"><button type="button" class="btn btn-primary btn-sm" id="pl-cont">Continue writing the rest</button><button type="button" class="btn btn-soft btn-sm" id="pl-drop">Discard the plan</button></div>';
      $("#pl-drop").addEventListener("click", function () { kdel("misc", "plan:" + ME()); box.innerHTML = ""; });
      $("#pl-cont").addEventListener("click", function () {
        Promise.all(m.lids.map(function (x) { return kget("drafts", x.lid); })).then(function (its) {
          batch = m.lids.map(function (x, i) { return { label: x.label, f: x.f, r: (its[i] && its[i].output && its[i].output.struct) || {}, lid: x.lid }; }).filter(function (b, i) { return its[i]; });
          planMeta.last = { base: m.base, f: m.f, items: m.items };
          runPlan(m.base, m.f, m.items, batch.length);
        });
      });
    });
  }
  function runPlan(base, f, items, from) {
    var res = $("#ai-res"), go = $("#ai-go"), box = $("#ai-plan"); planBusy = true; if (!from) planMeta(base, f, items); planStop = false; go.disabled = true;
    if (!from) { batch = []; batchIdx = 0; }
    box.innerHTML = '<div class="form-actions"><button type="button" class="btn btn-soft btn-sm" id="pl-stop">Stop after this lesson</button></div>';
    $("#pl-stop").addEventListener("click", function () { planStop = true; this.disabled = true; this.textContent = "Stopping..."; });
    var k = from || 0, bad = null;
    function next() {
      if (k >= items.length || planStop) return fin();
      var it = items[k], pl = Object.assign({}, base), fi = Object.assign({}, f, { topic: it.topic, week: "Week " + it.wk + ", Lesson " + it.j, date: fmtDate(it.iso) });
      pl.topic = it.topic; pl.week = fi.week;
      pl.series = ("Lesson " + (it.k + 1) + " of " + items.length + " in a plan of " + (items[items.length - 1].wk) + " week(s) (Week " + it.wk + ", lesson " + it.j + "). " +
        (it.q > 1 ? "This is part " + it.p + " of " + it.q + " on the topic \"" + it.topic + "\": " + (it.p === 1 ? "introduce the topic and its basic ideas" : it.p === it.q ? "finish the topic with application, revision and a short check" : "develop the topic further with new content and examples") + ". " : "") +
        (batch.length ? "Lessons already written: " + batch.map(function (b) { return b.label + " " + (b.r.title || b.f.topic); }).join("; ") + "." : "")).slice(0, 900);
      say(res, true, "Writing lesson " + (k + 1) + " of " + items.length + " (" + fi.week + "): " + it.topic + ". Keep this page open; each lesson takes about a minute.");
      return askKeep(pl).then(function (r) { var lid = newLid(); keepDraft(lid, { kind: "lesson_note", title: (fi.subject + " - " + fi.week + " - " + fi.topic).slice(0, 150), inputs: fi, output: { text: lessonText(r, fi), pics: [], struct: r } }, null); batch.push({ label: "Wk " + it.wk + " L" + it.j, f: fi, r: r, lid: lid }); if (batch.length === 1) { pics = []; picSeq = 0; batchIdx = 0; show("lesson_note", fi, r, null, lid); } k++; planMeta(); drawBatchProgress(); return next(); },
        function (er) { bad = er.handled ? er.message : "Could not reach the assistant. Check your connection."; return fin(); });
    }
    function drawBatchProgress() { var st = $("#pl-stop"), keepStop = st && !st.disabled; drawBatch(); if (keepStop) { box.insertAdjacentHTML("afterbegin", '<div class="form-actions"><button type="button" class="btn btn-soft btn-sm" id="pl-stop">Stop after this lesson</button></div>'); $("#pl-stop").addEventListener("click", function () { planStop = true; this.disabled = true; this.textContent = "Stopping..."; }); } }
    function fin() {
      planBusy = false; go.disabled = false; drawBatch();
      if (bad) { say(res, false, batch.length + " of " + items.length + " lessons are ready. " + bad); if (k < items.length) { box.insertAdjacentHTML("afterbegin", '<div class="form-actions"><button type="button" class="btn btn-primary btn-sm" id="pl-resume">Write the remaining ' + (items.length - k) + " lesson" + (items.length - k > 1 ? "s" : "") + "</button></div>"); $("#pl-resume").addEventListener("click", function () { runPlan(base, f, items, k); }); } }
      else if (planStop && k < items.length) say(res, true, "Stopped. " + batch.length + " of " + items.length + " lessons are ready.");
      else { kdel("misc", "plan:" + ME()); kdel("misc", fkey()); say(res, true, batch.length + " lesson notes are ready and saved to your account. Pick a lesson below to read and edit it. Everything is saved by itself."); }
    }
    return next();
  }

  /* ---- layout ---- */
  function open(h) {
    host = h; var off = !!(A.offline && A.offline());
    var tabs = off ? [["saved", "Saved drafts"]] : [["lesson", "Lesson note"], ["exam", "Exam paper"], ["bank", "Question bank"], ["saved", "Saved drafts"]]; if (off) sub = "saved";
    host.innerHTML = '<h2 class="sec-title" style="font-size:1.2rem">Teacher tools</h2><p class="count-line">The assistant writes a first draft. Always read, correct and adjust before use. For Qur\'an, Arabic and Islamic Studies, check every reference and ruling yourself.</p>' +
      (off ? "" : '<p class="count-line"><button type="button" class="btn btn-soft btn-sm" id="ai-chk">Check AI connection</button> <span id="ai-chk-r"></span></p>') +
      '<div class="level-tabs rw-tabs" role="tablist" aria-label="Teacher tools">' + tabs.map(function (x) { return '<button type="button" role="tab" data-s="' + x[0] + '" aria-selected="' + (x[0] === sub) + '">' + esc(x[1]) + "</button>"; }).join("") + '</div><div id="ai-body"></div>';
    $$(".rw-tabs button", host).forEach(function (b) { b.addEventListener("click", function () { sub = b.getAttribute("data-s"); cur = null; pics = []; srcs = []; links = []; examSeed = null; open(host); }); });
    if ($("#ai-chk")) $("#ai-chk").addEventListener("click", function () {
      var o = $("#ai-chk-r"); o.textContent = "Checking..."; var w = { ok: "working", rejected: "key refused", missing: "not set", not_found: "not available for this key", unreachable: "cannot reach Google" };
      call({ task: "ping" }).then(function (j) {
        var nm = { openai: "OpenAI", gemini: "Google", groq: "Groq", openrouter: "OpenRouter", anthropic: "Claude" };
        o.textContent = (j.checks || []).map(function (c) { return (nm[c.service] || c.service) + ": " + (c.ok ? "working" + (c.model ? " (" + c.model + ")" : "") : "NOT working (" + (c.status ? "code " + c.status + " " : "") + (c.detail || c.error || "") + ")"); }).join("  |  ") || ("Writing: " + (w[j.text] || j.text) + ".");
      }, function (e) { o.textContent = e.handled ? e.message : "Could not check."; });
    });
    var body = $("#ai-body"); (sub === "saved" ? saved : sub === "bank" ? bank : form)(body);
  }
  function fld(id, label, extra, tag, cls) { return '<div class="fld' + (cls ? " " + cls : "") + '"><label for="' + id + '">' + label + "</label>" + (tag || '<input class="input" id="' + id + '" maxlength="200" ' + (extra || "") + ">") + "</div>"; }
  var PRESETS = { mixed: { ob: 20, fb: 0, tf: 0, mt: 0, sa: 0, th: 4 }, objective: { ob: 40, fb: 0, tf: 0, mt: 0, sa: 0, th: 0 }, theory: { ob: 0, fb: 0, tf: 0, mt: 0, sa: 0, th: 6 }, ca: { ob: 5, fb: 5, tf: 5, mt: 0, sa: 3, th: 0 }, quiz: { ob: 10, fb: 0, tf: 5, mt: 0, sa: 0, th: 0 }, junior: { ob: 10, fb: 5, tf: 5, mt: 5, sa: 3, th: 0 } };
  var teaching = null, pre = null;
  function roleLine(T) {
    var ct = T.filter(function (c) { return c.access === "class_teacher"; }), st = T.filter(function (c) { return c.own.length; });
    var a = ct.length ? "Class teacher of " + ct.map(function (c) { return c.name; }).join(", ") : "", b = st.length ? "Subject teacher: " + st.map(function (c) { return c.own.map(function (x) { return x.name; }).join(", ") + " (" + c.name + ")"; }).join("; ") : "";
    return [a, b].filter(Boolean).join(". ");
  }
  function sbOf(c) { return c.access === "class_teacher" && c.section === "basic" ? c.subjects : c.own; }
  function form(body) {
    if (A.role() !== "teacher") return formIn(body);
    if (teaching) return formIn(body);
    body.innerHTML = '<p class="count-line">Loading your classes...</p>';
    A.rpc("my_teaching").then(function (t) { teaching = t || []; formIn(body); }, function () { teaching = []; formIn(body); });
  }
  function formIn(body) {
    var ex = sub === "exam", num = function (id, l, v, mx) { return fld(id, l, 'type="number" min="0" max="' + mx + '" value="' + v + '"'); };
    var tch = A.role() === "teacher", clF = fld("ai-cl", "Class", 'placeholder="e.g. Primary 3"'), sbF = fld("ai-sb", "Subject", 'placeholder="e.g. Mathematics"'), rl = "";
    if (tch) {
      var cs = (teaching || []).filter(function (c) { return sbOf(c).length; });
      if (!cs.length) { body.innerHTML = '<div class="empty"><h3>No class or subject assigned yet</h3><p>An administrator assigns your class or subjects (Users and logins, Assign teachers). Then you can write notes and papers for them here.</p></div>'; return; }
      var pc = pre && cs.filter(function (c) { return c.id === pre.cls; })[0] || cs[0];
      clF = fld("ai-cl", "Class", "", '<select class="select-lg" id="ai-cl">' + cs.map(function (c) { return '<option value="' + esc(c.name) + '" data-id="' + esc(c.id) + '"' + (c.id === pc.id ? " selected" : "") + ">" + esc(c.name) + "</option>"; }).join("") + "</select>");
      sbF = fld("ai-sb", "Subject", "", '<select class="select-lg" id="ai-sb"></select>');
      rl = '<p class="notice is-info" style="margin-bottom:1rem"><span data-icon="alert"></span><span>' + esc(roleLine(teaching)) + ". You can write notes and papers only for these classes and subjects.</span></p>";
    }
    var modeSw = ex ? "" : '<div class="qb-mode" role="group" aria-label="One lesson or a weekly plan"><button type="button" class="' + (planMode === "one" ? "on" : "") + '" data-pm="one">One lesson</button><button type="button" class="' + (planMode === "plan" ? "on" : "") + '" data-pm="plan">Weekly plan (1 to 2 weeks)</button></div>', plan = !ex && planMode === "plan";
    var seedBar = ex && examSeed ? '<p class="notice is-info" id="ai-seed"><span data-icon="alert"></span><span>The questions will follow your lesson note: <b>' + esc(examSeed.title || examSeed.topic) + '</b>. <button type="button" class="btn btn-soft btn-sm" id="ai-seedx">Do not use it</button></span></p>' : "";
    body.innerHTML = rl + modeSw + seedBar + '<form id="ai-form" class="form-card" novalidate><div class="form-grid">' + clF + sbF +
      fld("ai-tp", ex ? "Topics covered" : plan ? "Main topic" : "Topic", 'placeholder="' + (ex ? "e.g. Addition, subtraction, shapes" : "e.g. Fractions") + '"') +
      (ex ? fld("ai-et", "Exam type", "", '<select class="select-lg" id="ai-et"><option>Continuous assessment</option><option>Mid-term test</option><option selected>End of term examination</option><option>Weekly quiz</option><option>Promotion examination</option></select>') +
        fld("ai-tm", "Term", "", '<select class="select-lg" id="ai-tm"><option>First</option><option>Second</option><option>Third</option></select>') + fld("ai-df", "Difficulty", "", '<select class="select-lg" id="ai-df"><option value="easy">Easy</option><option value="medium" selected>Medium</option><option value="hard">Hard</option><option value="mixed">Mixed</option></select>') + fld("ai-du", "Time allowed", 'value="1 hour"') +
        fld("ai-fm", "Paper format", "", '<select class="select-lg" id="ai-fm"><option value="mixed">Objective + Theory</option><option value="objective">Objective only</option><option value="theory">Theory only</option><option value="ca">Continuous assessment (fill-in, true/false, short answer)</option><option value="quiz">Quick quiz (objective + true/false)</option><option value="junior">Junior mixed (all short formats)</option><option value="custom">Custom (set the numbers below)</option></select>', "full") +
        num("ai-ob", "Objective (A-D)", 20, 50) + num("ai-fb", "Fill in the gaps", 0, 20) + num("ai-tf", "True or false", 0, 20) + num("ai-mt", "Matching pairs", 0, 10) + num("ai-sa", "Short answers", 0, 15) + num("ai-th", "Theory", 4, 15) + fld("ai-om", "Marks per objective-type question", 'type="number" min="0.5" max="5" step="0.5" value="1"')
        : fld("ai-du", "Duration", 'value="40 minutes"') + (plan ? fld("ai-pw", "Number of weeks", "", '<select class="select-lg" id="ai-pw"><option value="1">1 week</option><option value="2" selected>2 weeks</option></select>') + fld("ai-pn", "Lessons per week", "", '<select class="select-lg" id="ai-pn">' + [1, 2, 3, 4, 5].map(function (n) { return '<option value="' + n + '"' + (n === 3 ? " selected" : "") + ">" + n + "</option>"; }).join("") + "</select>") + fld("ai-pm", "Topics", "", '<select class="select-lg" id="ai-pm"><option value="same">The same topic for every lesson</option><option value="diff">Different topics (I will list them)</option></select>') + '<div class="fld full" id="ai-tplw" hidden><label for="ai-tpl">Topics, one per line, in teaching order</label><textarea class="input" id="ai-tpl" rows="4" maxlength="900" placeholder="e.g.&#10;Counting 1 to 20&#10;Number names&#10;Addition of small numbers"></textarea></div>' : fld("ai-wk", "Week", 'placeholder="e.g. 2nd and 3rd"')) + fld("ai-dtd", plan ? "Start date (optional)" : "Date", 'type="date"') + fld("ai-rf", "Reference (textbook)", 'placeholder="e.g. STAN Basic Computer Book 4"') + fld("ai-dt", "Detail", "", '<select class="select-lg" id="ai-dt"><option value="full">Full lesson note</option><option value="brief">Brief lesson note</option></select>') + '<div class="fld full"><label for="ai-obj">Objectives (optional)</label><textarea class="input" id="ai-obj" rows="2" maxlength="800"></textarea></div>') +
      (plan ? '<p class="count-line full">A plan writes one full lesson note per lesson, one after another, so each lesson builds on the last. About one minute per lesson: keep this page open.</p>' : "") + resHtml() + srcHtml() + '<div class="fld full"><label for="ai-nt">Extra notes (optional)</label><textarea class="input" id="ai-nt" rows="2" maxlength="800" placeholder="Scheme of work, pupils\' level, local examples..."></textarea></div></div>' +
      '<div class="form-actions" style="margin-top:1rem"><button class="btn btn-primary" type="submit" id="ai-go">' + (ex ? "Generate exam paper" : plan ? "Generate the lesson plan" : "Generate lesson note") + '</button></div><p class="result" id="ai-res" role="status"></p></form><div id="ai-plan"></div><div id="ai-out"></div>';
    $$(".qb-mode button", body).forEach(function (b) { b.addEventListener("click", function () { planMode = b.getAttribute("data-pm"); batch = []; cur = null; formIn(body); }); });
    if (plan) { $("#ai-pm").addEventListener("change", function () { $("#ai-tplw").hidden = this.value !== "diff"; }); }
    if (batch.length && plan) drawBatch();
    if (tch) {
      var fill = function () { var id = $("#ai-cl").selectedOptions[0].getAttribute("data-id"), c = teaching.filter(function (x) { return x.id === id; })[0], want = pre && pre.sb; $("#ai-sb").innerHTML = sbOf(c).map(function (x) { return '<option value="' + esc(x.name) + '"' + (x.id === want ? " selected" : "") + ">" + esc(x.name) + "</option>"; }).join(""); resDraw(); };
      $("#ai-cl").addEventListener("change", function () { pre = null; fill(); }); fill(); pre = null;
    }
    if (ex && examSeed) {
      try { $("#ai-cl").value = examSeed.cls; if (tch) { $("#ai-cl").dispatchEvent(new Event("change")); } $("#ai-sb").value = examSeed.sb; $("#ai-tp").value = examSeed.topic; } catch (e) { /* keep the defaults */ }
      $("#ai-seedx").addEventListener("click", function () { examSeed = null; var n = $("#ai-seed"); if (n) n.remove(); });
    }
    if (ex) $("#ai-fm").addEventListener("change", function () { var p = PRESETS[this.value]; if (!p) return; $("#ai-ob").value = p.ob; $("#ai-fb").value = p.fb; $("#ai-tf").value = p.tf; $("#ai-mt").value = p.mt; $("#ai-sa").value = p.sa; $("#ai-th").value = p.th; });
    srcWire(); resWire();
    var fsT = null; $("#ai-form").addEventListener("input", function () { clearTimeout(fsT); fsT = setTimeout(function () { formSave($("#ai-form")); }, 500); }); $("#ai-form").addEventListener("change", function () { clearTimeout(fsT); fsT = setTimeout(function () { formSave($("#ai-form")); }, 500); });
    if (!(ex && examSeed) && !pre) formRestore(tch);
    if (!ex) planBanner();
    $("#ai-form").addEventListener("submit", function (e) {
      e.preventDefault(); var res = $("#ai-res");
      var f = { class: $("#ai-cl").value.trim(), subject: $("#ai-sb").value.trim(), topic: $("#ai-tp").value.trim(), notes: $("#ai-nt").value.trim() };
      var planOn = !ex && planMode === "plan", tlines = [];
      if (planOn && $("#ai-pm").value === "diff") { tlines = $("#ai-tpl").value.split(/\r?\n/).map(function (x) { return x.replace(/^\s*(\d+[.)]|[-*])\s*/, "").trim(); }).filter(Boolean).slice(0, 12).map(function (x) { return x.slice(0, 120); }); if (!tlines.length) return say(res, false, "List at least one topic, one per line."); if (!f.topic) f.topic = tlines[0]; }
      if (!f.class || !f.subject || !f.topic) return say(res, false, "Please fill in class, subject and " + (ex ? "topics." : "topic."));
      var payload;
      if (ex) {
        f.term = $("#ai-tm").value; f.exam_type = $("#ai-et").value; f.difficulty = $("#ai-df").value; f.duration = $("#ai-du").value.trim(); f.objective_marks = $("#ai-om").value;
        [["objective", "ob"], ["fill_blank", "fb"], ["true_false", "tf"], ["matching", "mt"], ["short_answer", "sa"], ["theory", "th"]].forEach(function (k) { f[k[0]] = +$("#ai-" + k[1]).value || 0; });
        if (f.objective + f.fill_blank + f.true_false + f.matching + f.short_answer + f.theory < 1) return say(res, false, "Ask for at least one question.");
        payload = Object.assign({ task: "exam" }, f);
      } else { f.duration = $("#ai-du").value.trim(); f.week = $("#ai-wk") ? $("#ai-wk").value.trim() : ""; f.reference = $("#ai-rf").value.trim(); f.date = fmtDate($("#ai-dtd").value); f.detail = $("#ai-dt").value; f.objectives = $("#ai-obj").value.trim(); payload = Object.assign({ task: "lesson_note" }, f); if (f.reference) payload.notes = ((f.notes ? f.notes + " " : "") + "Reference textbook: " + f.reference).slice(0, 800); }
      var stx = $("#ai-stx") ? $("#ai-stx").value.trim() : ""; if (stx) payload.source_text = stx.slice(0, 12000);
      if (ex && examSeed && $("#ai-seed")) payload.lesson_context = examSeed.ctx;
      var rid = $$("#ai-reslist input:checked").map(function (c) { return c.value; }); if (rid.length) payload.resource_ids = rid.slice(0, 3);
      if (srcs.length || links.length) { payload.sources = srcs.map(function (x) { return { mime: x.mime, data: x.data }; }); payload.links = links.slice(); }
      if (planOn) { var W = +$("#ai-pw").value || 1, N = +$("#ai-pn").value || 1; delete payload.week; return runPlan(payload, f, planItems(f, W, N, tlines, $("#ai-dtd").value), 0); }
      var b = $("#ai-go"); b.disabled = true; say(res, true, (srcs.length || links.length || stx) ? "Reading your material and writing the draft. This can take up to three minutes..." : "Writing the draft. This can take up to two minutes: numbers are checked twice...");
      askKeep(payload).then(function (r) { kdel("misc", fkey()); res.className = "result"; res.textContent = ""; pics = []; picSeq = 0; show(ex ? "exam" : "lesson_note", f, r); var m2 = [];
          if (r._checked) m2.push("Every calculation was re-checked by the assistant. Still check the numbers yourself before class.");
          if (r._src) m2.push("The assistant read " + r._src + " attached source" + (r._src > 1 ? "s" : "") + " (photos, PDFs, videos or school resources) and based the draft on " + (r._src > 1 ? "them" : "it") + ".");
          else if (srcs.length || links.length || stx || $$("#ai-reslist input:checked").length) m2.push("No attached material could be read, so this draft is general. Check the files and links, or add the key points in Extra notes.");
          if (r._unread && r._unread.length) m2.push("Could not read: " + r._unread.join(", ") + ". Add a few lines about it in Extra notes and generate again.");
          if (m2.length) say($("#ai-res2"), !(r._unread && r._unread.length), m2.join(" ")); },
        function (er) { say(res, false, er.handled ? er.message : "Could not reach the assistant. Check your connection."); }).then(function () { b.disabled = false; });
    });
  }

  /* ---- editable draft ---- */
  function show(kind, f, r, savedRow, lidIn, textIn) {
    var out = $("#ai-out"), t;
    if (savedRow) { var o = savedRow.output || {}; t = kind === "exam" ? o.texts : { paper: o.text }; pics = (o.pics || []).map(function (p) { return { n: p.n, caption: p.caption, prompt: p.prompt || "", style: "cartoon", url: p.url, w: p.w, h: p.h }; }); picSeq = pics.reduce(function (m, p) { return Math.max(m, p.n); }, 0); }
    else t = kind === "exam" ? examTexts(r, f) : { paper: lessonText(r, f) };
    if (textIn != null) t = { paper: textIn };
    cur = { kind: kind, f: f, id: savedRow && savedRow.id, r: r || (savedRow && (savedRow.output || {}).struct) || null };
    out.innerHTML = '<article class="panel" style="margin-top:1.2rem"><h3>' + (kind === "exam" ? "Question paper (editable)" : "Lesson note (editable)") + '</h3><p class="notice is-info"><span data-icon="alert"></span><span>This is a draft. Check facts, answers and wording before you use it.</span></p>' +
      '<textarea class="input ai-doc" id="ai-t1" rows="22" spellcheck="true">' + esc(t.paper) + "</textarea>" +
      (kind === "exam" ? '<h3 style="margin-top:1.2rem">Marking scheme and answers (editable, teacher copy)</h3><textarea class="input ai-doc" id="ai-t2" rows="14" spellcheck="true">' + esc(t.scheme) + "</textarea>" : "") +
      '<div class="form-actions" style="margin-top:1rem;flex-wrap:wrap"><button class="btn btn-primary btn-sm" id="ai-pdf" type="button">' + (kind === "exam" ? "Question paper (PDF)" : "Download PDF") + '</button><button class="btn btn-primary btn-sm" id="ai-dx" type="button">' + (kind === "exam" ? "Question paper (Word)" : "Download Word (.docx)") + "</button>" + (kind === "exam" ? '<button class="btn btn-soft btn-sm" id="ai-pdf2" type="button">Marking scheme (PDF)</button><button class="btn btn-soft btn-sm" id="ai-dx2" type="button">Marking scheme (Word)</button>' : "") +
      (kind === "lesson_note" ? '<button class="btn btn-primary btn-sm" id="ai-toexam" type="button">Make an exam from this lesson</button>' : "") + '<button class="btn btn-soft btn-sm" id="ai-save" type="button">Save now</button>' + (kind === "exam" ? '<button class="btn btn-soft btn-sm" id="ai-tobank" type="button">Add questions to question bank</button>' : "") + '<button class="btn btn-soft btn-sm" id="ai-pr" type="button">Print</button><button class="btn btn-soft btn-sm" id="ai-copy" type="button">Copy text</button></div><p class="ai-auto" id="ai-auto" role="status"></p><p class="result" id="ai-res2" role="status"></p></article>';
    U.injectIcons && U.injectIcons(out);
    function texts() { return kind === "exam" ? { paper: $("#ai-t1").value, scheme: $("#ai-t2").value } : { paper: $("#ai-t1").value }; }
    function title() { return (f.subject || "") + " - " + (f.topic || "").slice(0, 60); }
    function used(txt) { return pics.filter(function (p) { return p.url && txt.indexOf("[Picture " + p.n + "]") > -1; }); }
    drawPics(kind);
    /* autosave: every change is written to this phone at once and to the teacher's account as soon as there is a connection */
    var lidNow = lidIn || (savedRow && savedRow._lid) || newLid(), tmr = null;
    cur.lid = lidNow;
    function snapshot() {
      var tx = texts(), keep = pics.filter(function (p) { return p.url; }).map(function (p) { return { n: p.n, caption: p.caption, prompt: p.prompt, url: p.url, w: p.w, h: p.h }; });
      return { kind: kind, title: title().slice(0, 150), inputs: f, output: kind === "exam" ? { texts: tx, pics: keep, struct: cur.r || undefined } : { text: tx.paper, pics: keep, struct: cur.r || undefined } };
    }
    function setAuto(m, bad) { var el = $("#ai-auto"); if (el) { el.textContent = m; el.className = "ai-auto" + (bad ? " warn" : ""); } }
    function commit() { clearTimeout(tmr); if (!$("#ai-t1") || !cur || cur.lid !== lidNow) return Promise.resolve(); return keepDraft(lidNow, snapshot(), (savedRow && savedRow.id) || null).then(function () { setAuto("Saved on this phone at " + clockNow() + (navigator.onLine ? ". Saving to your account..." : ". It will upload by itself when you are online."), !navigator.onLine); }); }
    function status() { kget("drafts", lidNow).then(function (it) { if (!it || !$("#ai-auto") || !cur || cur.lid !== lidNow) return; if (!it.dirty) { setAuto("Saved to your account at " + clockNow() + ". You can also open it offline."); if (it.id) cur.id = it.id; } else setAuto("Saved on this phone. " + (navigator.onLine ? "Your account could not be reached just now; it will try again by itself." : "It will upload by itself when you are online."), true); }); }
    function schedule() { setAuto("Saving..."); clearTimeout(tmr); tmr = setTimeout(commit, 700); }
    onChange = Object.assign(schedule, { flush: function () { if (tmr) commit(); }, status: status });
    $$("#ai-t1, #ai-t2").forEach(function (ta) { ta.addEventListener("input", schedule); });
    $("#ai-save").addEventListener("click", function () { commit().then(function () { return syncAll(); }).then(function () { status(); say($("#ai-res2"), true, navigator.onLine ? "Saved." : "Saved on this phone. It uploads when you are online."); }); });
    commit();
    var te = $("#ai-toexam"); if (te) te.addEventListener("click", function () {
      examSeed = { cls: f.class, sb: f.subject, topic: f.topic, title: (r && r.title) || f.topic, ctx: (r ? lessonDigest(r, f) + "\n" : "") + texts().paper.slice(0, 3600) };
      sub = "exam"; cur = null; pics = []; open(host);
    });
    var tb = $("#ai-tobank"); if (tb) tb.addEventListener("click", function () {
      var rows = bankRows(cur.r, f), res = $("#ai-res2");
      if (!rows.length) return say(res, false, "There are no questions to add. Generate the paper, or open a draft saved after this update.");
      tb.disabled = true; rest("POST", "/rest/v1/question_bank", rows, { Prefer: "return=minimal" }).then(function () { say(res, true, rows.length + " questions added to your question bank (Question bank tab)."); }, function (e) { say(res, false, A.nice(e.message)); tb.disabled = false; });
    });
    $("#ai-copy").addEventListener("click", function () { var tx = texts(); U.copyText(tx.paper + (tx.scheme ? "\n\n" + tx.scheme : "")).then(function () { say($("#ai-res2"), true, "Copied."); }, function () { say($("#ai-res2"), false, "Could not copy. Select the text and copy it yourself."); }); });
    $("#ai-pdf").addEventListener("click", function () { doPdf(kind, f, texts().paper, used(texts().paper), false); });
    $("#ai-dx").addEventListener("click", function () { doDocx(kind, f, texts().paper, false); });
    var d2 = $("#ai-dx2"); if (d2) d2.addEventListener("click", function () { doDocx(kind, f, texts().scheme, true); });
    var p2 = $("#ai-pdf2"); if (p2) p2.addEventListener("click", function () { doPdf(kind, f, texts().scheme, [], true); });
    $("#ai-pr").addEventListener("click", function () { var tx = texts(); printIt(tx.paper, used(tx.paper), kind === "exam" ? tx.scheme : null); });
    out.scrollIntoView && out.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---- pictures panel ---- */
  function addMarker(p) {
    var ta = $("#ai-t1"); if (!ta || ta.value.indexOf("[Picture " + p.n + "]") > -1) return;
    ta.value = ta.value.replace(/\s+$/, "") + (/TEACHING PICTURES\s*$|\[Picture \d+\][^\n]*\s*$/.test(ta.value) ? "\n" : "\n\nTEACHING PICTURES\n") + "[Picture " + p.n + "] " + (p.caption || "");
  }
  function dropMarker(p) { var ta = $("#ai-t1"); if (ta) ta.value = ta.value.replace(new RegExp("\\n?\\[Picture " + p.n + "\\][^\\n]*", "g"), ""); }
  function drawPics(kind) { drawPics0(kind); if (onChange) onChange(); }
  function drawPics0(kind) {
    var box = $("#ai-pics"); if (!box) return;
    box.innerHTML = pics.length ? pics.map(function (p) {
      return '<div class="form-card ai-pic" data-n="' + p.n + '" style="margin-bottom:.8rem"><div class="form-grid"><div class="fld"><label>Caption (shown under the picture)</label><input class="input" data-c maxlength="120" value="' + esc(p.caption) + '"></div>' +
        '<div class="fld"><label>Style</label><select class="select-lg" data-st>' + [["cartoon", "Friendly cartoon"], ["diagram", "Teaching diagram"], ["realistic", "Realistic"]].map(function (s) { return '<option value="' + s[0] + '"' + (p.style === s[0] ? " selected" : "") + ">" + s[1] + "</option>"; }).join("") + '</select></div>' +
        '<div class="fld full"><label>What should the picture show?</label><textarea class="input" data-p rows="2" maxlength="400" placeholder="e.g. A market seller giving change to a child, with coins and notes on the table">' + esc(p.prompt) + "</textarea></div></div>" +
        (p.url ? '<p style="margin:.8rem 0"><img src="' + p.url + '" alt="' + esc(p.caption || "Teaching picture") + '" style="max-width:100%;border-radius:12px;border:1px solid var(--border)"></p>' : "") +
        '<div class="form-actions"><button type="button" class="btn btn-primary btn-sm" data-g>' + (p.url ? "Make it again" : "Make picture") + '</button><button type="button" class="btn btn-soft btn-sm" data-x>Remove</button></div><p class="result" data-r role="status"></p></div>';
    }).join("") : '<p class="count-line">No pictures yet.</p>';
    $$(".ai-pic", box).forEach(function (el) {
      var p = pics.filter(function (x) { return x.n === +el.getAttribute("data-n"); })[0], r = $("[data-r]", el);
      $("[data-c]", el).addEventListener("input", function () { p.caption = this.value; });
      $("[data-p]", el).addEventListener("input", function () { p.prompt = this.value; });
      $("[data-st]", el).addEventListener("change", function () { p.style = this.value; });
      $("[data-x]", el).addEventListener("click", function () { dropMarker(p); pics = pics.filter(function (x) { return x !== p; }); drawPics(kind); });
      $("[data-g]", el).addEventListener("click", function () {
        if (!p.prompt.trim()) return say(r, false, "Describe the picture first.");
        var btn = this; btn.disabled = true; say(r, true, "Making the picture. This takes up to a minute...");
        call({ task: "picture", prompt: p.prompt, style: p.style, class: cur.f.class, subject: cur.f.subject }).then(function (j) { return shrink(j.image, j.mime); }).then(function (im) { p.url = im.url; p.w = im.w; p.h = im.h; addMarker(p); drawPics(kind); },
          function (e) { say(r, false, e.handled ? e.message : "The picture could not be made. Check your connection."); btn.disabled = false; });
      });
    });
  }

  /* ---- print / PDF with the school heading ---- */
  function heading() {
    var S = U.site(), ph = (S.phones || [])[0] || "", bits = [S.address, ph, S.email].filter(Boolean).join("  |  ");
    return { name: SCHOOL, motto: MOTTO, line: bits };
  }
  function printIt(txt, ps, scheme) {
    var h = heading();
    function block(t, label) {
      var buf = [], html = "";
      function flush() { if (buf.length) html += "<pre>" + esc(buf.join("\n")) + "</pre>"; buf = []; }
      String(t).split("\n").forEach(function (ln) {
        var m = ln.match(/^\[Picture (\d+)\]/);
        if (m) { var p = ps.filter(function (x) { return x.n === +m[1]; })[0]; if (p) { flush(); html += '<figure class="ai-fig"><img src="' + p.url + '" alt=""><figcaption>' + esc(p.caption || "") + "</figcaption></figure>"; } return; }
        if (ln.indexOf("\t") > -1) { flush(); var cs = ln.split("\t"); html += '<div class="ai-cols" style="--n:' + cs.length + '">' + cs.map(function (c) { return "<span>" + esc(c.trim()) + "</span>"; }).join("") + "</div>"; return; }
        buf.push(ln);
      });
      flush();
      return '<div class="ai-print"><div class="ai-head"><img src="' + ROOT + 'assets/img/logo.jpg" alt="" width="64" height="64"><div><h2>' + esc(h.name) + "</h2><p>" + esc(h.motto) + (h.line ? "<br>" + esc(h.line) : "") + "</p></div></div>" + (label ? "<h3>" + label + "</h3>" : "") + html + "</div>";
    }
    U.printHTML(block(txt) + (scheme ? '<div style="page-break-before:always"></div>' + block(scheme, "TEACHER COPY - not for pupils") : ""));
  }
  var jsLoad = null;
  function loadPdfLib() {
    if (window.PdfLite) return Promise.resolve();
    if (jsLoad) return jsLoad;
    jsLoad = new Promise(function (res, rej) { var s = document.createElement("script"); s.src = ROOT + "assets/lib/pdf-lite.js"; s.onload = res; s.onerror = function () { jsLoad = null; rej(new Error("load")); }; document.head.appendChild(s); });
    return jsLoad;
  }
  var exLoad = null;
  var lsLoad = null, myName = null;
  function loadLessonPdf() {
    if (window.LessonPdf) return Promise.resolve();
    return lsLoad || (lsLoad = new Promise(function (res, rej) { var s = document.createElement("script"); s.src = ROOT + "assets/lib/lesson-pdf.js"; s.onload = res; s.onerror = function () { lsLoad = null; rej(new Error("load")); }; document.head.appendChild(s); }));
  }
  function teacherName() {
    if (myName !== null) return Promise.resolve(myName);
    return rest("GET", "/rest/v1/staff?select=full_name&user_id=eq." + encodeURIComponent(A.uid ? A.uid() : "") + "&limit=1").then(function (r) { myName = (r && r[0] && r[0].full_name) || ""; return myName; }, function () { return ""; });
  }
  function loadExamPdf() {
    if (window.ExamPdf) return Promise.resolve();
    return exLoad || (exLoad = new Promise(function (res, rej) { var s = document.createElement("script"); s.src = ROOT + "assets/lib/exam-pdf.js"; s.onload = res; s.onerror = function () { exLoad = null; rej(new Error("load")); }; document.head.appendChild(s); }));
  }
  function logoData() {
    return fetch(ROOT + "assets/img/logo.jpg").then(function (r) { return r.blob(); }).then(function (b) { return new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.readAsDataURL(b); }); }).catch(function () { return null; });
  }
  function ascii(s) {
    return String(s).replace(/₦/g, "N").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/…/g, "...").replace(/[•·]/g, "-").replace(/→/g, "->").replace(/×/g, "x").replace(/[^\x09\x0A\x20-\x7E\xA0-\xFF]/g, "?");
  }
  var dxLoad;
  function loadDocx() {
    if (window.DocxLite) return Promise.resolve();
    return dxLoad || (dxLoad = new Promise(function (res, rej) { var sc = document.createElement("script"); sc.src = ROOT + "assets/lib/docx-lite.js"; sc.onload = res; sc.onerror = function () { dxLoad = null; rej(new Error("load")); }; document.head.appendChild(sc); }));
  }
  function doDocx(kind, f, txt, isScheme) {
    var res = $("#ai-res2"), h = heading(); say(res, true, "Making the Word file...");
    Promise.all([loadDocx(), fetch(ROOT + "assets/img/logo.jpg").then(function (r) { return r.ok ? r.arrayBuffer() : null; }).catch(function () { return null; })]).then(function (r) {
      return window.DocxLite.make({ name: h.name, motto: h.motto, line: h.line, running: h.name + "  |  " + (isScheme ? "Marking scheme: " : "") + (f.subject || "") + " " + (f.class || ""), text: txt, exam: kind === "exam" && !isScheme, logo: r[1] });
    }).then(function (blob) {
      var a = document.createElement("a"), nm = ((isScheme ? "marking-scheme-" : kind === "exam" ? "exam-" : "lesson-note-") + (f.subject || "") + "-" + (f.class || "")).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".docx";
      a.href = URL.createObjectURL(blob); a.download = nm; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      say(res, true, "Downloaded " + nm + ". Open it in Word or Google Docs to edit.");
    }).catch(function () { say(res, false, "Could not make the Word file. Try the PDF or Print instead."); });
  }
  function doPdf(kind, f, txt, ps, isScheme) {
    var res = $("#ai-res2");
    if (/[؀-ۿݐ-ݿ]/.test(txt)) { say(res, true, "This text has Arabic script, which the PDF maker cannot draw. Use Print and choose 'Save as PDF' instead."); return printIt(txt, ps); }
    say(res, true, "Making the PDF...");
    Promise.all([loadPdfLib(), logoData(), loadExamPdf(), kind === "lesson_note" && !ps.length ? loadLessonPdf().then(teacherName) : ""]).then(function (r) {
      if (kind === "exam" && !isScheme) {
        var hd = heading(), isSec = /\b(jss|sss?|ss|senior|junior|secondary|basic\s*[7-9]|year\s*(7|8|9|10|11|12))\b/i.test(f.class || ""), ses0 = ((window.UBK_SITE || {}).session || {}).label;
        var dd = window.ExamPdf.build(window.PdfLite, ascii(txt), { logo: r[1], name: ascii(hd.name), motto: ascii(hd.motto), line: ascii(hd.line), level: isSec && !f.compact ? "secondary" : "primary", theoryLines: f.compact ? 3 : undefined, subject: ascii(f.subject || ""), cls: ascii(f.class || ""), term: ascii(f.term || ""), session: ascii(ses0 || ""), time: ascii(f.duration || "") });
        var nm0 = ((f.subject || "exam") + "-" + (f.class || "") + "-exam").replace(/[^\w\-]+/g, "-").replace(/-+/g, "-").toLowerCase() + ".pdf";
        dd.save(nm0); var np0 = dd.getNumberOfPages(); say(res, !(f.compact && np0 > 2), "PDF downloaded: " + nm0 + (isSec && !f.compact ? " (A4 landscape booklet)" : " (A4 portrait, " + np0 + (np0 > 1 ? " pages" : " page") + ")") + (f.compact && np0 > 2 ? ". This is more than two pages: remove a question from the text and download again." : "")); return;
      }
      if (kind === "lesson_note" && !isScheme && !ps.length && window.LessonPdf) {
        var hl = heading(), sl = ((window.UBK_SITE || {}).session || {}).label;
        var dl = window.LessonPdf.build(window.PdfLite, ascii(txt), { logo: r[1], name: ascii(hl.name), motto: ascii(hl.motto), line: ascii(hl.line), subject: ascii(f.subject || ""), cls: ascii(f.class || ""), teacher: ascii(r[3] || ""), term: "", session: ascii(sl || "") });
        var nl = ((f.subject || "lesson") + "-" + (f.class || "") + "-" + (f.topic || "note")).replace(/[^\w\-]+/g, "-").replace(/-+/g, "-").toLowerCase().slice(0, 70) + ".pdf";
        dl.save(nl); say(res, true, "PDF downloaded: " + nl); return;
      }
      var logo = r[1], d = window.PdfLite.create(), W = 210, H = 297, M = 16, CW = W - 2 * M, y = 0, h = heading(), first = true;
      var PUR = [48, 32, 120], GOLD = [213, 164, 59], GREY = [90, 90, 90], TEAL = [22, 166, 163];
      var sec = kind === "exam" && !isScheme && /\b(jss|sss?|ss|senior|junior|secondary|basic\s*[7-9]|year\s*(7|8|9|10|11|12))\b/i.test(f.class || "");
      function runHead() { d.setFont("helvetica", "normal"); d.setFontSize(8); d.setTextColor.apply(d, GREY); d.text(ascii(h.name), M, 9); d.text(ascii((isScheme ? "Marking scheme: " : "") + (f.subject || "") + " - " + (f.class || "")), W - M, 9, { align: "right" }); d.setDrawColor.apply(d, GOLD); d.setLineWidth(0.4); d.line(M, 11, W - M, 11); y = 18; }
      function title() {
        if (sec) {
          d.setFillColor.apply(d, PUR); d.rect(0, 0, W, 34, "F"); d.setFillColor.apply(d, GOLD); d.rect(0, 34, W, 1.6, "F");
          if (logo) { d.setFillColor(255, 255, 255); d.rect(M - 1.5, 5.5, 25, 25, "F"); try { d.addImage(logo, "JPEG", M, 7, 22, 22); } catch (e) {} }
          var sx = logo ? M + 29 : M; d.setFont("helvetica", "bold"); d.setFontSize(15); d.setTextColor(255, 255, 255); d.text(ascii(h.name), sx, 16);
          d.setFont("helvetica", "italic"); d.setFontSize(9.5); d.setTextColor(232, 224, 255); d.text(ascii(h.motto), sx, 22);
          if (h.line) { d.setFont("helvetica", "normal"); d.setFontSize(8); d.text(ascii(h.line), sx, 28); }
          y = 44; first = false; return;
        }
        d.setFillColor.apply(d, PUR); d.rect(0, 0, W, 4, "F"); d.setFillColor.apply(d, GOLD); d.rect(0, 4, W, 1.2, "F");
        if (logo) try { d.addImage(logo, "JPEG", M, 10, 22, 22); } catch (e) {}
        var x = logo ? M + 27 : M; d.setFont("helvetica", "bold"); d.setFontSize(16); d.setTextColor.apply(d, PUR); d.text(ascii(h.name), x, 19);
        d.setFont("helvetica", "italic"); d.setFontSize(10); d.setTextColor.apply(d, GREY); d.text(ascii(h.motto), x, 25);
        if (h.line) { d.setFont("helvetica", "normal"); d.setFontSize(8.5); d.text(ascii(h.line), x, 30); }
        d.setDrawColor.apply(d, PUR); d.setLineWidth(0.6); d.line(M, 36, W - M, 36); y = 44; first = false;
      }
      function need(n) { if (y + n > H - 16) { d.addPage(); runHead(); } }
      function para(t, size, bold, indent, color, gap) {
        d.setFont("helvetica", bold ? "bold" : "normal"); d.setFontSize(size); d.setTextColor.apply(d, color || [20, 20, 20]);
        d.splitTextToSize(ascii(t), CW - (indent || 0)).forEach(function (ln) { need(size * 0.42 + 1.6); d.text(ln, M + (indent || 0), y); y += size * 0.4 + 1.5; });
        y += gap || 0;
      }
      title();
      var lines = ascii(txt).split("\n"), i0 = 0;
      if (lines.length && lines[0].trim() && lines[0] === lines[0].toUpperCase()) { need(10); d.setFont("helvetica", "bold"); d.setFontSize(14); d.setTextColor.apply(d, PUR); d.splitTextToSize(lines[0], CW).forEach(function (ln) { d.text(ln, W / 2, y, { align: "center" }); y += 6.5; }); y += 1; i0 = 1; }
      if (sec && i0 === 1 && /^Class:/.test(lines[1] || "")) {
        need(48); var meta = ascii(lines[1]).replace(/\s{3,}/g, "  |  ");
        d.setFillColor(243, 240, 252); d.rect(M, y, CW, 8, "F"); d.setFillColor.apply(d, TEAL); d.rect(M, y, 2.2, 8, "F");
        d.setFont("helvetica", "bold"); d.setFontSize(10); d.setTextColor.apply(d, PUR); d.text(meta, M + 6, y + 5.4); y += 13;
        d.setDrawColor.apply(d, PUR); d.setLineWidth(0.3); d.setFont("helvetica", "bold"); d.setFontSize(9); d.setTextColor.apply(d, GREY);
        [["Candidate's name", M, CW * 0.62], ["Date", M + CW * 0.66, CW * 0.34]].forEach(function (c) { d.text(c[0] + ":", c[1], y); d.line(c[1] + d.getTextWidth(c[0] + ":") + 2, y + 0.8, c[1] + c[2], y + 0.8); });
        y += 8; [["Class / Arm", M, CW * 0.3], ["Admission No.", M + CW * 0.34, CW * 0.36], ["Score", M + CW * 0.74, CW * 0.26]].forEach(function (c) { d.text(c[0] + ":", c[1], y); d.line(c[1] + d.getTextWidth(c[0] + ":") + 2, y + 0.8, c[1] + c[2], y + 0.8); });
        y += 9; i0 = 3;
      } else if (kind === "exam" && !isScheme && i0 === 1 && /^Class:/.test(lines[1] || "")) {
        need(24); d.setFillColor(243, 240, 252); d.rect(M, y, CW, 20, "F"); d.setDrawColor.apply(d, PUR); d.setLineWidth(0.4); d.line(M, y, W - M, y); d.line(M, y + 20, W - M, y + 20); d.line(M, y, M, y + 20); d.line(W - M, y, W - M, y + 20);
        d.setFont("helvetica", "bold"); d.setFontSize(10); d.setTextColor(20, 20, 20); d.splitTextToSize(lines[1].replace(/\s{3,}/g, "   |   "), CW - 6).slice(0, 2).forEach(function (ln, k2) { d.text(ln, M + 3, y + 6.5 + k2 * 5); });
        d.setFont("helvetica", "normal"); d.setFontSize(10); d.text(lines[2] || "", M + 3, y + 17); y += 25; i0 = 3;
      }
      function cols(ln) {
        var cs = ln.split("\t").map(function (c) { return c.trim(); }), n = cs.length, ind = 8, cw = (CW - ind) / n, wr = cs.map(function (c) { return d.splitTextToSize(c, cw - 2); }), h = Math.max.apply(null, wr.map(function (a) { return a.length; }));
        d.setFont("helvetica", "normal"); d.setFontSize(10.5); d.setTextColor(20, 20, 20); need(h * 5 + 2);
        wr.forEach(function (a, i) { a.forEach(function (t, k2) { d.text(t, M + ind + i * cw, y + k2 * 4.6); }); });
        y += h * 4.6 + 1.4;
      }
      var sect = "", ansN = 0;
      function ansFlush() { if (!ansN) return; d.setDrawColor(190, 190, 200); d.setLineWidth(0.2); for (var q = 0; q < ansN; q++) { need(7); d.line(M + 6, y + 2, W - M, y + 2); y += 7; } ansN = 0; y += 1; }
      lines.slice(i0).forEach(function (raw) {
        var ln = raw.replace(/\s+$/, ""), m;
        if (!ln.trim()) { y += 2.2; return; }
        if (ln.indexOf("\t") > -1) { cols(ln); return; }
        if ((m = ln.match(/^\[Picture (\d+)\]\s*(.*)$/))) {
          var p = ps.filter(function (x) { return x.n === +m[1]; })[0]; if (!p) return;
          var w = Math.min(120, CW), hh = w * (p.h || 600) / (p.w || 900); if (hh > 90) { hh = 90; w = hh * (p.w || 900) / (p.h || 600); }
          need(hh + 12); try { d.addImage(p.url, "JPEG", M + (CW - w) / 2, y, w, hh); } catch (e) {} y += hh + 4;
          if (p.caption) { d.setFont("helvetica", "italic"); d.setFontSize(9); d.setTextColor.apply(d, GREY); d.text(ascii(p.caption), W / 2, y + 2, { align: "center" }); y += 7; } return;
        }
        if (sec && /^SECTION [A-H]:/.test(ln)) { ansFlush(); y += 3; need(14); d.setFillColor.apply(d, PUR); d.rect(M, y - 5, CW, 8, "F"); d.setFont("helvetica", "bold"); d.setFontSize(10.5); d.setTextColor(255, 255, 255); d.text(ln, M + 3, y + 0.4); y += 8; sect = ln; return; }
        if (sec && (/^\d+\.\s/.test(ln) || /^Total marks/i.test(ln))) ansFlush();
        if (/^SECTION [A-H]:/.test(ln) || (ln.length >= 4 && !/[a-z]/.test(ln) && !/^[\d\-\s]/.test(ln))) { y += 2; need(12); para(ln, 11, true, 0, PUR, 0); d.setDrawColor.apply(d, GOLD); d.setLineWidth(0.3); d.line(M, y - 1, W - M, y - 1); y += 3.5; return; }
        if (/^(Example \d+:|Answer:)/.test(ln)) { y += 1; para(ln, 10.5, true, 0, /^Answer/.test(ln) ? PUR : [20, 20, 20], 0.5); return; }
        if (/^\s{2,}\S/.test(ln) && !/^\s{2,}(Teacher|Pupils):/.test(ln)) { para(ln.trim(), 10.5, false, 8, null, 0); return; }
        if (/^Step \d+:/.test(ln)) { y += 1; para(ln, 10.5, true, 0, [20, 20, 20], 0); return; }
        if (/^\s{2,}(Teacher|Pupils):/.test(ln)) { para(ln.trim(), 10, false, 6, [40, 40, 40], 0); return; }
        if (/^\s*[A-J]\. /.test(ln)) { para(ln.trim(), 10.5, false, 8, null, 0); return; }
        if (/^\d+\.\s/.test(ln)) { para(ln, 10.5, false, 0, null, 0.5); if (sec) ansN = /THEORY/.test(sect) ? 5 : /SHORT/.test(sect) ? 2 : /FILL/.test(sect) ? 0 : 0; return; }
        if (/^- /.test(ln)) { para("-  " + ln.slice(2), 10.5, false, 3, null, 0); return; }
        para(ln, 10.5, false, 0, null, 0);
      });
      if (sec) {
        ansFlush(); need(14); y += 4; d.setFont("helvetica", "bold"); d.setFontSize(10); d.setTextColor.apply(d, PUR); d.text("*** END OF PAPER ***", W / 2, y, { align: "center" });
        if (d.getNumberOfPages() % 2) { d.addPage(); runHead(); d.setFont("helvetica", "bold"); d.setFontSize(11); d.setTextColor.apply(d, PUR); d.text("ROUGH WORK", M, y); d.setDrawColor(200, 200, 210); d.setLineWidth(0.2); for (var yy = y + 8; yy < H - 20; yy += 8) d.line(M, yy, W - M, yy); }
      }
      var n = d.getNumberOfPages(); for (var k = 1; k <= n; k++) { d.setPage(k); d.setFont("helvetica", "normal"); d.setFontSize(8); d.setTextColor.apply(d, GREY); d.text("Page " + k + " of " + n, W / 2, H - 8, { align: "center" }); if (isScheme) d.text("TEACHER COPY - not for pupils", M, H - 8); if (sec) { d.setDrawColor.apply(d, GOLD); d.setLineWidth(0.4); d.line(M, H - 12, W - M, H - 12); d.text(ascii((f.subject || "") + " | " + (f.class || "")), M, H - 8); if (k < n) { d.setFont("helvetica", "italic"); d.text("Turn over >>", W - M, H - 8, { align: "right" }); } } }
      var nm = ((f.subject || "document") + "-" + (f.class || "") + (kind === "exam" ? (isScheme ? "-marking-scheme" : "-exam") : "-lesson-note")).replace(/[^\w\-]+/g, "-").replace(/-+/g, "-").toLowerCase() + ".pdf";
      d.save(nm); say(res, true, "PDF downloaded: " + nm);
    }).catch(function () { say(res, false, "Could not make the PDF. Check your connection and try again, or use Print and choose 'Save as PDF'."); });
  }

  /* ---- question bank ---- */
  var KINDS = { objective: "Objective", fill_blank: "Fill in the gap", true_false: "True or false", short_answer: "Short answer", theory: "Theory" };
  function bankRows(r, f) {
    if (!r) return [];
    var rows = [], om = parseFloat(f.objective_marks) || 1, base = { class_name: String(f.class || "").slice(0, 60), subject: String(f.subject || "").slice(0, 80), topic: String(f.topic || "").slice(0, 200) };
    function add(kind, q, o) { if (q && String(q.q || "").length >= 3) rows.push(Object.assign({ kind: kind, q: String(q.q).slice(0, 1500), options: [], answer: "", marks: om }, base, o)); }
    (r.objective || []).forEach(function (q) { add("objective", q, { options: (q.options || []).slice(0, 4).map(String), answer: String(q.answer || "").toUpperCase().replace(/[^A-D]/g, "") }); });
    (r.fill_blank || []).forEach(function (q) { add("fill_blank", q, { answer: String(q.answer || "").slice(0, 3000) }); });
    (r.true_false || []).forEach(function (q) { add("true_false", q, { answer: String(q.answer || "") }); });
    (r.short_answer || []).forEach(function (q) { add("short_answer", q, { answer: String(q.answer || "").slice(0, 3000), marks: +q.marks || 2 }); });
    (r.theory || []).forEach(function (q) { add("theory", q, { answer: (q.marking_scheme || []).join("\n").slice(0, 3000), marks: +q.marks || 5 }); });
    return rows;
  }
  function fromBank(rows) {
    var r = { instructions: "Answer all questions.", total_marks: 0 }, tot = 0;
    rows.forEach(function (x) {
      var k = x.kind; (r[k] = r[k] || []);
      if (k === "objective") r[k].push({ q: x.q, options: x.options || [], answer: x.answer });
      else if (k === "theory") r[k].push({ q: x.q, marks: +x.marks, marking_scheme: String(x.answer || "").split("\n").filter(Boolean) });
      else if (k === "short_answer") r[k].push({ q: x.q, marks: +x.marks, answer: x.answer });
      else r[k].push({ q: x.q, answer: x.answer });
      tot += +x.marks || 0;
    });
    r.total_marks = Math.round(tot * 10) / 10; return r;
  }
  /* ---- question bank: add one question at a time, bulk upload from Word (admin), build a two-page exam ---- */
  var qbCtx = { cls: "", sb: "", term: "First" }, docxLoad = null;
  function loadDocxRead() {
    if (window.DocxRead) return Promise.resolve();
    return docxLoad || (docxLoad = new Promise(function (res, rej) { var s = document.createElement("script"); s.src = ROOT + "assets/lib/docx-read.js"; s.onload = res; s.onerror = function () { docxLoad = null; rej(new Error("load")); }; document.head.appendChild(s); }));
  }
  /* read a Word paper into question rows. Understands "1." numbering or Word auto-numbering, (a)/A. options, "Answer: b", [5 marks], and Class:/Subject:/Term: lines. */
  function parseDoc(paras, ctx) {
    var out = [], d = { cls: ctx.cls, sb: ctx.sb, term: ctx.term, topic: "", kind: "" }, q = null, m;
    function mk(k) { return String(k || "").replace(/^\(?[a-dA-D][.)]\s*/, "").trim(); }
    function done() {
      if (!q) return; var x = q; q = null;
      var mm = /\[(\d+(?:\.\d+)?)\s*marks?\]|\((\d+(?:\.\d+)?)\s*marks?\)/i.exec(x.text), marks = mm ? parseFloat(mm[1] || mm[2]) : 0;
      var text = x.text.replace(/\s*(\[\d+(?:\.\d+)?\s*marks?\]|\(\d+(?:\.\d+)?\s*marks?\))/ig, "").trim();
      var obj = x.opts.length >= 4 || x.opts.length >= 2 && x.kind0 === "objective";
      var row = { class_name: x.cls, subject: x.sb, term: x.term, topic: x.topic, kind: obj ? "objective" : "theory", q: text, options: [], answer: "", marks: marks || (obj ? 1 : 5) }, bad = "";
      if (!obj && x.opts.length) row.q = text + "\n" + x.opts.map(function (o, i) { return "(" + "abcdefgh"[i] + ") " + o; }).join("\n");
      if (obj) { row.options = x.opts.slice(0, 4); row.answer = (/\(?\b([a-dA-D])\b\)?/.exec(x.ans || "") || [])[1] ? (/\(?\b([a-dA-D])\b\)?/.exec(x.ans)[1]).toUpperCase() : ""; if (row.options.length < 4) bad = "needs four options"; else if (!row.answer) bad = "no answer (add a line: Answer: b)"; }
      else row.answer = String(x.ans || "").trim();
      if (row.q.length < 3) bad = "empty question"; else if (!row.class_name || !row.subject) bad = "choose class and subject above";
      out.push({ n: x.n, row: row, bad: bad });
    }
    var stop = false;
    paras.forEach(function (p) {
      var t = String(p.text || "").replace(/\s+/g, " ").trim(); if (!t || stop) return;
      if (/^how to fill (this )?in\b/i.test(t)) { done(); stop = true; return; }
      if ((m = /^(class|subject|term|topic)\s*[:\-]\s*(.+)$/i.exec(t))) { done(); var k = m[1].toLowerCase(), v = m[2].trim(); if (k === "class") d.cls = v; else if (k === "subject") d.sb = v; else if (k === "topic") d.topic = v; else d.term = /third|3/i.test(v) ? "Third" : /second|2/i.test(v) ? "Second" : "First"; return; }
      if (t.length < 90 && !/^\d/.test(t) && /^(section\s+[a-z]\b.*|objective.*|theory.*|essay.*|multiple choice.*)$/i.test(t) && !(q && /^\(?[a-d][.)]/i.test(t))) { done(); d.kind = /theory|essay|short/i.test(t) ? "theory" : "objective"; return; }
      var an = /^(answer|ans|correct answer|correct option|key)\s*[:=\-]\s*(.*)$/i.exec(t);
      if (an && q) { q.ans = an[2]; q.mode = "ans"; return; }
      var opts = [], re = /(?:^|\s)\(?([a-dA-D])[.)]\s+/g, hits = [], z;
      while ((z = re.exec(t))) hits.push({ i: z.index + z[0].length - z[0].replace(/^\s/, "").length + (z[0].charAt(0) === " " ? 0 : 0), end: re.lastIndex, l: z[1] });
      if (q && hits.length && /^\(?[a-dA-D][.)]\s+/.test(t)) {
        hits.forEach(function (h, i) { var stop = i + 1 < hits.length ? hits[i + 1].i : t.length; opts.push(t.slice(h.end, stop).replace(/\s+$/, "")); });
        q.opts = q.opts.concat(opts); q.mode = "opt"; return;
      }
      if (q && p.num === 1 && !/^\d{1,3}\s*[.)]\s/.test(t)) { q.opts.push(mk(t)); q.mode = "opt"; return; }
      var nq = /^(\d{1,3})\s*[.)]\s+(.*)$/.exec(t);
      if (nq || p.num === 0) { done(); q = { n: nq ? nq[1] : String(out.length + 1), text: nq ? nq[2] : t, opts: [], ans: "", mode: "q", kind0: d.kind, cls: d.cls, sb: d.sb, term: d.term, topic: d.topic };
        var iq = q.text.split(/\s+(?=\(?[a-dA-D][.)]\s)/); if (iq.length >= 4 && /^\(?[aA][.)]\s/.test(iq[1])) { q.text = iq[0]; q.opts = iq.slice(1).map(function (o) { return o.replace(/^\(?[a-dA-D][.)]\s+/, "").trim(); }); q.mode = "opt"; }
        return; }
      if (!q) return;
      if (q.mode === "ans") q.ans += (q.ans ? "\n" : "") + t; else if (q.mode === "opt" && q.opts.length) q.opts[q.opts.length - 1] += " " + t; else q.text += " " + t;
    });
    done(); return out;
  }
  function pageFit(pick, f) {
    return Promise.all([loadPdfLib(), loadExamPdf()]).then(function () {
      var hd = heading(), ses = ((window.UBK_SITE || {}).session || {}).label, ob = pick.filter(function (x) { return x.kind === "objective"; }), th = pick.filter(function (x) { return x.kind !== "objective"; }), dropped = 0;
      function pages() {
        var r = fromBank(ob.concat(th)); r.title = f.title || (f.subject + " examination");
        var t = examTexts(r, f).paper, d = window.ExamPdf.build(window.PdfLite, ascii(t), { logo: "", name: ascii(hd.name), motto: ascii(hd.motto), line: ascii(hd.line), level: "primary", subject: ascii(f.subject), cls: ascii(f.class), term: ascii(f.term || ""), session: ascii(ses || ""), time: ascii(f.duration || ""), theoryLines: 3 });
        return d.getNumberOfPages();
      }
      var n = pages();
      while (n > 2 && ob.length + th.length > 1) { if (th.length > 1 || !ob.length) th.pop(); else ob.pop(); dropped++; n = pages(); }
      return { pick: ob.concat(th), pages: n, dropped: dropped };
    });
  }
  function bank(body) {
    var me = A.uid && A.uid(), admin = A.can(["super_admin", "school_admin"]), part = "add", rows = [], T = [], allSb = [], added = 0, kindNew = "objective", addMode = "one", parsed = [];
    body.innerHTML = '<p class="count-line">Loading the question bank...</p>';
    Promise.all([rest("GET", "/rest/v1/question_bank?select=*&order=created_at.desc&limit=1500"), admin ? rest("GET", "/rest/v1/classes?select=id,name&order=section.desc,sort.asc,name.asc") : A.rpc("my_teaching"), admin ? rest("GET", "/rest/v1/subjects?select=name&order=name.asc&limit=300") : Promise.resolve([])]).then(function (r) {
      rows = r[0] || []; allSb = (r[2] || []).map(function (x) { return x.name; });
      T = admin ? (r[1] || []).map(function (c) { return { name: c.name, subjects: allSb }; }) : (r[1] || []).filter(function (c) { return sbOf(c).length; }).map(function (c) { return { name: c.name, subjects: sbOf(c).map(function (x) { return x.name; }) }; });
      if (!T.length) { body.innerHTML = '<div class="empty"><h3>No class or subject assigned yet</h3><p>An administrator assigns your class or subjects. Then you can add questions for them here.</p></div>'; return; }
      if (!T.some(function (c) { return c.name === qbCtx.cls; })) qbCtx.cls = T[0].name;
      function subs() { var c = T.filter(function (x) { return x.name === qbCtx.cls; })[0]; return c ? c.subjects : []; }
      if (subs().indexOf(qbCtx.sb) < 0) qbCtx.sb = subs()[0] || "";
      function opt(list, cur) { return list.map(function (x) { return '<option value="' + esc(x) + '"' + (x === cur ? " selected" : "") + ">" + esc(x) + "</option>"; }).join(""); }
      var tabs = [["add", "Add a question"], ["list", "My questions"], ["exam", "Make an exam"]]; if (admin) tabs.push(["bulk", "Upload from Word"]);
      body.innerHTML = '<div class="qb-ctx form-card"><div class="form-grid"><div class="fld"><label for="qx-c">Class</label><select class="select-lg" id="qx-c">' + opt(T.map(function (c) { return c.name; }), qbCtx.cls) + '</select></div><div class="fld"><label for="qx-s">Subject</label><select class="select-lg" id="qx-s"></select></div><div class="fld"><label for="qx-t">Term</label><select class="select-lg" id="qx-t">' + opt(["First", "Second", "Third"], qbCtx.term) + '</select></div></div></div>' +
        '<div class="level-tabs rw-tabs qb-tabs" role="tablist" aria-label="Question bank">' + tabs.map(function (x) { return '<button type="button" role="tab" data-p="' + x[0] + '" aria-selected="' + (x[0] === part) + '">' + esc(x[1]) + "</button>"; }).join("") + '</div><div id="qb-pane"></div><div id="ai-out"></div>';
      function fillSb() { $("#qx-s").innerHTML = opt(subs(), qbCtx.sb); }
      function pool() { return rows.filter(function (x) { return x.class_name === qbCtx.cls && x.subject === qbCtx.sb && (!x.term || x.term === qbCtx.term); }); }
      function draw() { $$(".qb-tabs button", body).forEach(function (b) { b.setAttribute("aria-selected", b.getAttribute("data-p") === part); }); ({ add: addPane, list: listPane, exam: examPane, bulk: bulkPane })[part](); }
      fillSb();
      $("#qx-c").addEventListener("change", function () { qbCtx.cls = this.value; qbCtx.sb = subs()[0] || ""; fillSb(); draw(); });
      $("#qx-s").addEventListener("change", function () { qbCtx.sb = this.value; draw(); });
      $("#qx-t").addEventListener("change", function () { qbCtx.term = this.value; draw(); });
      $$(".qb-tabs button", body).forEach(function (b) { b.addEventListener("click", function () { part = b.getAttribute("data-p"); draw(); }); });

      /* ---- add one question ---- */
      function modeBar() { return '<div class="qb-mode" role="group" aria-label="How many questions"><button type="button" class="' + (addMode === "one" ? "on" : "") + '" data-m="one">One question</button><button type="button" class="' + (addMode === "many" ? "on" : "") + '" data-m="many">Several at once</button></div>'; }
      function modeWire(p) { $$(".qb-mode button", p).forEach(function (b) { b.addEventListener("click", function () { addMode = b.getAttribute("data-m"); addPane(); }); }); }
      function addPane() {
        var p = $("#qb-pane"), obj = kindNew === "objective";
        if (addMode === "many") return manyPane(p);
        p.innerHTML = modeBar() + '<form id="qb-add" class="form-card" novalidate><div class="qb-kind" role="group" aria-label="Question type"><button type="button" class="btn btn-sm ' + (obj ? "btn-primary" : "btn-soft") + '" data-k="objective">Objective</button><button type="button" class="btn btn-sm ' + (obj ? "btn-soft" : "btn-primary") + '" data-k="theory">Theory</button></div>' +
          '<div class="fld"><label for="qa-q">Question</label><textarea class="input" id="qa-q" rows="3" maxlength="1500" placeholder="' + (obj ? "e.g. Which of these is a living thing?" : "e.g. Describe three uses of water. [5 marks]") + '"></textarea></div>' +
          (obj ? '<fieldset class="qb-opts"><legend>Options: tick the correct one</legend>' + [1, 2, 3, 4].map(function (i) { return '<label class="qb-opt"><input type="radio" name="qa-ok" value="' + "ABCD"[i - 1] + '" aria-label="Option ' + "abcd"[i - 1] + ' is correct"><b>(' + "abcd"[i - 1] + ')</b><input class="input" id="qa-o' + i + '" maxlength="300" aria-label="Option ' + "abcd"[i - 1] + '"></label>'; }).join("") + "</fieldset>"
            : '<div class="fld"><label for="qa-a">Marking points / model answer (optional)</label><textarea class="input" id="qa-a" rows="3" maxlength="3000"></textarea></div>') +
          '<div class="form-grid"><div class="fld"><label for="qa-m">Marks</label><input class="input" id="qa-m" type="number" min="0.5" max="50" step="0.5" value="' + (obj ? 1 : 5) + '"></div><div class="fld"><label for="qa-tp">Topic (optional)</label><input class="input" id="qa-tp" maxlength="200"></div></div>' +
          '<div class="form-actions"><button class="btn btn-primary" type="submit">Save question</button><span class="count-line">' + added + ' saved this visit. The class, subject and term above stay the same, so you can add the next one straight away.</span></div><p class="result" id="qa-res" role="status"></p></form>';
        modeWire(p);
        $$(".qb-kind button", p).forEach(function (b) { b.addEventListener("click", function () { kindNew = b.getAttribute("data-k"); addPane(); }); });
        $("#qa-q").focus();
        $("#qb-add").addEventListener("submit", function (e) {
          e.preventDefault(); var res = $("#qa-res"), q = $("#qa-q").value.trim(), o = obj ? [1, 2, 3, 4].map(function (i) { return $("#qa-o" + i).value.trim(); }) : [], ok = obj ? ($("input[name=qa-ok]:checked", p) || {}).value || "" : $("#qa-a").value.trim();
          if (q.length < 3) return say(res, false, "Type the question first.");
          if (obj && (o.some(function (x) { return !x; }) || !ok)) return say(res, false, "Fill in all four options and tick the correct one.");
          var row = { class_name: qbCtx.cls, subject: qbCtx.sb, term: qbCtx.term, topic: $("#qa-tp").value.trim(), kind: kindNew, q: q, options: o, answer: ok, marks: parseFloat($("#qa-m").value) || (obj ? 1 : 5) };
          var b = $("button[type=submit]", p); b.disabled = true;
          rest("POST", "/rest/v1/question_bank", row, { Prefer: "return=representation" }).then(function (j) { rows.unshift(j[0]); added++; var tp = row.topic, mk = $("#qa-m").value; addPane(); $("#qa-tp").value = tp; $("#qa-m").value = mk; say($("#qa-res"), true, "Saved. Add the next question, or open Make an exam."); },
            function (er) { b.disabled = false; say(res, false, A.nice(er.message)); });
        });
      }
      /* ---- list ---- */
      function listPane() {
        var p = $("#qb-pane"), all = false, kf = "", tx = "";
        function view() {
          var L = rows.filter(function (x) { return (all || (x.class_name === qbCtx.cls && x.subject === qbCtx.sb && (!x.term || x.term === qbCtx.term))) && (!kf || x.kind === kf) && (!tx || (x.q + " " + x.topic).toLowerCase().indexOf(tx) > -1); });
          $("#ql-n").textContent = L.length + " question" + (L.length === 1 ? "" : "s");
          $("#ql").innerHTML = L.length ? '<div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>Question</th><th>Type</th><th>Marks</th><th></th></tr></thead><tbody>' + L.map(function (x) {
            var mine = x.owner === me || admin;
            return '<tr data-id="' + esc(x.id) + '"><td class="qb-q"><strong>' + esc(x.q.slice(0, 180)) + (x.q.length > 180 ? "..." : "") + "</strong>" + (x.kind === "objective" ? "<small>" + (x.options || []).map(function (o, i) { return "(" + "abcd"[i] + ") " + esc(o); }).join(" &nbsp; ") + " &middot; answer (" + esc(String(x.answer).toLowerCase()) + ")</small>" : "") + (all ? "<small>" + esc(x.class_name + " · " + x.subject + (x.term ? " · " + x.term + " term" : "")) + "</small>" : "") + "</td><td>" + esc(KINDS[x.kind] || x.kind) + "</td><td>" + esc(x.marks) + "</td><td>" +
              (mine ? '<button type="button" class="btn btn-soft btn-sm" data-sh>' + (x.shared ? "Shared" : "Share") + '</button> <button type="button" class="btn btn-soft btn-sm" data-dl>Delete</button>' : "") + "</td></tr>";
          }).join("") + "</tbody></table></div>" : '<div class="empty"><h3>No questions yet for ' + esc(qbCtx.cls + ", " + qbCtx.sb) + '</h3><p>Open Add a question to save the first one.</p></div>';
          $$("[data-dl]", $("#ql")).forEach(function (b) { b.addEventListener("click", function () { if (!confirm("Delete this question?")) return; var id = b.closest("tr").getAttribute("data-id"); rest("DELETE", "/rest/v1/question_bank?id=eq." + encodeURIComponent(id)).then(function () { rows = rows.filter(function (x) { return x.id !== id; }); view(); }, function (e) { say($("#ql-res"), false, A.nice(e.message)); }); }); });
          $$("[data-sh]", $("#ql")).forEach(function (b) { b.addEventListener("click", function () { var id = b.closest("tr").getAttribute("data-id"), x = rows.filter(function (y) { return y.id === id; })[0]; rest("PATCH", "/rest/v1/question_bank?id=eq." + encodeURIComponent(id), { shared: !x.shared }, { Prefer: "return=minimal" }).then(function () { x.shared = !x.shared; view(); }, function (e) { say($("#ql-res"), false, A.nice(e.message)); }); }); });
        }
        p.innerHTML = '<div class="qb-filters"><div class="fld"><label for="ql-k">Type</label><select class="select-lg" id="ql-k"><option value="">All</option>' + Object.keys(KINDS).map(function (k) { return '<option value="' + k + '">' + KINDS[k] + "</option>"; }).join("") + '</select></div><div class="fld"><label for="ql-t">Search</label><input class="input" id="ql-t" placeholder="words in the question"></div><label class="check"><input type="checkbox" id="ql-a"> Show every class and subject</label></div><p class="count-line" id="ql-n"></p><div id="ql"></div><p class="result" id="ql-res" role="status"></p>';
        $("#ql-k").addEventListener("change", function () { kf = this.value; view(); }); $("#ql-t").addEventListener("input", function () { tx = this.value.trim().toLowerCase(); view(); }); $("#ql-a").addEventListener("change", function () { all = this.checked; view(); });
        view();
      }
      /* ---- make an exam that fits two A4 pages ---- */
      function examPane() {
        var p = $("#qb-pane"), L = pool(), no = L.filter(function (x) { return x.kind === "objective"; }).length, nt = L.length - no;
        p.innerHTML = '<div class="form-card"><p class="count-line">Questions saved for <b>' + esc(qbCtx.cls) + ", " + esc(qbCtx.sb) + ", " + esc(qbCtx.term) + ' term</b>: ' + no + " objective and " + nt + ' theory. The paper is picked at random and trimmed so it never goes over two A4 pages.</p><div class="form-grid">' +
          fld("ex-no", "Objective questions", 'type="number" min="0" max="50" value="' + Math.min(20, no) + '"') + fld("ex-nt", "Theory questions", 'type="number" min="0" max="15" value="' + Math.min(3, nt) + '"') + fld("ex-d", "Time allowed", 'value="1 hour"') + fld("ex-x", "Paper title (optional)", 'maxlength="80"') + '</div><div class="form-actions"><button type="button" class="btn btn-primary" id="ex-go">Build exam (two pages at most)</button></div><p class="result" id="ex-res" role="status"></p></div>';
        $("#ex-go").addEventListener("click", function () {
          var res = $("#ex-res"), wo = Math.max(0, +$("#ex-no").value || 0), wt = Math.max(0, +$("#ex-nt").value || 0);
          function rnd(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
          var pick = rnd(L.filter(function (x) { return x.kind === "objective"; })).slice(0, wo).concat(rnd(L.filter(function (x) { return x.kind !== "objective"; })).slice(0, wt));
          if (!pick.length) return say(res, false, "There are no saved questions for this class, subject and term yet. Add some first.");
          var f = { class: qbCtx.cls, subject: qbCtx.sb, topic: "", term: qbCtx.term, duration: $("#ex-d").value.trim(), title: $("#ex-x").value.trim(), compact: true, objective_marks: (pick.filter(function (x) { return x.kind === "objective"; })[0] || { marks: 1 }).marks };
          var b = $("#ex-go"); b.disabled = true; say(res, true, "Fitting the paper to two pages...");
          pageFit(pick, f).then(function (o) {
            var r = fromBank(o.pick); r.title = f.title || (f.subject + " examination"); pics = []; picSeq = 0;
            var m = []; if (o.dropped) m.push(o.dropped + " question" + (o.dropped > 1 ? "s were" : " was") + " left out to keep it to two pages"); if (o.pick.length < wo + wt && !o.dropped) m.push("only " + o.pick.length + " saved questions were available");
            res.className = "result"; res.textContent = ""; show("exam", f, r); say($("#ai-res2"), true, "Built " + o.pick.length + " questions on " + o.pages + " page" + (o.pages > 1 ? "s" : "") + (m.length ? " (" + m.join("; ") + ")" : "") + ". Check it, then download the PDF.");
          }, function () { say(res, false, "Could not build the paper. Check your connection and try again."); }).then(function () { b.disabled = false; });
        });
      }
      /* ---- administrator: upload a Word exam ---- */
      var FMT = ["Class: " + (qbCtx.cls || "BASIC3"), "Subject: " + (qbCtx.sb || "Mathematics"), "Term: " + qbCtx.term, "", "SECTION A: OBJECTIVE", "1. What is 2 + 3?", "(a) 4", "(b) 5", "(c) 6", "(d) 7", "Answer: b", "", "2. Which of these is a fruit? (a) Chair (b) Mango (c) Pen (d) Book", "Answer: b", "", "SECTION B: THEORY", "3. Name three things we use water for. [5 marks]", "Answer: Drinking, washing, cooking.", "", "HOW TO FILL THIS IN", "Number every question (1. 2. 3.). Give four options (a) to (d) for an objective question and an Answer line.", "A theory question may end with [5 marks]. Its Answer line is optional.", "Class, Subject and Term lines are optional: delete them to use the choices on the screen.", "Delete the example questions above before you add yours."].join("\n");
      function getTemplate(btn) {
        btn.disabled = true;
        Promise.all([loadDocx(), fetch(ROOT + "assets/img/logo.jpg").then(function (r) { return r.ok ? r.arrayBuffer() : null; }).catch(function () { return null; })]).then(function (r) { var h = heading(); return window.DocxLite.make({ name: h.name, motto: h.motto, line: h.line, running: "Question bank upload format", text: "QUESTION BANK UPLOAD FORMAT\n" + FMT, exam: false, logo: r[1] }); }).then(function (blob) {
          var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "question-bank-format.docx"; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
        }).catch(function () { alert("Could not make the format file. Check your connection and try again."); }).then(function () { btn.disabled = false; });
      }
      /* shows a parsed list as a checklist table, then saves the good rows */
      function review(host, res, list, shared) {
        var ok = list.filter(function (x) { return !x.bad; });
        say(res, ok.length > 0, list.length ? ok.length + " of " + list.length + " questions are ready." + (ok.length < list.length ? " Rows in red are skipped: fix them and check again, or save the rest." : "") : "No questions were found. Number each question (1. 2. 3.).");
        host.innerHTML = list.length ? '<div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>#</th><th>Question</th><th>Type</th><th>Where</th><th>Status</th></tr></thead><tbody>' + list.map(function (x) { var r = x.row; return '<tr' + (x.bad ? ' style="background:#fdf1f1"' : "") + "><td>" + esc(x.n) + '</td><td class="qb-q"><strong>' + esc(r.q.slice(0, 140)) + "</strong>" + (r.kind === "objective" ? "<small>" + r.options.map(function (o, i) { return "(" + "abcd"[i] + ") " + esc(o); }).join(" &nbsp; ") + " &middot; answer (" + esc(r.answer.toLowerCase()) + ")</small>" : "") + "</td><td>" + esc(KINDS[r.kind]) + " · " + esc(r.marks) + "</td><td>" + esc(r.class_name + ", " + r.subject + ", " + r.term) + "</td><td>" + (x.bad ? esc(x.bad) : "Ready") + "</td></tr>"; }).join("") + '</tbody></table></div><div class="form-actions" style="margin-top:1rem"><button type="button" class="btn btn-primary" id="rv-go"' + (ok.length ? "" : " disabled") + ">Save " + ok.length + " question" + (ok.length === 1 ? "" : "s") + "</button></div>" : "";
        var go = $("#rv-go", host); if (!go) return;
        go.addEventListener("click", function () {
          var rowsIn = ok.map(function (x) { return Object.assign({}, x.row, shared ? { shared: true } : {}); }); go.disabled = true; say(res, true, "Saving...");
          var chain = Promise.resolve(), made = [];
          for (var i = 0; i < rowsIn.length; i += 100) (function (chunk) { chain = chain.then(function () { return rest("POST", "/rest/v1/question_bank", chunk, { Prefer: "return=representation" }).then(function (j) { made = made.concat(j || []); }); }); })(rowsIn.slice(i, i + 100));
          chain.then(function () { rows = made.concat(rows); added += made.length; host.innerHTML = ""; say(res, true, made.length + " questions saved" + (shared ? " and shared with teachers" : "") + ". Open Make an exam or My questions to use them."); var t = $("#mq-t"); if (t) t.value = ""; }, function (er) { go.disabled = false; say(res, false, A.nice(er.message)); });
        });
      }
      function manyPane(p) {
        p.innerHTML = modeBar() + '<div class="form-card"><p class="count-line">Type or paste as many questions as you like, in the format below. Questions without a Class, Subject or Term line use the choices above (<b>' + esc(qbCtx.cls + ", " + qbCtx.sb + ", " + qbCtx.term) + '</b>).</p><div class="fld"><label for="mq-t">Your questions</label><textarea class="input qb-many" id="mq-t" rows="12" spellcheck="true" placeholder="' + esc("1. What is 2 + 3?\n(a) 4\n(b) 5\n(c) 6\n(d) 7\nAnswer: b\n\n2. Name three uses of water. [5 marks]") + '"></textarea></div><div class="form-actions"><button type="button" class="btn btn-primary" id="mq-go">Check questions</button><button type="button" class="btn btn-soft" id="mq-ex">Show an example</button><button type="button" class="btn btn-soft" id="mq-fm">Download Word format</button></div><p class="result" id="mq-res" role="status"></p><div id="mq-prev"></div></div>';
        modeWire(p);
        $("#mq-ex").addEventListener("click", function () { $("#mq-t").value = FMT.split("\nHOW TO FILL")[0]; $("#mq-t").focus(); });
        $("#mq-fm").addEventListener("click", function () { getTemplate(this); });
        $("#mq-go").addEventListener("click", function () {
          var lines = $("#mq-t").value.split(/\r?\n/).map(function (t) { return { text: t, num: null }; }); parsed = parseDoc(lines, qbCtx);
          review($("#mq-prev"), $("#mq-res"), parsed, admin);
        });
      }
      function bulkPane() {
        var p = $("#qb-pane");
        p.innerHTML = '<div class="form-card"><p class="count-line">Upload a Word (.docx) paper. Questions are numbered (1. 2. 3. or Word numbering), options are (a) (b) (c) (d), and each objective question has a line <b>Answer: b</b>. Theory questions may end with [5 marks] and may have an <b>Answer:</b> line. Optional lines: <b>Class:</b>, <b>Subject:</b>, <b>Term:</b>. Anything not stated uses the choices above.</p>' +
          '<div class="form-actions"><label class="btn btn-primary" for="bk-f" style="cursor:pointer">Choose Word file</label><input id="bk-f" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" style="position:absolute;opacity:0;width:1px;height:1px"><button type="button" class="btn btn-soft" id="bk-fm">Download the Word format</button></div><p class="count-line" id="bk-n"></p><p class="result" id="bk-res" role="status"></p><div id="bk-prev"></div></div>';
        $("#bk-fm").addEventListener("click", function () { getTemplate(this); });
        $("#bk-f").addEventListener("change", function () {
          var f = this.files[0], res = $("#bk-res"); if (!f) return; $("#bk-n").textContent = f.name;
          if (!/\.docx$/i.test(f.name)) return say(res, false, "Use a .docx file (Word). Save an old .doc file as .docx first.");
          say(res, true, "Reading the file...");
          loadDocxRead().then(function () { return window.DocxRead.paragraphs(f); }).then(function (paras) { parsed = parseDoc(paras, qbCtx); review($("#bk-prev"), res, parsed, true); },
            function (er) { say(res, false, /unsupported/.test(er.message) ? "This browser cannot read Word files. Use a recent Chrome, Edge or Safari." : "That file could not be read. Is it a Word .docx file?"); });
        });
      }
      draw();
    }, function (e) { body.innerHTML = '<div class="notice"><span>' + esc(A.nice(e.message)) + "</span></div>"; });
  }

  /* ---- saved drafts ---- */
  function saved(body) {
    var me = ME(), off = !!(A.offline && A.offline());
    body.innerHTML = '<p class="count-line">Loading...</p>';
    syncAll();
    Promise.all([rest("GET", "/rest/v1/ai_drafts?select=id,kind,title,inputs,output,updated_at&order=updated_at.desc&limit=100").then(function (r) { return r || []; }, function () { return null; }), kall("drafts")]).then(function (a) {
      var remote = a[0], local = a[1].filter(function (x) { return x.uid === me && !x.deleted; }), byId = {}, list = [], puts = [];
      local.forEach(function (l) { if (l.id) byId[l.id] = l; });
      function row(l) { return { id: l.id, _lid: l.lid, kind: l.kind, title: l.title, inputs: l.inputs, output: l.output, updated_at: new Date(l.at || 0).toISOString(), _wait: !!l.dirty }; }
      if (remote) {
        remote.forEach(function (r) {
          var l = byId[r.id], t = Date.parse(r.updated_at) || 0;
          if (l && (l.dirty || (l.at || 0) >= t)) { list.push(row(l)); return; }
          var it = l || { lid: newLid(), uid: me, ver: 1 };
          Object.assign(it, { id: r.id, kind: r.kind, title: r.title, inputs: r.inputs, output: r.output, at: t, dirty: false }); puts.push(kput("drafts", it)); list.push(row(it));
        });
        local.forEach(function (l) { if (!l.id) list.push(row(l)); else if (!remote.some(function (r) { return r.id === l.id; })) { if (l.dirty || remote.length >= 100) list.push(row(l)); else kdel("drafts", l.lid); } });
      } else list = local.map(row);
      list.sort(function (x, y) { return y.updated_at < x.updated_at ? -1 : 1; });
      var note = !remote ? '<p class="notice is-info" role="status"><span data-icon="alert"></span><span>You are offline. These are the copies saved on this phone. Your changes upload by themselves when you are online.</span></p>' : "";
      if (!list.length) { body.innerHTML = note + '<div class="empty"><h3>No saved drafts</h3><p>Every lesson note and exam paper you generate is saved here by itself.</p></div>'; return; }
      body.innerHTML = note + '<div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>Draft</th><th>Type</th><th>Saved</th><th></th></tr></thead><tbody>' + list.map(function (r) {
        return '<tr data-lid="' + esc(r._lid) + '"><td><strong>' + esc(r.title) + '</strong><small style="display:block;color:var(--text-muted)">' + esc((r.inputs || {}).class || "") + (r._wait ? " &middot; waiting to upload" : "") + "</small></td><td>" + (r.kind === "exam" ? "Exam" : "Lesson note") + "</td><td>" + esc(fmtDate(r.updated_at.slice(0, 10))) + '</td><td class="ad-acts"><button type="button" class="btn btn-soft btn-sm" data-o="1">Open</button><button type="button" class="btn btn-soft btn-sm" data-d="1">Delete</button></td></tr>';
      }).join("") + '</tbody></table></div><div id="ai-out"></div><p class="result" id="ai-res" role="status"></p>';
      $$("[data-o]", body).forEach(function (b) { b.addEventListener("click", function () { var lid = b.closest("tr").getAttribute("data-lid"), r = list.filter(function (x) { return x._lid === lid; })[0]; pics = []; picSeq = 0; show(r.kind, r.inputs || {}, null, r); $("#ai-out").scrollIntoView({ behavior: "smooth", block: "start" }); }); });
      $$("[data-d]", body).forEach(function (b) {
        b.addEventListener("click", function () {
          if (!confirm("Delete this saved draft?")) return;
          var tr = b.closest("tr"), lid = tr.getAttribute("data-lid");
          kmod("drafts", lid, function (o) { if (!o) return null; o.deleted = true; o.dirty = true; return o; }).then(function () { tr.remove(); syncSoon(); });
        });
      });
    });
  }

  A.ai = {
    ask: ask, lessonText: lessonText,
    lessonPdf: function (txt, f) {
      return Promise.all([loadPdfLib(), logoData(), loadLessonPdf().then(teacherName)]).then(function (r) {
        var hl = heading(), sl = ((window.UBK_SITE || {}).session || {}).label;
        var dl = window.LessonPdf.build(window.PdfLite, ascii(txt), { logo: r[1], name: ascii(hl.name), motto: ascii(hl.motto), line: ascii(hl.line), subject: ascii(f.subject || ""), cls: ascii(f.class || ""), teacher: ascii(r[2] || ""), term: "", session: ascii(sl || "") });
        var nl = ((f.subject || "lesson") + "-" + (f.class || "") + "-" + (f.topic || "note")).replace(/[^\w\-]+/g, "-").replace(/-+/g, "-").toLowerCase().slice(0, 70) + ".pdf";
        dl.save(nl); return nl;
      });
    }
  };
  A.aitools = open;
  A.aiPrefill = function (o) { pre = o; sub = "lesson"; };
})();
