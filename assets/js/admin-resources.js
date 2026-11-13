/* Dashboard: School resources. Administrators upload the syllabus, scheme of work, textbook pages and notes (PDF, JPEG, PNG).
   Teachers pick them in Teacher tools so a lesson note follows what the school actually teaches. Files are private (bucket "resources"). */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, $$ = U.$$, esc = U.esc, A = window.UBK_ADMIN, B = (window.UBK_SITE || {}).backend || {};
  if (!A) return;
  var KINDS = { syllabus: "Syllabus", scheme: "Scheme of work", textbook: "Textbook pages", notes: "Notes", other: "Other" }, OK = ["application/pdf", "image/jpeg", "image/png"], MAX = 15728640, host, rows = [], fClass = "";
  function say(ok, m) { var el = $("#rs-res"); if (el) { el.className = "result show " + (ok ? "ok" : "bad"); el.textContent = m; } }
  function nice(e) { var m = (e && e.message) || ""; return /row-level|forbidden|permission/.test(m) ? "You do not have permission for that." : A.nice(m); }
  function uuid() { return crypto.randomUUID ? crypto.randomUUID() : Date.now() + "" + Math.random().toString(16).slice(2); }
  function kb(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB"; }
  function load() {
    host.innerHTML = '<p class="count-line">Loading...</p>';
    return A.api("GET", "/rest/v1/school_resources?select=*&order=class_name.asc,subject.asc,created_at.desc&limit=500").then(function (r) { rows = r || []; draw(); }, function (e) { host.innerHTML = '<div class="notice"><span>' + esc(nice(e)) + "</span></div>"; });
  }
  function draw() {
    var cls = []; rows.forEach(function (r) { if (r.class_name && cls.indexOf(r.class_name) < 0) cls.push(r.class_name); });
    var list = rows.filter(function (r) { return !fClass || r.class_name === fClass; });
    host.innerHTML = '<div class="form-card"><h3 class="fc-h">Upload resources</h3><p class="count-line">Drag files here or choose several at once. PDF, JPEG or PNG, up to 15 MB each. Teachers can attach up to 3 when they generate a lesson note.</p>' +
      '<form id="rs-form" novalidate><label class="rs-drop" id="rs-drop" for="rs-f"><strong>Drop files here</strong><span>or click to choose files</span></label><input id="rs-f" type="file" accept="application/pdf,image/jpeg,image/png" multiple hidden>' +
      '<ul class="rs-q" id="rs-q"></ul><div class="form-grid">' +
      '<div class="fld"><label for="rs-c">Class</label><input class="input" id="rs-c" maxlength="60" placeholder="e.g. Primary 3 (blank = all classes)"></div><div class="fld"><label for="rs-s">Subject</label><input class="input" id="rs-s" maxlength="80" placeholder="e.g. Mathematics (blank = all)"></div>' +
      '<div class="fld"><label for="rs-k">Type</label><select class="select-lg" id="rs-k">' + Object.keys(KINDS).map(function (k) { return '<option value="' + k + '">' + KINDS[k] + "</option>"; }).join("") + '</select></div></div>' +
      '<div class="form-actions" style="margin-top:1rem"><button class="btn btn-primary btn-sm" type="submit" id="rs-go">Upload</button></div><p class="result" id="rs-res" role="status"></p></form></div>' +
      '<div class="form-card" style="margin-top:1.2rem"><div class="rs-head"><h3 class="fc-h">Library (' + rows.length + ')</h3>' + (cls.length ? '<select class="select-lg" id="rs-fc" aria-label="Filter by class"><option value="">All classes</option>' + cls.map(function (c) { return '<option' + (c === fClass ? " selected" : "") + ">" + esc(c) + "</option>"; }).join("") + "</select>" : "") + "</div>" +
      (list.length ? '<div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>Title</th><th>Class and subject</th><th>Type</th><th>Status</th><th></th></tr></thead><tbody>' + list.map(function (r) {
        return "<tr><td><strong>" + esc(r.title) + "</strong><br><small>" + kb(r.size || 0) + "</small></td><td>" + esc(r.class_name || "All classes") + "<br><small>" + esc(r.subject || "All subjects") + "</small></td><td>" + esc(KINDS[r.kind] || "Other") + "</td><td>" + (r.active ? "Available" : "Hidden") + '</td><td class="rs-act"><button type="button" class="btn btn-soft btn-sm" data-tg="' + esc(r.id) + '">' + (r.active ? "Hide" : "Show") + '</button> <button type="button" class="btn btn-soft btn-sm" data-rm="' + esc(r.id) + '">Delete</button></td></tr>';
      }).join("") + "</tbody></table></div>" : '<div class="empty"><p>No resources yet. Upload the syllabus or scheme of work above.</p></div>') + "</div>";
    var fc = $("#rs-fc"); if (fc) fc.addEventListener("change", function () { fClass = fc.value; draw(); });
    $("#rs-form").addEventListener("submit", submit); wireDrop();
    $$("[data-tg]", host).forEach(function (b) { b.addEventListener("click", function () { var r = rows.filter(function (x) { return x.id === b.getAttribute("data-tg"); })[0]; A.api("PATCH", "/rest/v1/school_resources?id=eq." + encodeURIComponent(r.id), { active: !r.active }, { Prefer: "return=minimal" }).then(load, function (e) { alert(nice(e)); }); }); });
    $$("[data-rm]", host).forEach(function (b) { b.addEventListener("click", function () {
      var r = rows.filter(function (x) { return x.id === b.getAttribute("data-rm"); })[0]; if (!confirm("Delete \"" + r.title + "\" for good?")) return;
      A.fresh().then(function (tok) { return fetch(B.url + "/storage/v1/object/resources/" + r.file_path.split("/").map(encodeURIComponent).join("/"), { method: "DELETE", headers: { apikey: B.key, Authorization: "Bearer " + tok } }); })
        .then(function () { return A.api("DELETE", "/rest/v1/school_resources?id=eq." + encodeURIComponent(r.id), null, { Prefer: "return=minimal" }); }).then(load, function (e) { alert(nice(e)); });
    }); });
  }
  var queue = [];
  function addFiles(list) {
    Array.prototype.forEach.call(list || [], function (f) {
      if (OK.indexOf(f.type) < 0) return say(false, f.name + ": only PDF, JPEG or PNG files can be used.");
      if (f.size > MAX) return say(false, f.name + " is over 15 MB. Split or compress it first.");
      if (queue.length >= 20) return say(false, "Up to 20 files at a time.");
      queue.push({ f: f, t: f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").slice(0, 120) });
    }); drawQ();
  }
  function drawQ() {
    var ul = $("#rs-q"); if (!ul) return;
    ul.innerHTML = queue.map(function (x, i) { return '<li><input class="input" data-qt="' + i + '" value="' + esc(x.t) + '" maxlength="120" aria-label="Title for ' + esc(x.f.name) + '"><small>' + kb(x.f.size) + '</small><button type="button" class="btn btn-soft btn-sm" data-qx="' + i + '" aria-label="Remove ' + esc(x.f.name) + '">&times;</button></li>'; }).join("");
    $$("[data-qt]", ul).forEach(function (el) { el.addEventListener("input", function () { queue[+el.getAttribute("data-qt")].t = el.value; }); });
    $$("[data-qx]", ul).forEach(function (el) { el.addEventListener("click", function () { queue.splice(+el.getAttribute("data-qx"), 1); drawQ(); }); });
  }
  function wireDrop() {
    var dz = $("#rs-drop"), inp = $("#rs-f"); queue = []; drawQ();
    inp.addEventListener("change", function () { addFiles(inp.files); inp.value = ""; });
    ["dragenter", "dragover"].forEach(function (n) { dz.addEventListener(n, function (e) { e.preventDefault(); dz.classList.add("on"); }); });
    ["dragleave", "drop"].forEach(function (n) { dz.addEventListener(n, function (e) { e.preventDefault(); dz.classList.remove("on"); }); });
    dz.addEventListener("drop", function (e) { addFiles(e.dataTransfer && e.dataTransfer.files); });
  }
  function why(st, m) {
    m = String(m || "");
    if (st === 413 || /too large|size/i.test(m)) return "the file is larger than the storage limit";
    if (st === 401 || st === 403 || /row-level|policy|unauthor/i.test(m)) return "your account is not allowed to upload (sign in again as an administrator)";
    if (/mime|type/i.test(m)) return "that file type is not accepted";
    if (st === 404 || /bucket/i.test(m)) return "the storage folder is missing";
    return "storage said: " + (m.slice(0, 120) || "error " + st);
  }
  function one(x, meta) {
    var f = x.f, path = uuid() + (f.type === "application/pdf" ? ".pdf" : f.type === "image/png" ? ".png" : ".jpg");
    return A.fresh().then(function (tok) { return fetch(B.url + "/storage/v1/object/resources/" + path, { method: "POST", headers: { apikey: B.key, Authorization: "Bearer " + tok, "Content-Type": f.type }, body: f }); })
      .then(function (r) { if (r.ok) return r; return r.json().catch(function () { return {}; }).then(function (j) { throw new Error(why(r.status, j && (j.message || j.error))); }); }).then(function () { return A.api("POST", "/rest/v1/school_resources", { title: (x.t || f.name).trim(), class_name: meta.c, subject: meta.s, kind: meta.k, file_path: path, mime: f.type, size: f.size }, { Prefer: "return=minimal" }); });
  }
  function submit(e) {
    e.preventDefault(); var btn = $("#rs-go");
    if (!queue.length) return say(false, "Choose or drop at least one PDF, JPEG or PNG file.");
    var meta = { c: $("#rs-c").value.trim(), s: $("#rs-s").value.trim(), k: $("#rs-k").value }, todo = queue.slice(), done = 0, bad = [], why1 = "";
    btn.disabled = true;
    (function next() {
      if (!todo.length) { if (!bad.length) return load(); btn.disabled = false; queue = queue.filter(function (q) { return bad.indexOf(q.f.name) >= 0; }); drawQ(); say(false, done + " uploaded. Not uploaded: " + bad.join(", ") + ". Reason: " + why1); return; }
      var x = todo.shift(); say(true, "Uploading " + (done + bad.length + 1) + " of " + (done + bad.length + todo.length + 1) + ": " + x.f.name + "...");
      one(x, meta).then(function () { done++; }, function (er) { bad.push(x.f.name); why1 = why1 || nice(er); }).then(next);
    })();
  }
  A.resources = function (h) { host = h; load(); };
})();
