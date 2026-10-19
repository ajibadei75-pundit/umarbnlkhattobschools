/* Events page: month calendar (keyboard navigable) and list view, category filter, day/event dialog,
   .ics export for one event or all, printable calendar, deep link #event=ID. */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, $$ = U.$$, t = U.t, esc = U.esc, icon = U.icon;
  var CATS = ["all", "meeting", "exam", "holiday", "recitation", "activity", "general"];
  var narrow = window.matchMedia && window.matchMedia("(max-width: 720px)").matches;
  var view = U.store.get("ubk-ev-view", narrow ? "list" : "calendar"), cat = "all", past = false;
  var cursor = U.today(), focusDay = null, opener = null;
  cursor.setDate(1);

  function all() { return U.events(); }
  function matching() { return all().filter(function (e) { return cat === "all" || e.cat === cat; }); }
  function onDay(e, iso) { return U.toISO(e.s) <= iso && iso <= U.toISO(e.e); }
  function range(e) { var w = U.eventWhen(e); return w.date + (w.time ? ", " + w.time : ""); }
  function plain(e) { return [e.title, range(e), t("ev.where") + ": " + (e.location || t("con.tbc")), e.description || ""].filter(Boolean).join("\n"); }

  /* ---------- .ics ---------- */
  function esc2(s) { return String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n"); }
  function d8(s) { return s.replace(/-/g, ""); }
  function p2(n) { return n < 10 ? "0" + n : "" + n; }
  function vevent(e, stamp) {
    var L = ["BEGIN:VEVENT", "UID:" + e.id + "@umar-khattob-school.invalid", "DTSTAMP:" + stamp];
    var multi = e.start !== (e.end || e.start);
    if (e.time && !multi) {
      var end = e.endTime || (p2(Math.min(+e.time.split(":")[0] + 1, 23)) + ":" + e.time.split(":")[1]);
      L.push("DTSTART:" + d8(e.start) + "T" + e.time.replace(":", "") + "00", "DTEND:" + d8(e.start) + "T" + end.replace(":", "") + "00");
    } else {
      var d = new Date(e.e.getTime()); d.setDate(d.getDate() + 1);
      L.push("DTSTART;VALUE=DATE:" + d8(e.start), "DTEND;VALUE=DATE:" + d8(U.toISO(d)));
    }
    L.push("SUMMARY:" + esc2(e.title), "DESCRIPTION:" + esc2(e.description), "LOCATION:" + esc2(e.location), "END:VEVENT");
    return L;
  }
  function ics(list) {
    var n = new Date(), stamp = n.getUTCFullYear() + p2(n.getUTCMonth() + 1) + p2(n.getUTCDate()) + "T" + p2(n.getUTCHours()) + p2(n.getUTCMinutes()) + p2(n.getUTCSeconds()) + "Z";
    var L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Umar BN L Khattob School//Website//EN", "CALSCALE:GREGORIAN"];
    list.forEach(function (e) { L = L.concat(vevent(e, stamp)); });
    L.push("END:VCALENDAR"); return L.join("\r\n") + "\r\n";
  }

  /* ---------- filters ---------- */
  function chips() {
    var base = all();
    $("#ev-cats").innerHTML = CATS.map(function (c) {
      var n = c === "all" ? base.length : base.filter(function (e) { return e.cat === c; }).length;
      if (c !== "all" && !n) return "";
      return '<button type="button" class="chip" data-cat="' + c + '" aria-pressed="' + (c === cat) + '">' + esc(c === "all" ? t("filter.all") : t("cat." + c)) + '<span class="count">' + n + "</span></button>";
    }).join("");
    $$("#ev-cats .chip").forEach(function (b) { b.addEventListener("click", function () { cat = b.getAttribute("data-cat"); render(); }); });
    $("#cal-legend").innerHTML = CATS.slice(1).map(function (c) { return '<span><i style="--cc:var(--c-' + c + ')"></i>' + esc(t("cat." + c)) + "</span>"; }).join("");
  }

  /* ---------- calendar ---------- */
  function monthDays() {
    var first = new Date(cursor.getFullYear(), cursor.getMonth(), 1), lead = (first.getDay() + 6) % 7, out = [];
    var n = Math.ceil((lead + new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()) / 7) * 7;
    for (var i = 0; i < n; i++) out.push(new Date(first.getFullYear(), first.getMonth(), 1 - lead + i));
    return out;
  }
  function renderCal() {
    $("#cal-title").textContent = U.fmt(cursor, { month: "long", year: "numeric" });
    $("#cal").setAttribute("aria-label", t("ev.cal.of", { m: U.fmt(cursor, { month: "long", year: "numeric" }) }));
    var days = monthDays(), evs = matching(), td = U.toISO(U.today());
    if (!focusDay || !days.some(function (d) { return U.toISO(d) === focusDay; })) {
      var inMonth = days.filter(function (d) { return d.getMonth() === cursor.getMonth(); });
      focusDay = U.toISO(inMonth.filter(function (d) { return U.toISO(d) === td; })[0] || inMonth[0]);
    }
    var h = '<div class="cal-dow" role="row">';
    for (var k = 0; k < 7; k++) h += '<div role="columnheader">' + esc(U.fmt(new Date(2024, 0, 1 + k), { weekday: "short" })) + "</div>";
    h += "</div>";
    for (var r = 0; r < days.length / 7; r++) {
      h += '<div class="cal-row" role="row">';
      days.slice(r * 7, r * 7 + 7).forEach(function (d) {
        var iso = U.toISO(d), de = evs.filter(function (e) { return onDay(e, iso); });
        var label = U.fmt(d, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + (de.length ? ". " + de.map(function (e) { return e.title; }).join(", ") : "");
        h += '<button type="button" role="gridcell" class="cal-cell' + (d.getMonth() !== cursor.getMonth() ? " out" : "") + (iso === td ? " today" : "") + '" data-d="' + iso + '" tabindex="' + (iso === focusDay ? 0 : -1) + '" aria-label="' + esc(label) + '"' + (iso === td ? ' aria-current="date"' : "") + '><span class="dn">' + d.getDate() + "</span>";
        de.slice(0, 2).forEach(function (e) { h += '<span class="ev-chip" style="--cc:var(--c-' + esc(e.cat) + ')">' + esc(e.title) + "</span>"; });
        if (de.length > 2) h += '<span class="ev-more">' + esc(t("ev.more", { n: de.length - 2 })) + "</span>";
        if (de.length) h += '<span class="ev-dots">' + de.map(function (e) { return '<i style="--cc:var(--c-' + esc(e.cat) + ')"></i>'; }).join("") + "</span>";
        h += "</button>";
      });
      h += "</div>";
    }
    $("#cal").innerHTML = h;
    $$(".cal-cell").forEach(function (c) {
      c.addEventListener("click", function () { focusDay = c.getAttribute("data-d"); openDay(focusDay, c); });
      c.addEventListener("keydown", calKey);
    });
  }
  function shiftDay(iso, n) { var d = U.parseISO(iso); d.setDate(d.getDate() + n); return d; }
  function calKey(e) {
    var step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7 }[e.key], rtl = document.documentElement.dir === "rtl";
    var cur = e.currentTarget.getAttribute("data-d"), target = null;
    if (step) { if (rtl && Math.abs(step) === 1) step = -step; target = shiftDay(cur, step); }
    else if (e.key === "Home") target = shiftDay(cur, -((U.parseISO(cur).getDay() + 6) % 7));
    else if (e.key === "End") target = shiftDay(cur, 6 - ((U.parseISO(cur).getDay() + 6) % 7));
    else if (e.key === "PageDown" || e.key === "PageUp") { target = U.parseISO(cur); target.setMonth(target.getMonth() + (e.key === "PageDown" ? 1 : -1)); }
    if (!target) return;
    e.preventDefault(); focusDay = U.toISO(target);
    if (target.getMonth() !== cursor.getMonth() || target.getFullYear() !== cursor.getFullYear()) cursor = new Date(target.getFullYear(), target.getMonth(), 1);
    renderCal(); var el = $('.cal-cell[data-d="' + focusDay + '"]'); if (el) el.focus();
  }

  /* ---------- list ---------- */
  function renderList() {
    var td = U.today(), list = matching().filter(function (e) { return past || e.e >= td; });
    var h = "", month = "";
    list.forEach(function (e) {
      var m = U.fmt(e.s, { month: "long", year: "numeric" });
      if (m !== month) { month = m; h += '<h3 class="ev-month">' + esc(m) + "</h3>"; }
      var w = U.eventWhen(e);
      h += '<article class="ev-row' + (e.e < td ? " is-past" : "") + '" id="ev-' + esc(e.id) + '"><div class="date-box" aria-hidden="true"><b>' + e.s.getDate() + "</b><span>" + esc(U.fmt(e.s, { month: "short" })) + "</span></div><div>" +
        '<div class="news-meta" style="margin-bottom:.35rem">' + U.catBadge(e.cat) + (e.sample ? U.sampleBadge() : "") + "</div><h3>" + esc(e.title) + '</h3><div class="ev-sub"><span>' + icon("clock") + esc(w.date + (w.time ? ", " + w.time : "")) + "</span>" +
        "<span>" + icon("mappin") + esc(e.location || t("con.tbc")) + "</span></div></div>" +
        '<button type="button" class="btn btn-soft btn-sm" data-id="' + esc(e.id) + '">' + esc(t("read.more")) + "</button></article>";
    });
    $("#ev-list").innerHTML = h; $("#ev-empty").hidden = list.length > 0;
    $$("#ev-list button").forEach(function (b) { b.addEventListener("click", function () { openEvent(b.getAttribute("data-id"), b); }); });
  }

  /* ---------- dialog ---------- */
  function detail(e) {
    return '<article class="ev-detail"><div class="post-meta">' + U.catBadge(e.cat) + (e.sample ? U.sampleBadge() : "") + '</div><h3 style="margin:.6rem 0 0">' + esc(e.title) + "</h3><dl><dt>" + esc(t("ev.when")) + "</dt><dd>" + esc(range(e)) + "</dd><dt>" + esc(t("ev.where")) +
      "</dt><dd>" + esc(e.location || t("con.tbc")) + "</dd></dl>" + (e.description ? "<p>" + esc(e.description) + "</p>" : "") +
      '<div style="display:flex;flex-wrap:wrap;gap:.5rem"><button type="button" class="btn btn-soft btn-sm" data-act="copy" data-id="' + esc(e.id) + '"><span>' + icon("copy") + "</span>" + esc(t("copy.link")) + '</button><button type="button" class="btn btn-soft btn-sm" data-act="ics" data-id="' + esc(e.id) + '">' + icon("download") + esc(t("ev.add")) + "</button></div></article>";
  }
  var dlgState = null;
  function fillDlg() {
    if (!dlgState) return;
    var list = dlgState.day ? all().filter(function (e) { return onDay(e, dlgState.day); }) : all().filter(function (e) { return e.id === dlgState.id; });
    $("#ev-dlg-title").textContent = dlgState.day ? t("ev.on", { d: U.fmt(U.parseISO(dlgState.day), { weekday: "long", day: "numeric", month: "long" }) }) : (list[0] ? list[0].title : "");
    $("#ev-dlg-body").innerHTML = list.length ? list.map(detail).join("") : '<p class="sec-lead">' + esc(t("ev.none")) + "</p>";
    $$("#ev-dlg-body button").forEach(function (b) {
      b.addEventListener("click", function () {
        var e = all().filter(function (x) { return x.id === b.getAttribute("data-id"); })[0];
        if (b.getAttribute("data-act") === "ics") U.download(e.id + ".ics", "text/calendar;charset=utf-8", ics([e]));
        else {
          var url = location.href.split("#")[0] + "#event=" + e.id;
          U.copyText(url).then(function () { b.lastChild.textContent = " " + t("copied"); }, function () { window.prompt(t("copy.link"), url); });
        }
      });
    });
  }
  function openDay(iso, from) { opener = from; dlgState = { day: iso }; fillDlg(); U.openDialog($("#ev-dlg")); }
  function openEvent(id, from) {
    var e = all().filter(function (x) { return x.id === id; })[0]; if (!e) return false;
    opener = from || null; dlgState = { id: id }; fillDlg(); U.openDialog($("#ev-dlg"));
    try { history.replaceState(null, "", "#event=" + id); } catch (x) {}
    return true;
  }

  /* ---------- print ---------- */
  function printCal() {
    var days = monthDays(), evs = matching(), h = "<h1>" + esc(t("school")) + "</h1><h2>" + esc(U.fmt(cursor, { month: "long", year: "numeric" })) + '</h2><table style="width:100%;border-collapse:collapse" border="1" cellpadding="6"><tr>';
    for (var k = 0; k < 7; k++) h += "<th>" + esc(U.fmt(new Date(2024, 0, 1 + k), { weekday: "short" })) + "</th>";
    h += "</tr>";
    for (var r = 0; r < days.length / 7; r++) {
      h += "<tr>";
      days.slice(r * 7, r * 7 + 7).forEach(function (d) {
        var iso = U.toISO(d), de = evs.filter(function (e) { return onDay(e, iso); });
        h += '<td style="vertical-align:top;height:80px;' + (d.getMonth() !== cursor.getMonth() ? "color:#999" : "") + '"><b>' + d.getDate() + "</b>" + de.map(function (e) { return "<div style='font-size:11px'>" + esc(e.title) + "</div>"; }).join("") + "</td>";
      });
      h += "</tr>";
    }
    U.printHTML(h + "</table>");
  }

  /* ---------- render ---------- */
  function render() {
    $("#cal-view").hidden = view !== "calendar"; $("#list-view").hidden = view !== "list";
    $("#past-wrap").hidden = view !== "list";
    $("#v-cal").setAttribute("aria-pressed", String(view === "calendar")); $("#v-list").setAttribute("aria-pressed", String(view === "list"));
    $("#ev-sample").hidden = !all().some(function (e) { return e.sample; });
    chips(); renderCal(); renderList(); fillDlg();
  }
  function fromHash() {
    var m = /event=([\w-]+)/.exec(location.hash); if (!m) return;
    var e = all().filter(function (x) { return x.id === m[1]; })[0];
    if (!e) { U.clearHash(); return; }
    cursor = new Date(e.s.getFullYear(), e.s.getMonth(), 1); focusDay = U.toISO(e.s); render(); openEvent(e.id);
  }
  U.init(function () {
    $("#cal-prev").innerHTML = icon("prev", 2); $("#cal-next").innerHTML = icon("next", 2);
    U.dialog($("#ev-dlg"), function () { dlgState = null; if (/event=/.test(location.hash)) U.clearHash(); if (opener && document.contains(opener)) opener.focus(); });
    $("#ev-dlg .x-btn").innerHTML = icon("close", 2);
    function setView(v) { view = v; U.store.set("ubk-ev-view", v); render(); }
    $("#v-cal").addEventListener("click", function () { setView("calendar"); });
    $("#v-list").addEventListener("click", function () { setView("list"); });
    $("#ev-past").addEventListener("change", function (e) { past = e.target.checked; renderList(); });
    function go(n) { cursor = new Date(cursor.getFullYear(), cursor.getMonth() + n, 1); focusDay = null; renderCal(); }
    $("#cal-prev").addEventListener("click", function () { go(-1); });
    $("#cal-next").addEventListener("click", function () { go(1); });
    $("#cal-today").addEventListener("click", function () { cursor = U.today(); cursor.setDate(1); focusDay = null; renderCal(); });
    $("#ev-print").addEventListener("click", printCal);
    $("#ev-ics-all").addEventListener("click", function () { U.download("school-calendar.ics", "text/calendar;charset=utf-8", ics(matching())); });
    window.addEventListener("hashchange", fromHash);
  });
  U.onLang(render);
  U.onLang(function once() { if (!once.d) { once.d = 1; fromHash(); } });
})();
