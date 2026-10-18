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
  U.init(function () {
    $("#trk-form").addEventListener("submit", go);
    var m = /ref=([A-Za-z0-9-]+)/.exec(location.search); if (m) $("#t-ref").value = m[1];
  });
  U.onLang(function () { render(); if (!busy) $("#t-go").textContent = t("trk.go"); });
})();
