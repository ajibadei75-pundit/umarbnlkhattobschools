/* Public leadership page: shows published rows of the "leaders" table. Nothing is shown that the school has not approved. */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, t = U.t, esc = U.esc;
  var B = (window.UBK_SITE || {}).backend || {};
  var rows = [], loaded = false;
  function pick(o) { var l = document.documentElement.lang; return (o && (o[l] || o.en)) || ""; }
  function initials(n) { return n.split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join(""); }
  function render() {
    $("#ld-grid").innerHTML = rows.map(function (r, i) {
      var pic = r.photo_path ? '<img src="' + esc(B.url + "/storage/v1/object/public/gallery/" + r.photo_path.split("/").map(encodeURIComponent).join("/")) + '" alt="" width="120" height="120" loading="lazy">' : '<span class="ld-init" aria-hidden="true">' + esc(initials(r.name)) + "</span>";
      return '<article class="ld-card reveal in" style="--i:' + (i % 6) + '"><div class="ld-pic">' + pic + "</div><h3>" + esc(r.name) + '</h3><p class="ld-role">' + esc(pick(r.role)) + "</p>" + (pick(r.bio) ? "<p>" + esc(pick(r.bio)) + "</p>" : "") + "</article>";
    }).join("");
    $("#ld-empty").hidden = !(loaded && !rows.length);
  }
  U.init(function () {
    if (!B.url || !B.key) { loaded = true; return render(); }
    fetch(B.url + "/rest/v1/leaders?status=eq.published&select=name,role,bio,photo_path&order=sort.asc,created_at.asc&limit=60", { headers: { apikey: B.key } })
      .then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; })
      .then(function (d) { rows = d || []; loaded = true; render(); });
  });
  U.onLang(render);
})();
