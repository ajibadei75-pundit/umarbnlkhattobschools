/* Dashboard: Teacher tools. Lesson Note AI and Exam Question Generator.
   The server function (teacher-ai) returns a DRAFT. The teacher edits it as plain text, then saves, copies, downloads or prints.
   Nothing is shared with pupils or parents from here. Drafts are private to the teacher who saved them. */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, $$ = U.$$, esc = U.esc;
  var A = window.UBK_ADMIN, B = (window.UBK_SITE || {}).backend || {};
  if (!A) return;
  var host, sub = "lesson", cur = null;

  function rest(m, p, b, x) { return A.api(m, p, b, x); }
  function say(el, ok, msg) { if (!el) return; el.className = "result show " + (ok ? "ok" : "bad"); el.textContent = msg; }
  function list(a) { return (a || []).map(function (x, i) { return (i + 1) + ". " + x; }).join("\n"); }
  function bullets(a) { return (a || []).map(function (x) { return "- " + x; }).join("\n"); }
  function aiError(status, body) {
    var e = (body && body.error) || "";
    if (status === 503 || e === "ai_not_configured") return "The AI assistant is not switched on yet. Ask the administrator to add the AI key.";
    if (status === 403) return "Your account is not allowed to use this tool.";
    if (e === "ai_bad_output") return "The assistant's answer could not be read. Please try again.";
    if (status === 400) return "Please fill in class, subject and topic" + (sub === "exam" ? ", and at least one question" : "") + ".";
    return "The assistant could not answer just now. Please try again in a moment.";
  }
  function ask(payload) {
    return A.fresh().then(function (tok) {
      return fetch(B.url + "/functions/v1/teacher-ai", { method: "POST", headers: { apikey: B.key, Authorization: "Bearer " + tok, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) { var e = new Error(aiError(r.status, j)); e.handled = true; throw e; } return j.result; }); });
  }

  /* ---- text builders ---- */
  function lessonText(r, f) {
    var out = [(r.title || f.topic || "Lesson note").toUpperCase(), "Class: " + f.class + "    Subject: " + f.subject + "    Duration: " + (r.duration || f.duration || ""), "Topic: " + f.topic, "",
      "OBJECTIVES", list(r.objectives), "", "PREVIOUS KNOWLEDGE", r.previous_knowledge || "", "", "TEACHING MATERIALS", bullets(r.materials), "", "INTRODUCTION", r.introduction || "", "", "PRESENTATION"];
    (r.steps || []).forEach(function (s, i) { out.push("Step " + (i + 1) + ": " + (s.stage || "") + (s.time ? " (" + s.time + ")" : ""), "  Teacher: " + (s.teacher_activity || ""), "  Pupils: " + (s.pupil_activity || ""), ""); });
    out.push("BOARD SUMMARY", bullets(r.board_summary), "", "EVALUATION", list(r.evaluation), "", "ASSIGNMENT", r.assignment || "");
    return out.join("\n");
  }
  function examTexts(r, f) {
    var marksO = parseFloat(f.objective_marks) || 1, p = [(r.title || (f.subject + " examination")).toUpperCase(), "Class: " + f.class + "    Subject: " + f.subject + (f.term ? "    Term: " + f.term : ""), "Name: ______________________________", "", "INSTRUCTIONS", r.instructions || "", ""];
    var k = [(r.title || f.subject).toUpperCase() + " - MARKING SCHEME", ""];
    if ((r.objective || []).length) {
      p.push("SECTION A: OBJECTIVE (" + marksO + " mark each)", ""); k.push("SECTION A: OBJECTIVE ANSWERS");
      r.objective.forEach(function (q, i) { p.push((i + 1) + ". " + q.q); (q.options || []).forEach(function (o, j) { p.push("   " + "ABCD"[j] + ". " + o); }); p.push(""); k.push((i + 1) + ". " + (q.answer || "")); });
      k.push("");
    }
    if ((r.theory || []).length) {
      p.push("SECTION B: THEORY", ""); k.push("SECTION B: THEORY MARKING SCHEME", "");
      r.theory.forEach(function (q, i) { p.push((i + 1) + ". " + q.q + " [" + (q.marks || "") + " marks]", ""); k.push((i + 1) + ". (" + (q.marks || "") + " marks)", bullets(q.marking_scheme), ""); });
    }
    if (r.total_marks) k.push("Total marks: " + r.total_marks);
    return { paper: p.join("\n"), scheme: k.join("\n") };
  }

  /* ---- layout ---- */
  function open(h) {
    host = h;
    var tabs = [["lesson", "Lesson Note AI"], ["exam", "Exam Question Generator"], ["saved", "Saved drafts"]];
    host.innerHTML = '<h2 class="sec-title" style="font-size:1.2rem">Teacher tools</h2><p class="count-line">The assistant writes a first draft. Always read, correct and adjust it before use. For Qur\'an, Arabic and Islamic Studies, check every reference and ruling yourself.</p>' +
      '<div class="level-tabs rw-tabs" role="tablist" aria-label="Teacher tools">' + tabs.map(function (x) { return '<button type="button" role="tab" data-s="' + x[0] + '" aria-selected="' + (x[0] === sub) + '">' + esc(x[1]) + "</button>"; }).join("") + '</div><div id="ai-body"></div>';
    $$(".rw-tabs button", host).forEach(function (b) { b.addEventListener("click", function () { sub = b.getAttribute("data-s"); cur = null; open(host); }); });
    var body = $("#ai-body"); (sub === "saved" ? saved : form)(body);
  }
  function fld(id, label, extra, tag) { return '<div class="fld"><label for="' + id + '">' + label + "</label>" + (tag || '<input class="input" id="' + id + '" maxlength="200" ' + (extra || "") + ">") + "</div>"; }
  function form(body) {
    var ex = sub === "exam";
    body.innerHTML = '<form id="ai-form" class="form-card" novalidate><div class="form-grid">' + fld("ai-cl", "Class", 'placeholder="e.g. Primary 3"') + fld("ai-sb", "Subject", 'placeholder="e.g. Mathematics"') +
      fld("ai-tp", ex ? "Topics covered" : "Topic", 'placeholder="' + (ex ? "e.g. Addition, subtraction, shapes" : "e.g. Fractions") + '"') +
      (ex ? fld("ai-tm", "Term", "", '<select class="select-lg" id="ai-tm"><option>First</option><option>Second</option><option>Third</option></select>') + fld("ai-df", "Difficulty", "", '<select class="select-lg" id="ai-df"><option value="easy">Easy</option><option value="medium" selected>Medium</option><option value="hard">Hard</option><option value="mixed">Mixed</option></select>') +
        fld("ai-ob", "Objective questions", 'type="number" min="0" max="40" value="10"') + fld("ai-om", "Marks per objective question", 'type="number" min="0.5" max="5" step="0.5" value="1"') + fld("ai-th", "Theory questions", 'type="number" min="0" max="15" value="3"')
        : fld("ai-du", "Duration", 'value="40 minutes"') + '<div class="fld full"><label for="ai-ob">Objectives (optional)</label><textarea class="input" id="ai-ob" rows="2" maxlength="800"></textarea></div>') +
      '<div class="fld full"><label for="ai-nt">Extra notes (optional)</label><textarea class="input" id="ai-nt" rows="2" maxlength="800" placeholder="Scheme of work, pupils\' level, local examples..."></textarea></div></div>' +
      '<div class="form-actions" style="margin-top:1rem"><button class="btn btn-primary" type="submit" id="ai-go">' + (ex ? "Generate questions" : "Generate lesson note") + '</button></div><p class="result" id="ai-res" role="status"></p></form><div id="ai-out"></div>';
    $("#ai-form").addEventListener("submit", function (e) {
      e.preventDefault(); var res = $("#ai-res");
      var f = { class: $("#ai-cl").value.trim(), subject: $("#ai-sb").value.trim(), topic: $("#ai-tp").value.trim(), notes: $("#ai-nt").value.trim() };
      if (!f.class || !f.subject || !f.topic) return say(res, false, "Please fill in class, subject and " + (ex ? "topics." : "topic."));
      var payload;
      if (ex) { f.term = $("#ai-tm").value; f.difficulty = $("#ai-df").value; f.objective = +$("#ai-ob").value || 0; f.objective_marks = $("#ai-om").value; f.theory = +$("#ai-th").value || 0; if (f.objective + f.theory < 1) return say(res, false, "Ask for at least one question."); payload = Object.assign({ task: "exam" }, f); }
      else { f.duration = $("#ai-du").value.trim(); f.objectives = $("#ai-ob").value.trim(); payload = Object.assign({ task: "lesson_note" }, f); }
      var b = $("#ai-go"); b.disabled = true; say(res, true, "Writing the draft. This can take up to half a minute...");
      ask(payload).then(function (r) { res.className = "result"; res.textContent = ""; show(ex ? "exam" : "lesson_note", f, r); },
        function (er) { say(res, false, er.handled ? er.message : "Could not reach the assistant. Check your connection."); }).then(function () { b.disabled = false; });
    });
  }

  /* ---- editable draft ---- */
  function show(kind, f, r, savedRow) {
    var out = $("#ai-out"), t;
    if (kind === "exam") { t = savedRow ? savedRow.output.texts : examTexts(r, f); } else { t = savedRow ? { paper: savedRow.output.text } : { paper: lessonText(r, f) }; }
    cur = { kind: kind, f: f, r: r, id: savedRow && savedRow.id };
    out.innerHTML = '<article class="panel" style="margin-top:1.2rem"><h3>' + (kind === "exam" ? "Question paper (editable)" : "Lesson note (editable)") + '</h3><p class="notice is-info"><span data-icon="alert"></span><span>This is a draft. Check facts, answers and wording before you use it.</span></p>' +
      '<textarea class="input ai-doc" id="ai-t1" rows="22" spellcheck="true">' + esc(t.paper) + "</textarea>" +
      (kind === "exam" ? '<h3 style="margin-top:1.2rem">Marking scheme and answers (editable)</h3><textarea class="input ai-doc" id="ai-t2" rows="14" spellcheck="true">' + esc(t.scheme) + "</textarea>" : "") +
      '<div class="form-actions" style="margin-top:1rem;flex-wrap:wrap"><button class="btn btn-primary btn-sm" id="ai-save" type="button">Save draft</button><button class="btn btn-soft btn-sm" id="ai-copy" type="button">Copy</button><button class="btn btn-soft btn-sm" id="ai-dl" type="button">Download</button>' +
      '<button class="btn btn-soft btn-sm" id="ai-pr" type="button">' + (kind === "exam" ? "Print question paper" : "Print") + "</button>" + (kind === "exam" ? '<button class="btn btn-soft btn-sm" id="ai-pr2" type="button">Print marking scheme</button>' : "") + '</div><p class="result" id="ai-res2" role="status"></p></article>';
    U.injectIcons && U.injectIcons(out);
    function texts() { return kind === "exam" ? { paper: $("#ai-t1").value, scheme: $("#ai-t2").value } : { paper: $("#ai-t1").value }; }
    function title() { return (f.subject || "") + " - " + (f.topic || "").slice(0, 60); }
    function printIt(txt, ttl) { U.printHTML('<div class="ai-print"><h2>' + esc(U.site().name || "Umar BN L Khattob Nursery & Primary School") + "</h2><pre>" + esc(txt) + "</pre></div>"); }
    $("#ai-save").addEventListener("click", function () {
      var tx = texts(), row = { kind: kind, title: title().slice(0, 150), inputs: f, output: kind === "exam" ? { texts: tx } : { text: tx.paper } }, res = $("#ai-res2");
      var p = cur.id ? rest("PATCH", "/rest/v1/ai_drafts?id=eq." + encodeURIComponent(cur.id), { title: row.title, inputs: f, output: row.output }, { Prefer: "return=minimal" })
        : rest("POST", "/rest/v1/ai_drafts", row, { Prefer: "return=representation" }).then(function (j) { cur.id = (j && j[0] && j[0].id) || null; });
      p.then(function () { say(res, true, "Saved. Find it under Saved drafts."); }, function (e) { say(res, false, A.nice(e.message)); });
    });
    $("#ai-copy").addEventListener("click", function () { var tx = texts(); U.copyText(tx.paper + (tx.scheme ? "\n\n" + tx.scheme : "")).then(function () { say($("#ai-res2"), true, "Copied."); }, function () { say($("#ai-res2"), false, "Could not copy. Select the text and copy it yourself."); }); });
    $("#ai-dl").addEventListener("click", function () { var tx = texts(); U.download((title().replace(/[^\w\- ]+/g, "").trim() || "draft") + ".txt", "text/plain;charset=utf-8", tx.paper + (tx.scheme ? "\n\n\n" + tx.scheme : "")); });
    $("#ai-pr").addEventListener("click", function () { printIt(texts().paper); });
    var p2 = $("#ai-pr2"); if (p2) p2.addEventListener("click", function () { printIt(texts().scheme); });
    out.scrollIntoView && out.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---- saved drafts ---- */
  function saved(body) {
    body.innerHTML = '<p class="count-line">Loading...</p>';
    rest("GET", "/rest/v1/ai_drafts?select=id,kind,title,inputs,output,updated_at&order=updated_at.desc&limit=100").then(function (rows) {
      if (!rows.length) { body.innerHTML = '<div class="empty"><h3>No saved drafts</h3><p>Generate a lesson note or exam paper, edit it, then press "Save draft".</p></div>'; return; }
      body.innerHTML = '<div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>Draft</th><th>Type</th><th>Saved</th><th></th></tr></thead><tbody>' + rows.map(function (r) {
        return '<tr data-id="' + esc(r.id) + '"><td><strong>' + esc(r.title) + "</strong><small style=\"display:block;color:var(--text-muted)\">" + esc((r.inputs || {}).class || "") + "</small></td><td>" + (r.kind === "exam" ? "Exam" : "Lesson note") + "</td><td>" + esc(U.fmt(new Date(r.updated_at), { day: "numeric", month: "short", year: "numeric" })) +
          '</td><td class="ad-acts"><button type="button" class="btn btn-soft btn-sm" data-o="1">Open</button><button type="button" class="btn btn-soft btn-sm" data-d="1">Delete</button></td></tr>';
      }).join("") + '</tbody></table></div><div id="ai-out"></div><p class="result" id="ai-res" role="status"></p>';
      $$("[data-o]", body).forEach(function (b) { b.addEventListener("click", function () { var id = b.closest("tr").getAttribute("data-id"), r = rows.filter(function (x) { return x.id === id; })[0]; show(r.kind, r.inputs || {}, null, r); }); });
      $$("[data-d]", body).forEach(function (b) {
        b.addEventListener("click", function () {
          if (!confirm("Delete this saved draft?")) return;
          rest("DELETE", "/rest/v1/ai_drafts?id=eq." + encodeURIComponent(b.closest("tr").getAttribute("data-id"))).then(function () { open(host); }, function (e) { say($("#ai-res"), false, A.nice(e.message)); });
        });
      });
    }, function (e) { body.innerHTML = '<div class="notice"><span>' + esc(A.nice(e.message)) + "</span></div>"; });
  }

  A.aitools = open;
})();
