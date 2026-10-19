/* Dashboard: Website content manager (news, events, FAQ, school details) with Arabic and Hausa fields and an
   AI writing assistant. AI output only ever fills the form as a DRAFT; a person must read it and press Save.
   New items are saved as "Draft" unless the editor chooses "Published". Permissions are enforced by the database. */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, $$ = U.$$, esc = U.esc, icon = U.icon;
  var A = window.UBK_ADMIN; if (!A) return;
  var B = (window.UBK_SITE || {}).backend || {};
  var LANGS = [["en", "English"], ["ar", "العربية"], ["ha", "Hausa"]];
  var NEWS_CATS = ["notice", "exam", "holiday", "achievement", "activity", "general"];
  var EVENT_CATS = ["meeting", "exam", "holiday", "recitation", "activity", "general"];
  var CAT_LABEL = { notice: "Notice", exam: "Exams", holiday: "Holiday", achievement: "Achievement", activity: "Activity", general: "General", meeting: "Meeting", recitation: "Recitation" };

  /* what each kind of content looks like: translatable fields (kind: line / text / paras) and plain fields */
  var KINDS = {
    news: {
      label: "News", table: "news", order: "publish_at.desc", add: "New news item",
      tr: [["title", "Title", "line", 90], ["excerpt", "Short summary", "text", 220], ["body", "Full story (leave a blank line between paragraphs)", "paras"]],
      draft: "draft_news", need: "title"
    },
    events: {
      label: "Events", table: "events", order: "start_date.desc", add: "New event",
      tr: [["title", "Event name", "line", 80], ["description", "Description", "text", 400]],
      draft: "draft_event", need: "title"
    },
    notices: {
      label: "Parent notices", table: "parent_notices", order: "publish_at.desc", add: "New parent notice",
      tr: [["title", "Title", "line", 90], ["body", "Message (leave a blank line between paragraphs)", "paras"]],
      draft: "draft_news", need: "title"
    },
    faqs: {
      label: "FAQ", table: "faqs", order: "sort.asc", add: "New question",
      tr: [["q", "Question", "line", 200], ["a", "Answer", "text", 600]],
      draft: "draft_faq", need: "q"
    }
  };
  var host, kind = "news", rows = [], cur = null, curLang = "en";

  function today() { return U.toISO(new Date()); }
  function slug(s) { return String(s || "item").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "item"; }
  function rid() { return Math.random().toString(36).slice(2, 7); }
  function val(v, l) { return v && v[l] ? v[l] : ""; }
  function paraText(v) { return Array.isArray(v) ? v.join("\n\n") : (v || ""); }
  function toParas(s) { return String(s || "").split(/\n\s*\n/).map(function (x) { return x.trim(); }).filter(Boolean); }

  /* ---------- AI ---------- */
  function ai(payload) {
    return A.fresh().then(function (tok) {
      return fetch(B.url + "/functions/v1/content-ai", { method: "POST", headers: { apikey: B.key, Authorization: "Bearer " + tok, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var e = new Error(j.error || "ai_failed"); e.status = r.status; throw e; }
        return j.result;
      });
    });
  }
  function aiMsg(e) {
    if (e.message === "ai_not_configured") return "The AI assistant is not switched on yet. The school needs to add its AI key in the Supabase settings (see the README). You can still write and translate by hand.";
    if (e.message === "forbidden" || e.status === 403) return "Your account is not allowed to use the AI assistant.";
    if (e.message === "ai_unreachable" || e.message === "ai_failed" || e.message === "ai_bad_output") return "The AI could not produce a draft just now. Please try again in a moment, or write it by hand.";
    return "The AI request did not work (" + e.message + "). Check your connection and try again.";
  }
  function aiBusy(btn, on, label) { btn.disabled = on; btn.dataset.l = btn.dataset.l || btn.textContent; btn.textContent = on ? "Working..." : btn.dataset.l; }
  function aiNote(msg, ok) {
    var el = $("#cm-ai-res"); if (!el) return;
    el.className = "result show " + (ok ? "ok" : "bad"); el.textContent = msg;
  }

  /* ---------- list ---------- */
  function shell() {
    host.innerHTML = '<div class="level-tabs" id="cm-kinds" role="tablist" aria-label="Content type" style="flex-wrap:wrap;border-radius:18px;margin-bottom:1.2rem">' +
      Object.keys(KINDS).map(function (k) { return '<button type="button" role="tab" data-k="' + k + '" aria-selected="false">' + KINDS[k].label + "</button>"; }).join("") +
      '<button type="button" role="tab" data-k="site" aria-selected="false">School details</button></div><div id="cm-body"></div>';
    $$("#cm-kinds button").forEach(function (b) { b.addEventListener("click", function () { show(b.getAttribute("data-k")); }); });
  }
  function show(k) {
    kind = k;
    $$("#cm-kinds button").forEach(function (b) { b.setAttribute("aria-selected", String(b.getAttribute("data-k") === k)); });
    if (k === "site") siteForm(); else loadList();
  }
  function statusPill(r) {
    if (r.status !== "published") return '<span class="status-pill">Draft</span>';
    if ((kind === "news" || kind === "notices") && r.publish_at > today()) return '<span class="status-pill st-under_review">Scheduled</span>';
    return '<span class="status-pill st-offered">Published</span>';
  }
  function loadList() {
    var K = KINDS[kind], body = $("#cm-body"); body.innerHTML = '<p class="count-line">Loading...</p>';
    A.api("GET", "/rest/v1/" + K.table + "?select=*&order=" + K.order + "&limit=500").then(function (r) {
      rows = r || [];
      var when = function (x) { return kind === "news" || kind === "notices" ? x.publish_at : kind === "events" ? x.start_date : "#" + x.sort; };
      var cat2 = function (x) { return kind === "notices" ? (x.audience || []).map(function (a) { return a === "all" ? "All parents" : a.charAt(0).toUpperCase() + a.slice(1); }).join(", ") : (CAT_LABEL[x.category] || x.category); };
      var titleOf = function (x) { return val(x[K.tr[0][0]], "en") || "(no English title)"; };
      var langs = function (x) { return LANGS.slice(1).map(function (l) { return val(x[K.tr[0][0]], l[0]) ? l[0].toUpperCase() : ""; }).filter(Boolean).join(" "); };
      body.innerHTML = '<div class="toolbar"><button type="button" class="btn btn-primary btn-sm" id="cm-new">' + "+ " + esc(K.add) + '</button><span style="flex:1"></span><button type="button" class="btn btn-soft btn-sm" id="cm-re">Refresh</button></div>' +
        '<p class="count-line">' + rows.length + " " + K.label.toLowerCase() + ". Only items marked Published appear on the website.</p>" +
        (rows.length ? '<div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>Title</th><th>' + (kind === "faqs" ? "Order" : "Date") + "</th>" + (kind !== "faqs" ? "<th>" + (kind === "notices" ? "For" : "Category") + "</th>" : "") + "<th>Translations</th><th>Status</th></tr></thead><tbody>" +
          rows.map(function (x) {
            return '<tr tabindex="0" data-id="' + esc(x.id) + '"><td><strong>' + esc(titleOf(x)) + "</strong></td><td>" + esc(when(x)) + "</td>" + (kind !== "faqs" ? "<td>" + esc(cat2(x)) + "</td>" : "") + "<td>" + (esc(langs(x)) || "<em>English only</em>") + "</td><td>" + statusPill(x) + "</td></tr>";
          }).join("") + "</tbody></table></div>" : '<div class="empty"><h3>Nothing here yet.</h3><p>Until something is published, the website shows its clearly labelled sample content.</p></div>');
      $("#cm-new").addEventListener("click", function () { edit(null); });
      $("#cm-re").addEventListener("click", loadList);
      $$("tr[data-id]", body).forEach(function (tr) {
        function open() { edit(tr.getAttribute("data-id")); }
        tr.addEventListener("click", open); tr.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
      });
    }, function (e) { body.innerHTML = '<div class="notice"><span>' + esc(A.nice(e.message)) + "</span></div>"; });
  }

  /* ---------- editor ---------- */
  function fld(id, label, inner, cls) { return '<div class="fld ' + (cls || "") + '"><label for="' + id + '">' + esc(label) + "</label>" + inner + '<div class="err"></div></div>'; }
  function langPane(l, K, rec) {
    var dir = l === "ar" ? ' dir="rtl" lang="ar"' : l === "ha" ? ' lang="ha"' : ' lang="en"';
    return '<div class="cm-pane" data-lang="' + l + '"' + (l === curLang ? "" : " hidden") + ">" + K.tr.map(function (f) {
      var id = "cm-" + f[0] + "-" + l, v = rec ? rec[f[0]] : null, max = typeof f[3] === "number" ? ' maxlength="' + f[3] + '"' : "";
      var inner = f[2] === "line" ? '<input class="input" id="' + id + '" data-f="' + f[0] + '"' + max + dir + ' value="' + esc(val(v, l)) + '">'
        : '<textarea class="textarea" id="' + id + '" data-f="' + f[0] + '"' + max + dir + ' style="min-height:' + (f[2] === "paras" ? 220 : 100) + 'px">' + esc(f[2] === "paras" ? paraText(v && v[l]) : val(v, l)) + "</textarea>";
      return fld(id, f[1] + (l === "en" ? " (required)" : " (optional, falls back to English)"), inner, "full");
    }).join("") + "</div>";
  }
  function edit(id) {
    var K = KINDS[kind], rec = id ? rows.filter(function (x) { return x.id === id; })[0] : null; if (id && !rec) return;
    cur = rec; curLang = "en";
    var plain = "";
    if (kind === "news") plain = fld("cm-cat", "Category", '<select class="select-lg" id="cm-cat">' + NEWS_CATS.map(function (c) { return '<option value="' + c + '">' + CAT_LABEL[c] + "</option>"; }).join("") + "</select>") +
      fld("cm-date", "Publish date (a future date schedules it)", '<input class="input" type="date" id="cm-date">') +
      '<div class="fld"><label class="check"><input type="checkbox" id="cm-pin"> Pin to the top</label></div><div class="fld"><label class="check"><input type="checkbox" id="cm-arch"> Move to the archive</label></div>';
    if (kind === "notices") plain = fld("cm-aud", "Who should see it", '<select class="select-lg" id="cm-aud"><option value="all">All parents</option><option value="nursery">Nursery parents</option><option value="primary">Primary parents</option><option value="secondary">Secondary parents</option></select>') +
      fld("cm-date", "Show from (a future date schedules it)", '<input class="input" type="date" id="cm-date">');
    if (kind === "events") plain = fld("cm-cat", "Category", '<select class="select-lg" id="cm-cat">' + EVENT_CATS.map(function (c) { return '<option value="' + c + '">' + CAT_LABEL[c] + "</option>"; }).join("") + "</select>") +
      fld("cm-loc", "Place", '<input class="input" id="cm-loc" maxlength="120">') +
      fld("cm-sd", "Starts on (required)", '<input class="input" type="date" id="cm-sd">') + fld("cm-ed", "Ends on (optional)", '<input class="input" type="date" id="cm-ed">') +
      fld("cm-st", "Start time (optional)", '<input class="input" type="time" id="cm-st">') + fld("cm-et", "End time (optional)", '<input class="input" type="time" id="cm-et">');
    if (kind === "faqs") plain = fld("cm-sort", "Order on the page (small numbers first)", '<input class="input" type="number" id="cm-sort" min="1" max="9999">');
    var status = fld("cm-status", "Visibility", '<select class="select-lg" id="cm-status"><option value="draft">Draft (hidden from the website)</option><option value="published">Published (shown on the website)</option></select>');

    $("#ad-dlg-t").textContent = rec ? "Edit: " + (val(rec[K.tr[0][0]], "en") || "item") : K.add;
    $("#ad-dlg-b").innerHTML = '<form id="cm-form" novalidate>' +
      '<div class="cm-ai" id="cm-ai"><h3>AI writing assistant</h3><p class="count-line">Optional. The AI only fills this form with a draft. Nothing is saved or published until you read it and press Save.</p>' +
      '<div class="fld"><label for="cm-notes">Your notes, in plain words (facts only: dates, times, names)</label><textarea class="textarea" id="cm-notes" maxlength="3000" style="min-height:90px" placeholder="Example: Mid-term break starts Friday 24 October, school resumes Monday 3 November."></textarea></div>' +
      '<div class="cm-ai-btns"><button type="button" class="btn btn-soft btn-sm" id="cm-ai-draft">Draft in English from notes</button><button type="button" class="btn btn-soft btn-sm" id="cm-ai-improve">Improve this language\'s wording</button><button type="button" class="btn btn-soft btn-sm" id="cm-ai-tr">Translate English into this language</button></div>' +
      '<div class="result" id="cm-ai-res" role="status" aria-live="polite"></div></div>' +
      '<div class="level-tabs cm-lang" role="tablist" aria-label="Language" style="margin:1.2rem 0 1rem">' + LANGS.map(function (l) { return '<button type="button" role="tab" data-l="' + l[0] + '" aria-selected="' + (l[0] === "en") + '">' + l[1] + "</button>"; }).join("") + "</div>" +
      LANGS.map(function (l) { return langPane(l[0], K, rec); }).join("") +
      '<div class="form-grid" style="margin-top:.6rem">' + plain + status + "</div>" +
      '<div class="form-actions" style="margin-top:1.2rem"><button type="submit" class="btn btn-primary" id="cm-save">Save</button>' + (rec ? '<button type="button" class="btn btn-soft" id="cm-del" style="margin-inline-start:auto">Delete</button>' : "") + '</div><div class="result" id="cm-res" role="status" tabindex="-1"></div></form>';

    if (kind === "news") { $("#cm-cat").value = rec ? rec.category : "notice"; $("#cm-date").value = rec ? rec.publish_at : today(); $("#cm-pin").checked = !!(rec && rec.pinned); $("#cm-arch").checked = !!(rec && rec.archived); }
    if (kind === "notices") { $("#cm-aud").value = rec && rec.audience && rec.audience[0] || "all"; $("#cm-date").value = rec ? rec.publish_at : today(); }
    if (kind === "events") { $("#cm-cat").value = rec ? rec.category : "general"; $("#cm-loc").value = rec && rec.location || ""; $("#cm-sd").value = rec ? rec.start_date : ""; $("#cm-ed").value = rec && rec.end_date || ""; $("#cm-st").value = rec && rec.start_time || ""; $("#cm-et").value = rec && rec.end_time || ""; }
    if (kind === "faqs") $("#cm-sort").value = rec ? rec.sort : (rows.length ? Math.max.apply(null, rows.map(function (r) { return r.sort; })) + 10 : 10);
    $("#cm-status").value = rec ? rec.status : "draft";
    bindEditor(K);
    U.openDialog($("#ad-dlg"));
  }
  function getLang(l, K) {
    var o = {}; K.tr.forEach(function (f) { var el = $("#cm-" + f[0] + "-" + l); o[f[0]] = f[2] === "paras" ? toParas(el.value) : el.value.trim(); }); return o;
  }
  function setLang(l, K, o) {
    K.tr.forEach(function (f) { var v = o && o[f[0]]; if (v == null) return; $("#cm-" + f[0] + "-" + l).value = f[2] === "paras" ? paraText(v) : (Array.isArray(v) ? v.join(" ") : String(v)); });
  }
  function hasText(o) { return Object.keys(o).some(function (k) { return Array.isArray(o[k]) ? o[k].length : o[k]; }); }
  function pane(l) {
    curLang = l;
    $$(".cm-lang button").forEach(function (b) { b.setAttribute("aria-selected", String(b.getAttribute("data-l") === l)); });
    $$(".cm-pane").forEach(function (p) { p.hidden = p.getAttribute("data-lang") !== l; });
    $("#cm-ai-tr").hidden = l === "en"; $("#cm-ai-draft").hidden = l !== "en";
    var res = $("#cm-ai-res"); res.className = "result"; res.textContent = "";
  }
  function bindEditor(K) {
    $$(".cm-lang button").forEach(function (b) { b.addEventListener("click", function () { pane(b.getAttribute("data-l")); }); });
    pane("en");
    $("#cm-ai-draft").addEventListener("click", function () {
      var notes = $("#cm-notes").value.trim(), b = this; if (notes.length < 10) { aiNote("Write a few facts in the notes box first.", false); return; }
      var en = getLang("en", K);
      if (hasText(en) && !confirm("This will replace what is in the English fields with a new draft. Continue?")) return;
      var cat = $("#cm-cat") ? $("#cm-cat").value : "notice";
      aiBusy(b, true); aiNote("Drafting...", true);
      ai({ task: K.draft, text: notes, category: cat }).then(function (r) {
        setLang("en", K, r); aiNote("Draft added to the English fields. Please read it, correct anything wrong, then press Save. Dates and names must come from you.", true);
      }, function (e) { aiNote(aiMsg(e), false); }).then(function () { aiBusy(b, false); });
    });
    $("#cm-ai-improve").addEventListener("click", function () {
      var b = this, f = getLang(curLang, K); if (!hasText(f)) { aiNote("There is no text in this language yet.", false); return; }
      aiBusy(b, true); aiNote("Improving...", true);
      ai({ task: "improve", fields: f }).then(function (r) { setLang(curLang, K, r); aiNote("Wording improved. Please read it before saving.", true); },
        function (e) { aiNote(aiMsg(e), false); }).then(function () { aiBusy(b, false); });
    });
    $("#cm-ai-tr").addEventListener("click", function () {
      var b = this, en = getLang("en", K), to = curLang; if (!hasText(en)) { aiNote("Write the English version first, then translate it.", false); return; }
      if (hasText(getLang(to, K)) && !confirm("This will replace the text in this language. Continue?")) return;
      aiBusy(b, true); aiNote("Translating...", true);
      ai({ task: "translate", to: to, fields: en }).then(function (r) {
        setLang(to, K, r); aiNote("Translation added as a draft. A fluent " + (to === "ar" ? "Arabic" : "Hausa") + " speaker should check it before you publish.", true);
      }, function (e) { aiNote(aiMsg(e), false); }).then(function () { aiBusy(b, false); });
    });
    $("#cm-form").addEventListener("submit", function (e) { e.preventDefault(); save(K); });
    var del = $("#cm-del"); if (del) del.addEventListener("click", function () { remove(K); });
  }
  function bad(el, msg) {
    var f = el.closest(".fld"); if (f) { f.classList.add("invalid"); f.querySelector(".err").textContent = msg; }
  }
  function save(K) {
    $$("#cm-form .fld.invalid").forEach(function (f) { f.classList.remove("invalid"); });
    var res = $("#cm-res"), rec = {}, ok = true, first = null, en = getLang("en", K);
    function fail(el, m, l) { ok = false; bad(el, m); if (!first) first = { el: el, l: l }; }
    K.tr.forEach(function (f) {
      var o = {}; LANGS.forEach(function (l) {
        var v = getLang(l[0], K)[f[0]]; if (Array.isArray(v) ? v.length : v) o[l[0]] = v;
      }); rec[f[0]] = o;
    });
    var needEl = $("#cm-" + K.need + "-en");
    if (!en[K.need]) fail(needEl, "Please write this in English.", "en");
    if (kind === "news") {
      if (!en.body.length) fail($("#cm-body-en"), "Please write the story in English.", "en");
      rec.category = $("#cm-cat").value; rec.pinned = $("#cm-pin").checked; rec.archived = $("#cm-arch").checked; rec.publish_at = $("#cm-date").value;
      if (!rec.publish_at) fail($("#cm-date"), "Choose a date.");
    }
    if (kind === "notices") {
      if (!en.body.length) fail($("#cm-body-en"), "Please write the message in English.", "en");
      rec.audience = [$("#cm-aud").value]; rec.publish_at = $("#cm-date").value;
      if (!rec.publish_at) fail($("#cm-date"), "Choose a date.");
    }
    if (kind === "events") {
      rec.category = $("#cm-cat").value; rec.location = $("#cm-loc").value.trim() || null; rec.start_date = $("#cm-sd").value; rec.end_date = $("#cm-ed").value || null;
      rec.start_time = $("#cm-st").value || null; rec.end_time = $("#cm-et").value || null;
      if (!rec.start_date) fail($("#cm-sd"), "Choose the start date.");
      if (rec.end_date && rec.end_date < rec.start_date) fail($("#cm-ed"), "The end date cannot be before the start.");
      if (rec.end_time && !rec.start_time) fail($("#cm-et"), "Add a start time too.");
    }
    if (kind === "faqs") {
      var s = parseInt($("#cm-sort").value, 10); if (isNaN(s) || s < 1) fail($("#cm-sort"), "Enter a number from 1."); rec.sort = s;
    }
    rec.status = $("#cm-status").value;
    if (!ok) {
      if (first.l) pane(first.l); first.el.focus();
      res.className = "result show bad"; res.textContent = "Please fix the highlighted fields."; return;
    }
    rec.id = cur ? cur.id : slug(en[K.need === "q" ? "q" : "title"]) + "-" + rid();
    $("#cm-save").disabled = true;
    A.api("POST", "/rest/v1/" + K.table + "?on_conflict=id", rec, { Prefer: "resolution=merge-duplicates,return=minimal" }).then(function () {
      $("#ad-dlg").close(); loadList();
    }, function (e) { res.className = "result show bad"; res.textContent = A.nice(e.message); res.focus(); }).then(function () { var b = $("#cm-save"); if (b) b.disabled = false; });
  }
  function remove(K) {
    if (!cur || !confirm("Delete this permanently? To only hide it from the website, set it to Draft instead.")) return;
    A.api("DELETE", "/rest/v1/" + K.table + "?id=eq." + encodeURIComponent(cur.id)).then(function () { $("#ad-dlg").close(); loadList(); },
      function (e) { var r = $("#cm-res"); r.className = "result show bad"; r.textContent = A.nice(e.message); });
  }

  /* ---------- school details ---------- */
  function siteForm() {
    var body = $("#cm-body"); body.innerHTML = '<p class="count-line">Loading...</p>';
    A.api("GET", "/rest/v1/site_settings?select=value&key=eq.contact").then(function (r) {
      var v = (r && r[0] && r[0].value) || {};
      body.innerHTML = '<div class="form-card"><h2 style="font-size:1.2rem;margin:0 0 .3rem">School details</h2><p class="count-line">These appear in the website footer and on the Contact page. Leave a box empty to show "To be confirmed".</p>' +
        '<form id="cs-form" novalidate><div class="form-grid">' +
        fld("cs-addr", "Address", '<textarea class="textarea" id="cs-addr" maxlength="300" style="min-height:80px">' + esc(v.address || "") + "</textarea>", "full") +
        fld("cs-phones", "Phone numbers (one per line)", '<textarea class="textarea" id="cs-phones" style="min-height:80px" inputmode="tel">' + esc((v.phones || []).join("\n")) + "</textarea>") +
        fld("cs-hours", "Opening hours (one per line, as: Days | Time)", '<textarea class="textarea" id="cs-hours" style="min-height:80px" placeholder="Monday to Friday | 8:00 AM to 3:00 PM">' + esc((v.hours || []).map(function (h) { return h.days + " | " + h.time; }).join("\n")) + "</textarea>") +
        fld("cs-email", "Email", '<input class="input" type="email" id="cs-email" maxlength="120" value="' + esc(v.email || "") + '">') +
        fld("cs-wa", "WhatsApp number (digits with country code, e.g. 2348012345678)", '<input class="input" id="cs-wa" inputmode="numeric" maxlength="20" value="' + esc(v.whatsapp || "") + '">') +
        fld("cs-map", "Map link (https://...)", '<input class="input" type="url" id="cs-map" maxlength="400" value="' + esc(v.mapUrl || "") + '">', "full") +
        '</div><div class="form-actions" style="margin-top:1.2rem"><button type="submit" class="btn btn-primary" id="cs-save">Save school details</button></div><div class="result" id="cs-res" role="status" tabindex="-1"></div></form></div>';
      $("#cs-form").addEventListener("submit", function (e) {
        e.preventDefault(); $$("#cs-form .fld.invalid").forEach(function (f) { f.classList.remove("invalid"); });
        var res = $("#cs-res"), ok = true, em = $("#cs-email").value.trim(), wa = $("#cs-wa").value.replace(/[\s+()-]/g, ""), mp = $("#cs-map").value.trim();
        if (em && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { ok = false; bad($("#cs-email"), "That email does not look right."); }
        if (wa && !/^\d{8,15}$/.test(wa)) { ok = false; bad($("#cs-wa"), "Use digits only, with the country code (8 to 15 digits)."); }
        if (mp && !/^https:\/\//i.test(mp)) { ok = false; bad($("#cs-map"), "The link must start with https://"); }
        var hours = [], hoursOk = true;
        $("#cs-hours").value.split("\n").forEach(function (l) { l = l.trim(); if (!l) return; var p = l.split("|"); if (p.length !== 2 || !p[0].trim() || !p[1].trim()) hoursOk = false; else hours.push({ days: p[0].trim(), time: p[1].trim() }); });
        if (!hoursOk) { ok = false; bad($("#cs-hours"), "Write each line as: Days | Time"); }
        if (!ok) { res.className = "result show bad"; res.textContent = "Please fix the highlighted fields."; return; }
        var value = { address: $("#cs-addr").value.trim(), phones: $("#cs-phones").value.split("\n").map(function (x) { return x.trim(); }).filter(Boolean), hours: hours, email: em, whatsapp: wa, mapUrl: mp };
        $("#cs-save").disabled = true;
        A.api("POST", "/rest/v1/site_settings?on_conflict=key", { key: "contact", value: value }, { Prefer: "resolution=merge-duplicates,return=minimal" }).then(function () {
          res.className = "result show ok"; res.textContent = "Saved. The website will show these details within a minute for new visitors.";
        }, function (err) { res.className = "result show bad"; res.textContent = A.nice(err.message); }).then(function () { $("#cs-save").disabled = false; });
      });
    }, function (e) { body.innerHTML = '<div class="notice"><span>' + esc(A.nice(e.message)) + "</span></div>"; });
  }

  A.content = function (h) { host = h; if (!$("#cm-kinds", h)) shell(); show(kind); };
  U.init(function () { /* the shared dialog is used by this module; keep dirty tabs from leaking between panels */ });
})();
