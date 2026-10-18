/* Dashboard: pupils and parent accounts. Staff (super administrator, school administrator) add pupils, create parent
   access, and link each parent to their own children. Parents then see only the children linked here. */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, $$ = U.$$, esc = U.esc;
  var A = window.UBK_ADMIN; if (!A) return;
  var LEVELS = { nursery: "Nursery", primary: "Primary", secondary: "Secondary" };
  var host, pupils = [], parents = [], admissions = [];

  function lvlOpts(sel) { return Object.keys(LEVELS).map(function (k) { return '<option value="' + k + '"' + (k === sel ? " selected" : "") + ">" + LEVELS[k] + "</option>"; }).join(""); }
  function note(el, ok, msg) { el.className = "result show " + (ok ? "ok" : "bad"); el.textContent = msg; }
  function nice(m) {
    if (/user_not_found/.test(m)) return "No account with that email. Create the user in Supabase (Authentication, Add user) first, then add them here.";
    if (/duplicate key/.test(m)) return "That child is already linked to this parent.";
    return A.nice(m);
  }

  var classes = [];
  function clsOpts(sel, blank) { return (blank ? '<option value="">' + blank + "</option>" : "") + classes.map(function (c) { return '<option value="' + esc(c.id) + '"' + (sel === c.id ? " selected" : "") + ">" + esc(c.name) + "</option>"; }).join(""); }
  function sexOpts(sel) { return '<option value="">Not set</option><option value="M"' + (sel === "M" ? " selected" : "") + ">Male</option><option value=\"F\"" + (sel === "F" ? " selected" : "") + ">Female</option>"; }
  function load() {
    host.innerHTML = '<p class="count-line">Loading...</p>';
    return Promise.all([
      A.api("GET", "/rest/v1/students?select=*&order=first_name.asc&limit=2000"),
      A.api("GET", "/rest/v1/classes?select=id,name,level,section&order=section.desc,sort.asc,name.asc"),
      A.api("POST", "/rest/v1/rpc/admin_list_parents", {}),
      A.api("GET", "/rest/v1/admissions?select=id,reference,child_first_name,child_last_name,level,status&order=created_at.desc&limit=500")
    ]).then(function (r) { pupils = r[0] || []; classes = r[1] || []; parents = r[2] || []; admissions = r[3] || []; render(); },
      function (e) { host.innerHTML = '<div class="notice"><span>' + esc(nice(e.message)) + "</span></div>"; });
  }
  function render() {
    var enrolled = {}; pupils.forEach(function (p) { if (p.admission_id) enrolled[p.admission_id] = 1; });
    var open = admissions.filter(function (a) { return !enrolled[a.id] && a.status !== "declined" && a.status !== "withdrawn"; });
    var active = pupils.filter(function (p) { return p.active; });
    host.innerHTML =
      '<h2 class="sec-title" style="font-size:1.15rem">Pupils (' + pupils.length + ')</h2>' +
      (pupils.length ? '<div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>Name</th><th>Student ID</th><th>Class</th><th>Status</th></tr></thead><tbody>' + pupils.map(function (p) {
        return '<tr tabindex="0" data-p="' + esc(p.id) + '"><td><strong>' + esc(p.first_name + " " + p.last_name) + "</strong></td><td>" + esc(p.student_code || "") + "</td><td>" + esc(p.class_name || "Not assigned") + "</td><td>" + (p.active ? "Active" : "Inactive") + "</td></tr>";
      }).join("") + "</tbody></table></div>" : '<div class="empty"><p>No pupils yet. Add one below or enrol from an application.</p></div>') +
      '<div class="two-col" style="margin-top:1.4rem"><div class="form-card"><h3 style="font-size:1.05rem;margin:0 0 .6rem">Add a pupil</h3><form id="pe-add" novalidate><div class="form-grid">' +
      '<div class="fld"><label for="pe-fn">First name</label><input class="input" id="pe-fn" maxlength="60"></div><div class="fld"><label for="pe-ln">Last name</label><input class="input" id="pe-ln" maxlength="60"></div>' +
      '<div class="fld"><label for="pe-cl">Class</label><select class="select-lg" id="pe-cl">' + clsOpts("", "Choose a class...") + '</select></div><div class="fld"><label for="pe-sx">Sex</label><select class="select-lg" id="pe-sx">' + sexOpts("") + '</select></div></div>' +
      '<div class="form-actions" style="margin-top:1rem"><button class="btn btn-primary btn-sm" type="submit">Add pupil</button></div><div class="result" id="pe-res" role="status"></div></form></div>' +
      '<div class="form-card"><h3 style="font-size:1.05rem;margin:0 0 .6rem">Enrol from an application</h3><p class="count-line">Creates the pupil from the application details. Choose it only after the school has offered the place.</p>' +
      '<form id="pe-enrol" novalidate><div class="fld"><label for="pe-ad">Application</label><select class="select-lg" id="pe-ad"><option value="">Choose...</option>' + open.map(function (a) { return '<option value="' + esc(a.id) + '">' + esc(a.reference + " · " + a.child_first_name + " " + a.child_last_name + " (" + a.status.replace(/_/g, " ") + ")") + "</option>"; }).join("") + '</select></div>' +
      '<div class="form-actions" style="margin-top:1rem"><button class="btn btn-primary btn-sm" type="submit">Enrol pupil</button></div><div class="result" id="pe-res2" role="status"></div></form></div></div>' +

      '<h2 class="sec-title" style="font-size:1.15rem;margin-top:2.4rem">Parent accounts (' + parents.length + ')</h2>' +
      (parents.length ? '<div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>Parent</th><th>Linked children</th><th>Link a child</th><th>Access</th></tr></thead><tbody>' + parents.map(function (p) {
        return '<tr><td><strong>' + esc(p.full_name || "") + "</strong><br><small>" + esc(p.email) + "</small></td><td>" +
          (p.children.length ? p.children.map(function (c) { return '<span class="chip-pill">' + esc(c.name) + ' <button type="button" class="x-mini" data-unlink="' + esc(c.link) + '" aria-label="Unlink ' + esc(c.name) + '">&times;</button></span>'; }).join(" ") : "<em>None</em>") + "</td>" +
          '<td><div class="pe-link"><select class="select-lg" data-sel="' + esc(p.user_id) + '" aria-label="Child to link to ' + esc(p.email) + '"><option value="">Choose...</option>' + active.map(function (s) { return '<option value="' + esc(s.id) + '">' + esc(s.first_name + " " + s.last_name + " (" + LEVELS[s.level] + ")") + "</option>"; }).join("") + '</select><button type="button" class="btn btn-soft btn-sm" data-link="' + esc(p.user_id) + '">Link</button></div></td>' +
          "<td>" + (p.active ? "Active " : "Disabled ") + '<button type="button" class="btn btn-soft btn-sm" data-act="' + esc(p.user_id) + '" data-v="' + (p.active ? 0 : 1) + '">' + (p.active ? "Disable" : "Enable") + "</button></td></tr>";
      }).join("") + "</tbody></table></div>" : '<div class="empty"><p>No parent accounts yet.</p></div>') +
      '<div class="form-card" style="margin-top:1.4rem"><h3 style="font-size:1.05rem;margin:0 0 .3rem">Give a parent access</h3><p class="count-line">Create the user in Supabase first (Authentication, Add user, with a password you give the parent), then add their email here and link their children.</p>' +
      '<form id="pa-add" novalidate><div class="form-grid"><div class="fld"><label for="pa-em">Email</label><input class="input" id="pa-em" type="email"></div><div class="fld"><label for="pa-nm">Full name</label><input class="input" id="pa-nm" maxlength="100"></div></div>' +
      '<div class="form-actions" style="margin-top:1rem"><button class="btn btn-primary btn-sm" type="submit">Save parent access</button></div><div class="result" id="pa-res" role="status"></div></form></div>';
    bind();
  }
  function bind() {
    $$("tr[data-p]", host).forEach(function (tr) {
      function open() { editPupil(tr.getAttribute("data-p")); }
      tr.addEventListener("click", open); tr.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    });
    $("#pe-add").addEventListener("submit", function (e) {
      e.preventDefault(); var r = $("#pe-res"), fn = $("#pe-fn").value.trim(), ln = $("#pe-ln").value.trim();
      if (!fn || !ln) { note(r, false, "Enter the first and last name."); return; }
      var c = classes.filter(function (x) { return x.id === $("#pe-cl").value; })[0]; if (!c) { note(r, false, "Choose the class. Add classes under Results and reports."); return; }
      A.api("POST", "/rest/v1/students", { first_name: fn, last_name: ln, class_id: c.id, level: c.level, sex: $("#pe-sx").value || null }, { Prefer: "return=minimal" }).then(load, function (er) { note(r, false, nice(er.message)); });
    });
    $("#pe-enrol").addEventListener("submit", function (e) {
      e.preventDefault(); var r = $("#pe-res2"), id = $("#pe-ad").value; if (!id) { note(r, false, "Choose an application."); return; }
      A.api("POST", "/rest/v1/rpc/admin_enrol_from_admission", { p_admission: id }).then(load, function (er) { note(r, false, nice(er.message)); });
    });
    $("#pa-add").addEventListener("submit", function (e) {
      e.preventDefault(); var r = $("#pa-res"), em = $("#pa-em").value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { note(r, false, "Enter a valid email."); return; }
      A.api("POST", "/rest/v1/rpc/admin_add_parent", { p_email: em, p_name: $("#pa-nm").value }).then(load, function (er) { note(r, false, nice(er.message)); });
    });
    $$("[data-link]", host).forEach(function (b) { b.addEventListener("click", function () {
      var uid = b.getAttribute("data-link"), sel = host.querySelector('[data-sel="' + uid + '"]'); if (!sel.value) { sel.focus(); return; }
      b.disabled = true; A.api("POST", "/rest/v1/parent_students", { parent_user_id: uid, student_id: sel.value }, { Prefer: "return=minimal" }).then(load, function (er) { b.disabled = false; alert(nice(er.message)); });
    }); });
    $$("[data-unlink]", host).forEach(function (b) { b.addEventListener("click", function () {
      if (!confirm("Remove this child from the parent's account?")) return;
      A.api("DELETE", "/rest/v1/parent_students?id=eq." + encodeURIComponent(b.getAttribute("data-unlink"))).then(load, function (er) { alert(nice(er.message)); });
    }); });
    $$("[data-act]", host).forEach(function (b) { b.addEventListener("click", function () {
      A.api("PATCH", "/rest/v1/parents?user_id=eq." + encodeURIComponent(b.getAttribute("data-act")), { active: b.getAttribute("data-v") === "1" }, { Prefer: "return=minimal" }).then(load, function (er) { alert(nice(er.message)); });
    }); });
  }
  function editPupil(id) {
    var p = pupils.filter(function (x) { return x.id === id; })[0]; if (!p) return;
    $("#ad-dlg-t").textContent = "Edit pupil: " + p.first_name + " " + p.last_name;
    $("#ad-dlg-b").innerHTML = '<form id="pu-form" novalidate><div class="form-grid"><div class="fld"><label for="pu-fn">First name</label><input class="input" id="pu-fn" maxlength="60" value="' + esc(p.first_name) + '"></div><div class="fld"><label for="pu-ln">Last name</label><input class="input" id="pu-ln" maxlength="60" value="' + esc(p.last_name) + '"></div>' +
      '<div class="fld"><label for="pu-cl">Class</label><select class="select-lg" id="pu-cl">' + clsOpts(p.class_id, "Not assigned") + '</select></div><div class="fld"><label for="pu-sx">Sex</label><select class="select-lg" id="pu-sx">' + sexOpts(p.sex) + '</select></div><div class="fld full"><p class="count-line">Student ID: <strong>' + esc(p.student_code || "") + '</strong>. Parents use it with the name to look up a released result.</p></div>' +
      '<div class="fld full"><label class="check"><input type="checkbox" id="pu-act"' + (p.active ? " checked" : "") + '> Active pupil (inactive pupils are hidden from parents)</label></div></div>' +
      '<div class="form-actions" style="margin-top:1rem"><button class="btn btn-primary" type="submit">Save</button></div><div class="result" id="pu-res" role="status"></div></form>';
    $("#pu-form").addEventListener("submit", function (e) {
      e.preventDefault(); var r = $("#pu-res"), fn = $("#pu-fn").value.trim(), ln = $("#pu-ln").value.trim(); if (!fn || !ln) { note(r, false, "Enter the first and last name."); return; }
      A.api("PATCH", "/rest/v1/students?id=eq." + encodeURIComponent(id), { first_name: fn, last_name: ln, class_id: $("#pu-cl").value || null, sex: $("#pu-sx").value || null, active: $("#pu-act").checked }, { Prefer: "return=minimal" })
        .then(function () { $("#ad-dlg").close(); load(); }, function (er) { note(r, false, nice(er.message)); });
    });
    U.openDialog($("#ad-dlg"));
  }
  A.people = function (h) { host = h; load(); };
})();
