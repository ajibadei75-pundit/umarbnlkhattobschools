/* Public gallery. Shows the photos the school has published (table gallery_items, public bucket "gallery").
   Until there are published photos it shows the built-in illustrations and says so. */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, $$ = U.$$, t = U.t, esc = U.esc;
  var B = (window.UBK_SITE || {}).backend || {};
  var CATS = ["morning", "quran", "sports", "arabic", "nursery", "evening", "events", "other"];
  var ILLUS = ["morning", "quran", "sports", "arabic", "nursery", "evening"];
  var photos = [], loaded = false, cat = "all", list = [], cur = 0, opener = null;

  function url(p) { return B.url + "/storage/v1/object/public/gallery/" + p.split("/").map(encodeURIComponent).join("/"); }
  function cap(it) { var l = document.documentElement.lang; return (it.caption && (it.caption[l] || it.caption.en)) || ""; }
  function items() {
    if (photos.length) return photos.map(function (x) { return { cat: x.category, cap: cap(x), bg: "url(" + url(x.file_path) + ")", photo: true }; });
    return ILLUS.map(function (id) { return { cat: id, cap: t("act." + id), bg: U.actBg(id), photo: false }; });
  }
  function render() {
    var all = items(), usedCats = CATS.filter(function (c) { return all.some(function (i) { return i.cat === c; }); });
    if (cat !== "all" && usedCats.indexOf(cat) < 0) cat = "all";
    $("#gl-tabs").innerHTML = ["all"].concat(usedCats).map(function (c) {
      return '<button type="button" role="tab" data-c="' + c + '" aria-selected="' + (c === cat) + '">' + esc(c === "all" ? t("filter.all") : t("gal.c." + c)) + "</button>";
    }).join("");
    $$("#gl-tabs button").forEach(function (b) { b.addEventListener("click", function () { cat = b.getAttribute("data-c"); render(); }); });
    $("#gl-note").hidden = photos.length > 0 || !loaded;
    list = all.filter(function (i) { return cat === "all" || i.cat === cat; });
    $("#gl-grid").innerHTML = list.map(function (i, n) {
      return '<button type="button" class="gl-tile reveal in" style="--i:' + (n % 6) + ';background-image:' + esc(i.bg) + '" data-n="' + n + '" aria-label="' + esc(i.cap) + '"><span class="gl-cap">' + esc(i.cap) + "</span></button>";
    }).join("");
    $$(".gl-tile").forEach(function (b) { b.addEventListener("click", function () { open(+b.getAttribute("data-n"), b); }); });
  }
  function show(i) {
    cur = (i + list.length) % list.length; var it = list[cur];
    $("#lb-pic").style.backgroundImage = it.bg; $("#lb-pic").setAttribute("aria-label", it.cap); $("#lb-cap").textContent = it.cap;
  }
  function open(i, from) { opener = from; show(i); U.openDialog($("#lightbox")); $("#lb-next").focus(); }

  function load() {
    if (!B.url || !B.key) { loaded = true; return render(); }
    fetch(B.url + "/rest/v1/gallery_items?status=eq.published&select=category,caption,file_path&order=sort.asc,created_at.desc&limit=200", { headers: { apikey: B.key } })
      .then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; })
      .then(function (rows) { photos = rows || []; loaded = true; render(); });
  }
  U.init(function () {
    var dlg = $("#lightbox");
    U.dialog(dlg, function () { if (opener) opener.focus(); });
    $("#lb-prev").addEventListener("click", function () { show(cur - 1); });
    $("#lb-next").addEventListener("click", function () { show(cur + 1); });
    dlg.addEventListener("keydown", function (e) { var d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!d) return; if (document.documentElement.dir === "rtl") d = -d; e.preventDefault(); show(cur + d); });
    $("#lb-prev").innerHTML = U.icon("prev", 2); $("#lb-next").innerHTML = U.icon("next", 2); $("#lightbox .round[data-close]").innerHTML = U.icon("close", 2);
    render(); load();
  });
  U.onLang(render);
})();
