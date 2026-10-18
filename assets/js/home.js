/* Home page: module cards (live ones link to their page), learning filter,
   activity slideshow, latest news and upcoming events. */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, $$ = U.$$, t = U.t, esc = U.esc, icon = U.icon, root = document.documentElement;

  /* One entry per module, listed once, under the role that uses it. A card with `href` is a live page;
     the others stay unlinked and say "Planned" so nothing pretends to work before it is built.
     Row: { t: title, d: description, s: build section, lv: learning levels, ai: AI tool, href, tk/dk: i18n keys } */
  var CATALOGUE = {
    general: [
      { k: "grp.school", cards: [
        { t: "About the School", d: "Vision, mission, values, staff profiles and facilities.", href: "about.html", tk: "card.about.t", dk: "card.about.d" },
        { t: "Academics", d: "Nursery and primary programmes, Qur'anic studies and Arabic.", href: "academics.html", tk: "card.academics.t", dk: "card.academics.d" },
        { t: "Admissions", d: "Requirements, online application, document upload, reference number and status tracking.", href: "admissions.html", tk: "card.admissions.t", dk: "card.admissions.d" }
      ] },
      { k: "grp.join", cards: [
        { t: "News & Announcements", d: "Notices, exams, holidays and achievements.", href: "news.html", tk: "card.news.t", dk: "card.news.d" },
        { t: "Events & Calendar", d: "Calendar and list views of school events.", href: "events.html", tk: "card.events.t", dk: "card.events.d" },
        { t: "Contact & Support", d: "Contact form, school details and answers to common questions.", href: "contact.html", tk: "card.contact.t", dk: "card.contact.d" }
      ] }
    ],
    admin: [
      { k: "grp.ops", cards: [
        { t: "Overview", d: "Pending admissions, new receipts, approval requests, events and messages at a glance.", href: "admin.html#overview" },
        { t: "Website Content", d: "Add and edit news, events, FAQs and parent notices in English, Arabic and Hausa, with AI drafting help.", href: "admin.html#content" },
        { t: "Admissions Manager", d: "Review applications, view documents, record decisions and leave a message for the family.", href: "admin.html#admissions" },
        { t: "Users, Roles & Permissions", d: "Give staff access by role. Every change is recorded in an audit log.", href: "admin.html#staff" }
      ] },
      { k: "grp.fin", cards: [
        { t: "Financial Analysis", d: "Restricted analysis documents and approved resources.", s: "Section 6" },
        { t: "Financial Update", d: "Draft, review, publish and archive approved financial updates.", s: "Section 6" },
        { t: "Results & Report Sheets", d: "Set up classes and teachers, approve results, and print Nursery & Primary and J.S.S. report sheets.", href: "admin.html#results" },
        { t: "Receipt Approvals", d: "Review parent receipts and written requests, approve or reject with a note, and download the list.", href: "admin.html#payments" }
      ] }
    ],
    teacher: [
      { k: "grp.ai", cards: [
        { t: "Lesson Note AI", d: "Generate a structured lesson note from class, subject, topic and objectives. Review, edit and save before use.", href: "admin.html#aitools", ai: true },
        { t: "Exam Question Generator", d: "Draft exam questions with a marking scheme and answer key by class, subject, topic and difficulty. Teachers review before use.", href: "admin.html#aitools", ai: true }
      ] },
      { k: "grp.class", cards: [
        { t: "My Classes", d: "Enter scores and pupil details for your assigned classes, then submit them for printing.", href: "admin.html#myclasses" },
        { t: "Messages to Parents", d: "Class notices and replies, delivered only where a provider is configured.", s: "Section 8" }
      ] }
    ],
    parent: [
      { k: "grp.account", cards: [
        { t: "Secure Login & Recovery", d: "Sign in with the account created by the school office. Password resets are handled by the office.", href: "parent.html", tk: "card.parent_login.t", dk: "card.parent_login.d" },
        { t: "My Children", d: "See only the children verified and linked to your account.", href: "parent.html", tk: "card.parent_kids.t", dk: "card.parent_kids.d" },
        { t: "School Notices", d: "Notices from the school for all parents or for your child's level.", href: "parent.html", tk: "card.parent_notes.t", dk: "card.parent_notes.d" }
      ] },
      { k: "grp.pay", cards: [
        { t: "Submit Payment Receipt", d: "Upload a receipt as evidence. No online payment is taken here.", href: "parent.html" },
        { t: "Payment Approval Request", d: "Send a written request and track Waiting, Approved or Rejected.", href: "parent.html" },
        { t: "Children's Results", d: "View approved report sheets, or check a result with the Student ID.", href: "parent.html" }
      ] }
    ],
    learning: [
      { k: null, cards: [
        { t: "Kiddies' Videos", d: "Alphabet, numbers, colours, basic Arabic and age-appropriate Qur'anic learning.", s: "Section 9", lv: "nursery arabic" },
        { t: "Educational Games", d: "Letter, number, matching and Arabic letter-recognition games.", s: "Section 9", lv: "nursery primary arabic" },
        { t: "Learning Materials", d: "Worksheets, notes, revision packs and downloadable PDFs.", s: "Section 9", lv: "primary secondary arabic" },
        { t: "Quizzes & Activities", d: "Practice quizzes with instant feedback and optional progress tracking.", s: "Section 9", lv: "nursery primary secondary" }
      ] }
    ]
  };

  var firstRender = true, currentFilter = "all";
  function renderCards() {
    Object.keys(CATALOGUE).forEach(function (key) {
      var host = document.getElementById("groups-" + key);
      if (!host) return;
      host.innerHTML = "";
      CATALOGUE[key].forEach(function (g) {
        var wrap = document.createElement("div");
        wrap.className = "group";
        if (g.k) {
          var h = document.createElement("h3");
          h.className = "group-title reveal"; h.textContent = t(g.k);
          wrap.appendChild(h);
          if (firstRender) U.reveal(h); else h.classList.add("in");
        }
        var grid = document.createElement("div");
        grid.className = "grid";
        g.cards.forEach(function (m, i) {
          var c = document.createElement(m.href ? "a" : "article");
          c.className = "card reveal" + (m.ai ? " is-ai" : "") + (m.href ? " is-link" : "");
          if (m.href) c.setAttribute("href", m.href);
          c.style.setProperty("--i", i % 4);
          if (m.lv) c.setAttribute("data-levels", m.lv);
          c.innerHTML = (m.ai ? '<span class="tag-ai">AI</span>' : "") + "<h3></h3><p></p>" +
            (m.href ? '<span class="badge live"></span><span class="card-go">' + icon("arrow", 2) + "</span>" : '<span class="badge next"></span>');
          c.querySelector("h3").textContent = m.tk ? t(m.tk) : m.t;
          c.querySelector("p").textContent = m.dk ? t(m.dk) : m.d;
          c.querySelector(".badge").textContent = m.href ? t("status.built") : t("status.planned") + " · " + m.s;
          grid.appendChild(c);
          if (firstRender) U.reveal(c); else c.classList.add("in");
        });
        wrap.appendChild(grid);
        host.appendChild(wrap);
      });
    });
    firstRender = false;
    applyFilter(currentFilter, false);
  }

  /* ---------------- Learning filter ---------------- */
  function applyFilter(f, animate) {
    currentFilter = f;
    var k = 0;
    $$("#groups-learning .card").forEach(function (c) {
      var lv = (c.getAttribute("data-levels") || "").split(" ");
      var show = f === "all" || lv.indexOf(f) > -1;
      c.hidden = !show;
      if (show && animate) {
        c.classList.add("in"); c.style.setProperty("--j", k++);
        c.classList.remove("pop"); void c.offsetWidth; c.classList.add("pop");
      }
    });
    $$(".chip[data-filter]").forEach(function (c) { c.setAttribute("aria-pressed", String(c.getAttribute("data-filter") === f)); });
  }

  /* ---------------- Latest news and upcoming events ---------------- */
  function renderFeed() {
    var nl = $("#home-news"), el = $("#home-events");
    if (nl) {
      var news = U.news(false).slice(0, 3);
      nl.innerHTML = news.length ? news.map(function (n) {
        return '<li><a href="news.html#post=' + esc(n.id) + '"><span class="m-top">' + U.catBadge(n.cat) + (n.sample ? U.sampleBadge() : "") + "</span><strong>" + esc(n.title) + "</strong><time>" +
          esc(U.fmt(U.parseISO(n.date), { day: "numeric", month: "short", year: "numeric" })) + "</time></a></li>";
      }).join("") : '<li class="m-sub">' + esc(t("upd.none.news")) + "</li>";
    }
    if (el) {
      var evs = U.upcoming().slice(0, 3);
      el.innerHTML = evs.length ? evs.map(function (e) {
        var w = U.eventWhen(e);
        return '<li><a class="mini-ev" href="events.html#event=' + esc(e.id) + '"><span class="date-box" aria-hidden="true"><b>' + e.s.getDate() + "</b><span>" + esc(U.fmt(e.s, { month: "short" })) + "</span></span><span><strong>" + esc(e.title) +
          '</strong><span class="m-sub" style="display:block">' + esc(w.time || w.date) + "</span></span></a></li>";
      }).join("") : '<li class="m-sub">' + esc(t("upd.none.events")) + "</li>";
    }
  }

  /* ---------------- Activity slideshow ---------------- */
  var ACTS = [{ id: "morning" }, { id: "quran" }, { id: "sports" }, { id: "arabic" }, { id: "nursery" }, { id: "evening" }];
  var DUR = 6500, actIdx = 0, userPaused = U.reduceMotion, hoverBar = false, focusBar = false, hero;

  function ensure(i) {
    var a = ACTS[(i + ACTS.length) % ACTS.length];
    if (!a.loaded) { a.img.style.backgroundImage = U.actBg(a.id); a.loaded = true; }
  }
  function go(i) {
    i = (i + ACTS.length) % ACTS.length;
    ensure(i); ensure(i + 1);
    ACTS.forEach(function (a, k) {
      var on = k === i;
      a.el.classList.toggle("active", on);
      a.tab.setAttribute("aria-selected", String(on));
      a.tab.tabIndex = on ? 0 : -1;
    });
    actIdx = i;
    var tab = ACTS[i].tab, list = tab.parentNode;
    if (list.scrollWidth > list.clientWidth) list.scrollTo({ left: tab.offsetLeft - 16, behavior: U.reduceMotion ? "auto" : "smooth" });
    updateActivityText();
  }
  function updateActivityText() {
    ACTS.forEach(function (a) { $(".tab-label", a.tab).textContent = t("act." + a.id); });
    $("#act-title").textContent = t("act." + ACTS[actIdx].id);
    $("#act-desc").textContent = t("act." + ACTS[actIdx].id + ".d");
    applyPause();
  }
  function applyPause() {
    var paused = userPaused || hoverBar || focusBar || document.hidden;
    hero.classList.toggle("is-paused", paused);
    var btn = $("#act-toggle");
    btn.innerHTML = icon(userPaused ? "play" : "pause", 2);
    btn.setAttribute("aria-label", t(userPaused ? "act.play" : "act.pause"));
    btn.title = t(userPaused ? "act.play" : "act.pause");
    $("#act-caption").setAttribute("aria-live", userPaused ? "polite" : "off");
  }
  function initHero() {
    hero = $("#home");
    var slides = $("#hero-slides"), tabs = $("#act-tabs");
    ACTS.forEach(function (a, i) {
      var s = document.createElement("div"); s.className = "slide";
      var im = document.createElement("div"); im.className = "slide-img"; s.appendChild(im); slides.appendChild(s);
      a.el = s; a.img = im;
      var b = document.createElement("button");
      b.type = "button"; b.className = "tab"; b.setAttribute("role", "tab");
      b.innerHTML = '<span class="tab-label"></span><span class="bar" aria-hidden="true"></span>';
      b.addEventListener("click", function () { go(i); });
      b.addEventListener("keydown", function (e) {
        var d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!d) return;
        if (root.dir === "rtl") d = -d;
        e.preventDefault(); go(actIdx + d); ACTS[actIdx].tab.focus();
      });
      tabs.appendChild(b); a.tab = b;
    });
    hero.style.setProperty("--dur", DUR + "ms");
    $("#act-prev").innerHTML = icon("prev", 2); $("#act-next").innerHTML = icon("next", 2);
    $("#act-prev").addEventListener("click", function () { go(actIdx - 1); });
    $("#act-next").addEventListener("click", function () { go(actIdx + 1); });
    $("#act-toggle").addEventListener("click", function () { userPaused = !userPaused; applyPause(); });
    /* the progress bar on the active tab drives auto-advance */
    tabs.addEventListener("animationend", function (e) { if (e.animationName === "fill") go(actIdx + 1); });
    var bar = $("#act-bar");
    bar.addEventListener("mouseenter", function () { hoverBar = true; applyPause(); });
    bar.addEventListener("mouseleave", function () { hoverBar = false; applyPause(); });
    bar.addEventListener("focusin", function () { focusBar = true; applyPause(); });
    bar.addEventListener("focusout", function () { focusBar = false; applyPause(); });
    document.addEventListener("visibilitychange", applyPause);
    var x0 = null;
    hero.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    hero.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 60) go(actIdx + (dx < 0 ? 1 : -1) * (root.dir === "rtl" ? -1 : 1));
    }, { passive: true });
    go(0);
  }

  U.init(function () {
    $$(".chip[data-filter]").forEach(function (c) { c.addEventListener("click", function () { applyFilter(c.getAttribute("data-filter"), true); }); });
    initHero();
  });
  U.onLang(function () { renderCards(); renderFeed(); updateActivityText(); });
})();
