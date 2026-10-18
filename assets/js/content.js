/* Live website content: replaces the built-in sample content with what the school has published in the dashboard
   (news, events, FAQ, school details). If the backend is unreachable or nothing is published for a type, the sample
   content in data.js is kept and labelled "Sample". The last good copy is cached so repeat visits show instantly. */
(function () {
  "use strict";
  var U = window.UBK, root = document.documentElement, D = window.UBK_DATA, S = window.UBK_SITE || (window.UBK_SITE = {});
  var B = S.backend, CACHE = "ubk-content-v1", raw = null, SAMPLE = { news: D.news, events: D.events, faqs: D.faqs };
  var BASE_SITE = JSON.parse(JSON.stringify({ address: S.address || "", phones: S.phones || [], email: S.email || "", whatsapp: S.whatsapp || "", mapUrl: S.mapUrl || "", hours: S.hours || [] }));
  if (!B || !B.url || !B.key) return;

  function pick(o, l) { if (!o) return ""; return o[l] || o.en || o[Object.keys(o).filter(function (k) { return o[k] && o[k].length; })[0]] || ""; }
  function build(l) {
    if (!raw) return;
    D.news = raw.news.length ? raw.news.map(function (n) {
      var b = pick(n.body, l);
      return { id: n.id, cat: n.category, pinned: n.pinned, archived: n.archived, date: n.publish_at, publishAt: n.publish_at, title: pick(n.title, l), excerpt: pick(n.excerpt, l), body: Array.isArray(b) ? b : String(b).split(/\n{2,}/) };
    }) : SAMPLE.news;
    D.events = raw.events.length ? raw.events.map(function (e) {
      return { id: e.id, cat: e.category, start: e.start_date, end: e.end_date || undefined, time: e.start_time || undefined, endTime: e.end_time || undefined, title: pick(e.title, l), location: e.location || "", description: pick(e.description, l) };
    }) : SAMPLE.events;
    D.faqs = raw.faqs.length ? raw.faqs.map(function (f) { return { id: f.id, q: pick(f.q, l), a: pick(f.a, l) }; }) : SAMPLE.faqs;
    var c = raw.contact;
    ["address", "email", "whatsapp", "mapUrl"].forEach(function (k) { S[k] = c ? (c[k] || "") : BASE_SITE[k]; });
    S.phones = c ? (c.phones || []) : BASE_SITE.phones; S.hours = c ? (c.hours || []) : BASE_SITE.hours;
  }
  function apply(data) { raw = data; build(root.lang || "en"); }
  function done() { root.classList.remove("content-loading"); }

  U.onLang(function (l) { build(l); });

  var cached = null; try { cached = JSON.parse(localStorage.getItem(CACHE) || "null"); } catch (e) {}
  if (cached) apply(cached); else root.classList.add("content-loading");
  setTimeout(done, 2500);

  function get(path) {
    return fetch(B.url + "/rest/v1/" + path, { headers: { apikey: B.key } }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }
  Promise.all([
    get("news?select=*&order=pinned.desc,publish_at.desc&limit=200"),
    get("events?select=*&order=start_date.asc&limit=500"),
    get("faqs?select=*&order=sort.asc&limit=100"),
    get("site_settings?select=key,value&key=eq.contact")
  ]).then(function (r) {
    var fresh = { news: r[0], events: r[1], faqs: r[2], contact: r[3][0] ? r[3][0].value : null };
    var changed = JSON.stringify(fresh) !== JSON.stringify(cached);
    try { localStorage.setItem(CACHE, JSON.stringify(fresh)); } catch (e) {}
    apply(fresh); done();
    if (changed && U.refresh) U.refresh();
  }, done);
})();
