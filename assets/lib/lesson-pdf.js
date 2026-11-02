/* lesson-pdf: lays out a lesson note on A4 portrait: school band, details grid, section bars,
   a Stage / Teacher / Pupils table for the presentation, boxed board summary, teacher-copy answers, sign-off lines.
   Input is the plain lesson text made by the teacher tools (already Latin-1). Output is a PdfLite document. */
(function () {
  "use strict";
  var PUR = [48, 32, 120], GOLD = [213, 164, 59], TEAL = [22, 166, 163], LAV = [243, 240, 252], GREY = [90, 90, 90], INK = [20, 20, 20], LINE = [200, 194, 222];
  var HEADS = /^(OBJECTIVES|BEHAVIOURAL OBJECTIVES|PREVIOUS KNOWLEDGE|TEACHING MATERIALS|INSTRUCTIONAL MATERIALS|CONCLUSION|KEY WORDS|INTRODUCTION|PRESENTATION|CLASS NOTE:.*|RULES AND FORMULAS|WORKED EXAMPLES|COMMON MISTAKES TO AVOID|IN REAL LIFE|SOURCE USED|BOARD SUMMARY|PRACTICE EXERCISE|SUPPORT AND EXTENSION|EVALUATION|ASSIGNMENT|AT HOME WITH PARENTS|ANSWERS TO THE PRACTICE EXERCISE.*|TEACHING PICTURES)$/;

  function parse(txt) {
    var L = String(txt).split("\n"), P = { title: (L[0] || "").trim(), meta: {}, topic: "", intro: [], secs: [] }, i = 1, cur = null, m;
    for (; i < L.length && !HEADS.test((L[i] || "").trim()); i++) {
      var t0 = (L[i] || "").trim(); if (!t0) continue;
      if (/^Class:.*\s{3,}Subject:/.test(t0)) { t0.split(/\s{3,}/).forEach(function (c) { if ((m = /^([A-Za-z ]+):\s*(.*)$/.exec(c.trim()))) P.meta[m[1].toLowerCase()] = m[2].trim(); }); continue; }
      if ((m = /^(Week|School|Class|Time|Duration|Subject|Topic|Reference|Date):\s*(.*)$/.exec(t0))) { P.meta[m[1].toLowerCase()] = m[2].trim(); if (m[1] === "Topic") P.topic = m[2].trim(); continue; }
      P.intro.push(t0);
    }
    for (; i < L.length; i++) {
      var ln = L[i].replace(/\s+$/, "");
      if (HEADS.test(ln.trim())) { cur = { head: ln.trim(), lines: [] }; P.secs.push(cur); continue; }
      if (!cur) { if (ln.trim()) P.intro.push(ln.trim()); continue; }
      cur.lines.push(ln);
    }
    P.secs.forEach(function (s) { while (s.lines.length && !s.lines[s.lines.length - 1].trim()) s.lines.pop(); });
    return P;
  }

  function build(PL, txt, o) {
    var d = PL.create(), W = 210, H = 297, M = 14, CW = W - 2 * M, y = 0, P = parse(txt), teacherCopy = false;
    function T(t, x, yy, size, bold, col, al, it) { d.setFont("helvetica", it ? "italic" : bold ? "bold" : "normal"); d.setFontSize(size); d.setTextColor.apply(d, col || INK); d.text(String(t), x, yy, al ? { align: al } : undefined); }
    function wrap(t, w, size, bold) { d.setFont("helvetica", bold ? "bold" : "normal"); d.setFontSize(size); return d.splitTextToSize(String(t), w); }
    function fill(c, x, yy, w, h) { d.setFillColor.apply(d, c); d.rect(x, yy, w, h, "F"); }
    function ln(x1, y1, x2, y2, c, wd) { d.setDrawColor.apply(d, c); d.setLineWidth(wd || 0.3); d.line(x1, y1, x2, y2); }
    function runHead() { T(o.name, M, 9, 8, false, GREY); T("Lesson note: " + (o.subject || "") + " - " + (o.cls || ""), W - M, 9, 8, false, GREY, "right"); ln(M, 11, W - M, 11, GOLD, 0.4); y = 18; }
    function need(h) { if (y + h > H - 16) { d.addPage(); runHead(); } }

    /* page 1 header */
    fill(PUR, 0, 0, W, 4); fill(GOLD, 0, 4, W, 1.2);
    if (o.logo) try { d.addImage(o.logo, "JPEG", M, 10, 20, 20); } catch (e) {}
    var hx = o.logo ? M + 25 : M;
    T(o.name, hx, 18, 15, true, PUR); T(o.motto, hx, 24, 9.5, false, GREY, null, true); if (o.line) T(o.line, hx, 29, 8, false, GREY);
    fill(PUR, W - M - 36, 12, 36, 9); T("LESSON NOTE", W - M - 18, 18, 9.5, true, [255, 255, 255], "center");
    ln(M, 34, W - M, 34, PUR, 0.6); y = 41;
    /* title */
    var title = P.title || "LESSON NOTE";
    wrap(title, CW, 14, true).forEach(function (l) { T(l, M, y, 14, true, PUR); y += 6.4; });
    y += 1.5;
    /* details grid: ruled label / value table, like the school's lesson-note book */
    var M0 = P.meta, rows = [[["School", M0.school || o.name, 2]], [["Class", M0["class"] || o.cls], ["Subject", M0.subject || o.subject]], [["Time", M0.time || M0.duration], ["Week", M0.week]], [["Date", M0.date], ["Teacher", o.teacher]], [["Topic", P.topic || M0.topic, 2]], [["Reference", M0.reference, 2]]];
    var half = CW / 2, lw = 24, rh = 7.4;
    rows.forEach(function (r, ri) {
      r.forEach(function (c, ci) {
        var span = c[2] || 1, x = M + (span === 2 ? 0 : ci * half), w = span === 2 ? CW : half, vl = wrap(c[1] || "", w - lw - 4, 9.5, true), h = Math.max(rh, vl.length * 4.6 + 2.8);
        c.h = h;
      });
      var h = Math.max.apply(null, r.map(function (c) { return c.h; }));
      r.forEach(function (c, ci) {
        var span = c[2] || 1, x = M + (span === 2 ? 0 : ci * half), w = span === 2 ? CW : half;
        fill(LAV, x, y, lw, h); ln(x, y, x + w, y, LINE, 0.25); ln(x, y + h, x + w, y + h, LINE, 0.25); ln(x, y, x, y + h, LINE, 0.25); ln(x + w, y, x + w, y + h, LINE, 0.25); ln(x + lw, y, x + lw, y + h, LINE, 0.25);
        T(c[0].toUpperCase(), x + 2, y + 4.8, 7, true, PUR); wrap(c[1] || "", w - lw - 4, 9.5, true).forEach(function (l, j) { T(l, x + lw + 2.5, y + 4.9 + j * 4.6, 9.5, true, INK); });
      });
      y += h;
    });
    y += 4;
    if (P.intro.length) { wrap(P.intro.join(" "), CW, 9, false).forEach(function (l) { need(5); T(l, M, y, 9, false, GREY, null, true); y += 4.4; }); y += 2; }

    /* building blocks */
    function bar(t) {
      var label = t.replace(/\s*\(TEACHER\)\s*$/, "");
      need(14); y += 2; fill(LAV, M, y, CW, 7); fill(TEAL, M, y, 1.8, 7); T(label.replace(/^CLASS NOTE:\s*/, "CLASS NOTE: "), M + 4.5, y + 4.9, 9.5, true, PUR); y += 10.5;
    }
    function para(t, indent, size, bold, col) {
      size = size || 9.5; var w = CW - (indent || 0);
      wrap(t, w, size, bold).forEach(function (l) { need(size * 0.42 + 1.2); T(l, M + (indent || 0), y, size, bold, col); y += size * 0.43 + 1.3; });
    }
    function bullet(t, ind) {
      var w = CW - ind - 5, ls = wrap(t, w, 9.5, false);
      need(ls.length * 4.9 + 1); fill(TEAL, M + ind + 0.4, y - 2, 1.5, 1.5);
      ls.forEach(function (l) { T(l, M + ind + 5, y, 9.5, false, INK); y += 4.9; }); y += 0.6;
    }
    function numbered(n, t, ind, g) {
      g = g || 7; var w = CW - ind - g, ls = wrap(t, w, 9.5, false);
      need(ls.length * 4.9 + 1); T(n, M + ind, y, 9.5, true, PUR);
      ls.forEach(function (l) { T(l, M + ind + g, y, 9.5, false, INK); y += 4.9; }); y += 0.6;
    }
    function lines(arr, ind) {
      ind = ind || 0;
      arr.forEach(function (raw) {
        var t = raw.replace(/\s+$/, ""), m;
        if (!t.trim()) { y += 1.6; return; }
        if ((m = /^\s*-\s+(.*)$/.exec(t))) return bullet(m[1], ind + (/^\s{2,}/.test(t) ? 4 : 0));
        if ((m = /^(i{1,3}|iv|vi{0,3}|ix|x{1,2}i{0,3}|xiv|xv)\.\s+(.*)$/.exec(t))) return numbered(m[1] + ".", m[2], ind, 9);
        if ((m = /^(\d+)\.\s+(.*)$/.exec(t))) return numbered(m[1] + ".", m[2], ind);
        if (/^(By the end of|The teacher (presents|evaluates))/.test(t)) { para(t, ind, 9.5, true, INK); return; }
        if ((m = /^(Example \d+:.*)$/.exec(t))) { y += 1.5; need(7); para(m[1], ind, 10, true, PUR); return; }
        if ((m = /^(Question:|Answer:)\s*(.*)$/.exec(t))) { need(6); var w0 = m[1] === "Answer:" ? TEAL : GREY; T(m[1], M + ind, y, 9.5, true, w0); var rest = wrap(m[2], CW - ind - 20, 9.5, false); rest.forEach(function (l, k) { if (k) { need(5); } T(l, M + ind + 18, y, 9.5, false, INK); y += 4.9; }); if (!rest.length) y += 4.9; return; }
        if (/^\((Pupils copy|The teacher writes)/.test(t)) { para(t, ind, 8.5, false, GREY); return; }
        para(t.replace(/^\s+/, ""), ind + (/^\s{3,}/.test(t) ? 4 : 0));
      });
    }
    function twoCol(rows, a, b) {
      var wa = 40, wb = CW - wa; need(9);
      fill(PUR, M, y, CW, 6); T(a, M + 2, y + 4.2, 8.5, true, [255, 255, 255]); T(b, M + wa + 2, y + 4.2, 8.5, true, [255, 255, 255]); y += 6;
      rows.forEach(function (r, k) {
        var l1 = wrap(r[0], wa - 4, 9, true), l2 = wrap(r[1], wb - 4, 9, false), h = Math.max(l1.length, l2.length) * 4.4 + 3;
        need(h); if (k % 2) fill([250, 248, 254], M, y, CW, h);
        l1.forEach(function (l, j) { T(l, M + 2, y + 4 + j * 4.4, 9, true, PUR); }); l2.forEach(function (l, j) { T(l, M + wa + 2, y + 4 + j * 4.4, 9, false, INK); });
        ln(M, y + h, M + CW, y + h, LINE, 0.2); y += h;
      }); y += 2;
    }
    function steps(arr) {
      var steps = [], cur = null, m;
      arr.forEach(function (raw) {
        var t = raw.trim(); if (!t) return;
        if ((m = /^Step ([ivxIVX\d]+):\s*(.*)$/.exec(t))) { cur = { n: m[1], stage: m[2], t: "", p: "" }; steps.push(cur); return; }
        if (!cur) return;
        if ((m = /^Teacher:\s*(.*)$/.exec(t))) { cur.t = m[1]; cur.last = "t"; return; }
        if ((m = /^Pupils:\s*(.*)$/.exec(t))) { cur.p = m[1]; cur.last = "p"; return; }
        if (cur.last) cur[cur.last] += " " + t;
      });
      var pre = arr.filter(function (r) { return r.trim() && !/^Step [ivxIVX\d]+:/.test(r.trim()); }).length && !steps.length;
      if (!steps.length) return lines(arr);
      var intro = arr[0] && !/^Step [ivxIVX\d]+:/.test(arr[0].trim()) ? arr[0].trim() : "";
      if (intro) { para(intro, 0, 9.5, true, INK); y += 1.5; }
      var gw = 20;
      steps.forEach(function (s) {
        var m2 = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(s.stage), st = m2 ? m2[1] : s.stage, tm = m2 ? m2[2] : "";
        var blocks = [[st + (tm ? " (" + tm + ")" : ""), "", true]]; if (s.t) blocks.push(["Teacher: ", s.t]); if (s.p) blocks.push(["Pupils: ", s.p]);
        var total = 0, L = blocks.map(function (b) { var ls = wrap((b[0] && !b[2] ? "Teacher: " : "") + b[1] + (b[2] ? b[0] : ""), CW - gw - 2, 9.5, !!b[2]); total += ls.length * 4.8 + 1; return ls; });
        need(Math.min(total + 3, 30)); var y0 = y;
        T("Step " + s.n, M, y + 0.2, 9.5, true, PUR); ln(M, y + 1.4, M + 15, y + 1.4, PUR, 0.5);
        blocks.forEach(function (b, bi) {
          if (b[2]) { wrap(b[0], CW - gw - 2, 9.5, true).forEach(function (l) { need(5); T(l, M + gw, y, 9.5, true, INK); y += 4.8; }); return; }
          var lab = b[0].trim(), lines2 = wrap(b[1], CW - gw - 2 - 17, 9.5, false);
          lines2.forEach(function (l, j) { need(5); if (j === 0) T(lab, M + gw, y, 9, true, lab === "Teacher:" ? PUR : TEAL); T(l, M + gw + 17, y, 9.5, false, INK); y += 4.8; });
        });
        y += 3;
      });
    }
    function boxed(arr) {
      var items = []; arr.forEach(function (r) { var t = r.replace(/^\s*-\s+/, "").trim(); if (t) items.push(t); });
      var ls = []; items.forEach(function (t) { wrap(t, CW - 14, 9.5, false).forEach(function (l, j) { ls.push([l, j === 0]); }); });
      var h = ls.length * 4.9 + 5; need(Math.min(h, 40));
      if (y + h > H - 16) return arr.forEach(function (t) { lines([t]); });
      fill(LAV, M, y, CW, h); fill(GOLD, M, y, 1.6, h);
      ls.forEach(function (l, j) { if (l[1]) fill(TEAL, M + 5, y + 4.2 + j * 4.9 - 1.9, 1.5, 1.5); T(l[0], M + 9, y + 4.2 + j * 4.9, 9.5, false, INK); }); y += h + 3;
    }

    P.secs.forEach(function (s) {
      var h = s.head;
      if (/^ANSWERS TO THE PRACTICE/.test(h) && !teacherCopy) { teacherCopy = true; need(30); y += 3; ln(M, y, W - M, y, GOLD, 0.6); y += 4; T("TEACHER COPY - not for pupils", M, y, 8, true, [165, 45, 53]); y += 3; }
      if (!s.lines.some(function (x) { return x.trim(); })) return;
      bar(h);
      if (h === "PRESENTATION") return steps(s.lines);
      if (h === "BOARD SUMMARY") return boxed(s.lines);
      if (h === "KEY WORDS") {
        var rows = []; s.lines.forEach(function (r) { var m = /^\s*-\s*([^:]+):\s*(.*)$/.exec(r); if (m) rows.push([m[1].trim(), m[2].trim()]); });
        if (rows.length) return twoCol(rows, "WORD", "MEANING");
      }
      lines(s.lines);
      y += 2;
    });
    /* sign-off */
    need(34); y += 6; ln(M, y, W - M, y, LINE, 0.3); y += 5;
    var bw = (CW - 6) / 2;
    [["Teacher's signature and date", 0], ["Head teacher's remarks and signature", 1]].forEach(function (b) {
      var x = M + b[1] * (bw + 6); T(b[0].toUpperCase(), x, y, 7, true, GREY); ln(x, y + 12, x + bw, y + 12, PUR, 0.3); ln(x, y + 20, x + bw, y + 20, PUR, 0.3);
    });
    y += 24;
    /* footers */
    var n = d.getNumberOfPages();
    for (var k = 1; k <= n; k++) {
      d.setPage(k); ln(M, H - 12, W - M, H - 12, GOLD, 0.4);
      T((o.subject || "") + " | " + (o.cls || ""), M, H - 8, 8, false, GREY); T("Page " + k + " of " + n, W / 2, H - 8, 8, false, GREY, "center"); T(o.name, W - M, H - 8, 8, false, GREY, "right", true);
    }
    return d;
  }
  window.LessonPdf = { build: build, parse: parse };
})();
