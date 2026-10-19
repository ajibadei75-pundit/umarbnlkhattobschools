/* Public site behaviour shared by all pages: admissions contact links, count-up, card tilt, header shadow,
   Arabic word of the day. Nothing here stores or sends data. */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, $$ = U.$$, t = U.t, esc = U.esc;
  var ADM = (window.UBK_SITE || {}).admissions || {};

  /* Admissions links: every [data-adm="call|wa"] points to the admissions desk number. */
  function admissions() {
    $$("[data-adm]").forEach(function (a) {
      var k = a.getAttribute("data-adm");
      if (k === "call" && ADM.tel) a.href = "tel:" + ADM.tel;
      if (k === "wa" && ADM.whatsapp) { a.href = "https://wa.me/" + ADM.whatsapp + "?text=" + encodeURIComponent(t("adm.msg")); a.target = "_blank"; a.rel = "noopener"; }
    });
    $$("[data-adm-num]").forEach(function (n) { n.textContent = ADM.phone || ""; });
  }

  /* Header gets a soft shadow once the page is scrolled. */
  function header() {
    var h = $(".site-header"); if (!h) return;
    function f() { h.classList.toggle("is-scrolled", window.scrollY > 8); }
    window.addEventListener("scroll", f, { passive: true }); f();
  }

  /* Card tilt that follows the pointer (fine pointers only, never with reduced motion). */
  function tilt() {
    if (U.reduceMotion || !window.matchMedia("(hover:hover) and (pointer:fine)").matches) return;
    $$("[data-tilt]").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        el.style.transform = "perspective(700px) rotateX(" + (-y * 6).toFixed(2) + "deg) rotateY(" + (x * 6).toFixed(2) + "deg) translateY(-3px)";
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  }

  /* Arabic word of the day: simple everyday words, one per calendar day. Translations are drafts. */
  var WORDS = [
    ["كِتَاب", "kitāb", "book", "littafi"], ["قَلَم", "qalam", "pen", "alƙalami"], ["مَدْرَسَة", "madrasa", "school", "makaranta"],
    ["مُعَلِّم", "muʿallim", "teacher", "malami"], ["مَاء", "māʾ", "water", "ruwa"], ["شَمْس", "shams", "sun", "rana"],
    ["قَمَر", "qamar", "moon", "wata"], ["بَيْت", "bayt", "house", "gida"], ["سَلَام", "salām", "peace", "zaman lafiya"],
    ["عِلْم", "ʿilm", "knowledge", "ilimi"], ["نُور", "nūr", "light", "haske"], ["صَبَاح", "ṣabāḥ", "morning", "safiya"],
    ["بَاب", "bāb", "door", "ƙofa"], ["شَجَرَة", "shajara", "tree", "itace"], ["طَالِب", "ṭālib", "student", "ɗalibi"]
  ];
  function word() {
    var host = $("#wotd"); if (!host) return;
    var d = new Date(), n = Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)) / 864e5), w = WORDS[n % WORDS.length];
    function draw() {
      var lang = U.lang || document.documentElement.lang || "en", mean = lang === "ha" ? w[3] : w[2];
      var flipped = host.classList.contains("is-flipped");
      host.setAttribute("aria-pressed", String(flipped));
      $("#wotd-ar").textContent = w[0]; $("#wotd-tr").textContent = w[1];
      $("#wotd-mean").textContent = lang === "ar" ? w[0] : mean;
      $("#wotd-hint").textContent = t(flipped ? "hx.word.back" : "hx.word.tap");
    }
    host.addEventListener("click", function () { host.classList.toggle("is-flipped"); draw(); });
    draw(); U.onLang(draw);
  }

  /* Animated marquee: duplicate the track once so it loops without a gap. */
  function marquee() {
    $$(".hx-marq-track").forEach(function (tr) { tr.innerHTML += tr.innerHTML; tr.setAttribute("aria-hidden", "true"); });
  }

  U.init(function () { admissions(); header(); tilt(); word(); marquee(); });
  U.onLang(admissions);
})();
