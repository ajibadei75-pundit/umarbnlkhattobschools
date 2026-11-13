/* Student portal: Student ID + 6-digit PIN. The PIN is checked by the database (hashed, locks after 5 wrong tries).
   Nothing is stored in the browser: signing in again is needed after a refresh. */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, t = U.t, esc = U.esc, B = (window.UBK_SITE || {}).backend || {};
  var data = null;
  function say(m) { var r = $("#st-res"); r.className = m ? "result show bad" : "result"; r.textContent = m || ""; }
  function render() {
    if (!data) return;
    var s = data.student;
    $("#st-hello").textContent = t("st.hello") + " " + s.first_name; $("#st-class").textContent = (s.class || "") + " · " + s.student_code;
    $("#st-rmsg").textContent = t(data.released ? "st.ready" : "st.notyet"); $("#st-view").hidden = !data.released;
  }
  function showSheet() {
    var box = $("#st-sheet"); box.hidden = false; window.UBK_REPORT.mount(box, data.result, { watermark: true, guard: true }); box.scrollIntoView({ behavior: U.reduceMotion ? "auto" : "smooth" });
  }
  function signOut() { data = null; $("#st-sheet").innerHTML = ""; $("#st-sheet").hidden = true; $("#st-app").hidden = true; $("#st-login").hidden = false; $("#st-pin").value = ""; say(""); }
  U.init(function () {
    if (!B.url || !B.key) { $("#st-cfg").hidden = false; $("#st-go").disabled = true; return; }
    $("#st-form").addEventListener("submit", function (e) {
      e.preventDefault(); var code = $("#st-code").value.trim(), pin = $("#st-pin").value.trim();
      if (!code || !/^\d{6}$/.test(pin)) return say(t("st.need"));
      $("#st-go").disabled = true; say("");
      fetch(B.url + "/rest/v1/rpc/student_portal", { method: "POST", headers: { apikey: B.key, "Content-Type": "application/json" }, body: JSON.stringify({ p_code: code, p_pin: pin }) })
        .then(function (r) { if (!r.ok) throw new Error("net"); return r.json(); })
        .then(function (j) {
          if (!j.ok) return say(t(j.error === "locked" ? "st.e.lock" : j.error === "rate" ? "st.e.rate" : "st.e.bad"));
          data = j; $("#st-pin").value = ""; $("#st-login").hidden = true; $("#st-app").hidden = false; render();
        }, function () { say(t("st.e.net")); }).then(function () { $("#st-go").disabled = false; });
    });
    $("#st-view").addEventListener("click", showSheet); $("#st-out").addEventListener("click", signOut);
  });
  U.onLang(render);
})();
