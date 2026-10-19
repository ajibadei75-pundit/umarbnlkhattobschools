/* Staff dashboard (English only for now): sign-in with Supabase Auth, role-aware tabs, admissions manager,
   staff roles. Every action is enforced by the database (row level security + audited functions); hiding a button
   here is only a convenience. The session lives in this browser tab only (sessionStorage) and ends when it closes. */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, $$ = U.$$, esc = U.esc, icon = U.icon;
  var B = (window.UBK_SITE || {}).backend || {}, KEY = "ubk-session";
  var STATUSES = { submitted: "Received", under_review: "Under review", more_info_needed: "More information needed", offered: "Place offered", declined: "Not offered a place", withdrawn: "Withdrawn" };
  var ROLES = { super_admin: "Super administrator", school_admin: "School administrator", admissions_officer: "Admissions officer", finance_officer: "Finance officer", content_editor: "Content editor", teacher: "Teacher" };
  var session = null, role = null, apps = [], tab = "overview";

  /* ---------- session ---------- */
  function load() { try { return JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch (e) { return null; } }
  function save(s) { session = s; try { if (s) sessionStorage.setItem(KEY, JSON.stringify(s)); else sessionStorage.removeItem(KEY); } catch (e) {} }
  function baseHeaders(auth) { var h = { apikey: B.key, "Content-Type": "application/json" }; if (auth) h.Authorization = "Bearer " + auth; return h; }
  function authCall(path, body) {
    return fetch(B.url + "/auth/v1/" + path, { method: "POST", headers: baseHeaders(), body: JSON.stringify(body) }).then(function (r) {
      return r.json().then(function (j) { if (!r.ok) { var e = new Error(j.error_description || j.msg || j.message || "auth"); e.status = r.status; throw e; } return j; });
    });
  }
  function adopt(j) { save({ access: j.access_token, refresh: j.refresh_token, exp: Date.now() + (j.expires_in || 3600) * 1000 - 30000, email: (j.user && j.user.email) || (session && session.email) }); }
  function fresh() {
    if (!session) return Promise.reject(new Error("signed_out"));
    if (Date.now() < session.exp) return Promise.resolve(session.access);
    return authCall("token?grant_type=refresh_token", { refresh_token: session.refresh }).then(function (j) { adopt(j); return session.access; }, function (e) { save(null); throw e; });
  }
  function api(method, path, body, extra) {
    return fresh().then(function (tok) {
      var h = baseHeaders(tok); Object.keys(extra || {}).forEach(function (k) { h[k] = extra[k]; });
      return fetch(B.url + path, { method: method, headers: h, body: body ? JSON.stringify(body) : undefined });
    }).then(function (r) {
      return r.text().then(function (txt) {
        var d = null; try { d = txt ? JSON.parse(txt) : null; } catch (e) {}
        if (!r.ok) { var e = new Error((d && (d.message || d.error)) || "request_failed"); e.status = r.status; throw e; }
        return d;
      });
    });
  }
  function rpc(name, body) { return api("POST", "/rest/v1/rpc/" + name, body || {}); }

  /* ---------- helpers ---------- */
  function pill(st) { return '<span class="status-pill st-' + esc(st) + '">' + esc(STATUSES[st] || st) + "</span>"; }
  function d(s) { return s ? U.fmt(new Date(s), { day: "numeric", month: "short", year: "numeric" }) : ""; }
  function nice(msg) {
    if (/forbidden|row-level security|permission denied/.test(msg)) return "You do not have permission for that.";
    if (/duplicate key/.test(msg)) return "An item with that name already exists. Please try saving again.";
    if (/user_not_found/.test(msg)) return "No account with that email. Create the user in Supabase (Authentication, Add user) first, then add the role here.";
    if (/cannot_change_self/.test(msg)) return "You cannot change your own access.";
    return "That did not work: " + msg;
  }
  function can(list) { return list.indexOf(role) > -1; }
  var ADM = ["super_admin", "school_admin", "admissions_officer"], CMS = ["super_admin", "school_admin", "content_editor"];

  /* ---------- sign in / out ---------- */
  function showLogin(msg) {
    $("#ad-login").hidden = false; $("#ad-app").hidden = true;
    var r = $("#ad-result"); r.className = msg ? "result show bad" : "result"; r.textContent = msg || "";
  }
  function start() {
    rpc("staff_role").then(function (r) {
      role = r;
      if (!role) { save(null); showLogin("This account is not set up as school staff. Ask a super administrator to add you."); return; }
      $("#ad-login").hidden = true; $("#ad-app").hidden = false;
      $("#ad-who").textContent = (session.email || "") + " · " + ROLES[role];
      buildTabs();
    }, function () { save(null); showLogin(""); });
  }
  function signIn(e) {
    e.preventDefault();
    var em = $("#ad-email").value.trim(), pw = $("#ad-pass").value;
    if (!em || !pw) { showLogin("Enter your email and password."); return; }
    $("#ad-go").disabled = true;
    authCall("token?grant_type=password", { email: em, password: pw }).then(function (j) { adopt(j); $("#ad-pass").value = ""; start(); },
      function (err) { showLogin(err.status === 400 || err.status === 401 ? "Email or password is not correct." : "Could not sign in. Check your connection and try again."); })
      .then(function () { $("#ad-go").disabled = false; });
  }
  function signOut() {
    var tok = session && session.access; save(null); role = null; apps = [];
    if (tok) fetch(B.url + "/auth/v1/logout", { method: "POST", headers: baseHeaders(tok) }).catch(function () {});
    showLogin("");
  }

  /* ---------- tabs ---------- */
  function buildTabs() {
    var tabs = role === "teacher" ? [] : [["overview", "Overview"]];
    if (role === "teacher") tabs.push(["myclasses", "My classes"]);
    if (can(["super_admin", "school_admin", "teacher"])) tabs.push(["aitools", "Teacher tools"]);
    if (can(ADM)) tabs.push(["admissions", "Admissions manager"]);
    if (can(CMS)) tabs.push(["content", "Website content"]);
    if (can(["super_admin", "school_admin"])) { tabs.push(["results", "Results and reports"]); tabs.push(["people", "Pupils and parents"]); }
    if (can(["super_admin", "school_admin", "content_editor", "teacher"])) tabs.push(["learning", "Learning Centre"]);
    if (can(["super_admin", "school_admin", "finance_officer"])) tabs.push(["payments", "Payments"]);
    if (can(["super_admin"])) tabs.push(["staff", "Users and roles"]);
    var IC = { overview: "grid", admissions: "family", content: "news", people: "users", staff: "shield", myclasses: "book", results: "list", aitools: "news", payments: "list", learning: "book" };
    $("#ad-tabs").innerHTML = tabs.map(function (x) { return '<button type="button" role="tab" data-tab="' + x[0] + '" aria-selected="false">' + icon(IC[x[0]] || "list") + "<span>" + esc(x[1]) + "</span></button>"; }).join("");
    $$("#ad-tabs button").forEach(function (b, i, all) {
      b.addEventListener("click", function () { go(b.getAttribute("data-tab")); });
      b.addEventListener("keydown", function (e) {
        var k = e.key, n = k === "ArrowDown" || k === "ArrowRight" ? i + 1 : k === "ArrowUp" || k === "ArrowLeft" ? i - 1 : k === "Home" ? 0 : k === "End" ? all.length - 1 : -1;
        if (n < 0) return; e.preventDefault(); n = (n + all.length) % all.length; all[n].focus(); go(all[n].getAttribute("data-tab"));
      });
    });
    var h = (location.hash || "").slice(1);
    go(tabs.some(function (x) { return x[0] === h; }) ? h : tabs[0][0]);
  }
  function go(t) {
    tab = t;
    $$("#ad-tabs button").forEach(function (b) { var on = b.getAttribute("data-tab") === t; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; });
    var cur = $('#ad-tabs [aria-selected="true"]'); if (cur && cur.scrollIntoView && window.innerWidth < 900) try { cur.scrollIntoView({ block: "nearest", inline: "center" }); } catch (e) {}
    ["overview", "admissions", "content", "people", "staff", "myclasses", "results", "aitools", "payments", "learning"].forEach(function (k) { $("#p-" + k).hidden = k !== t; });
    try { history.replaceState(null, "", "#" + t); } catch (e) {}
    if (t === "overview") overview(); if (t === "admissions") loadApps(); if (t === "content" && window.UBK_ADMIN.content) window.UBK_ADMIN.content($("#p-content")); if (t === "people" && window.UBK_ADMIN.people) window.UBK_ADMIN.people($("#p-people")); if (t === "myclasses" && window.UBK_ADMIN.teach) window.UBK_ADMIN.teach($("#p-myclasses")); if (t === "results" && window.UBK_ADMIN.results) window.UBK_ADMIN.results($("#p-results")); if (t === "aitools" && window.UBK_ADMIN.aitools) window.UBK_ADMIN.aitools($("#p-aitools")); if (t === "payments" && window.UBK_ADMIN.payments) window.UBK_ADMIN.payments($("#p-payments")); if (t === "learning" && window.UBK_ADMIN.learning) window.UBK_ADMIN.learning($("#p-learning")); if (t === "staff") staffPanel();
  }

  /* ---------- overview ---------- */
  function overview() {
    var host = $("#p-overview");
    if (!can(ADM)) { host.innerHTML = '<div class="empty"><h3>Welcome</h3><p>Your role (' + esc(ROLES[role]) + ") " + (can(CMS) ? 'can manage the website content. Open "Website content" above.' : "has no dashboard modules yet.") + "</p></div>"; return; }
    host.innerHTML = '<p class="count-line">Loading...</p>';
    loadApps(true).then(function () {
      var by = {}; Object.keys(STATUSES).forEach(function (k) { by[k] = 0; });
      apps.forEach(function (a) { by[a.status]++; });
      var week = apps.filter(function (a) { return Date.now() - new Date(a.created_at) < 7 * 864e5; }).length;
      var open = by.submitted + by.under_review + by.more_info_needed;
      host.innerHTML = '<div class="ad-stats">' +
        stat("New (7 days)", week) + stat("Needs attention", by.submitted + by.more_info_needed) + stat("Open applications", open) + stat("All applications", apps.length) + "</div>" +
        '<h2 class="sec-title" style="font-size:1.15rem;margin-top:2rem">By status</h2><div class="ad-stats">' + Object.keys(STATUSES).map(function (k) { return '<button type="button" class="ad-stat is-btn" data-st="' + k + '"><b>' + by[k] + "</b><span>" + esc(STATUSES[k]) + "</span></button>"; }).join("") + "</div>" +
        '<h2 class="sec-title" style="font-size:1.15rem;margin-top:2rem">Latest applications</h2>' + table(apps.slice(0, 5)) + '<p style="margin-top:1rem"><button type="button" class="link-arrow" id="ov-all" style="background:none;border:0;cursor:pointer">All applications ' + icon("arrow") + "</button></p>";
      $$("#p-overview [data-st]").forEach(function (b) { b.addEventListener("click", function () { go("admissions"); $("#ad-fs").value = b.getAttribute("data-st"); renderApps(); }); });
      $("#ov-all").addEventListener("click", function () { go("admissions"); });
      bindRows(host);
    }, function (e) { host.innerHTML = '<div class="notice"><span>' + esc(nice(e.message)) + "</span></div>"; });
  }
  function stat(l, n) { return '<div class="ad-stat"><b>' + n + "</b><span>" + esc(l) + "</span></div>"; }

  /* ---------- admissions ---------- */
  function loadApps(quiet) {
    return api("GET", "/rest/v1/admissions?select=*&order=created_at.desc&limit=1000").then(function (r) { apps = r || []; if (!quiet) renderApps(); });
  }
  function filtered() {
    var q = $("#ad-q").value.trim().toLowerCase(), fs = $("#ad-fs").value, fl = $("#ad-fl").value;
    return apps.filter(function (a) {
      if (fs && a.status !== fs) return false; if (fl && a.level !== fl) return false;
      return !q || [a.reference, a.child_first_name, a.child_last_name, a.guardian_name, a.guardian_phone, a.guardian_email].join(" ").toLowerCase().indexOf(q) > -1;
    });
  }
  function table(list) {
    return '<div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>Reference</th><th>Child</th><th>Level</th><th>Guardian</th><th>Submitted</th><th>Status</th></tr></thead><tbody>' +
      list.map(function (a) { return '<tr tabindex="0" data-id="' + esc(a.id) + '"><td><strong>' + esc(a.reference) + "</strong></td><td>" + esc(a.child_first_name + " " + a.child_last_name) + "</td><td>" + esc(a.level) + "</td><td>" + esc(a.guardian_name) + "</td><td>" + esc(d(a.created_at)) + "</td><td>" + pill(a.status) + "</td></tr>"; }).join("") + "</tbody></table></div>";
  }
  function bindRows(host) {
    $$("tr[data-id]", host).forEach(function (tr) {
      function open() { openApp(tr.getAttribute("data-id")); }
      tr.addEventListener("click", open); tr.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    });
  }
  function renderApps() {
    var list = filtered();
    $("#ad-count").textContent = list.length + " of " + apps.length + " applications";
    $("#ad-empty").hidden = list.length > 0;
    var wrap = $("#p-admissions .ad-table-wrap"); wrap.hidden = !list.length;
    $("#ad-table").innerHTML = list.length ? table(list).replace(/^<div[^>]*><table[^>]*>|<\/table><\/div>$/g, "") : "";
    bindRows($("#ad-table"));
  }
  function csv() {
    var rows = [["Reference", "Status", "Level", "Class", "Child first name", "Child last name", "Date of birth", "Gender", "Guardian", "Relationship", "Phone", "Email", "Submitted"]];
    filtered().forEach(function (a) { rows.push([a.reference, STATUSES[a.status], a.level, a.class_applying, a.child_first_name, a.child_last_name, a.child_dob, a.child_gender, a.guardian_name, a.guardian_relationship, a.guardian_phone, a.guardian_email, a.created_at]); });
    var text = rows.map(function (r) { return r.map(function (c) { c = String(c == null ? "" : c); if (/^[=+\-@]/.test(c)) c = "'" + c; return '"' + c.replace(/"/g, '""') + '"'; }).join(","); }).join("\r\n");
    U.download("applications.csv", "text/csv;charset=utf-8", "﻿" + text);
  }
  function openApp(id) {
    var a = apps.filter(function (x) { return x.id === id; })[0]; if (!a) return;
    $("#ad-dlg-t").textContent = a.reference + " · " + a.child_first_name + " " + a.child_last_name;
    function row(k, v) { return "<dt>" + esc(k) + "</dt><dd>" + (v ? esc(v) : "<em>Not given</em>") + "</dd>"; }
    var docs = (a.documents || []).map(function (x, i) { return '<li><span>' + esc(x.kind.replace(/_/g, " ")) + " (" + esc(x.name) + ')</span> <button type="button" class="btn btn-soft btn-sm" data-doc="' + i + '">View</button></li>'; }).join("");
    $("#ad-dlg-b").innerHTML = '<div class="post-meta">' + pill(a.status) + "<span>Submitted " + esc(d(a.created_at)) + "</span></div>" +
      '<dl class="review" style="margin-top:1rem">' + row("Level", a.level) + row("Class", a.class_applying) + row("Date of birth", a.child_dob) + row("Gender", a.child_gender) + row("Previous school", a.previous_school) + row("Health or learning needs", a.health_notes) +
      row("Guardian", a.guardian_name) + row("Relationship", a.guardian_relationship) + row("Phone", a.guardian_phone) + row("Email", a.guardian_email) + row("Address", a.guardian_address) + row("Language", a.preferred_language) + "</dl>" +
      '<h3 style="font-size:1rem;margin:1.2rem 0 .4rem">Documents</h3>' + (docs ? '<ul class="ad-docs">' + docs + "</ul>" : '<p class="count-line">None uploaded.</p>') +
      '<h3 style="font-size:1rem;margin:1.2rem 0 .4rem">Decision and message to the family</h3>' +
      '<form id="ad-status"><div class="form-grid"><div class="fld"><label for="ds-st">Status</label><select class="select-lg" id="ds-st">' + Object.keys(STATUSES).map(function (k) { return '<option value="' + k + '"' + (k === a.status ? " selected" : "") + ">" + esc(STATUSES[k]) + "</option>"; }).join("") + "</select></div>" +
      '<div class="fld full"><label for="ds-note">Message shown to the family on the Track page (optional)</label><textarea class="textarea" id="ds-note" maxlength="500" style="min-height:90px">' + esc(a.public_note || "") + "</textarea></div></div>" +
      '<div class="form-actions"><button type="submit" class="btn btn-primary">Save</button></div><div class="result" id="ds-res" role="status" tabindex="-1"></div></form>' +
      '<h3 style="font-size:1rem;margin:1.4rem 0 .4rem">History</h3><ol class="timeline" id="ds-hist"><li><small>Loading...</small></li></ol>';
    U.openDialog($("#ad-dlg"));
    $$("[data-doc]").forEach(function (b) { b.addEventListener("click", function () { viewDoc(a.documents[+b.getAttribute("data-doc")], b); }); });
    $("#ad-status").addEventListener("submit", function (e) {
      e.preventDefault(); var res = $("#ds-res");
      rpc("admin_set_status", { p_id: a.id, p_status: $("#ds-st").value, p_note: $("#ds-note").value }).then(function () {
        res.className = "result show ok"; res.textContent = "Saved."; return loadApps(true).then(function () { renderApps(); if (tab === "overview") overview(); history_(a.id); });
      }, function (err) { res.className = "result show bad"; res.textContent = nice(err.message); });
    });
    history_(a.id);
  }
  function history_(id) {
    api("GET", "/rest/v1/admission_status_history?select=status,note,created_at&admission_id=eq." + encodeURIComponent(id) + "&order=created_at.asc").then(function (h) {
      var el = $("#ds-hist"); if (!el) return;
      el.innerHTML = h.map(function (x) { return "<li><strong>" + esc(STATUSES[x.status] || x.status) + "</strong><small>" + esc(d(x.created_at)) + "</small>" + (x.note ? "<p>" + esc(x.note) + "</p>" : "") + "</li>"; }).join("");
    }, function () {});
  }
  function viewDoc(doc, btn) {
    btn.disabled = true;
    api("POST", "/storage/v1/object/sign/admission-docs/" + doc.path, { expiresIn: 300 }).then(function (r) {
      var url = B.url + "/storage/v1" + r.signedURL; window.open(url, "_blank", "noopener");
    }, function () { btn.textContent = "Unavailable"; }).then(function () { btn.disabled = false; });
  }

  /* ---------- staff ---------- */
  function staffPanel() {
    var host = $("#p-staff"); host.innerHTML = '<p class="count-line">Loading...</p>';
    rpc("admin_list_staff").then(function (list) {
      host.innerHTML = '<div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Access</th></tr></thead><tbody>' + list.map(function (s) {
        return "<tr><td>" + esc(s.full_name || "") + "</td><td>" + esc(s.email) + "</td><td>" + esc(ROLES[s.role] || s.role) + "</td><td>" + (s.active ? "Active " : "Disabled ") + '<button type="button" class="btn btn-soft btn-sm" data-u="' + esc(s.user_id) + '" data-a="' + (s.active ? 0 : 1) + '">' + (s.active ? "Disable" : "Enable") + "</button></td></tr>";
      }).join("") + "</tbody></table></div>" +
        '<div class="form-card" style="margin-top:1.6rem"><h2 style="font-size:1.2rem">Give a person staff access</h2><p class="count-line">They need an account first: create the user in Supabase (Authentication, Add user), then add their role here.</p>' +
        '<form id="st-form" novalidate><div class="form-grid"><div class="fld"><label for="st-email">Email</label><input class="input" id="st-email" type="email"></div><div class="fld"><label for="st-name">Full name</label><input class="input" id="st-name" maxlength="80"></div>' +
        '<div class="fld full"><label for="st-role">Role</label><select class="select-lg" id="st-role">' + Object.keys(ROLES).map(function (k) { return '<option value="' + k + '">' + esc(ROLES[k]) + "</option>"; }).join("") + '</select></div></div><div class="form-actions"><button type="submit" class="btn btn-primary">Save access</button></div><div class="result" id="st-res" role="status"></div></form></div>';
      $$("[data-u]", host).forEach(function (b) { b.addEventListener("click", function () { rpc("admin_set_staff_active", { p_user: b.getAttribute("data-u"), p_active: b.getAttribute("data-a") === "1" }).then(staffPanel, function (e) { alert(nice(e.message)); }); }); });
      $("#st-form").addEventListener("submit", function (e) {
        e.preventDefault(); var r = $("#st-res");
        rpc("admin_add_staff", { p_email: $("#st-email").value, p_role: $("#st-role").value, p_name: $("#st-name").value }).then(function () { staffPanel(); }, function (err) { r.className = "result show bad"; r.textContent = nice(err.message); });
      });
    }, function (e) { host.innerHTML = '<div class="notice"><span>' + esc(nice(e.message)) + "</span></div>"; });
  }

  function uid() { try { return JSON.parse(atob(session.access.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).sub; } catch (e) { return null; } }
  window.UBK_ADMIN = { api: api, fresh: fresh, nice: nice, can: can, role: function () { return role; }, uid: uid, rpc: rpc };
  U.init(function () {
    if (!B.url || !B.key) { $("#ad-cfg").hidden = false; $("#ad-go").disabled = true; return; }
    $("#ad-form").addEventListener("submit", signIn);
    $("#ad-out").addEventListener("click", signOut);
    U.dialog($("#ad-dlg")); $("#ad-dlg .x-btn").innerHTML = icon("close", 2);
    ["#ad-q", "#ad-fs", "#ad-fl"].forEach(function (s) { $(s).addEventListener("input", renderApps); });
    $("#ad-fs").innerHTML += Object.keys(STATUSES).map(function (k) { return '<option value="' + k + '">' + esc(STATUSES[k]) + "</option>"; }).join("");
    $("#ad-csv").addEventListener("click", csv); $("#ad-reload").addEventListener("click", function () { loadApps().catch(function () {}); });
    session = load(); if (session) start();
  });
})();
