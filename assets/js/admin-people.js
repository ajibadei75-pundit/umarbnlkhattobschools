/* Dashboard: Pupils and parents. The student register (admin-students.js), enrolment from applications, and parent accounts
   linked to their own children. Parents then see only the children linked here. */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, $$ = U.$$, esc = U.esc, A = window.UBK_ADMIN;
  if (!A) return;
  var LEVELS = { nursery: "Nursery", primary: "Primary", secondary: "Secondary" };
  var host, sub = "students", pupils = [], parents = [], admissions = [], classes = [];

  function note(el, ok, msg) { el.className = "result show " + (ok ? "ok" : "bad"); el.textContent = msg; }
  function nice(m) {
    if (/user_not_found/.test(m)) return "No account with that email. Create the user in Supabase (Authentication, Add user) first, then add them here.";
    if (/students_admission_no_uq|duplicate key.*admission/.test(m)) return "That admission number is already used by another pupil.";
    if (/duplicate key/.test(m)) return "That child is already linked to this parent.";
    return A.nice(m);
  }
  function clsOpts(sel, blank) { return '<option value="">' + blank + "</option>" + classes.map(function (c) { return '<option value="' + esc(c.id) + '"' + (sel === c.id ? " selected" : "") + ">" + esc(c.name) + "</option>"; }).join(""); }
  function sexOpts(sel) { return '<option value="">Not set</option><option value="male"' + (sel === "male" ? " selected" : "") + '>Male</option><option value="female"' + (sel === "female" ? " selected" : "") + ">Female</option>"; }
  function btn(act, v, label) { return '<button type="button" class="btn btn-soft btn-sm" data-' + act + '="' + esc(v) + '">' + label + "</button>"; }

  function load() {
    host.innerHTML = '<p class="count-line">Loading...</p>';
    return Promise.all([
      A.api("GET", "/rest/v1/students?select=*&order=last_name.asc&limit=3000"),
      A.api("GET", "/rest/v1/classes?select=id,name,level,section&order=section.desc,sort.asc,name.asc"),
      A.api("POST", "/rest/v1/rpc/admin_list_parents", {}),
      A.api("GET", "/rest/v1/admissions?select=id,reference,child_first_name,child_last_name,level,class_applying,status&order=created_at.desc&limit=500")
    ]).then(function (r) { pupils = r[0] || []; classes = r[1] || []; parents = r[2] || []; admissions = r[3] || []; render(); },
      function (e) { host.innerHTML = '<div class="notice"><span>' + esc(nice(e.message)) + "</span></div>"; });
  }
  function render() {
    host.innerHTML = '<div class="level-tabs rw-tabs" role="tablist" aria-label="People">' + [["students", "Student register (" + pupils.length + ")"], ["parents", "Parent accounts (" + parents.length + ")"]].map(function (x) { return '<button type="button" role="tab" data-s="' + x[0] + '" aria-selected="' + (x[0] === sub) + '">' + esc(x[1]) + "</button>"; }).join("") + '</div><div id="pp-body"></div>';
    $$(".rw-tabs button", host).forEach(function (b) { b.addEventListener("click", function () { sub = b.getAttribute("data-s"); render(); }); });
    (sub === "students" ? students : parentsView)($("#pp-body"));
  }

  function students(body) {
    A.register(body, { pupils: pupils, classes: classes, reload: load, edit: editPupil });
    var enrolled = {}; pupils.forEach(function (p) { if (p.admission_id) enrolled[p.admission_id] = 1; });
    var open = admissions.filter(function (a) { return !enrolled[a.id] && a.status !== "declined" && a.status !== "withdrawn"; }), card = document.createElement("div");
    card.className = "form-card"; card.style.marginTop = "1.6rem";
    card.innerHTML = '<h3 style="font-size:1.05rem;margin:0 0 .4rem">Enrol from an application</h3><p class="count-line">Accept an application and place the pupil in a class in one step. The application is marked as offered and the pupil appears in that class register.</p><form id="pe-enrol" novalidate><div class="fld"><label for="pe-ad">Application</label><select class="select-lg" id="pe-ad"><option value="">Choose...</option>' +
      open.map(function (a) { return '<option value="' + esc(a.id) + '">' + esc(a.reference + " · " + a.child_first_name + " " + a.child_last_name + " (" + a.status.replace(/_/g, " ") + ")") + "</option>"; }).join("") + '</select></div><div class="fld"><label for="pe-cl">Place in class</label><select class="select-lg" id="pe-cl">' + clsOpts("", "Choose a class...") + '</select><p class="count-line" id="pe-hint"></p></div><div class="form-actions" style="margin-top:1rem"><button class="btn btn-primary btn-sm" type="submit">Accept and enrol</button></div><div class="result" id="pe-res2" role="status"></div></form>';
    body.appendChild(card);
    $("#pe-ad").addEventListener("change", function () {
      var a = open.filter(function (x) { return x.id === this.value; }.bind(this))[0], cl = $("#pe-cl"), h = $("#pe-hint"); h.textContent = ""; if (!a) return;
      var want = String(a.class_applying || "").toLowerCase().replace(/\s+/g, ""), m = classes.filter(function (c) { return want && c.name.toLowerCase().replace(/\s+/g, "") === want; })[0];
      if (m) { cl.value = m.id; h.textContent = "Applied for " + a.class_applying + ". Change it if the school places the child elsewhere."; } else if (a.class_applying || a.level) { h.textContent = "Applied for " + (a.class_applying || a.level) + ". Choose the class to place the child in."; }
    });
    $("#pe-enrol").addEventListener("submit", function (e) {
      e.preventDefault(); var r = $("#pe-res2"), id = $("#pe-ad").value, cl = $("#pe-cl").value; if (!id) return note(r, false, "Choose an application."); if (!cl) return note(r, false, "Choose the class to place the pupil in.");
      var b = e.target.querySelector("button[type=submit]"); b.disabled = true;
      var ap = open.filter(function (x) { return x.id === id; })[0], first = ap && ap.status === "offered" ? Promise.resolve() : A.api("POST", "/rest/v1/rpc/admin_set_status", { p_id: id, p_status: "offered", p_note: "" });
      first.then(function () { return A.api("POST", "/rest/v1/rpc/admin_enrol_into_class", { p_admission: id, p_class: cl }); }).then(load, function (er) { b.disabled = false; note(r, false, nice(er.message)); });
    });
  }

  function parentsView(body) {
    var active = pupils.filter(function (p) { return p.active; });
    body.innerHTML = (parents.length ? '<div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>Parent</th><th>Linked children</th><th>Link a child</th><th>Access</th></tr></thead><tbody>' + parents.map(function (p) {
      return "<tr><td><strong>" + esc(p.full_name || "") + "</strong><br><small>" + esc(p.email) + "</small></td><td>" +
        (p.children.length ? p.children.map(function (c) { return '<span class="chip-pill">' + esc(c.name) + ' <button type="button" class="x-mini" data-unlink="' + esc(c.link) + '" aria-label="Unlink ' + esc(c.name) + '">&times;</button></span>'; }).join(" ") : "<em>None</em>") + "</td>" +
        '<td><div class="pe-link"><select class="select-lg" data-sel="' + esc(p.user_id) + '" aria-label="Child to link to ' + esc(p.email) + '"><option value="">Choose...</option>' + active.map(function (s) { return '<option value="' + esc(s.id) + '">' + esc(s.first_name + " " + s.last_name + (s.admission_no ? " · " + s.admission_no : "")) + "</option>"; }).join("") + "</select>" + btn("link", p.user_id, "Link") + "</div></td><td>" + (p.active ? "Active " : "Disabled ") + '<button type="button" class="btn btn-soft btn-sm" data-act="' + esc(p.user_id) + '" data-v="' + (p.active ? 0 : 1) + '">' + (p.active ? "Disable" : "Enable") + "</button></td></tr>";
    }).join("") + "</tbody></table></div>" : '<div class="empty"><p>No parent accounts yet.</p></div>') +
      '<div class="form-card" style="margin-top:1.4rem"><h3 style="font-size:1.05rem;margin:0 0 .3rem">Give a parent access</h3><p class="count-line">Create the user in Supabase first (Authentication, Add user, with a password you give the parent), then add their email here and link their children.</p>' +
      '<form id="pa-add" novalidate><div class="form-grid"><div class="fld"><label for="pa-em">Email</label><input class="input" id="pa-em" type="email"></div><div class="fld"><label for="pa-nm">Full name</label><input class="input" id="pa-nm" maxlength="100"></div></div><div class="form-actions" style="margin-top:1rem"><button class="btn btn-primary btn-sm" type="submit">Save parent access</button></div><div class="result" id="pa-res" role="status"></div></form></div>';
    $("#pa-add").addEventListener("submit", function (e) {
      e.preventDefault(); var r = $("#pa-res"), em = $("#pa-em").value.trim(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return note(r, false, "Enter a valid email.");
      A.api("POST", "/rest/v1/rpc/admin_add_parent", { p_email: em, p_name: $("#pa-nm").value }).then(load, function (er) { note(r, false, nice(er.message)); });
    });
    $$("[data-link]", body).forEach(function (b) { b.addEventListener("click", function () {
      var uid = b.getAttribute("data-link"), sel = body.querySelector('[data-sel="' + uid + '"]'); if (!sel.value) return sel.focus();
      b.disabled = true; A.api("POST", "/rest/v1/parent_students", { parent_user_id: uid, student_id: sel.value }, { Prefer: "return=minimal" }).then(load, function (er) { b.disabled = false; alert(nice(er.message)); });
    }); });
    $$("[data-unlink]", body).forEach(function (b) { b.addEventListener("click", function () {
      if (confirm("Remove this child from the parent's account?")) A.api("DELETE", "/rest/v1/parent_students?id=eq." + encodeURIComponent(b.getAttribute("data-unlink"))).then(load, function (er) { alert(nice(er.message)); });
    }); });
    $$("[data-act]", body).forEach(function (b) { b.addEventListener("click", function () {
      A.api("PATCH", "/rest/v1/parents?user_id=eq." + encodeURIComponent(b.getAttribute("data-act")), { active: b.getAttribute("data-v") === "1" }, { Prefer: "return=minimal" }).then(load, function (er) { alert(nice(er.message)); });
    }); });
  }

  function editPupil(id) {
    var p = pupils.filter(function (x) { return x.id === id; })[0]; if (!p) return;
    $("#ad-dlg-t").textContent = "Edit pupil: " + p.first_name + " " + p.last_name;
    $("#ad-dlg-b").innerHTML = '<form id="pu-form" novalidate><div class="form-grid"><div class="fld"><label for="pu-fn">First name</label><input class="input" id="pu-fn" maxlength="60" value="' + esc(p.first_name) + '"></div><div class="fld"><label for="pu-ln">Last name</label><input class="input" id="pu-ln" maxlength="60" value="' + esc(p.last_name) + '"></div>' +
      '<div class="fld"><label for="pu-no">Admission number</label><input class="input" id="pu-no" maxlength="40" value="' + esc(p.admission_no || "") + '"></div><div class="fld"><label for="pu-sx">Sex</label><select class="select-lg" id="pu-sx">' + sexOpts(p.sex) + '</select></div>' +
      '<div class="fld full"><label for="pu-cl">Class</label><select class="select-lg" id="pu-cl">' + clsOpts(p.class_id, "Not assigned") + '</select></div><div class="fld full"><p class="count-line">Student ID: <strong>' + esc(p.student_code || "") + '</strong>. Parents use it with the name to look up a released result.</p></div>' +
      '<div class="fld full"><label class="check"><input type="checkbox" id="pu-act"' + (p.active ? " checked" : "") + '> Active pupil (inactive pupils are hidden from parents and class lists)</label></div></div><div class="form-actions" style="margin-top:1rem"><button class="btn btn-primary" type="submit">Save</button>' + (A.can(["super_admin", "school_admin"]) ? '<button class="btn btn-danger" type="button" id="pu-del">Delete pupil</button>' : "") + '</div><div class="result" id="pu-res" role="status"></div></form>';
    var dl = $("#pu-del"); if (dl) dl.addEventListener("click", function () {
      if (!confirm("Permanently delete " + p.first_name + " " + p.last_name + "?\n\nTheir scores, attendance, PIN and parent links are removed. Payment receipts stay in the finance records under their name.\n\nThis cannot be undone. To only hide the pupil, untick Active instead.")) return;
      dl.disabled = true; A.api("POST", "/rest/v1/rpc/admin_delete_student", { p_student: id }).then(function () { $("#ad-dlg").close(); load(); }, function (er) { dl.disabled = false; note($("#pu-res"), false, nice(er.message)); });
    });
    $("#pu-form").addEventListener("submit", function (e) {
      e.preventDefault(); var r = $("#pu-res"), fn = $("#pu-fn").value.trim(), ln = $("#pu-ln").value.trim(); if (!fn || !ln) return note(r, false, "Enter the first and last name.");
      var c = classes.filter(function (x) { return x.id === $("#pu-cl").value; })[0];
      A.api("PATCH", "/rest/v1/students?id=eq." + encodeURIComponent(id), { first_name: fn, last_name: ln, admission_no: $("#pu-no").value.trim() || null, class_id: c ? c.id : null, level: c ? c.level : p.level, sex: $("#pu-sx").value || null, active: $("#pu-act").checked }, { Prefer: "return=minimal" })
        .then(function () { $("#ad-dlg").close(); load(); }, function (er) { note(r, false, nice(er.message)); });
    });
    U.openDialog($("#ad-dlg"));
  }
  A.people = function (h) { host = h; load(); };
})();
