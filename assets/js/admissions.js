/* Admissions: four-step application (child, guardian, documents, review). Nothing is stored in the browser.
   On submit the documents go to private storage, then one database function validates and saves the application
   and returns a reference number and a one-time tracking code. If anything fails, nothing is claimed as saved. */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, $$ = U.$$, t = U.t, esc = U.esc, icon = U.icon;
  var step = 1, MAX = 4, files = {}, busy = false, KINDS = ["birth_certificate", "photo", "previous_report"];
  var EXT = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" };

  function val(id) { return ($("#a-" + id).value || "").trim(); }
  function level() { var r = $("input[name=level]:checked"); return r ? r.value : ""; }
  function flag(id, bad, bag) {
    var f = $("#a-" + id) || $("#err-" + id), box = (f && f.closest(".fld")) || $("#err-" + id).closest(".fld");
    if (box) box.classList.toggle("invalid", !!bad);
    if (f && f.setAttribute) f.setAttribute("aria-invalid", String(!!bad));
    if (bad) bag.push(id);
  }
  function dobOk(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var d = U.parseISO(s), td = U.today(), min = new Date(td.getFullYear() - 15, td.getMonth(), td.getDate()), max = new Date(td.getFullYear() - 1, td.getMonth(), td.getDate());
    return d >= min && d <= max;
  }
  function validate(n) {
    var bad = [];
    if (n === 1) {
      var lv = level(); $("#err-level").closest(".fld").classList.toggle("invalid", !lv); if (!lv) bad.push("level");
      flag("cfn", val("cfn").length < 2, bad); flag("cln", val("cln").length < 2, bad); flag("dob", !dobOk(val("dob")), bad);
    }
    if (n === 2) {
      var email = val("gemail"), phone = val("gphone");
      flag("gname", val("gname").length < 2, bad); flag("grel", val("grel").length < 2, bad);
      flag("gemail", !!email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email), bad);
      flag("gphone", !!phone && !/^\+?[0-9 ()-]{7,20}$/.test(phone), bad);
      var none = !email && !phone; $("#err-gcontact").style.display = none ? "block" : "none"; if (none) bad.push("gphone");
    }
    if (n === 3) KINDS.forEach(function (k) { if (files[k] && files[k].error) bad.push(k); });
    if (n === 4) { flag("consent", !$("#a-consent").checked, bad); }
    return bad;
  }
  function note(kind, html) {
    var r = $("#adm-result"); r.className = "result show " + kind; r.innerHTML = html;
    r.focus({ preventScroll: true }); r.scrollIntoView({ block: "nearest", behavior: U.reduceMotion ? "auto" : "smooth" });
  }
  function clearNote() { $("#adm-result").className = "result"; }

  /* ---------- steps ---------- */
  function show(n, focus) {
    step = n; clearNote();
    $$(".wiz-pane").forEach(function (p) { p.hidden = +p.getAttribute("data-step") !== n; });
    $$("#wiz-steps li").forEach(function (li) { var s = +li.getAttribute("data-s"); li.className = s === n ? "is-now" : s < n ? "is-done" : ""; if (s === n) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current"); });
    $("#wiz-progress").textContent = t("adm.progress", { n: n, m: MAX });
    $("#wiz-back").hidden = n === 1; $("#wiz-next").hidden = n === MAX; $("#wiz-submit").hidden = n !== MAX;
    if (n === MAX) review();
    if (focus) { var f = $(".wiz-pane[data-step='" + n + "'] input:not([type=hidden]), .wiz-pane[data-step='" + n + "'] select"); $("#adm-card").scrollIntoView({ block: "start", behavior: U.reduceMotion ? "auto" : "smooth" }); if (f) setTimeout(function () { f.focus({ preventScroll: true }); }, 250); }
  }
  function next() {
    var bad = validate(step);
    if (bad.length) { note("bad", esc(t("adm.e.fix"))); var f = $("#a-" + bad[0]) || $("input[name=level]"); if (f) f.focus(); return; }
    show(step + 1, true);
  }

  /* ---------- documents ---------- */
  function renderFiles() {
    $("#file-list").innerHTML = KINDS.map(function (k) {
      var f = files[k];
      return '<div class="file-row' + (f && f.error ? " invalid" : "") + '"><div><strong>' + esc(t("adm.d." + k)) + "</strong><small>" + (f ? esc(f.file.name) + (f.error ? ' <span class="file-err">' + esc(t(f.error)) + "</span>" : "") : "") + "</small></div>" +
        (f ? '<button type="button" class="btn btn-soft btn-sm" data-rm="' + k + '">' + esc(t("adm.d.remove")) + "</button>" : '<label class="btn btn-soft btn-sm" for="file-' + k + '">' + esc(t("adm.d.choose")) + '</label><input class="sr-only" id="file-' + k + '" data-k="' + k + '" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png">') + "</div>";
    }).join("");
    $$("#file-list input[type=file]").forEach(function (i) {
      i.addEventListener("change", function () {
        var file = i.files[0]; if (!file) return;
        files[i.getAttribute("data-k")] = { file: file, error: !EXT[file.type] ? "adm.e.type" : file.size > 5242880 ? "adm.e.size" : "" };
        renderFiles();
      });
    });
    $$("#file-list [data-rm]").forEach(function (b) { b.addEventListener("click", function () { delete files[b.getAttribute("data-rm")]; renderFiles(); }); });
  }

  /* ---------- review ---------- */
  function row(label, v) { return "<dt>" + esc(label) + "</dt><dd>" + (v ? esc(v) : '<em>' + esc(t("adm.none")) + "</em>") + "</dd>"; }
  function review() {
    var g = val("gender") ? t("adm.g." + val("gender")) : "", dob = dobOk(val("dob")) ? U.fmt(U.parseISO(val("dob")), { day: "numeric", month: "long", year: "numeric" }) : val("dob");
    var docs = KINDS.filter(function (k) { return files[k] && !files[k].error; }).map(function (k) { return t("adm.d." + k) + " (" + files[k].file.name + ")"; }).join("; ");
    $("#review").innerHTML = '<h4>' + esc(t("adm.s1")) + "</h4><dl>" + row(t("adm.level"), t("filter." + level())) + row(t("adm.class"), val("class")) + row(t("adm.cfn"), val("cfn")) + row(t("adm.cln"), val("cln")) + row(t("adm.dob"), dob) + row(t("adm.gender"), g) + row(t("adm.prev"), val("prev")) + row(t("adm.health"), val("health")) + "</dl>" +
      '<h4>' + esc(t("adm.s2")) + "</h4><dl>" + row(t("adm.gname"), val("gname")) + row(t("adm.grel"), val("grel")) + row(t("adm.gphone"), val("gphone")) + row(t("adm.gemail"), val("gemail")) + row(t("adm.gaddr"), val("gaddr")) + "</dl>" +
      '<h4>' + esc(t("adm.s3")) + "</h4><dl>" + row(t("adm.docs.t"), docs) + "</dl>";
  }

  /* ---------- submit ---------- */
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16); });
  }
  function busyUI(b) { busy = b; var s = $("#wiz-submit"); s.disabled = b; s.textContent = t(b ? "adm.sending" : "adm.submit"); $("#wiz-back").disabled = b; }
  function errText(e) {
    if (e.kind === "rate") return t("adm.e.rate");
    if (e.kind === "cfg") return t("adm.e.cfg");
    if (e.kind === "upload") return t("adm.e.upload");
    if (e.kind === "invalid") return t("adm.e.fix");
    return t("adm.e.net");
  }
  function submit(e) {
    e.preventDefault(); if (busy) return;
    if ($("#a-site").value) return;                                       /* honeypot */
    for (var n = 1; n <= MAX; n++) { var bad = validate(n); if (bad.length) { show(n); note("bad", esc(t("adm.e.fix"))); return; } }
    clearNote(); busyUI(true);
    var folder = "pending/" + uuid(), docs = [];
    var chain = Promise.resolve();
    KINDS.forEach(function (k) {
      if (!files[k]) return;
      chain = chain.then(function () {
        var p = folder + "/" + k + "." + EXT[files[k].file.type];
        return U.api.upload(p, files[k].file).then(function () { docs.push({ kind: k, path: p, name: files[k].file.name.slice(0, 80) }); });
      });
    });
    chain.then(function () {
      return U.api.rpc("submit_application", {
        p: { level: level(), class_applying: val("class"), child_first_name: val("cfn"), child_last_name: val("cln"), child_dob: val("dob"), child_gender: val("gender"),
          previous_school: val("prev"), health_notes: val("health"), guardian_name: val("gname"), guardian_relationship: val("grel"), guardian_phone: val("gphone"),
          guardian_email: val("gemail"), guardian_address: val("gaddr"), preferred_language: document.documentElement.lang, documents: docs, consent: true, website: "" }
      });
    }).then(done, function (err) { busyUI(false); note("bad", esc(errText(err))); });
  }
  var result = null;
  function done(r) {
    busyUI(false);
    result = { ref: r.reference, code: r.tracking_code, child: val("cfn") + " " + val("cln"), level: level(), docs: Object.keys(files).filter(function (k) { return !files[k].error; }).length, at: r.submitted_at };
    $("#adm-card").hidden = true; $("#adm-done").hidden = false;
    $("#done-ref").textContent = result.ref; $("#done-code").textContent = result.code;
    $("#done-docs").textContent = result.docs ? t("adm.ok.docs", { n: result.docs }) : "";
    $("#done-track").href = "track.html";
    $("#adm-done").focus(); $("#adm-done").scrollIntoView({ block: "start", behavior: U.reduceMotion ? "auto" : "smooth" });
    $("#adm-form").reset(); files = {}; renderFiles();            /* personal data is cleared from the page */
  }
  function summaryText() { return t("school") + "\n" + t("adm.ok.t") + "\n" + t("adm.ok.ref") + ": " + result.ref + "\n" + t("adm.ok.code") + ": " + result.code; }

  U.init(function () {
    if (!U.api.configured()) { $("#adm-cfg").hidden = false; $("#wiz-submit").disabled = true; }
    var td = U.today(); $("#a-dob").max = U.toISO(new Date(td.getFullYear() - 1, td.getMonth(), td.getDate())); $("#a-dob").min = U.toISO(new Date(td.getFullYear() - 15, td.getMonth(), td.getDate()));
    $("#wiz-next").addEventListener("click", next);
    $("#wiz-back").addEventListener("click", function () { show(step - 1, true); });
    $("#adm-form").addEventListener("submit", submit);
    $("#adm-form").addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target.tagName === "INPUT" && step < MAX && e.target.type !== "file") { e.preventDefault(); next(); } });
    $("#done-print").addEventListener("click", function () {
      U.printHTML("<h1>" + esc(t("school")) + "</h1><h2>" + esc(t("adm.ok.t")) + '</h2><p class="post-meta">' + esc(t("adm.ok.ref")) + ": <strong>" + esc(result.ref) + "</strong></p><p class=\"post-meta\">" + esc(t("adm.ok.code")) + ": <strong>" + esc(result.code) + "</strong></p><p>" + esc(result.child) + " · " + esc(t("filter." + result.level)) + "</p><p>" + esc(t("pg.track")) + ": " + esc(location.href.replace(/admissions\.html.*$/, "track.html")) + "</p>");
    });
    $("#done-copy").addEventListener("click", function () { var l = $("#done-copy-l"); U.copyText(summaryText()).then(function () { l.textContent = t("copied"); setTimeout(function () { l.textContent = t("adm.ok.copy"); }, 1600); }, function () {}); });
    renderFiles(); show(1);
  });
  U.onLang(function () { if (!busy) { $("#wiz-submit").textContent = t("adm.submit"); } $("#wiz-progress").textContent = t("adm.progress", { n: step, m: MAX }); renderFiles(); if (step === MAX) review(); });
})();
