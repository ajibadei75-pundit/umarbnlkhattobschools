/* News page: search, category filter, pinned and archived posts, "show more" paging, post dialog with print and share link. */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, $$ = U.$$, t = U.t, esc = U.esc, icon = U.icon;
  var PAGE = 6, shown = PAGE, cat = "all", q = "", arch = false, openId = null;
  var CATS = ["all", "notice", "exam", "holiday", "achievement", "activity", "general"];

  function base() { return U.news(arch); }
  function filtered() {
    return base().filter(function (n) {
      if (cat !== "all" && n.cat !== cat) return false;
      return !q || (n.title + " " + n.excerpt + " " + (n.body || []).join(" ")).toLowerCase().indexOf(q) > -1;
    });
  }
  function dateText(n) { return U.fmt(U.parseISO(n.date), { day: "numeric", month: "long", year: "numeric" }); }
  function badges(n) {
    return U.catBadge(n.cat) + (n.archived ? '<span class="draft-badge">' + esc(t("news.archived.tag")) + "</span>" : "") + (n.sample ? U.sampleBadge() : "");
  }
  function chips() {
    var all = base();
    $("#news-cats").innerHTML = CATS.map(function (c) {
      var n = c === "all" ? all.length : all.filter(function (x) { return x.cat === c; }).length;
      if (c !== "all" && !n) return "";
      return '<button type="button" class="chip" data-cat="' + c + '" aria-pressed="' + (c === cat) + '">' + esc(c === "all" ? t("filter.all") : t("cat." + c)) + '<span class="count">' + n + "</span></button>";
    }).join("");
    $$("#news-cats .chip").forEach(function (b) { b.addEventListener("click", function () { cat = b.getAttribute("data-cat"); shown = PAGE; render(); }); });
  }
  function render() {
    chips();
    var list = filtered(), vis = list.slice(0, shown);
    $("#news-grid").innerHTML = vis.map(function (n, i) {
      return '<article class="news-card reveal in' + (n.pinned ? " is-pinned" : "") + '" style="--i:' + (i % 3) + '"><div class="news-meta">' + badges(n) +
        (n.pinned ? '<span class="pin">' + icon("pin", 2) + esc(t("news.pinned")) + "</span>" : "") + "<span>" + esc(dateText(n)) + "</span></div>" +
        '<h3><a href="#post=' + esc(n.id) + '" data-id="' + esc(n.id) + '">' + esc(n.title) + "</a></h3><p>" + esc(n.excerpt) + '</p><span class="more link-arrow">' + esc(t("read.more")) + icon("arrow", 2) + "</span></article>";
    }).join("");
    $$("#news-grid h3 a").forEach(function (a) { a.addEventListener("click", function (e) { e.preventDefault(); openPost(a.getAttribute("data-id"), true); }); });
    $("#news-empty").hidden = list.length > 0;
    $("#news-count").textContent = list.length ? t("showing", { n: vis.length, m: list.length }) : "";
    var more = $("#news-more"); more.hidden = list.length <= shown;
    $("#news-sample").hidden = !base().some(function (n) { return n.sample; });
    if (openId) fillPost();
  }
  function fillPost() {
    var n = U.news(true).filter(function (x) { return x.id === openId; })[0]; if (!n) return;
    $("#post-meta").innerHTML = badges(n) + "<span>" + esc(t("post.published")) + ": " + esc(dateText(n)) + "</span>";
    $("#post-title").textContent = n.title;
    $("#post-body").innerHTML = n.body.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("");
  }
  function openPost(id, push) {
    var n = U.news(true).filter(function (x) { return x.id === id; })[0]; if (!n) return false;
    openId = id; fillPost(); U.openDialog($("#post-dlg"));
    if (push) { try { history.replaceState(null, "", "#post=" + id); } catch (e) {} }
    return true;
  }
  function fromHash() {
    var m = /post=([\w-]+)/.exec(location.hash);
    if (m && !openPost(m[1], false)) U.clearHash();
  }
  U.init(function () {
    var dlg = $("#post-dlg");
    U.dialog(dlg, function () { openId = null; U.clearHash(); });
    $("#post-dlg .x-btn").innerHTML = icon("close", 2);
    $("#news-q").addEventListener("input", function (e) { q = e.target.value.trim().toLowerCase(); shown = PAGE; render(); });
    $("#news-arch").addEventListener("change", function (e) { arch = e.target.checked; shown = PAGE; render(); });
    $("#news-more").addEventListener("click", function () { shown += PAGE; render(); });
    $("#post-print").addEventListener("click", function () {
      var n = U.news(true).filter(function (x) { return x.id === openId; })[0]; if (!n) return;
      U.printHTML("<h1>" + esc(n.title) + '</h1><p class="post-meta">' + esc(t("cat." + n.cat)) + " · " + esc(dateText(n)) + "</p>" + n.body.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "<p><small>" + esc(t("school")) + "</small></p>");
    });
    $("#post-copy").addEventListener("click", function () {
      var url = location.href.split("#")[0] + "#post=" + openId, l = $("#post-copy-l");
      U.copyText(url).then(function () { l.textContent = t("copied"); setTimeout(function () { l.textContent = t("copy.link"); }, 1600); }, function () { window.prompt(t("copy.link"), url); });
    });
    window.addEventListener("hashchange", fromHash);
  });
  U.onLang(function () { render(); });
  U.onLang(function once() { if (!once.d) { once.d = 1; fromHash(); } });
})();
