/* About page: content cards from the shared data, sticky section tabs with scroll-spy, gallery lightbox. */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, $$ = U.$$, t = U.t, esc = U.esc, icon = U.icon;
  var D = U.data().about, PICS = U.data().gallery, cur = 0;

  function panel(ic, title, text, cls) {
    return '<article class="panel reveal in ' + (cls || "") + '"><h3><span class="p-ico">' + icon(ic) + "</span>" + esc(title) + U.draftBadge() + "</h3><p>" + esc(text) + "</p></article>";
  }
  function render() {
    $("#vm-cards").innerHTML = panel("star", t("about.vision"), D.vision) + panel("book", t("about.mission"), D.mission);
    $("#values-cards").innerHTML = D.values.map(function (v) {
      return '<article class="panel value-card reveal in"><span class="p-ico">' + icon(v.icon) + "</span><h3>" + esc(v.t) + "</h3><p>" + esc(v.d) + "</p></article>";
    }).join("");
    $("#values-badge").innerHTML = U.draftBadge();
    $("#approach-cards").innerHTML = panel("heart", t("about.philosophy"), D.philosophy) + panel("moon", t("about.quranic"), D.quranic);
    $("#about-sample-note").textContent = t("draft.note");
    $("#gallery-grid").innerHTML = PICS.map(function (id, i) {
      return '<button type="button" class="shot reveal in" data-i="' + i + '" aria-label="' + esc(t("act." + id)) + '"><span class="pic" style="background-image:' + esc(U.actBg(id)) + '"></span><span class="cap">' + esc(t("act." + id)) + "</span></button>";
    }).join("");
    $$("#gallery-grid .shot").forEach(function (b) { b.addEventListener("click", function () { openBox(+b.getAttribute("data-i"), b); }); });
    $("#lb-prev").innerHTML = icon("prev", 2); $("#lb-next").innerHTML = icon("next", 2); $("#lightbox .round[data-close]").innerHTML = icon("close", 2);
    if ($("#lightbox").open) show(cur);
  }
  var opener = null;
  function show(i) {
    cur = (i + PICS.length) % PICS.length;
    var id = PICS[cur];
    $("#lb-pic").style.backgroundImage = U.actBg(id);
    $("#lb-pic").setAttribute("aria-label", t("act." + id));
    $("#lb-cap").textContent = t("act." + id) + ": " + t("act." + id + ".d");
  }
  function openBox(i, from) { opener = from; show(i); U.openDialog($("#lightbox")); $("#lb-next").focus(); }
  function spy() {
    var links = $$("#subnav a"), secs = links.map(function (a) { return $(a.getAttribute("href")); });
    function mark(id) { links.forEach(function (a) { a.setAttribute("aria-current", String(a.getAttribute("href") === "#" + id)); }); }
    if (!("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) mark(x.target.id); }); }, { rootMargin: "-30% 0px -60% 0px" });
    secs.forEach(function (s) { if (s) io.observe(s); });
    links.forEach(function (a) {
      a.addEventListener("click", function (e) {
        var s = $(a.getAttribute("href")); if (!s) return;
        e.preventDefault(); s.scrollIntoView({ behavior: U.reduceMotion ? "auto" : "smooth", block: "start" });
        try { history.replaceState(null, "", a.getAttribute("href")); } catch (x) {}
        mark(s.id); a.scrollIntoView({ block: "nearest", inline: "center" });
      });
    });
  }
  U.init(function () {
    var dlg = $("#lightbox");
    U.dialog(dlg, function () { if (opener) opener.focus(); });
    $("#lb-prev").addEventListener("click", function () { show(cur - 1); });
    $("#lb-next").addEventListener("click", function () { show(cur + 1); });
    dlg.addEventListener("keydown", function (e) {
      var d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!d) return;
      if (document.documentElement.dir === "rtl") d = -d;
      e.preventDefault(); show(cur + d);
    });
    spy();
  });
  U.onLang(render);
})();
