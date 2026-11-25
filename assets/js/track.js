/* Track an application with the reference number and the one-time tracking code. */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, t = U.t, esc = U.esc, icon = U.icon;
  var last = null, busy = false;
  function note(kind, html) { var r = $("#t-result"); r.className = "result show " + kind; r.innerHTML = html; }
  function fmtDate(s) { return U.fmt(new Date(s), { day: "numeric", month: "long", year: "numeric" }); }
  function render() {
    var out = $("#t-out"); if (!last) { out.hidden = true; return; }
    out.hidden = false;
    out.innerHTML = '<div class="trk-card"><div class="trk-top"><div><small>' + esc(t("trk.ref")) + "</small><b>" + esc(last.reference) + '</b></div><span class="status-pill st-' + esc(last.status) + '">' + esc(t("st." + last.status)) + "</span></div>" +
      "<p>" + esc(t("st." + last.status + ".d")) + "</p>" +
      (last.note ? '<div class="notice is-info"><span>' + icon("chat") + "</span><span><strong>" + esc(t("trk.note")) + ":</strong> " + esc(last.note) + "</span></div>" : "") +
      '<dl class="review" style="margin:1rem 0"><dl></dl></dl>' +
      '<p class="count-line">' + esc(t("trk.submitted")) + ": " + esc(fmtDate(last.submitted_at)) + " · " + esc(t("trk.updated")) + ": " + esc(fmtDate(last.updated_at)) + "</p>" +
      "<h3 style='font-size:1rem'>" + esc(t("trk.history")) + '</h3><ol class="timeline">' + (last.history || []).map(function (h) {
        return "<li><strong>" + esc(t("st." + h.status)) + "</strong><small>" + esc(fmtDate(h.at)) + "</small>" + (h.note ? "<p>" + esc(h.note) + "</p>" : "") + "</li>";
      }).join("") + "</ol></div>";
    out.querySelector("dl.review").remove();
  }
  function go(e) {
    e.preventDefault(); if (busy) return;
    if ($("#t-site").value) return;
    var ref = $("#t-ref").value.trim().toUpperCase(), code = $("#t-code").value.trim().toUpperCase();
    last = null; render();
    if (!/^UBK-\d{2}-[A-Z0-9]{6}$/.test(ref) || !/^[A-Z0-9]{8}$/.test(code)) { note("bad", esc(t("trk.notfound"))); return; }
    busy = true; $("#t-go").disabled = true; $("#t-go").textContent = t("trk.checking");
    U.api.rpc("track_application", { p_reference: ref, p_code: code }).then(function (r) {
      if (!r) { note("bad", esc(t("trk.notfound"))); return; }
      $("#t-result").className = "result"; last = r; render();
      $("#t-out").scrollIntoView({ block: "nearest", behavior: U.reduceMotion ? "auto" : "smooth" });
    }, function (err) { note("bad", esc(err.kind === "rate" ? t("adm.e.rate") : err.kind === "cfg" ? t("adm.e.cfg") : t("adm.e.net"))); })
    .then(function () { busy = false; $("#t-go").disabled = false; $("#t-go").textContent = t("trk.go"); });
  }
  /* Entrance exam result by unique code */
  var exBusy = false;
  function T(k, f) { var v = t(k); return v && v !== k ? v : f; }
  function exNote(kind, html) { var r = $("#ex-result"); r.className = "result show " + kind; r.innerHTML = html; }
  function exGo(e) {
    e.preventDefault(); if (exBusy) return;
    var code = $("#ex-code").value.trim().toUpperCase(), out = $("#ex-out"); out.hidden = true;
    if (!/^EX-[A-Z0-9]{6}$/.test(code)) { exNote("bad", esc(T("ex.bad", "Check the code. It looks like EX-ABC234."))); return; }
    exBusy = true; $("#ex-go").disabled = true;
    U.api.rpc("entrance_result", { p_code: code }).then(function (r) {
      if (!r) { exNote("bad", esc(T("ex.none", "No published result for this code yet. Please check the code or ask the school office."))); return; }
      $("#ex-result").className = "result";
      var pct = Number(r.percent), band = pct >= 70 ? "ex-hi" : pct >= 50 ? "ex-mid" : "ex-lo";
      out.hidden = false;
      out.innerHTML = '<div class="trk-card ex-card"><div class="trk-top"><div><small>' + esc(T("ex.child", "Candidate")) + "</small><b>" + esc(r.child) + '</b></div><span class="status-pill">' + esc(r.code) + "</span></div>" +
        '<div class="ex-score ' + band + '"><b>' + esc(r.score) + "<small> / " + esc(r.total) + "</small></b><span>" + esc(pct) + "%</span></div>" +
        '<dl class="ex-dl"><div><dt>' + esc(T("ex.level", "Level")) + "</dt><dd>" + esc(T("filter." + r.level, r.level)) + "</dd></div><div><dt>" + esc(T("ex.class", "Class applied for")) + "</dt><dd>" + esc(r.class || "-") + "</dd></div><div><dt>" + esc(T("ex.date", "Exam date")) + "</dt><dd>" + esc(r.exam_date ? fmtDate(r.exam_date) : "-") + "</dd></div><div><dt>" + esc(T("trk.ref", "Reference number")) + "</dt><dd>" + esc(r.reference) + "</dd></div></dl>" +
        (r.remark ? '<div class="notice is-info"><span>' + esc(r.remark) + "</span></div>" : "") +
        '<div class="form-actions" style="margin-top:.8rem"><button type="button" class="btn btn-soft" id="ex-pr">' + esc(T("ex.print", "Print result")) + '</button></div><p class="count-line">' + esc(T("ex.note", "This is the entrance exam score only. The school office will tell you the admission decision.")) + "</p></div>";
      $("#ex-pr").addEventListener("click", function () { U.printHTML("<h1>" + esc(t("school")) + "</h1><h2>" + esc(T("ex.t", "Entrance exam result")) + "</h2><p><strong>" + esc(r.child) + "</strong> · " + esc(r.code) + "</p><p>" + esc(r.score) + " / " + esc(r.total) + " (" + esc(pct) + "%)</p><p>" + esc(r.level) + " · " + esc(r.class || "") + " · " + esc(r.exam_date || "") + "</p>" + (r.remark ? "<p>" + esc(r.remark) + "</p>" : "")); });
      out.scrollIntoView({ block: "nearest", behavior: U.reduceMotion ? "auto" : "smooth" });
    }, function (err) { exNote("bad", esc(err.kind === "rate" ? t("adm.e.rate") : err.kind === "cfg" ? t("adm.e.cfg") : t("adm.e.net"))); })
    .then(function () { exBusy = false; $("#ex-go").disabled = false; });
  }
  U.init(function () {
    if ($("#ex-form")) $("#ex-form").addEventListener("submit", exGo);
    if (/#entrance/.test(location.hash)) setTimeout(function () { $("#ex-code").focus(); }, 300);
    $("#trk-form").addEventListener("submit", go);
    var m = /ref=([A-Za-z0-9-]+)/.exec(location.search); if (m) $("#t-ref").value = m[1];
  });
  U.onLang(function () { render(); if (!busy) $("#t-go").textContent = t("trk.go"); });
})();
