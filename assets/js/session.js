/* Academic session indicator: which session and term it is, when it begins and ends, and how far through it we are.
   Dates are entered by the school (Admin > Website > Session dates); nothing is invented here. */
(function () {
  "use strict";
  var U = window.UBK, S = window.UBK_SITE || (window.UBK_SITE = {}), $ = U.$, $$ = U.$$, t = U.t, esc = U.esc;
  var DAY = 864e5;
  function dt(s) { return s ? U.parseISO(s) : null; }
  function d(x) { return U.fmt(x, { day: "numeric", month: "short", year: "numeric" }); }
  function days(a, b) { return Math.round((b - a) / DAY); }
  function status() {
    var c = S.session; if (!c || !c.terms || !c.terms.length) return null;
    var now = U.today(), ts = c.terms.map(function (x) { return { term: x.term, s: dt(x.start), e: dt(x.end) }; }).filter(function (x) { return x.s && x.e; }).sort(function (a, b) { return a.s - b.s; });
    if (!ts.length) return null;
    var cur = ts.filter(function (x) { return now >= x.s && now <= x.e; })[0], next = ts.filter(function (x) { return x.s > now; })[0];
    return { label: c.label || "", ts: ts, cur: cur, next: next, now: now, ended: !cur && !next };
  }
  function tname(x) { var k = "ss." + x; var v = t(k); return v === k ? x : v; }
  function chip(st) {
    var el = $("[data-session-chip]"); if (!el) return;
    if (!st) { el.hidden = true; return; }
    el.hidden = false;
    var txt = st.cur ? st.label + " · " + t("ss.term", { t: tname(st.cur.term) }) : st.next ? st.label + " · " + t("ss.next") + ": " + d(st.next.s) : st.label + " · " + t("ss.ended");
    el.textContent = txt; el.setAttribute("href", /index|\/$/.test(location.pathname) || location.pathname === "/" ? "#session" : "index.html#session");
  }
  function card(st) {
    var h = $("#session-host"); if (!h) return;
    if (!st) { h.innerHTML = ""; return; }
    var x = st.cur || st.next || st.ts[st.ts.length - 1], html = '<div class="sess-card" id="session"><h2>' + esc(t("ss.title")) + '</h2><div class="sc-main">' + esc(st.label) + " · " + esc(t("ss.term", { t: tname(x.term) })) + "</div>";
    html += '<span class="sc-state' + (st.cur ? "" : " hol") + '">' + esc(st.cur ? t("ss.now") : st.ended ? t("ss.ended") : t("ss.hol")) + "</span>";
    html += '<dl class="sc-dates"><div><dt>' + esc(t("ss.begins")) + "</dt><dd>" + esc(d(x.s)) + "</dd></div><div><dt>" + esc(t("ss.ends")) + "</dt><dd>" + esc(d(x.e)) + "</dd></div></dl>";
    if (st.cur) {
      var tot = Math.max(1, days(x.s, x.e) + 1), done = Math.min(tot, days(x.s, st.now) + 1), left = days(st.now, x.e);
      html += '<div class="sc-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(done / tot * 100) + '"><i style="width:' + Math.round(done / tot * 100) + '%"></i></div>';
      html += '<p class="sc-note">' + esc(left === 0 ? t("ss.last") : t("ss.left", { n: left })) + " · " + esc(t("ss.week", { w: Math.ceil(done / 7), n: Math.ceil(tot / 7) })) + "</p>";
    } else if (st.next) html += '<p class="sc-note">' + esc(t("ss.starts_in", { n: days(st.now, st.next.s) })) + "</p>";
    h.innerHTML = html + "</div>";
  }
  function run() { var st = status(); chip(st); card(st); }
  U.init(run); U.onLang(run);
  window.UBK_SESSION = { refresh: run };
})();
