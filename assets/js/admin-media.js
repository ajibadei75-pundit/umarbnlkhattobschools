/* Dashboard: Gallery and Leadership manager (website content editors and administrators). Photos go to the public "gallery" bucket. */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, $$ = U.$$, esc = U.esc, A = window.UBK_ADMIN, B = (window.UBK_SITE || {}).backend || {};
  if (!A) return;
  var host, sub = "gallery", gal = [], led = [];
  var CATS = { morning: "Morning Adhkar", quran: "Qur'an", sports: "Sports", arabic: "Arabic", nursery: "Nursery", evening: "Evening", events: "Events", other: "Other" };
  function say(ok, m) { var el = $("#md-res"); if (el) { el.className = "result show " + (ok ? "ok" : "bad"); el.textContent = m; } }
  function nice(e) { var m = (e && e.message) || ""; return /row-level|forbidden|permission/.test(m) ? "You do not have permission for that." : A.nice(m); }
  function uuid() { return crypto.randomUUID ? crypto.randomUUID() : Date.now() + "" + Math.random().toString(16).slice(2); }
  function upload(prefix, f) {
    if (["image/jpeg", "image/png", "image/webp"].indexOf(f.type) < 0 || f.size > 6291456) return Promise.reject(new Error("Choose a JPG, PNG or WebP image up to 6 MB."));
    var path = prefix + "/" + uuid() + (f.type === "image/png" ? ".png" : f.type === "image/webp" ? ".webp" : ".jpg");
    return A.fresh().then(function (tok) { return fetch(B.url + "/storage/v1/object/gallery/" + path, { method: "POST", headers: { apikey: B.key, Authorization: "Bearer " + tok, "Content-Type": f.type }, body: f }); })
      .then(function (r) { if (!r.ok) throw new Error("Upload failed. Please try again."); return path; });
  }
  function drop(path) { if (!path) return Promise.resolve(); return A.fresh().then(function (tok) { return fetch(B.url + "/storage/v1/object/gallery/" + path.split("/").map(encodeURIComponent).join("/"), { method: "DELETE", headers: { apikey: B.key, Authorization: "Bearer " + tok } }); }).catch(function () {}); }
  function img(p) { return B.url + "/storage/v1/object/public/gallery/" + p.split("/").map(encodeURIComponent).join("/"); }
  function open(h) {
    host = h; host.innerHTML = '<p class="count-line">Loading...</p>';
    Promise.all([A.api("GET", "/rest/v1/gallery_items?select=*&order=sort.asc,created_at.desc"), A.api("GET", "/rest/v1/leaders?select=*&order=sort.asc,created_at.asc")])
      .then(function (r) { gal = r[0] || []; led = r[1] || []; draw(); }, function (e) { host.innerHTML = '<div class="notice"><span>' + esc(nice(e)) + "</span></div>"; });
  }
  function draw() {
    host.innerHTML = '<h2 class="sec-title" style="font-size:1.2rem">Gallery and leadership</h2><p class="count-line">Only photos and profiles you publish appear on the public website. Use photos the school has the right to show, and have parents\' consent for photos of children.</p>' +
      '<div class="level-tabs rw-tabs" role="tablist"><button type="button" role="tab" data-s="gallery" aria-selected="' + (sub === "gallery") + '">Gallery (' + gal.length + ')</button><button type="button" role="tab" data-s="leaders" aria-selected="' + (sub === "leaders") + '">Leadership (' + led.length + ')</button></div>' + (sub === "gallery" ? gallery() : leaders()) + '<p class="result" id="md-res" role="status"></p>';
    $$(".rw-tabs button", host).forEach(function (b) { b.addEventListener("click", function () { sub = b.getAttribute("data-s"); draw(); }); });
    (sub === "gallery" ? wireGallery : wireLeaders)();
  }
  function gallery() {
    return '<form id="md-gf" class="form-card" novalidate><h3 style="margin:0 0 .6rem;font-size:1.05rem">Add a photo</h3><div class="form-grid">' +
      '<div class="fld"><label for="g-f">Photo (JPG, PNG, WebP, up to 6 MB)</label><input class="input" id="g-f" type="file" accept="image/jpeg,image/png,image/webp" required></div>' +
      '<div class="fld"><label for="g-c">Category</label><select class="select-lg" id="g-c">' + Object.keys(CATS).map(function (k) { return '<option value="' + k + '">' + CATS[k] + "</option>"; }).join("") + "</select></div>" +
      '<div class="fld full"><label for="g-e">Caption (English)</label><input class="input" id="g-e" maxlength="160"></div><div class="fld"><label for="g-a">Caption (Arabic, optional)</label><input class="input" id="g-a" maxlength="160" dir="rtl"></div><div class="fld"><label for="g-h">Caption (Hausa, optional)</label><input class="input" id="g-h" maxlength="160"></div>' +
      '<div class="fld"><label for="g-s">Show on website</label><select class="select-lg" id="g-s"><option value="published">Published</option><option value="draft">Draft (hidden)</option></select></div></div><div class="form-actions" style="margin-top:1rem"><button class="btn btn-primary btn-sm" type="submit" id="g-go">Upload photo</button></div></form>' +
      (gal.length ? '<div class="md-grid">' + gal.map(function (g) { return '<article class="md-item" data-id="' + esc(g.id) + '" data-p="' + esc(g.file_path) + '"><img src="' + esc(img(g.file_path)) + '" alt="" loading="lazy"><div><strong>' + esc(g.caption.en) + "</strong><small>" + esc(CATS[g.category] || g.category) + " · " + (g.status === "published" ? "Published" : "Draft") + '</small><div class="form-actions"><button type="button" class="btn btn-soft btn-sm" data-t="1">' + (g.status === "published" ? "Hide" : "Publish") + '</button><button type="button" class="btn btn-soft btn-sm" data-d="1">Delete</button></div></div></article>'; }).join("") + "</div>" : '<div class="empty"><p>No photos yet.</p></div>');
  }
  function wireGallery() {
    $("#md-gf").addEventListener("submit", function (e) {
      e.preventDefault(); var f = $("#g-f").files[0], en = $("#g-e").value.trim(); if (!f) return say(false, "Choose a photo."); if (!en) return say(false, "Write a short English caption.");
      var cap = { en: en }; if ($("#g-a").value.trim()) cap.ar = $("#g-a").value.trim(); if ($("#g-h").value.trim()) cap.ha = $("#g-h").value.trim(); $("#g-go").disabled = true;
      upload("gallery", f).then(function (path) { return A.api("POST", "/rest/v1/gallery_items", { category: $("#g-c").value, caption: cap, file_path: path, status: $("#g-s").value }, { Prefer: "return=minimal" }); }).then(function () { open(host); }, function (er) { $("#g-go").disabled = false; say(false, nice(er)); });
    });
    $$(".md-item", host).forEach(function (a) {
      var id = a.getAttribute("data-id"), p = a.getAttribute("data-p"), g = gal.filter(function (x) { return x.id === id; })[0];
      a.querySelector("[data-t]").addEventListener("click", function () { A.api("PATCH", "/rest/v1/gallery_items?id=eq." + encodeURIComponent(id), { status: g.status === "published" ? "draft" : "published" }, { Prefer: "return=minimal" }).then(function () { open(host); }, function (er) { say(false, nice(er)); }); });
      a.querySelector("[data-d]").addEventListener("click", function () { if (!confirm("Delete this photo for good?")) return; A.api("DELETE", "/rest/v1/gallery_items?id=eq." + encodeURIComponent(id)).then(function () { return drop(p); }).then(function () { open(host); }, function (er) { say(false, nice(er)); }); });
    });
  }
  function leaders() {
    return '<form id="md-lf" class="form-card" novalidate><h3 style="margin:0 0 .6rem;font-size:1.05rem">Add a leader</h3><div class="form-grid">' +
      '<div class="fld"><label for="l-n">Full name</label><input class="input" id="l-n" maxlength="120"></div><div class="fld"><label for="l-r">Role (English)</label><input class="input" id="l-r" maxlength="120" placeholder="e.g. Head Teacher"></div>' +
      '<div class="fld"><label for="l-ra">Role (Arabic, optional)</label><input class="input" id="l-ra" maxlength="120" dir="rtl"></div><div class="fld"><label for="l-rh">Role (Hausa, optional)</label><input class="input" id="l-rh" maxlength="120"></div>' +
      '<div class="fld full"><label for="l-b">Short profile (English, optional)</label><textarea class="input" id="l-b" rows="3" maxlength="1200"></textarea></div>' +
      '<div class="fld"><label for="l-f">Photo (optional)</label><input class="input" id="l-f" type="file" accept="image/jpeg,image/png,image/webp"></div><div class="fld"><label for="l-o">Order (smaller first)</label><input class="input" id="l-o" type="number" value="10"></div>' +
      '<div class="fld"><label for="l-s">Show on website</label><select class="select-lg" id="l-s"><option value="published">Published</option><option value="draft">Draft (hidden)</option></select></div></div><div class="form-actions" style="margin-top:1rem"><button class="btn btn-primary btn-sm" type="submit" id="l-go">Add leader</button></div></form>' +
      (led.length ? '<div class="md-grid">' + led.map(function (l) { return '<article class="md-item" data-id="' + esc(l.id) + '" data-p="' + esc(l.photo_path || "") + '">' + (l.photo_path ? '<img src="' + esc(img(l.photo_path)) + '" alt="" loading="lazy">' : "") + "<div><strong>" + esc(l.name) + "</strong><small>" + esc(l.role.en) + " · " + (l.status === "published" ? "Published" : "Draft") + '</small><div class="form-actions"><button type="button" class="btn btn-soft btn-sm" data-t="1">' + (l.status === "published" ? "Hide" : "Publish") + '</button><button type="button" class="btn btn-soft btn-sm" data-d="1">Delete</button></div></div></article>'; }).join("") + "</div>" : '<div class="empty"><p>No leaders yet.</p></div>');
  }
  function wireLeaders() {
    $("#md-lf").addEventListener("submit", function (e) {
      e.preventDefault(); var n = $("#l-n").value.trim(), r = $("#l-r").value.trim(); if (!n || !r) return say(false, "Enter the name and the role.");
      var role = { en: r }; if ($("#l-ra").value.trim()) role.ar = $("#l-ra").value.trim(); if ($("#l-rh").value.trim()) role.ha = $("#l-rh").value.trim();
      var f = $("#l-f").files[0], bio = $("#l-b").value.trim(); $("#l-go").disabled = true;
      (f ? upload("leaders", f) : Promise.resolve(null)).then(function (path) { return A.api("POST", "/rest/v1/leaders", { name: n, role: role, bio: bio ? { en: bio } : {}, photo_path: path, sort: parseInt($("#l-o").value, 10) || 0, status: $("#l-s").value }, { Prefer: "return=minimal" }); }).then(function () { open(host); }, function (er) { $("#l-go").disabled = false; say(false, nice(er)); });
    });
    $$(".md-item", host).forEach(function (a) {
      var id = a.getAttribute("data-id"), p = a.getAttribute("data-p"), l = led.filter(function (x) { return x.id === id; })[0];
      a.querySelector("[data-t]").addEventListener("click", function () { A.api("PATCH", "/rest/v1/leaders?id=eq." + encodeURIComponent(id), { status: l.status === "published" ? "draft" : "published" }, { Prefer: "return=minimal" }).then(function () { open(host); }, function (er) { say(false, nice(er)); }); });
      a.querySelector("[data-d]").addEventListener("click", function () { if (!confirm("Delete this profile for good?")) return; A.api("DELETE", "/rest/v1/leaders?id=eq." + encodeURIComponent(id)).then(function () { return drop(p); }).then(function () { open(host); }, function (er) { say(false, nice(er)); }); });
    });
  }
  A.media = open;
})();
