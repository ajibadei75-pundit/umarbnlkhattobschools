/* Learning Centre (public). Reads only PUBLISHED items from the school's database. Nothing is invented: if the school has
   published nothing yet, the page says so. Games are built in (letters and numbers); videos are links (no video is hosted here);
   materials are files or links; quizzes run in the browser with instant feedback. No pupil data is collected or stored. */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, $$ = U.$$, t = U.t, esc = U.esc, icon = U.icon;
  var B = (window.UBK_SITE || {}).backend || {};
  var items = [], loaded = false, failed = false, kind = "all", level = "all", q = "";
  var KINDS = ["all", "video", "material", "quiz", "game"], LEVELS = ["all", "nursery", "primary", "secondary", "arabic"];

  /* ---------- built-in games ---------- */
  var AR = [["أ", "Alif"], ["ب", "Baa"], ["ت", "Taa"], ["ث", "Thaa"], ["ج", "Jeem"], ["ح", "Haa"], ["خ", "Khaa"], ["د", "Daal"], ["ذ", "Dhaal"], ["ر", "Raa"], ["ز", "Zay"], ["س", "Seen"], ["ش", "Sheen"], ["ص", "Saad"], ["ض", "Daad"], ["ط", "Taa (heavy)"], ["ظ", "Zaa"], ["ع", "Ayn"], ["غ", "Ghayn"], ["ف", "Faa"], ["ق", "Qaaf"], ["ك", "Kaaf"], ["ل", "Laam"], ["م", "Meem"], ["ن", "Noon"], ["ه", "Haa (light)"], ["و", "Waaw"], ["ي", "Yaa"]];
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function choices(correct, pool, n) { var o = shuffle(pool.filter(function (x) { return x !== correct; })).slice(0, n - 1); o.push(correct); return shuffle(o); }
  function gameLetters() {
    return shuffle(AR).slice(0, 10).map(function (p) { var names = AR.map(function (x) { return x[1]; }), o = choices(p[1], names, 4); return { big: p[0], bigAr: true, q: t("lc.which.letter"), options: o, answer: o.indexOf(p[1]) }; });
  }
  function gameCount() {
    var qs = []; for (var i = 0; i < 10; i++) { var n = 1 + Math.floor(Math.random() * 10), nums = []; for (var k = 1; k <= 12; k++) nums.push(String(k)); var o = choices(String(n), nums, 4); qs.push({ dots: n, q: t("lc.how.many"), options: o, answer: o.indexOf(String(n)) }); }
    return qs;
  }
  function gameAlpha() {
    var L = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    return shuffle(L).slice(0, 10).map(function (c) { var o = choices(c.toLowerCase(), L.map(function (x) { return x.toLowerCase(); }), 4); return { big: c, q: t("lc.which.lower"), options: o, answer: o.indexOf(c.toLowerCase()) }; });
  }
  var GAMES = [
    { id: "letters", tk: "lc.g.letters", dk: "lc.g.letters.d", levels: ["nursery", "primary", "arabic"], make: gameLetters },
    { id: "count", tk: "lc.g.count", dk: "lc.g.count.d", levels: ["nursery", "primary"], make: gameCount },
    { id: "alpha", tk: "lc.g.alpha", dk: "lc.g.alpha.d", levels: ["nursery", "primary"], make: gameAlpha }
  ];

  /* ---------- data ---------- */
  function pick(o) { if (!o) return ""; var l = document.documentElement.lang; return o[l] || o.en || ""; }
  function load() {
    if (!B.url || !B.key) { loaded = true; failed = true; return render(); }
    fetch(B.url + "/rest/v1/learning_items?status=eq.published&select=id,kind,title,description,levels,subject,url,file_path,quiz&order=created_at.desc&limit=500", { headers: { apikey: B.key } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (rows) { items = rows; loaded = true; render(); }, function () { loaded = true; failed = true; render(); });
  }
  function fileUrl(p) { return B.url + "/storage/v1/object/public/learning/" + p.split("/").map(encodeURIComponent).join("/"); }

  /* ---------- list ---------- */
  function all() {
    var list = items.map(function (x) { return { src: x, id: x.id, kind: x.kind, title: pick(x.title), desc: pick(x.description), levels: x.levels || [], subject: x.subject || "" }; });
    GAMES.forEach(function (g) { list.push({ game: g, id: "game-" + g.id, kind: "game", title: t(g.tk), desc: t(g.dk), levels: g.levels, subject: "" }); });
    return list;
  }
  function filtered() {
    return all().filter(function (x) {
      if (kind !== "all" && x.kind !== kind) return false;
      if (level !== "all" && x.levels.length && x.levels.indexOf(level) < 0) return false;
      return !q || (x.title + " " + x.desc + " " + x.subject).toLowerCase().indexOf(q) > -1;
    });
  }
  function render() {
    var base = all();
    $("#lc-kinds").innerHTML = KINDS.map(function (k) { var n = k === "all" ? base.length : base.filter(function (x) { return x.kind === k; }).length; return '<button type="button" role="tab" data-k="' + k + '" aria-selected="' + (k === kind) + '">' + esc(t("lc.k." + k)) + " (" + n + ")</button>"; }).join("");
    $("#lc-levels").innerHTML = LEVELS.map(function (l) { return '<button type="button" class="chip" data-l="' + l + '" aria-pressed="' + (l === level) + '">' + esc(t("lc.l." + l)) + "</button>"; }).join("");
    $$("#lc-kinds button").forEach(function (b) { b.addEventListener("click", function () { kind = b.getAttribute("data-k"); render(); }); });
    $$("#lc-levels .chip").forEach(function (b) { b.addEventListener("click", function () { level = b.getAttribute("data-l"); render(); }); });
    var list = filtered();
    $("#lc-grid").innerHTML = list.map(function (x, i) {
      var act = x.kind === "video" ? t("lc.watch") : x.kind === "material" ? t("lc.open") : x.kind === "quiz" ? t("lc.start") : t("lc.play");
      var ic = { video: "arrow", material: "download", quiz: "list", game: "star" }[x.kind] || "book";
      return '<article class="news-card reveal in" style="--i:' + (i % 3) + '"><div class="news-meta"><span class="cat-badge">' + esc(t("lc.k." + x.kind)) + "</span>" + x.levels.map(function (l) { return "<span>" + esc(t("lc.l." + l)) + "</span>"; }).join("") + (x.subject ? "<span>" + esc(x.subject) + "</span>" : "") + "</div>" +
        "<h3>" + esc(x.title) + "</h3>" + (x.desc ? "<p>" + esc(x.desc) + "</p>" : "") + '<p style="margin-top:auto"><button type="button" class="btn btn-primary btn-sm" data-go="' + esc(x.id) + '">' + (icon ? icon(ic, 2) : "") + "<span>" + esc(act) + "</span></button></p></article>";
    }).join("");
    $$("[data-go]").forEach(function (b) { b.addEventListener("click", function () { var x = list.filter(function (y) { return y.id === b.getAttribute("data-go"); })[0]; if (x) openItem(x); }); });
    var real = items.length;
    $("#lc-empty").hidden = list.length > 0 || failed;
    $("#lc-count").textContent = failed ? t("lc.err") : list.length ? t("lc.count", { n: list.length, m: base.length }) : "";
    if (loaded && !real && !failed && kind !== "game" && kind === "all") $("#lc-empty").hidden = true;
  }

  /* ---------- dialogs ---------- */
  function dlg(title, meta, html) { $("#lc-dt").textContent = title; $("#lc-dm").innerHTML = meta || ""; $("#lc-db").innerHTML = html; U.openDialog($("#lc-dlg")); }
  function embed(url) {
    var m = /^https:\/\/(?:www\.)?youtube\.com\/watch\?v=([\w-]{6,20})/.exec(url) || /^https:\/\/youtu\.be\/([\w-]{6,20})/.exec(url), v = /^https:\/\/(?:www\.)?vimeo\.com\/(\d+)/.exec(url);
    if (m) return "https://www.youtube-nocookie.com/embed/" + m[1];
    if (v) return "https://player.vimeo.com/video/" + v[1];
    return "";
  }
  function openItem(x) {
    if (x.kind === "video") {
      var e = embed(x.src.url);
      dlg(x.title, '<span class="cat-badge">' + esc(t("lc.k.video")) + "</span>", (e ? '<div class="lc-video"><iframe src="' + esc(e) + '" title="' + esc(x.title) + '" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>' : "") + (x.desc ? "<p>" + esc(x.desc) + "</p>" : "") + '<p><a class="btn btn-soft btn-sm" href="' + esc(x.src.url) + '" target="_blank" rel="noopener noreferrer">' + esc(t("lc.novideo")) + "</a></p>");
    } else if (x.kind === "material") {
      var href = x.src.file_path ? fileUrl(x.src.file_path) : x.src.url;
      dlg(x.title, '<span class="cat-badge">' + esc(t("lc.k.material")) + "</span>", (x.desc ? "<p>" + esc(x.desc) + "</p>" : "") + '<p><a class="btn btn-primary" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + esc(t("lc.open")) + "</a></p>");
    } else if (x.kind === "quiz") play(x.title, normalise(x.src.quiz), '<span class="cat-badge">' + esc(t("lc.k.quiz")) + "</span>");
    else play(x.title, x.game.make(), '<span class="cat-badge">' + esc(t("lc.k.game")) + "</span>");
  }
  function normalise(qz) {
    return (qz || []).filter(function (z) { return z && z.q && Array.isArray(z.options) && z.options.length > 1 && z.answer >= 0 && z.answer < z.options.length; }).map(function (z) { return { q: String(z.q), options: z.options.map(String), answer: +z.answer, explain: z.explain ? String(z.explain) : "" }; });
  }

  /* ---------- quiz / game player (instant feedback, nothing stored) ---------- */
  function play(title, qs, meta) {
    var i = 0, score = 0, done = false;
    function show() {
      if (i >= qs.length) return end();
      var z = qs[i], answered = false;
      var visual = z.big ? '<div class="lc-big"' + (z.bigAr ? ' lang="ar" dir="rtl"' : "") + ">" + esc(z.big) + "</div>" : z.dots ? '<div class="lc-dots" role="img" aria-label="' + z.dots + '">' + new Array(z.dots + 1).join('<i></i>') + "</div>" : "";
      $("#lc-db").innerHTML = '<p class="count-line">' + esc(t("lc.q")) + " " + (i + 1) + " " + esc(t("lc.of")) + " " + qs.length + '</p><div class="rw-meter" aria-hidden="true"><span style="width:' + Math.round(i / qs.length * 100) + '%"></span></div>' + visual +
        '<p class="lc-q" id="lc-qq">' + esc(z.q) + '</p><div class="lc-opts" role="group" aria-labelledby="lc-qq">' + z.options.map(function (o, k) { return '<button type="button" class="btn btn-soft lc-opt" data-o="' + k + '">' + esc(o) + "</button>"; }).join("") + '</div><p class="lc-fb" id="lc-fb" role="status" aria-live="polite"></p><p><button type="button" class="btn btn-primary" id="lc-next" hidden>' + esc(i === qs.length - 1 ? t("lc.finish") : t("lc.next")) + "</button></p>";
      $$(".lc-opt").forEach(function (b) {
        b.addEventListener("click", function () {
          if (answered) return; answered = true; var k = +b.getAttribute("data-o"), ok = k === z.answer; if (ok) score++;
          $$(".lc-opt").forEach(function (x) { x.disabled = true; var n = +x.getAttribute("data-o"); if (n === z.answer) x.classList.add("is-right"); else if (n === k) x.classList.add("is-wrong"); });
          $("#lc-fb").textContent = ok ? t("lc.correct") : t("lc.wrong") + " " + t("lc.answer") + " " + z.options[z.answer] + "." + (z.explain ? " " + z.explain : "");
          $("#lc-fb").className = "lc-fb " + (ok ? "ok" : "bad"); var nx = $("#lc-next"); nx.hidden = false; nx.focus();
        });
      });
      $("#lc-next").addEventListener("click", function () { i++; show(); });
    }
    function end() {
      done = true;
      $("#lc-db").innerHTML = '<p class="lc-q">' + esc(t("lc.score", { s: score, n: qs.length })) + '</p><div class="rw-meter" aria-hidden="true"><span style="width:' + Math.round(score / qs.length * 100) + '%"></span></div><p><button type="button" class="btn btn-primary" id="lc-again">' + esc(t("lc.again")) + '</button> <button type="button" class="btn btn-soft" data-close>' + esc(t("lc.close")) + "</button></p>";
      $("#lc-again").addEventListener("click", function () { i = 0; score = 0; done = false; qs = qs.some(function (z) { return z.big || z.dots; }) ? qs : shuffle(qs); show(); });
    }
    if (!qs.length) { dlg(title, meta, "<p>" + esc(t("lc.err")) + "</p>"); return; }
    dlg(title, meta, ""); show();
  }

  U.init(function () {
    $("#lc-q").addEventListener("input", function () { q = this.value.trim().toLowerCase(); render(); });
    render(); load(); U.onLang(render);
  });
})();
