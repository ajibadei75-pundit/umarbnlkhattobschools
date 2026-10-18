/* Thin client for the school's Supabase backend (database functions and private storage).
   Only the public (publishable) key is used here; what the public can do is limited by database rules. */
(function () {
  "use strict";
  function cfg() { var b = (window.UBK_SITE || {}).backend || {}; return b.url && b.key ? b : null; }
  function headers(extra) {
    var b = cfg(), h = { apikey: b.key };
    if (/^eyJ/.test(b.key)) h.Authorization = "Bearer " + b.key;   /* legacy JWT-style keys also go in Authorization */
    Object.keys(extra || {}).forEach(function (k) { h[k] = extra[k]; });
    return h;
  }
  function fail(kind, detail) { var e = new Error(kind); e.kind = kind; e.detail = detail; return e; }
  function rpc(name, body) {
    var b = cfg(); if (!b) return Promise.reject(fail("cfg"));
    return fetch(b.url + "/rest/v1/rpc/" + name, { method: "POST", headers: headers({ "Content-Type": "application/json" }), body: JSON.stringify(body) })
      .then(function (r) {
        return r.text().then(function (txt) {
          var data = null; try { data = txt ? JSON.parse(txt) : null; } catch (e) {}
          if (r.ok) return data;
          var msg = (data && data.message) || "";
          if (/rate_limited/.test(msg)) throw fail("rate");
          if (/^invalid:/.test(msg) || /rejected/.test(msg)) throw fail("invalid", msg);
          throw fail("server", msg || r.status);
        });
      }, function () { throw fail("net"); });
  }
  function upload(path, file) {
    var b = cfg(); if (!b) return Promise.reject(fail("cfg"));
    return fetch(b.url + "/storage/v1/object/admission-docs/" + path, { method: "POST", headers: headers({ "Content-Type": file.type, "x-upsert": "false" }), body: file })
      .then(function (r) { if (!r.ok) throw fail("upload", r.status); return path; }, function (e) { if (e && e.kind) throw e; throw fail("net"); });
  }
  window.UBK.api = { configured: function () { return !!cfg(); }, rpc: rpc, upload: upload };
})();
