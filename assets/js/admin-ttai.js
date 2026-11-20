/* Secondary timetable: AI draft (administrator), per-teacher review of their own subject, then publish. */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, $$ = U.$$, esc = U.esc, A = window.UBK_ADMIN;
  if (!A) return;
  var DAYS = ["", "Mon", "Tue", "Wed", "Thu", "Fri"], NP = 9, BREAK = 4;
  var DEF = [["08:00", "08:40"], ["08:40", "09:20"], ["09:20", "10:00"], ["10:00", "10:30"], ["10:30", "11:10"], ["11:10", "11:50"], ["11:50", "12:30"], ["12:30", "13:10"], ["13:10", "13:50"]];
  function rpc(n, b) { return A.api("POST", "/rest/v1/rpc/" + n, b || {}); }
  function say(el, ok, m) { if (el) { el.className = "result show " + (ok ? "ok" : "bad"); el.textContent = m; } }
  function quota(name) { return /math|english/i.test(name) ? 5 : /physics|chem|bio|basic sci|integrated/i.test(name) ? 4 : /quran|arabic|islam|civic|social|business|computer|agric|home|physical|art|music|crs|hausa|yoruba/i.test(name) ? 2 : 3; }
  var st = { classes: [], data: {}, draft: null, grid: {}, expl: [] };

  /* ---- data: secondary classes, their subjects and teachers ---- */
  function load() {
    return Promise.all([
      A.api("GET", "/rest/v1/classes?section=eq.secondary&select=id,name&order=sort.asc,name.asc"),
      A.api("GET", "/rest/v1/class_subjects?select=class_id,subject_id,subjects(name)"),
      A.api("GET", "/rest/v1/subject_teachers?select=class_id,subject_id,teacher_user_id"),
      A.api("GET", "/rest/v1/staff?select=user_id,full_name"), rpc("tt_draft_get", {})
    ]).then(function (r) {
      var names = {}; (r[3] || []).forEach(function (x) { names[x.user_id] = x.full_name; });
      st.classes = (r[0] || []).map(function (c) {
        var subs = (r[1] || []).filter(function (x) { return x.class_id === c.id; }).map(function (x) {
          var t = (r[2] || []).filter(function (y) { return y.class_id === c.id && y.subject_id === x.subject_id; })[0];
          var nm = (x.subjects || {}).name || ""; return { id: x.subject_id, name: nm, tid: t ? t.teacher_user_id : "", teacher: t ? names[t.teacher_user_id] || "" : "", n: quota(nm) };
        }).sort(function (a, b) { return a.name.localeCompare(b.name); });
        return { id: c.id, name: c.name, subs: subs };
      });
      st.draft = r[4]; if (st.draft) { st.grid = {}; (st.draft.rows || []).forEach(function (x) { (st.grid[x.class_id] = st.grid[x.class_id] || {})[x.day + "-" + x.period] = x.subject_id || ("L:" + (x.label || "")); }); st.expl = st.draft.explanation ? st.draft.explanation.split("\n") : []; }
    });
  }
  function times() { var t = DEF.slice(); $$("[data-ts]").forEach(function (i) { t[+i.getAttribute("data-ts") - 1][0] = i.value; }); $$("[data-te]").forEach(function (i) { t[+i.getAttribute("data-te") - 1][1] = i.value; }); return t; }

  /* ---- clash check and repair (the AI can slip: the page makes the draft correct) ---- */
  function check(grid) {
    var bad = [], used = {};
    st.classes.forEach(function (c) { var g = grid[c.id] || {}; Object.keys(g).forEach(function (k) {
      var s = c.subs.filter(function (x) { return x.id === g[k]; })[0]; if (!s || !s.tid) return; var key = s.tid + "|" + k;
      if (used[key]) bad.push({ cls: c.id, k: k, why: s.teacher + " is already teaching " + used[key] + " at that time" }); else used[key] = c.name;
    }); });
    return bad;
  }
  function repair(grid) {
    var log = []; check(grid).forEach(function (b) { delete (grid[b.cls] || {})[b.k]; });
    st.classes.forEach(function (c) { var g = grid[c.id] = grid[c.id] || {};
      c.subs.forEach(function (s) {
        var have = Object.keys(g).filter(function (k) { return g[k] === s.id; });
        while (have.length > s.n) { delete g[have.pop()]; }
        var guard = 0;
        while (have.length < s.n && guard++ < 60) {
          var best = null;
          for (var d = 1; d <= 5 && !best; d++) { for (var p = 1; p <= NP; p++) {
            var k = d + "-" + p; if (p === BREAK || g[k]) continue; if (have.some(function (h) { return h.split("-")[0] === String(d); }) && guard < 30) continue;
            if (s.tid && st.classes.some(function (o) { var og = grid[o.id] || {}, os = o.subs.filter(function (x) { return x.id === og[k]; })[0]; return os && os.tid === s.tid; })) continue;
            best = k; break; } }
          if (!best) { log.push(c.name + " " + s.name + ": only " + have.length + " of " + s.n + " periods could be placed without a clash."); break; }
          g[best] = s.id; have.push(best);
        }
      }); });
    return log;
  }

  /* ---- administrator screen ---- */
  A.ttai = A.ttai || {};
  A.ttai.admin = function (host) {
    host.innerHTML = '<p class="count-line">Loading...</p>';
    load().then(function () { draw(host); }, function (e) { host.innerHTML = '<div class="notice"><span>' + esc(A.nice(e.message)) + "</span></div>"; });
  };
  function draw(host) {
    var h = '<div class="tai"><h2 class="sec-title" style="font-size:1.2rem">Secondary timetable with AI</h2>' +
      '<details class="tai-how" open><summary>How this works</summary><ol><li><b>Set periods per week</b> for each subject below (we suggest a number; change it if you like). Teachers come from Classes &amp; subjects.</li><li><b>Ask the AI to draft.</b> It places every subject, spreads them across the week, puts hard subjects early, and keeps a teacher from being in two classes at once. This page then double-checks and repairs any clash.</li><li><b>Edit</b> any cell if you want, then <b>Send to teachers</b>. Each teacher sees only their own subject, time and class, and can approve or write a comment.</li><li>When everyone has approved, press <b>Publish</b>. The timetable goes live and teachers get a notice and reminders.</li></ol><p class="count-line">The AI only drafts. Nothing changes for teachers until you send it, and nothing goes live until you publish.</p></details>';
    if (!st.classes.length) return host.innerHTML = h + '<div class="empty"><h3>No secondary classes yet</h3><p>Add JSS/SS classes in Classes &amp; subjects first.</p></div></div>';
    h += '<div class="tai-set">' + st.classes.map(function (c) { return '<details class="tai-cls"><summary><b>' + esc(c.name) + "</b> <small>" + c.subs.length + " subjects</small></summary>" + (c.subs.length ? c.subs.map(function (s, i) {
      return '<div class="tai-sub"><span>' + esc(s.name) + "<small>" + (s.teacher ? esc(s.teacher) : "No teacher assigned") + '</small></span><input class="input" type="number" min="0" max="10" data-n="' + c.id + "|" + i + '" value="' + s.n + '" aria-label="' + esc(s.name) + ' periods per week"></div>'; }).join("") : "<p class='count-line'>No subjects yet.</p>") + "</details>"; }).join("") + "</div>";
    h += '<div class="tai-time"><b>Period times</b><div class="tai-tg">' + DEF.map(function (t, i) { return '<label>P' + (i + 1) + (i + 1 === BREAK ? " (break)" : "") + '<input class="input" type="time" data-ts="' + (i + 1) + '" value="' + t[0] + '"><input class="input" type="time" data-te="' + (i + 1) + '" value="' + t[1] + '"></label>'; }).join("") + "</div></div>";
    h += '<div class="form-actions"><button type="button" class="btn btn-primary" id="ta-go">Draft with AI</button><button type="button" class="btn btn-secondary" id="ta-fill">Draft without AI</button></div><p class="result" id="ta-res" role="status"></p><div id="ta-out"></div></div>';
    host.innerHTML = h;
    $$("[data-n]").forEach(function (i) { i.addEventListener("change", function () { var k = this.getAttribute("data-n").split("|"), c = st.classes.filter(function (x) { return x.id === k[0]; })[0]; c.subs[+k[1]].n = Math.max(0, Math.min(10, +this.value || 0)); }); });
    $("#ta-go").addEventListener("click", function () { aiDraft(this); });
    $("#ta-fill").addEventListener("click", function () { st.grid = {}; st.expl = ["Drafted by the page's own rules (no AI)."]; var l = repair(st.grid); st.expl = st.expl.concat(l); out(l); });
    if (st.draft) out([]);
  }
  function aiDraft(btn) {
    var data = { periods_per_day: NP, break_periods: [BREAK], days: 5, classes: st.classes.map(function (c) { return { class: c.name, subjects: c.subs.filter(function (s) { return s.n > 0; }).map(function (s) { return { name: s.name, per_week: s.n, teacher: s.teacher || "unassigned" }; }) }; }) };
    btn.disabled = true; btn.textContent = "Thinking... this can take a minute"; var res = $("#ta-res"); say(res, true, "Asking the AI to draft the timetable...");
    A.fresh().then(function (tok) {
      var B = (window.UBK_SITE || {}).backend || {}; return fetch((B.url || "") + "/functions/v1/timetable-ai", { method: "POST", headers: { apikey: B.key || "", Authorization: "Bearer " + tok, "Content-Type": "application/json" }, body: JSON.stringify({ data: data }) });
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(r.status === 503 ? "No AI key is set yet. Add one in Supabase (Edge Functions, Secrets), or use Draft without AI." : r.status === 429 ? "The daily AI limit has been reached. Try tomorrow or use Draft without AI." : "The AI could not answer just now. Try again, or use Draft without AI."); return j.result; }); }).then(function (o) {
      st.grid = {}; var by = {}; st.classes.forEach(function (c) { by[c.name.toLowerCase()] = c; });
      Object.keys(o.grid || {}).forEach(function (cn) { var c = by[String(cn).toLowerCase()]; if (!c) return; Object.keys(o.grid[cn]).forEach(function (k) {
        var s = c.subs.filter(function (x) { return x.name.toLowerCase() === String(o.grid[cn][k]).toLowerCase(); })[0]; if (s && /^[1-5]-\d$/.test(k) && +k.split("-")[1] <= NP) (st.grid[c.id] = st.grid[c.id] || {})[k] = s.id; }); });
      var l = repair(st.grid); st.expl = (o.explanation || []).map(String).slice(0, 8).concat(l); say(res, true, "Draft ready. Check it below, edit if needed, then save and send."); out(l);
    }).catch(function (e) { say(res, false, e.message); }).then(function () { btn.disabled = false; btn.textContent = "Draft with AI"; });
  }
  function out(log) {
    var t = times(), h = "";
    if (st.expl.length) h += '<div class="tai-why"><b>Why it looks like this</b><ul>' + st.expl.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>";
    h += st.classes.map(function (c) { var g = st.grid[c.id] || {};
      return '<h3 class="tai-h">' + esc(c.name) + '</h3><div class="ad-table-wrap"><table class="ad-table tt-grid"><thead><tr><th>Period</th>' + [1, 2, 3, 4, 5].map(function (d) { return "<th>" + DAYS[d] + "</th>"; }).join("") + "</tr></thead><tbody>" +
        t.map(function (tm, i) { var p = i + 1; return "<tr><th>" + p + "<div class='tt-time'><small>" + tm[0] + "-" + tm[1] + "</small></div></th>" + [1, 2, 3, 4, 5].map(function (d) {
          var k = d + "-" + p; if (p === BREAK) return "<td class='tai-brk'>Break</td>";
          return '<td><select class="select-lg" data-g="' + c.id + "|" + k + '" aria-label="' + esc(c.name) + " " + DAYS[d] + " period " + p + '"><option value="">-</option>' + c.subs.map(function (s) { return '<option value="' + esc(s.id) + '"' + (g[k] === s.id ? " selected" : "") + ">" + esc(s.name) + "</option>"; }).join("") + "</select></td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>"; }).join("");
    var rv = st.draft && st.draft.status === "sent" ? st.draft.reviews || [] : [];
    if (rv.length) h += '<div class="tai-rev"><b>Teacher reviews</b>' + rv.map(function (r) { return '<div class="tai-r tai-' + r.status + '"><span><b>' + esc(r.teacher || "Teacher") + "</b>" + (r.comment ? "<small>" + esc(r.comment) + "</small>" : "") + '</span><em>' + (r.status === "approved" ? "Approved" : r.status === "changes" ? "Asked for changes" : "Waiting") + "</em></div>"; }).join("") + "</div>";
    h += '<div class="form-actions" style="margin-top:1rem"><button type="button" class="btn btn-secondary" id="ta-save">Save draft</button><button type="button" class="btn btn-primary" id="ta-send">Send to teachers</button>' + (st.draft && st.draft.status === "sent" ? '<button type="button" class="btn btn-primary" id="ta-pub">Publish timetable</button>' : "") + '</div><p class="result" id="ta-r2" role="status"></p>';
    $("#ta-out").innerHTML = h;
    $$("[data-g]").forEach(function (s) { s.addEventListener("change", function () { var k = this.getAttribute("data-g").split("|"); (st.grid[k[0]] = st.grid[k[0]] || {})[k[1]] = this.value; if (!this.value) delete st.grid[k[0]][k[1]]; var b = check(st.grid); say($("#ta-r2"), !b.length, b.length ? b.length + " clash(es): a teacher is in two classes at once. " + b[0].why + "." : "No clashes."); }); });
    function rows() { var t2 = times(), r = []; st.classes.forEach(function (c) { var g = st.grid[c.id] || {}; Object.keys(g).forEach(function (k) { if (!g[k]) return; var a = k.split("-"), s = c.subs.filter(function (x) { return x.id === g[k]; })[0]; if (s) r.push({ class_id: c.id, subject_id: s.id, day: +a[0], period: +a[1], start: t2[+a[1] - 1][0], end: t2[+a[1] - 1][1] }); }); }); return r; }
    function save() { var b = check(st.grid); if (b.length) return Promise.reject(new Error("Fix the clashes first: " + b[0].why + ".")); return rpc("tt_draft_save", { p_rows: rows(), p_expl: st.expl.join("\n") }); }
    $("#ta-save").addEventListener("click", function () { var el = $("#ta-r2"); save().then(function () { return load().then(function () { out([]); say($("#ta-r2"), true, "Draft saved."); }); }, function (e) { say(el, false, A.nice(e.message)); }); });
    $("#ta-send").addEventListener("click", function () { var el = $("#ta-r2"), msg = ""; save().then(function () { return rpc("tt_draft_send", {}); }).then(function (r) { msg = "Sent to " + r.sent + " teacher(s)." + ((r.no_teacher || []).length ? " No teacher assigned for: " + r.no_teacher.slice(0, 6).join(", ") + "." : ""); return load(); }).then(function () { out([]); say($("#ta-r2"), true, msg); }, function (e) { say(el, false, A.nice(e.message)); }); });
    var pub = $("#ta-pub"); if (pub) pub.addEventListener("click", function () {
      var el = $("#ta-r2"), wait = (st.draft.reviews || []).filter(function (r) { return r.status !== "approved"; }).length;
      if (wait && !confirm(wait + " teacher(s) have not approved. Publish anyway?")) return;
      rpc("tt_draft_publish", { p_force: !!wait }).then(function (r) { say(el, true, "Published for " + r.classes + " class(es). Teachers have been notified."); st.draft = null; }, function (e) { say(el, false, A.nice(e.message)); });
    });
  }

  /* ---- teacher: review only my own subject ---- */
  A.ttai.teacher = function (box) {
    rpc("tt_my_review", {}).then(function (r) {
      if (!r) return; var sl = r.slots || [];
      var h = '<section class="tai-mine"><h2 class="sec-title" style="font-size:1.15rem">New timetable to review</h2><p class="count-line">These are your periods in the draft. Approve them, or write what should change.</p>' +
        (sl.length ? '<div class="tai-list">' + sl.map(function (x) { return '<div class="tai-slot"><b>' + esc(x.subject) + '</b><span>' + esc(x.class) + " - " + DAYS[x.day] + ", period " + x.period + (x.start ? " (" + esc(x.start) + "-" + esc(x.end) + ")" : "") + "</span></div>"; }).join("") + "</div>" : '<p class="count-line">No periods for you in this draft.</p>') +
        '<div class="fld"><label for="tr-c">Comment (needed if you ask for changes)</label><textarea class="input" id="tr-c" rows="3" maxlength="600">' + esc(r.comment || "") + '</textarea></div><div class="form-actions"><button type="button" class="btn btn-primary" id="tr-ok">Approve my periods</button><button type="button" class="btn btn-secondary" id="tr-no">Ask for changes</button></div><p class="result" id="tr-res" role="status">' + "</p>" +
        '<p class="count-line">Your answer now: <b>' + (r.status === "approved" ? "Approved" : r.status === "changes" ? "Changes asked" : "Not answered yet") + "</b></p></section>";
      box.insertAdjacentHTML("afterbegin", h);
      function go(s) { rpc("tt_review_set", { p_status: s, p_comment: $("#tr-c").value }).then(function () { say($("#tr-res"), true, s === "approved" ? "Thank you. Approved." : "Sent to the administrator."); }, function (e) { say($("#tr-res"), false, A.nice(e.message)); }); }
      $("#tr-ok").addEventListener("click", function () { go("approved"); }); $("#tr-no").addEventListener("click", function () { go("changes"); });
    }, function () {});
  };
})();
