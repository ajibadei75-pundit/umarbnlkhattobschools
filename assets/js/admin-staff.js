/* Dashboard: Users and logins (super administrator) and My account (everyone signed in).
   Creating a login and resetting a password go through the server function "staff-admin"; the service key never reaches the browser. */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, $$ = U.$$, esc = U.esc, A = window.UBK_ADMIN, B = (window.UBK_SITE || {}).backend || {};
  if (!A) return;
  var ROLES = { teacher: "Teacher", bursar: "Bursar", viewer: "Viewer (read-only)", school_admin: "School administrator", admissions_officer: "Admissions officer", finance_officer: "Finance officer", content_editor: "Content editor", publicity_manager: "Publicity manager", super_admin: "Super administrator" };
  var WHAT = { teacher: "Marks attendance, enters scores, writes lesson notes and exams for the classes assigned to them.", bursar: "Records fees, issues receipts and sees who owes.", viewer: "Can look at the overview, attendance and fees. Cannot change anything.", school_admin: "Runs the school: pupils, classes, results, attendance, fees, content.", admissions_officer: "Handles admission applications.", finance_officer: "Fees and parent payment proofs.", content_editor: "News, events, gallery and leadership pages.", publicity_manager: "Runs the public face of the school: news, events, gallery, leadership, school details and session dates, Learning Centre.", super_admin: "Everything, including creating logins." };
  var PORTAL = { teacher: "teacher/", bursar: "bursar/", finance_officer: "bursar/" };
  var host, lastSlip = null;
  function rpc(n, b) { return A.api("POST", "/rest/v1/rpc/" + n, b || {}); }
  function portalUrl(role) { var base = location.href.replace(/[?#].*$/, "").replace(/(teacher|parent|student|bursar|admin)\/(index\.html)?$/, ""); return base + (PORTAL[role] || "admin/"); }
  function errText(j, st) {
    var e = j && j.error;
    return e === "email_exists" ? "That email already has a login. Use \"Give an existing login a role\" below." : e === "weak_password" ? "A password needs at least 10 characters." : e === "forbidden" ? "Only a super administrator can do this." : e === "bad_request" ? "Check the email and role." : e === "not_found" ? "That person is not on the staff list." : "Could not complete this. Try again." + (st === 404 ? " (The staff-admin function is not deployed.)" : "");
  }
  function call(body) {
    return A.fresh().then(function (tok) { return fetch(B.url + "/functions/v1/staff-admin", { method: "POST", headers: { apikey: B.key, Authorization: "Bearer " + tok, "Content-Type": "application/json" }, body: JSON.stringify(body) }); })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) { var e = new Error(errText(j, r.status)); e.handled = true; throw e; } return j; }); });
  }
  function say(el, ok, m) { if (el) { el.className = "result show " + (ok ? "ok" : "bad"); el.textContent = m; } }

  /* ---------- credential slip ---------- */
  function slip(j, title) {
    var url = portalUrl(j.role || "");
    var rows = [["Name", j.full_name || ""], ["Portal", url], ["Email", j.email || ""], ["Temporary password", j.password]].filter(function (r) { return r[1]; });
    var html = '<div class="slip"><h3>' + esc(title) + "</h3><dl>" + rows.map(function (r) { return "<dt>" + esc(r[0]) + "</dt><dd" + (r[0] === "Temporary password" ? ' class="pw"' : "") + ">" + esc(r[1]) + "</dd>"; }).join("") + "</dl><p>Sign in, open <b>My account</b> and choose a new password. Keep this paper private.</p></div>";
    return html;
  }
  function showSlip(out, j, title) {
    out.innerHTML = '<div class="form-card" style="margin-top:1rem"><p class="notice is-info"><span data-icon="alert"></span><span>The password is shown only now. Copy or print it before you leave this page.</span></p>' + slip(j, title) +
      '<div class="form-actions" style="margin-top:1rem"><button type="button" class="btn btn-primary btn-sm" id="sl-pr">Print slip</button><button type="button" class="btn btn-soft btn-sm" id="sl-cp">Copy details</button></div></div>';
    U.injectIcons && U.injectIcons(out);
    $("#sl-pr").addEventListener("click", function () { U.printHTML('<div class="ai-print"><h2>' + esc("Umar BN L Khattob Nursery & Primary School") + "</h2>" + slip(j, title) + "</div>"); });
    $("#sl-cp").addEventListener("click", function () { U.copyText("Portal: " + portalUrl(j.role || "") + "\nEmail: " + (j.email || "") + "\nTemporary password: " + j.password).then(function () { $("#sl-cp").textContent = "Copied"; }, function () {}); });
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- Users and logins ---------- */
  var PORTAL = { teacher: "Teacher portal (/teacher/)", bursar: "Bursar portal (/bursar/)", viewer: "Admin portal (/admin/), read-only", school_admin: "Admin portal (/admin/)", admissions_officer: "Admin portal (/admin/)", finance_officer: "Admin portal (/admin/)", content_editor: "Admin portal (/admin/)", publicity_manager: "Admin portal (/admin/)", super_admin: "Admin portal (/admin/)" };
  var duty = { ct: {}, st: {} };
  function dutyText(uid) {
    var c = duty.ct[uid] || [], t = duty.st[uid] || [];
    if (!c.length && !t.length) return '<small style="color:var(--text-muted)">None</small>';
    return (c.length ? "<div><b>Class teacher:</b> " + esc(c.join(", ")) + "</div>" : "") + (t.length ? "<div><b>Subject teacher:</b> " + esc(t.slice(0, 4).join(", ")) + (t.length > 4 ? " +" + (t.length - 4) + " more" : "") + "</div>" : "");
  }
  function loadDuty() {
    var soft = function (p) { return A.api("GET", p).catch(function () { return []; }); };
    return Promise.all([soft("/rest/v1/classes?select=id,name"), soft("/rest/v1/class_teachers?select=class_id,teacher_user_id"), soft("/rest/v1/subject_teachers?select=class_id,subject_id,teacher_user_id"), soft("/rest/v1/subjects?select=id,name")]).then(function (r) {
      var cn = {}, sn = {}; r[0].forEach(function (x) { cn[x.id] = x.name; }); r[3].forEach(function (x) { sn[x.id] = x.name; });
      duty = { ct: {}, st: {} };
      r[1].forEach(function (x) { (duty.ct[x.teacher_user_id] = duty.ct[x.teacher_user_id] || []).push(cn[x.class_id] || "?"); });
      r[2].forEach(function (x) { (duty.st[x.teacher_user_id] = duty.st[x.teacher_user_id] || []).push((sn[x.subject_id] || "Subject") + " (" + (cn[x.class_id] || "?") + ")"); });
    });
  }
  function open(h) {
    host = h; host.innerHTML = '<p class="count-line">Loading...</p>';
    Promise.all([rpc("admin_list_staff"), loadDuty()]).then(function (r) { draw(r[0]); }, function (e) { host.innerHTML = '<div class="notice"><span>' + esc(A.nice(e.message)) + "</span></div>"; });
  }
  function draw(list) {
    var order = ["teacher", "bursar", "viewer", "school_admin", "admissions_officer", "finance_officer", "content_editor", "publicity_manager", "super_admin"];
    host.innerHTML = '<h2 class="sec-title" style="font-size:1.4rem;margin:0 0 .4rem">Users and logins</h2><p class="count-line">Create a login for a teacher, the bursar or anyone else. They sign in at the portal shown on the slip.</p>' +
      '<div class="form-card"><h3 style="font-size:1.15rem;margin:0 0 1rem">Create a login</h3><form id="cl-form" novalidate><div class="form-grid"><div class="fld"><label for="cl-name">Full name</label><input class="input" id="cl-name" maxlength="80" autocomplete="off"></div><div class="fld"><label for="cl-email">Email</label><input class="input" id="cl-email" type="email" autocomplete="off"></div>' +
      '<div class="fld"><label for="cl-role">Role</label><select class="select-lg" id="cl-role">' + order.map(function (k) { return '<option value="' + k + '">' + esc(ROLES[k]) + "</option>"; }).join("") + '</select></div><div class="fld"><label for="cl-pw">Password (leave empty to make a strong one)</label><input class="input" id="cl-pw" type="text" autocomplete="off" maxlength="72" placeholder="At least 10 characters"></div></div>' +
      '<p class="count-line" id="cl-what" style="margin:.6rem 0 0"></p><div class="form-actions" style="margin-top:1rem"><button type="submit" class="btn btn-primary" id="cl-go">Create login</button></div><p class="result" id="cl-res" role="status"></p></form></div><div id="cl-out"></div>' +
      '<h3 style="font-size:1.15rem;margin:2.4rem 0 .8rem">What each role can do</h3><div class="role-grid">' + order.map(function (k) { return '<div class="role-card"><strong>' + esc(ROLES[k]) + '</strong><p>' + esc(WHAT[k] || '') + '</p><small>' + esc(PORTAL[k] || '') + '</small></div>'; }).join('') + '</div><div class="form-actions" style="margin-top:1rem"><button type="button" class="btn btn-soft btn-sm" id="st-assign">Assign class teachers and subject teachers</button></div>' +
      '<h3 style="font-size:1.15rem;margin:2.4rem 0 .8rem">People with staff access</h3><div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Classes and subjects</th><th>Status</th><th></th></tr></thead><tbody>' + list.map(function (s) {
        return "<tr><td>" + esc(s.full_name || "") + "</td><td>" + esc(s.email) + '</td><td><select class="select-lg st-role" data-role="' + esc(s.user_id) + '" aria-label="Role of ' + esc(s.email) + '" style="min-height:40px;padding:.3rem .6rem">' + order.map(function (k) { return '<option value="' + k + '"' + (k === s.role ? " selected" : "") + ">" + esc(ROLES[k]) + "</option>"; }).join("") + "</select></td><td>" + (s.role === "teacher" ? dutyText(s.user_id) : '<small style="color:var(--text-muted)">' + esc(PORTAL[s.role] || "") + "</small>") + "</td><td>" + (s.active ? "Active" : "<b>Disabled</b>") + '</td><td style="white-space:nowrap"><button type="button" class="btn btn-soft btn-sm" data-rs="' + esc(s.user_id) + '" data-em="' + esc(s.email) + '">Reset password</button> <button type="button" class="btn btn-soft btn-sm" data-u="' + esc(s.user_id) + '" data-a="' + (s.active ? 0 : 1) + '">' + (s.active ? "Disable" : "Enable") + "</button></td></tr>";
      }).join("") + '</tbody></table></div><p class="result" id="st-res" role="status"></p>' +
      '<details class="form-card" style="margin-top:1.6rem"><summary style="cursor:pointer;font-weight:700">Give an existing login a role</summary><p class="count-line" style="margin-top:.8rem">For someone who already has an account (for example one created in Supabase).</p><form id="st-form" novalidate><div class="form-grid"><div class="fld"><label for="st-email">Email</label><input class="input" id="st-email" type="email"></div><div class="fld"><label for="st-name">Full name</label><input class="input" id="st-name" maxlength="80"></div><div class="fld full"><label for="st-role">Role</label><select class="select-lg" id="st-role">' + order.map(function (k) { return '<option value="' + k + '">' + esc(ROLES[k]) + "</option>"; }).join("") + '</select></div></div><div class="form-actions"><button type="submit" class="btn btn-soft">Save access</button></div><div class="result" id="st-res2" role="status"></div></form></details>';
    $("#st-assign").addEventListener("click", function () {
      var t = $('#ad-tabs [data-tab="results"]'); if (!t) return; t.click();
      setTimeout(function () { var b = $('#p-results .rw-tabs [data-s="teachers"]'); if (b) b.click(); }, 150);
    });
    function what() { $("#cl-what").textContent = WHAT[$("#cl-role").value] || ""; } $("#cl-role").addEventListener("change", what); what();
    $("#cl-form").addEventListener("submit", function (e) {
      e.preventDefault(); var r = $("#cl-res"), b = $("#cl-go"), body = { action: "create", full_name: $("#cl-name").value.trim(), email: $("#cl-email").value.trim(), role: $("#cl-role").value, password: $("#cl-pw").value };
      if (!body.full_name) return say(r, false, "Enter the person's name."); b.disabled = true; say(r, true, "Creating the login...");
      call(body).then(function (j) { lastSlip = { j: j, t: "New login" }; refresh(); }, function (er) { say(r, false, er.handled ? er.message : "Could not reach the server."); }).then(function () { b.disabled = false; });
    });
    function refresh() { Promise.all([rpc("admin_list_staff"), loadDuty()]).then(function (r) { draw(r[0]); }); }
    if (lastSlip) { showSlip($("#cl-out"), lastSlip.j, lastSlip.t); lastSlip = null; }
    $$("[data-u]", host).forEach(function (b) { b.addEventListener("click", function () { rpc("admin_set_staff_active", { p_user: b.getAttribute("data-u"), p_active: b.getAttribute("data-a") === "1" }).then(function () { open(host); }, function (e) { say($("#st-res"), false, A.nice(e.message)); }); }); });
    $$("[data-rs]", host).forEach(function (b) { b.addEventListener("click", function () { if (!confirm("Make a new password for " + b.getAttribute("data-em") + "? The old one stops working.")) return; call({ action: "reset", user_id: b.getAttribute("data-rs") }).then(function (j) { showSlip($("#cl-out"), { email: b.getAttribute("data-em"), password: j.password, role: (list.filter(function (s) { return s.user_id === b.getAttribute("data-rs"); })[0] || {}).role }, "New password"); }, function (er) { say($("#st-res"), false, er.handled ? er.message : "Could not reach the server."); }); }); });
    $$("[data-role]", host).forEach(function (s) { s.addEventListener("change", function () { var row = list.filter(function (x) { return x.user_id === s.getAttribute("data-role"); })[0]; rpc("admin_add_staff", { p_email: row.email, p_role: s.value, p_name: row.full_name || "" }).then(function () { say($("#st-res"), true, "Role changed for " + row.email + "."); row.role = s.value; }, function (e) { say($("#st-res"), false, A.nice(e.message)); s.value = row.role; }); }); });
    $("#st-form").addEventListener("submit", function (e) { e.preventDefault(); var r = $("#st-res2"); rpc("admin_add_staff", { p_email: $("#st-email").value, p_role: $("#st-role").value, p_name: $("#st-name").value }).then(function () { open(host); }, function (er) { say(r, false, A.nice(er.message)); }); });
  }

  /* ---------- My account ---------- */
  function account(h) {
    h.innerHTML = '<h2 class="sec-title" style="font-size:1.4rem;margin:0 0 .4rem">My account</h2><p class="count-line">' + esc(A.email ? A.email() : "") + " · " + esc(ROLES[A.role()] || A.role() || "") + '</p>' +
      '<div class="form-card" style="max-width:520px"><h3 style="font-size:1.15rem;margin:0 0 1rem">Change my password</h3><form id="ac-form" novalidate><div class="fld"><label for="ac-p1">New password (at least 10 characters)</label><input class="input" id="ac-p1" type="password" autocomplete="new-password" minlength="10"></div><div class="fld" style="margin-top:1rem"><label for="ac-p2">Type it again</label><input class="input" id="ac-p2" type="password" autocomplete="new-password"></div><div class="form-actions" style="margin-top:1.2rem"><button type="submit" class="btn btn-primary" id="ac-go">Save new password</button></div><p class="result" id="ac-res" role="status"></p></form></div>';
    $("#ac-form").addEventListener("submit", function (e) {
      e.preventDefault(); var r = $("#ac-res"), a = $("#ac-p1").value, b = $("#ac-p2").value;
      if (a.length < 10) return say(r, false, "Use at least 10 characters."); if (a !== b) return say(r, false, "The two passwords are not the same.");
      $("#ac-go").disabled = true;
      A.fresh().then(function (tok) { return fetch(B.url + "/auth/v1/user", { method: "PUT", headers: { apikey: B.key, Authorization: "Bearer " + tok, "Content-Type": "application/json" }, body: JSON.stringify({ password: a }) }); })
        .then(function (res) { return res.json().catch(function () { return {}; }).then(function (j) { if (!res.ok) throw new Error(j.msg || j.message || j.error_description || "failed"); say(r, true, "Your password has been changed."); $("#ac-p1").value = ""; $("#ac-p2").value = ""; }); })
        .catch(function (er) { say(r, false, /same|different/i.test(er.message) ? "Choose a password you have not used before." : /weak|short|length/i.test(er.message) ? "That password is too weak. Add more characters." : "Could not change the password. Sign out, sign in again and retry."); }).then(function () { $("#ac-go").disabled = false; });
    });
  }
  A.staffUsers = open; A.account = account;
})();
