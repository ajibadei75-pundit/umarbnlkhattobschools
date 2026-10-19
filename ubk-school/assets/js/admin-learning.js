/* Dashboard: Learning Centre manager. Staff add videos (links), materials (file or link) and quizzes.
   Teachers can save drafts or send items "for review"; only content staff and administrators can publish. */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, $$ = U.$$, esc = U.esc;
  var A = window.UBK_ADMIN, B = (window.UBK_SITE || {}).backend || {};
  if (!A) return;
  var host, rows = [], editing = null;
  var LV = { nursery: "Nursery", primary: "Primary", secondary: "Secondary", arabic: "Arabic" };
  var KD = { video: "Video (link)", material: "Material (file or link)", quiz: "Quiz" };
  var ST = { draft: "Draft", pending: "Waiting for review", published: "Published" };

  function rest(m, p, b, x) { return A.api(m, p, b, x); }
  function say(el, ok, m) { if (!el) return; el.className = "result show " + (ok ? "ok" : "bad"); el.textContent = m; }
  function nice(e) { var m = (e && e.message) || ""; if (/row-level security|violates row/.test(m)) return "You are not allowed to do that (teachers cannot publish)."; if (/li_video_url/.test(m)) return "A video needs a link."; if (/li_material_src/.test(m)) return "A material needs a file or a link."; if (/url_check|https/.test(m)) return "Links must start with https://"; return A.nice(m); }
  function isEditor() { return A.can(["super_admin", "school_admin", "content_editor"]); }

  /* quiz text <-> array. Format: a question line, then option lines starting with "-", the correct one starting with "*". Blank line between questions. */
  function parseQuiz(text) {
    var out = [], blocks = String(text || "").split(/\n\s*\n/), err = "";
    blocks.forEach(function (b, n) {
      var ls = b.split("\n").map(function (l) { return l.trim(); }).filter(Boolean); if (!ls.length) return;
      var q = ls[0].replace(/^q[:.]?\s*/i, ""), opts = [], ans = -1, ex = "";
      ls.slice(1).forEach(function (l) {
        if (/^explain[:]/i.test(l)) { ex = l.replace(/^explain:\s*/i, ""); return; }
        var c = /^\*/.test(l); l = l.replace(/^[*-]\s*/, ""); if (!l) return; if (c) ans = opts.length; opts.push(l);
      });
      if (!q || opts.length < 2 || ans < 0) err = err || "Question " + (n + 1) + " needs at least two options and one marked with *.";
      else out.push({ q: q, options: opts, answer: ans, explain: ex || undefined });
    });
    return { quiz: out, error: err };
  }
  function quizText(qz) { return (qz || []).map(function (z) { return z.q + "\n" + z.options.map(function (o, i) { return (i === z.answer ? "* " : "- ") + o; }).join("\n") + (z.explain ? "\nExplain: " + z.explain : ""); }).join("\n\n"); }

  function open(h) {
    host = h; editing = null; host.innerHTML = '<p class="count-line">Loading...</p>';
    rest("GET", "/rest/v1/learning_items?select=*&order=updated_at.desc&limit=500").then(function (r) { rows = r; draw(); }, function (e) { host.innerHTML = '<div class="notice"><span>' + esc(nice(e)) + "</span></div>"; });
  }
  function draw() {
    host.innerHTML = '<h2 class="sec-title" style="font-size:1.2rem">Learning Centre</h2><p class="count-line">Add videos (links only), materials and quizzes. Only published items are shown to the public. ' + (isEditor() ? "" : "As a teacher you can save drafts or send items for review; an administrator publishes them. ") + 'Built-in games need no setup.</p>' +
      '<div class="toolbar"><button type="button" class="btn btn-primary btn-sm" id="lm-new">Add an item</button></div><div id="lm-form"></div>' +
      (rows.length ? '<div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>Item</th><th>Type</th><th>Levels</th><th>Status</th><th></th></tr></thead><tbody>' + rows.map(function (r) {
        return '<tr data-id="' + esc(r.id) + '"><td><strong>' + esc((r.title || {}).en || "") + "</strong></td><td>" + esc(KD[r.kind] || r.kind) + "</td><td>" + esc((r.levels || []).map(function (l) { return LV[l]; }).join(", ") || "All") + '</td><td><span class="status-pill st-' + (r.status === "published" ? "offered" : r.status === "pending" ? "under_review" : "") + '">' + esc(ST[r.status]) + '</span></td><td class="ad-acts"><button type="button" class="btn btn-soft btn-sm" data-e="1">Edit</button><button type="button" class="btn btn-soft btn-sm" data-d="1">Delete</button></td></tr>';
      }).join("") + "</tbody></table></div>" : '<div class="empty"><h3>No items yet</h3><p>Add the first video, material or quiz.</p></div>') + '<p class="result" id="lm-res" role="status"></p>';
    $("#lm-new").addEventListener("click", function () { form(null); });
    $$("[data-e]", host).forEach(function (b) { b.addEventListener("click", function () { form(rows.filter(function (r) { return r.id === b.closest("tr").getAttribute("data-id"); })[0]); }); });
    $$("[data-d]", host).forEach(function (b) { b.addEventListener("click", function () { if (!confirm("Delete this item?")) return; rest("DELETE", "/rest/v1/learning_items?id=eq." + encodeURIComponent(b.closest("tr").getAttribute("data-id"))).then(function () { open(host); }, function (e) { say($("#lm-res"), false, nice(e)); }); }); });
  }
  function f(id, label, v, extra) { return '<div class="fld"><label for="' + id + '">' + label + '</label><input class="input" id="' + id + '" value="' + esc(v == null ? "" : v) + '" ' + (extra || "") + "></div>"; }
  function form(r) {
    editing = r; r = r || { kind: "video", title: {}, description: {}, levels: [], status: "draft" };
    var stats = isEditor() ? ["draft", "pending", "published"] : ["draft", "pending"];
    $("#lm-form").innerHTML = '<form id="lm-f" class="form-card" style="margin:1rem 0" novalidate><div class="form-grid">' +
      '<div class="fld"><label for="lm-k">Type</label><select class="select-lg" id="lm-k">' + Object.keys(KD).map(function (k) { return '<option value="' + k + '"' + (r.kind === k ? " selected" : "") + ">" + KD[k] + "</option>"; }).join("") + "</select></div>" +
      '<div class="fld"><label for="lm-s">Status</label><select class="select-lg" id="lm-s">' + stats.map(function (s) { return '<option value="' + s + '"' + (r.status === s ? " selected" : "") + ">" + ST[s] + "</option>"; }).join("") + "</select></div>" +
      f("lm-t", "Title (English)", (r.title || {}).en, 'maxlength="120"') + f("lm-sub", "Subject (optional)", r.subject, 'maxlength="60"') +
      '<div class="fld full"><label for="lm-d">Short description (English, optional)</label><textarea class="input" id="lm-d" rows="2" maxlength="500">' + esc((r.description || {}).en || "") + "</textarea></div>" +
      '<div class="fld full"><span class="lab">Levels (leave all empty for every level)</span><div class="rw-rates">' + Object.keys(LV).map(function (l) { return '<label class="check"><input type="checkbox" name="lm-l" value="' + l + '"' + ((r.levels || []).indexOf(l) > -1 ? " checked" : "") + "> " + LV[l] + "</label>"; }).join("") + "</div></div>" +
      '<div class="fld full" id="lm-urlw">' + '<label for="lm-u">Link (https://)</label><input class="input" id="lm-u" type="url" maxlength="500" value="' + esc(r.url || "") + '" placeholder="https://www.youtube.com/watch?v=..."></div>' +
      '<div class="fld full" id="lm-filew"><label for="lm-fl">Or upload a file (PDF, PNG or JPG, up to 10 MB)</label><input class="input" id="lm-fl" type="file" accept="application/pdf,image/png,image/jpeg">' + (r.file_path ? '<small class="count-line">A file is already attached. Choose a new one to replace it.</small>' : "") + "</div>" +
      '<div class="fld full" id="lm-qw"><label for="lm-q">Questions</label><textarea class="input" id="lm-q" rows="10" placeholder="Which colour is the sky?&#10;* Blue&#10;- Red&#10;- Green&#10;Explain: On a clear day the sky looks blue.&#10;&#10;Next question...">' + esc(quizText(r.quiz)) + '</textarea><small class="count-line">One block per question. Start the correct option with *, other options with -. Leave a blank line between questions.</small></div>' +
      '<details class="fld full"><summary>Arabic and Hausa titles (optional, drafts need review)</summary><div class="form-grid" style="margin-top:.6rem">' + f("lm-tar", "Title (Arabic)", (r.title || {}).ar, 'dir="rtl" lang="ar" maxlength="120"') + f("lm-tha", "Title (Hausa)", (r.title || {}).ha, 'maxlength="120"') + "</div></details></div>" +
      '<div class="form-actions" style="margin-top:1rem"><button class="btn btn-primary" type="submit" id="lm-save">Save</button><button class="btn btn-soft" type="button" id="lm-cancel">Cancel</button></div><p class="result" id="lm-r" role="status"></p></form>';
    function sync() { var k = $("#lm-k").value; $("#lm-urlw").hidden = k === "quiz"; $("#lm-filew").hidden = k !== "material"; $("#lm-qw").hidden = k !== "quiz"; $("#lm-urlw label").textContent = k === "video" ? "Video link (YouTube, Vimeo or other https link)" : "Link (https://)"; }
    $("#lm-k").addEventListener("change", sync); sync();
    $("#lm-cancel").addEventListener("click", function () { $("#lm-form").innerHTML = ""; });
    $("#lm-f").addEventListener("submit", function (e) {
      e.preventDefault(); var res = $("#lm-r"), k = $("#lm-k").value, title = $("#lm-t").value.trim(); if (!title) return say(res, false, "Enter the English title.");
      var tt = { en: title }, ta = $("#lm-tar").value.trim(), th = $("#lm-tha").value.trim(); if (ta) tt.ar = ta; if (th) tt.ha = th;
      var url = $("#lm-u").value.trim(), file = $("#lm-fl").files[0], d = $("#lm-d").value.trim();
      var row = { kind: k, title: tt, description: d ? { en: d } : {}, levels: $$("[name=lm-l]:checked").map(function (c) { return c.value; }), subject: $("#lm-sub").value.trim() || null, status: $("#lm-s").value, url: k === "quiz" ? null : (url || null), quiz: null };
      if (url && !/^https:\/\/\S+$/.test(url)) return say(res, false, "Links must start with https://");
      if (k === "video" && !url) return say(res, false, "A video needs a link.");
      if (k === "quiz") { var pq = parseQuiz($("#lm-q").value); if (pq.error) return say(res, false, pq.error); if (!pq.quiz.length) return say(res, false, "Add at least one question."); row.quiz = pq.quiz; }
      if (k === "material" && !url && !file && !(editing && editing.file_path)) return say(res, false, "Add a link or upload a file.");
      if (k !== "material") row.file_path = null;
      var b = $("#lm-save"); b.disabled = true;
      var up = Promise.resolve(editing && k === "material" ? editing.file_path : null);
      if (k === "material" && file) {
        if (file.size > 10485760 || ["application/pdf", "image/png", "image/jpeg"].indexOf(file.type) < 0) { b.disabled = false; return say(res, false, "Choose a PDF, PNG or JPG up to 10 MB."); }
        up = A.fresh().then(function (tok) {
          var path = A.uid() + "/" + (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "" + Math.random().toString(16).slice(2)) + (file.type === "application/pdf" ? ".pdf" : file.type === "image/png" ? ".png" : ".jpg");
          return fetch(B.url + "/storage/v1/object/learning/" + path, { method: "POST", headers: { apikey: B.key, Authorization: "Bearer " + tok, "Content-Type": file.type }, body: file }).then(function (x) { if (!x.ok) throw new Error("Upload failed"); return path; });
        });
      }
      up.then(function (path) {
        if (k === "material") row.file_path = path || null;
        return editing ? rest("PATCH", "/rest/v1/learning_items?id=eq." + encodeURIComponent(editing.id), row, { Prefer: "return=minimal" }) : rest("POST", "/rest/v1/learning_items", row, { Prefer: "return=minimal" });
      }).then(function () { open(host); }, function (er) { b.disabled = false; say(res, false, nice(er)); });
    });
    $("#lm-form").scrollIntoView && $("#lm-form").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  A.learning = open;
})();
