/* Dashboard: school overview statistics for administrators and viewers (read-only numbers; one database call). */
(function () {
  "use strict";
  var U = window.UBK, $ = U.$, $$ = U.$$, esc = U.esc, A = window.UBK_ADMIN;
  if (!A) return;
  function N(v) { return "₦" + Number(v || 0).toLocaleString("en-NG", { maximumFractionDigits: 0 }); }
  function pct(a, b) { return b > 0 ? Math.round(a / b * 100) : 0; }
  function defSession() { var d = new Date(), y = d.getFullYear(); return d.getMonth() >= 8 ? y + "/" + (y + 1) : (y - 1) + "/" + y; }
  var ROLE = { super_admin: "Super administrators", school_admin: "School administrators", admissions_officer: "Admissions officers", finance_officer: "Finance officers", content_editor: "Content editors", publicity_manager: "Publicity managers", teacher: "Teachers", bursar: "Bursars", viewer: "Viewers" };
  function tile(label, value, sub, tone) { return '<div class="ad-stat st-' + (tone || "n") + '"><b>' + value + "</b><span>" + esc(label) + "</span>" + (sub ? "<small>" + sub + "</small>" : "") + "</div>"; }

  function bars(days) {
    var W = 640, H = 170, pad = 22, max = Math.max.apply(null, days.map(function (d) { return +d.amount; }).concat([1])), bw = (W - pad * 2) / days.length;
    var total = days.reduce(function (a, d) { return a + +d.amount; }, 0);
    return '<svg viewBox="0 0 ' + W + " " + (H + 26) + '" role="img" aria-label="Payments recorded in the last 14 days, total ' + N(total) + '" class="st-chart"><title>Payments in the last 14 days</title>' +
      [0.5, 1].map(function (f) { var y = H - f * (H - 14); return '<line x1="' + pad + '" x2="' + (W - pad) + '" y1="' + y + '" y2="' + y + '" stroke="currentColor" opacity=".12"/>'; }).join("") +
      days.map(function (d, i) {
        var h = Math.max(+d.amount > 0 ? 3 : 0, (+d.amount / max) * (H - 14)), x = pad + i * bw + bw * 0.18, dt = new Date(d.day), lab = dt.getUTCDate();
        return '<g><title>' + dt.toUTCString().slice(0, 11) + ": " + N(d.amount) + '</title><rect x="' + x + '" y="' + (H - h) + '" width="' + (bw * 0.64) + '" height="' + h + '" rx="4" fill="var(--accent)"/><text x="' + (x + bw * 0.32) + '" y="' + (H + 16) + '" text-anchor="middle" font-size="11" fill="currentColor" opacity=".6">' + lab + "</text></g>";
      }).join("") + "</svg>";
  }

  function stats(host) {
    var ses, term; try { ses = localStorage.getItem("ubk_bur_session"); term = localStorage.getItem("ubk_bur_term"); } catch (e) {}
    ses = ses || defSession(); term = term || "First";
    host.innerHTML = '<p class="count-line">Loading the numbers...</p>';
    A.api("POST", "/rest/v1/rpc/dashboard_stats", { p_session: ses, p_term: term }).then(function (d) {
      d.apps = d.apps || { new7: 0, open: 0 }; d.staff = d.staff || {}; d.pay_by_day = d.pay_by_day || []; d.class_rows = d.class_rows || []; d.fees = d.fees;
      var att = d.attendance || { present: 0, late: 0, absent: 0, excused: 0 }, marked = att.present + att.late + att.absent + att.excused, here = att.present + att.late, fees = d.fees || {};
      var isAdm = A.can(["super_admin", "school_admin"]);
      host.innerHTML = '<div class="st-head"><div><h2 class="sec-title" style="font-size:1.5rem;margin:0">School overview</h2><p class="count-line" style="margin:.3rem 0 0">' + new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + " · " + esc(ses) + " " + esc(term) + " term</p></div>" +
        '<div class="form-actions">' + (isAdm ? '<button type="button" class="btn btn-soft btn-sm" data-go="attendance">Attendance</button><button type="button" class="btn btn-soft btn-sm" data-go="bursar">Fees</button><button type="button" class="btn btn-soft btn-sm" data-go="admissions">Admissions</button>' : '<button type="button" class="btn btn-soft btn-sm" data-go="attendance">Attendance</button><button type="button" class="btn btn-soft btn-sm" data-go="bursar">Fees</button>') + "</div></div>" +
        '<div class="ad-stats">' +
        tile("Pupils", d.pupils, d.boys || d.girls ? d.boys + " boys · " + d.girls + " girls" : d.classes + " classes") +
        tile("Present today", marked ? here + " / " + (marked) : "-", marked ? pct(here, marked) + "% attendance" : "Registers not taken yet", marked ? "g" : "n") +
        tile("Absent today", marked ? att.absent : "-", att.late ? att.late + " late" : "", att.absent ? "r" : "n") +
        tile("Fees collected", N(fees.paid), fees.expected ? pct(fees.paid, fees.expected) + "% of " + N(fees.expected) : "Set fees in Fees and receipts", "g") +
        tile("Paid today", N(fees.today), "") +
        tile("New applications", d.apps.new7, "last 7 days · " + d.apps.open + " open", d.apps.open ? "a" : "n") + "</div>" +
        '<div class="st-two"><section class="panel"><h3>Payments, last 14 days</h3>' + bars(d.pay_by_day || []) + "</section>" +
        '<section class="panel"><h3>Staff</h3><ul class="st-list">' + Object.keys(d.staff || {}).map(function (k) { return "<li><span>" + esc(ROLE[k] || k) + "</span><b>" + d.staff[k] + "</b></li>"; }).join("") + '</ul><h3 style="margin-top:1.4rem">Attendance today</h3>' +
        (marked ? '<div class="st-split" role="img" aria-label="' + att.present + " present, " + att.late + " late, " + att.absent + " absent, " + att.excused + ' excused"><i style="flex:' + att.present + ';background:var(--accent)"></i><i style="flex:' + att.late + ';background:var(--highlight)"></i><i style="flex:' + att.excused + ';background:#8b8ba7"></i><i style="flex:' + att.absent + ';background:var(--danger)"></i></div><p class="count-line" style="margin:.5rem 0 0">Present ' + att.present + " · Late " + att.late + " · Excused " + att.excused + " · Absent " + att.absent + "</p>" : '<p class="count-line">No register has been saved today.</p>') + "</section></div>" +
        '<h3 style="font-size:1.1rem;margin:2.2rem 0 .8rem">By class</h3><div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>Class</th><th>Pupils</th><th>Attendance today</th><th>Fees collected</th></tr></thead><tbody>' + (d.class_rows || []).map(function (c) {
          var fp = pct(+c.paid, +c.expected);
          return "<tr><td><strong>" + esc(c.name) + "</strong></td><td>" + c.pupils + "</td><td>" + (c.marked ? c.present + " of " + c.pupils + ' <small>(' + pct(c.present, c.marked) + "%)</small>" : "<small>Not marked</small>") + "</td><td>" + (+c.expected ? '<div class="st-bar"><i style="width:' + Math.min(100, fp) + '%"></i></div><small>' + N(c.paid) + " of " + N(c.expected) + " (" + fp + "%)</small>" : "<small>No fees set</small>") + "</td></tr>";
        }).join("") + "</tbody></table></div>";
      $$("[data-go]", host).forEach(function (b) { b.addEventListener("click", function () { var t = $('#ad-tabs [data-tab="' + b.getAttribute("data-go") + '"]'); if (t) t.click(); }); });
    }, function (e) { host.innerHTML = '<div class="notice"><span>' + esc(A.nice(e.message)) + "</span></div>"; });
  }
  A.stats = stats;
})();
