/* Staff dashboard (English only for now): sign-in with Supabase Auth, role-aware tabs, admissions manager,
   staff roles. Every action is enforced by the database (row level security + audited functions); hiding a button
   here is only a convenience. The session lives in this browser tab only (sessionStorage) and ends when it closes. */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, $$ = U.$$, esc = U.esc, icon = U.icon;
  var B = (window.UBK_SITE || {}).backend || {}, KEY = "ubk-session";
  var STATUSES = { submitted: "Received", under_review: "Under review", more_info_needed: "More information needed", offered: "Place offered", declined: "Not offered a place", withdrawn: "Withdrawn" };
  var ROLES = { super_admin: "Super administrator", school_admin: "School administrator", admissions_officer: "Admissions officer", finance_officer: "Finance officer", content_editor: "Content editor", publicity_manager: "Publicity manager", teacher: "Teacher", bursar: "Bursar", viewer: "Viewer" };
  var session = null, role = null, apps = [], tab = "overview", setupOpen = false;

  /* ---------- session ---------- */
  /* "Stay signed in on this phone" (teacher portal checkbox, off by default elsewhere): the session is also kept in localStorage so the
     teacher's saved work stays reachable after the screen turns off, the tab is closed or the phone is offline. Signing out clears both. */
  function keepIn() { try { return localStorage.getItem("ubk-keepin") === "1"; } catch (e) { return false; } }
  function load() { try { return JSON.parse(sessionStorage.getItem(KEY) || (keepIn() ? localStorage.getItem(KEY) : "") || "null"); } catch (e) { return null; } }
  function save(s) {
    session = s;
    try { if (s) sessionStorage.setItem(KEY, JSON.stringify(s)); else sessionStorage.removeItem(KEY); } catch (e) {}
    try { if (s && keepIn()) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY); } catch (e) {}
  }
  var offline = false;
  function roleKey() { return "ubk-role:" + ((session && session.email) || ""); }
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
    return authCall("token?grant_type=refresh_token", { refresh_token: session.refresh }).then(function (j) { adopt(j); return session.access; }, function (e) { if (e.status) save(null); throw e; });   /* no status = no network: keep the session so saved work stays available */
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
  var ADM = ["super_admin", "school_admin", "admissions_officer"], CMS = ["super_admin", "school_admin", "content_editor", "publicity_manager"];

  /* ---------- sign in / out ---------- */
  function showLogin(msg) {
    $("#ad-login").hidden = false; $("#ad-app").hidden = true;
    var r = $("#ad-result"); r.className = msg ? "result show bad" : "result"; r.textContent = msg || "";
  }
  (function () {
    var h = location.hash || "";
    if (/error_code=otp_expired|error=access_denied/.test(h)) {
      setTimeout(function () { var r = $("#ad-result"); if (r) { r.className = "result show bad"; r.textContent = "That confirmation link has expired or was already used. Just sign in with your email and password. If it says the email is not confirmed, ask the person who manages Supabase to confirm the account."; } }, 0);
      try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    }
  })();
  function start() {
    rpc("staff_role").then(function (r) {
      role = r;
      if (!role) {
        if (setupOpen && $("#ad-setup")) { showSetup(true); return; }
        save(null); showLogin("This account is not set up as school staff. Ask a super administrator to add you."); return;
      }
      var allow = ($("#ad-app").getAttribute("data-allow") || "").split(",").filter(Boolean);
      if (allow.length && allow.indexOf(role) < 0) { var r0 = role; save(null); role = null; showLogin("This account (" + (ROLES[r0] || r0) + ") belongs to a different portal. " + (r0 === "teacher" ? "Use /teacher." : "Use /admin.")); return; }
      try { localStorage.setItem(roleKey(), role); } catch (e) {}
      enter();
    }, function (err) {
      var cached = null; try { cached = localStorage.getItem(roleKey()); } catch (e) {}
      if (err && !err.status && session && cached) { offline = true; role = cached; enter(); return; }   /* offline: open the saved work on this phone */
      save(null); showLogin("");
    });
  }
  function enter() {
    $("#ad-login").hidden = true; $("#ad-app").hidden = false;
    $("#ad-who").textContent = (session.email || "") + " · " + ROLES[role] + (offline ? " · offline" : "");
    var bn = $("#ad-offline");
    if (offline) {
      if (!bn) { bn = document.createElement("p"); bn.id = "ad-offline"; bn.className = "notice is-info"; bn.setAttribute("role", "status"); $("#ad-tabs").parentNode.insertBefore(bn, $("#ad-tabs")); }
      bn.textContent = "You are offline. Your saved notes are on this phone. Anything you change is kept here and uploads by itself when you are back online.";
      window.addEventListener("online", function () { location.reload(); });
    } else if (bn) bn.remove();
    buildTabs();
  }
  function signIn(e) {
    e.preventDefault();
    var em = $("#ad-email").value.trim(), pw = $("#ad-pass").value;
    if (!em || !pw) { showLogin("Enter your email and password."); return; }
    $("#ad-go").disabled = true;
    var kp = $("#ad-keep"); if (kp) { try { localStorage.setItem("ubk-keepin", kp.checked ? "1" : "0"); } catch (e) {} }
    authCall("token?grant_type=password", { email: em, password: pw }).then(function (j) { adopt(j); $("#ad-pass").value = ""; start(); },
      function (err) { showLogin(err.status === 400 || err.status === 401 ? "Email or password is not correct." : "Could not sign in. Check your connection and try again."); })
      .then(function () { $("#ad-go").disabled = false; });
  }
  function signOut() {
    var tok = session && session.access, rk = roleKey(); save(null); role = null; apps = []; try { localStorage.removeItem("ubk-keepin"); localStorage.removeItem(rk); } catch (e) {}
    if (tok) fetch(B.url + "/auth/v1/logout", { method: "POST", headers: baseHeaders(tok) }).catch(function () {});
    showLogin("");
  }


  /* ---------- first-time setup: the very first administrator (closes itself once any staff exists) ---------- */
  function suSay(ok, m) { var r = $("#su-res"); r.className = "result show " + (ok ? "ok" : "bad"); r.textContent = m; }
  function showSetup(signedIn) {
    $("#ad-setup").hidden = false; $("#ad-app").hidden = true;
    if (signedIn) { $("#ad-login").hidden = true; $("#su-ef").hidden = true; $("#su-pf").hidden = true; $("#su-go").textContent = "Claim administrator access"; $("#su-lead").textContent = "You are signed in as " + (session && session.email) + ". Enter the setup code to become the administrator."; }
  }
  function claim(code, name) {
    return rpc("claim_first_admin", { p_code: code, p_name: name || null }).then(function (r) {
      if (r === "ok") { setupOpen = false; $("#ad-setup").hidden = true; start(); return; }
      suSay(false, r === "bad_code" ? "That setup code is not correct." : r === "closed" ? "An administrator already exists. Sign in instead." : r === "rate" ? "Too many tries. Please wait a little." : "Could not complete setup.");
    }, function () { suSay(false, "Could not complete setup. Check your connection and try again."); });
  }
  function setupSubmit(e) {
    e.preventDefault(); var name = $("#su-name").value.trim(), code = $("#su-code").value.replace(/[\s-]+/g, "").toUpperCase();
    if (!code) return suSay(false, "Enter the setup code.");
    $("#su-go").disabled = true;
    var done = function () { $("#su-go").disabled = false; };
    if (session) { claim(code, name).then(done); return; }
    var em = $("#su-email").value.trim(), pw = $("#su-pass").value;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) { done(); return suSay(false, "Enter a valid email."); }
    if (pw.length < 10) { done(); return suSay(false, "Use a password of at least 10 characters."); }
    fetch(B.url + "/functions/v1/setup-admin", { method: "POST", headers: baseHeaders(), body: JSON.stringify({ email: em, password: pw, name: name, code: code }) }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var m = { bad_code: "That setup code is not right. Check it and try again.", closed: "Setup is already finished. Sign in above.", rate: "Too many wrong tries. Wait an hour and try again.", email_exists: "That email already has an account. Sign in above, then enter the setup code.", finish_failed: "The account could not be finished. Please try again; if it repeats, tell your developer.", failed: "Setup could not start. Please try again.", create_failed: "The account could not be created. Please try again.", weak_password: "Use a password of at least 10 characters.", bad_email: "Enter a valid email." }; throw new Error(m[j.error] || "Could not finish setup. Please try again."); }
        return authCall("token?grant_type=password", { email: em, password: pw }).then(function (t) { adopt(t); $("#ad-setup").hidden = true; start(); });
      });
    }).catch(function (er) { suSay(false, er.message); }).then(done);
  }

  /* ---------- tabs ---------- */
  function buildTabs() {
    var tabs = role === "teacher" ? [] : [["overview", "Overview"]];
    if (role === "teacher") tabs.push(["myclasses", "My classes"]);
    if (can(["super_admin", "school_admin", "teacher"])) tabs.push(["timetable", "Timetable"]);
    if (role === "teacher") tabs.push(["lessons", "Lesson notes"]);
    if (can(["super_admin", "school_admin"])) { tabs.push(["topics", "Weekly topics"]); tabs.push(["approvals", "Note approvals"]); }
    if (can(["super_admin", "school_admin", "teacher", "viewer"])) tabs.push(["attendance", "Attendance"]);
    if (can(["super_admin", "school_admin", "teacher"])) tabs.push(["aitools", "Teacher tools"]);
    if (can(ADM)) tabs.push(["admissions", "Admissions manager"]);
    if (can(CMS)) tabs.push(["content", "Website content"]);
    if (can(["super_admin", "school_admin"])) { tabs.push(["results", "Results and reports"]); tabs.push(["people", "Pupils and parents"]); }
    if (can(["super_admin", "school_admin"])) tabs.push(["pins", "Student PINs"]);
    if (can(CMS)) tabs.push(["media", "Gallery and leadership"]);
    if (can(["super_admin", "school_admin"])) tabs.push(["resources", "School resources"]);
    if (can(["super_admin", "school_admin", "teacher"])) tabs.push(["learning", "Learning Centre"]);
    if (can(["super_admin", "school_admin", "bursar", "finance_officer", "viewer"])) tabs.push(["bursar", "Fees and receipts"]);
    if (can(["super_admin", "school_admin", "bursar", "finance_officer"])) tabs.push(["payments", "Parent payment proofs"]);
    if (can(["super_admin", "school_admin", "bursar", "finance_officer"])) tabs.push(["backup", "Backup and import"]);
    if (can(["super_admin"])) tabs.push(["staff", "Users and logins"]);
    tabs.push(["account", "My account"]);
    if (offline) tabs = tabs.filter(function (x) { return x[0] === "aitools" || x[0] === "account"; });
    var only = ($("#ad-app").getAttribute("data-tabs") || "").split(",").filter(Boolean);
    if (only.length) tabs = tabs.filter(function (x) { return only.indexOf(x[0]) >= 0; });
    if (!tabs.length) { $("#ad-tabs").innerHTML = ""; return; }
    var IC = { timetable: "grid", lessons: "book", topics: "list", approvals: "shield", overview: "grid", admissions: "family", content: "news", people: "users", staff: "shield", myclasses: "book", results: "list", aitools: "news", payments: "list", bursar: "list", attendance: "family", learning: "book", pins: "shield", media: "grid", resources: "book", backup: "download", account: "users" };
    $("#ad-tabs").innerHTML = tabs.map(function (x) { return '<button type="button" role="tab" data-tab="' + x[0] + '" aria-selected="false">' + icon(IC[x[0]] || "list") + "<span>" + esc(x[1]) + "</span></button>"; }).join("");
    $$("#ad-tabs button").forEach(function (b, i, all) {
      b.addEventListener("click", function () { go(b.getAttribute("data-tab")); });
      b.addEventListener("keydown", function (e) {
        var k = e.key, n = k === "ArrowDown" || k === "ArrowRight" ? i + 1 : k === "ArrowUp" || k === "ArrowLeft" ? i - 1 : k === "Home" ? 0 : k === "End" ? all.length - 1 : -1;
        if (n < 0) return; e.preventDefault(); n = (n + all.length) % all.length; all[n].focus(); go(all[n].getAttribute("data-tab"));
      });
    });
    var h = (location.hash || "").slice(1);
    setTimeout(function () { if (window.UBK_ADMIN.alerts) window.UBK_ADMIN.alerts(); }, 300);
    go(tabs.some(function (x) { return x[0] === h; }) ? h : tabs[0][0]);
  }
  function go(t) {
    tab = t;
    $$("#ad-tabs button").forEach(function (b) { var on = b.getAttribute("data-tab") === t; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; });
    var cur = $('#ad-tabs [aria-selected="true"]'); if (cur && cur.scrollIntoView && window.innerWidth < 900) try { cur.scrollIntoView({ block: "nearest", inline: "center" }); } catch (e) {}
    $$(".ad-main > [role=tabpanel]").forEach(function (el) { el.hidden = el.id !== "p-" + t; });
    try { history.replaceState(null, "", "#" + t); } catch (e) {}
    if (t === "overview") overview(); if (t === "admissions") loadApps(); if (t === "content" && window.UBK_ADMIN.content) window.UBK_ADMIN.content($("#p-content")); if (t === "people" && window.UBK_ADMIN.people) window.UBK_ADMIN.people($("#p-people")); if (t === "myclasses" && window.UBK_ADMIN.teach) window.UBK_ADMIN.teach($("#p-myclasses")); if (t === "results" && window.UBK_ADMIN.results) window.UBK_ADMIN.results($("#p-results")); if (t === "aitools" && window.UBK_ADMIN.aitools) window.UBK_ADMIN.aitools($("#p-aitools")); if (t === "payments" && window.UBK_ADMIN.payments) window.UBK_ADMIN.payments($("#p-payments")); if (t === "attendance" && window.UBK_ADMIN.attendance) window.UBK_ADMIN.attendance($("#p-attendance")); if (t === "bursar" && window.UBK_ADMIN.bursar) window.UBK_ADMIN.bursar($("#p-bursar")); if (t === "learning" && window.UBK_ADMIN.learning) window.UBK_ADMIN.learning($("#p-learning")); if (t === "staff" && window.UBK_ADMIN.staffUsers) window.UBK_ADMIN.staffUsers($("#p-staff")); if (t === "account" && window.UBK_ADMIN.account) window.UBK_ADMIN.account($("#p-account")); if (t === "pins" && window.UBK_ADMIN.pins) window.UBK_ADMIN.pins($("#p-pins")); if (t === "resources" && window.UBK_ADMIN.resources) window.UBK_ADMIN.resources($("#p-resources")); if (t === "backup" && window.UBK_ADMIN.backupTab) window.UBK_ADMIN.backupTab($("#p-backup")); if (t === "media" && window.UBK_ADMIN.media) window.UBK_ADMIN.media($("#p-media"));
    if (window.UBK_ADMIN.tabs && window.UBK_ADMIN.tabs[t]) window.UBK_ADMIN.tabs[t]($("#p-" + t));
  }

  /* ---------- overview ---------- */
  function overview() {
    var host = $("#p-overview");
    if (can(["super_admin", "school_admin", "viewer"]) && window.UBK_ADMIN.stats) return window.UBK_ADMIN.stats(host);
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



  function uid() { try { return JSON.parse(atob(session.access.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).sub; } catch (e) { return null; } }
  window.UBK_ADMIN = { offline: function () { return offline; }, email: function () { return session && session.email || ""; }, api: api, fresh: fresh, nice: nice, can: can, role: function () { return role; }, uid: uid, rpc: rpc };
  U.init(function () {
    if (!B.url || !B.key) { $("#ad-cfg").hidden = false; $("#ad-go").disabled = true; return; }
    $("#ad-form").addEventListener("submit", signIn);
    if ($("#ad-setup")) { $("#su-form").addEventListener("submit", setupSubmit); fetch(B.url + "/rest/v1/rpc/setup_open", { method: "POST", headers: { apikey: B.key, "Content-Type": "application/json" }, body: "{}" }).then(function (r) { return r.json(); }).then(function (o) { setupOpen = o === true; if (setupOpen && !session) $("#ad-setup").hidden = false; }).catch(function () {}); }
    $("#ad-out").addEventListener("click", signOut);
    U.dialog($("#ad-dlg")); $("#ad-dlg .x-btn").innerHTML = icon("close", 2);
    if ($("#ad-q")) {   /* the admissions manager exists only on the admin page */
      ["#ad-q", "#ad-fs", "#ad-fl"].forEach(function (s) { $(s).addEventListener("input", renderApps); });
      $("#ad-fs").innerHTML += Object.keys(STATUSES).map(function (k) { return '<option value="' + k + '">' + esc(STATUSES[k]) + "</option>"; }).join("");
      $("#ad-csv").addEventListener("click", csv); $("#ad-reload").addEventListener("click", function () { loadApps().catch(function () {}); });
    }
    session = load(); if (session) start();
  });
})();
