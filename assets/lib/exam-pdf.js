/* exam-pdf: lays out an exam paper on A4.
   Primary: portrait, one column, header with name / date / score boxes (like a classroom paper).
   Secondary: landscape booklet: cover page (candidate details, examiner's box, instructions), then two columns per page.
   Input is the plain paper text made by the teacher tools (already converted to Latin-1). Output is a PdfLite document. */
(function () {
  "use strict";
  var PUR = [48, 32, 120], GOLD = [213, 164, 59], TEAL = [22, 166, 163], LAV = [243, 240, 252], GREY = [90, 90, 90], INK = [20, 20, 20];

  /* ---- read the paper text ---- */
  function parse(txt) {
    var L = String(txt).split("\n"), P = { title: (L[0] || "").trim(), meta: {}, instr: [], sections: [], total: "" }, i = 1, sec = null, q = null;
    if (/^Class:/.test(L[i] || "")) { String(L[i]).split(/\s{3,}/).forEach(function (c) { var m = /^([A-Za-z ]+):\s*(.*)$/.exec(c.trim()); if (m) P.meta[m[1].toLowerCase()] = m[2].trim(); }); i++; }
    if (/^Name:/.test(L[i] || "")) i++;
    for (; i < L.length; i++) {
      var ln = L[i].replace(/\s+$/, ""), m;
      if (/^INSTRUCTIONS$/.test(ln)) { i++; while (i < L.length && L[i].trim() && !/^SECTION [A-H]:/.test(L[i])) { P.instr.push(L[i].trim()); i++; } i--; continue; }
      if ((m = /^SECTION ([A-H]):\s*(.*)$/.exec(ln))) { sec = { letter: m[1], head: m[2], items: [], col: null }; P.sections.push(sec); q = null; continue; }
      if ((m = /^Total marks:\s*(.*)$/i.exec(ln))) { P.total = m[1].trim(); continue; }
      if (!sec) continue;
      if (!ln.trim()) continue;
      if (/MATCHING/.test(sec.head)) {
        if (/^Column A/.test(ln)) { sec.col = "a"; sec.items.push({ k: "match", a: [], b: [] }); continue; }
        if (/^Column B/.test(ln)) { sec.col = "b"; continue; }
        var mt = sec.items[sec.items.length - 1];
        if (mt && sec.col === "a" && (m = /^\d+\.\s*(.*)$/.exec(ln))) { mt.a.push(m[1]); continue; }
        if (mt && sec.col === "b" && (m = /^\s*[A-J]\.\s*(.*)$/.exec(ln))) { mt.b.push(m[1]); continue; }
      }
      if ((m = /^(\d+)\.\s+(.*)$/.exec(ln))) { q = { k: "q", n: m[1], text: m[2], opts: [], parts: [] }; sec.items.push(q); continue; }
      if (q && /^\s{2,}\(/.test(ln)) { ln.split("\t").forEach(function (c) { c = c.trim(); if (c) q.opts.push(c); }); continue; }
      if (q && /^\(?[a-h]\)\s/.test(ln.trim())) { q.parts.push(ln.trim()); continue; }
      if (q && !q.opts.length && !q.parts.length) { q.text += " " + ln.trim(); continue; }
      sec.items.push({ k: "p", text: ln.trim() });
    }
    return P;
  }
  function secMarks(s) {
    var each = /\((\d+(?:\.\d+)?)\s*marks?\s*each\)/i.exec(s.head), n = 0;
    s.items.forEach(function (it) {
      if (it.k === "match") n += it.a.length * (each ? +each[1] : 1);
      else if (it.k === "q") { if (each) n += +each[1]; else { var t = (it.text + " " + it.parts.join(" ")).match(/\[(\d+(?:\.\d+)?)\s*marks?\]/gi) || []; t.forEach(function (x) { n += parseFloat(x.replace(/[^\d.]/g, "")); }); } }
    });
    return Math.round(n * 10) / 10;
  }
  function roman(n) { return ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"][n] || String(n + 1); }

  /* ---- build ---- */
  function build(PL, txt, o) {
    var P = parse(txt), sec2 = o.level === "secondary", d = PL.create({ landscape: sec2 }), S = d.pageSize(), W = S.w, H = S.h;
    var M = sec2 ? 12 : 16, GAP = 10, NC = sec2 ? 2 : 1, CW = (W - 2 * M - (NC - 1) * GAP) / NC, TOP = sec2 ? 17 : 18, BOT = H - 15, col = 0, y = 0;
    var subj = o.subject || P.meta.subject || "", cls = o.cls || P.meta["class"] || "", term = o.term || P.meta.term || "", ses = o.session || P.meta.session || "", time = o.time || P.meta.time || "";
    function cx() { return M + col * (CW + GAP); }
    function wid(s, sz, b) { d.setFont("helvetica", b ? "bold" : "normal"); d.setFontSize(sz); return d.getTextWidth(s); }
    function T(s, x, yy, sz, b, c, al, it) { d.setFont("helvetica", it ? "italic" : b ? "bold" : "normal"); d.setFontSize(sz); d.setTextColor.apply(d, c || INK); d.text(s, x, yy, al ? { align: al } : undefined); }
    function ln(x1, y1, x2, y2, c, w) { d.setDrawColor.apply(d, c || INK); d.setLineWidth(w || 0.3); d.line(x1, y1, x2, y2); }
    function box(x, yy, w, h, c, lw) { ln(x, yy, x + w, yy, c, lw); ln(x, yy + h, x + w, yy + h, c, lw); ln(x, yy, x, yy + h, c, lw); ln(x + w, yy, x + w, yy + h, c, lw); }
    function fill(x, yy, w, h, c) { d.setFillColor.apply(d, c); d.rect(x, yy, w, h, "F"); }
    function fillLine(label, x, yy, w) { T(label, x, yy, 9, true, GREY); var lw = wid(label, 9, true); ln(x + lw + 2, yy + 0.8, x + w, yy + 0.8, PUR, 0.3); }

    function runHead() {
      T(o.name, M, 9, 8, false, GREY); T(subj + (cls ? " - " + cls : ""), W - M, 9, 8, false, GREY, "right"); ln(M, 11, W - M, 11, GOLD, 0.4);
      if (NC === 2) ln(W / 2, TOP - 3, W / 2, BOT, [200, 196, 220], 0.25);
      y = TOP; col = 0;
    }
    function nextCol() { if (col + 1 < NC) { col++; y = TOP; } else { d.addPage(); runHead(); } }
    function need(h) { if (y + h > BOT) nextCol(); }

    /* ---------- page one ---------- */
    var totalTxt = P.total || "";
    function secRows() { return P.sections.map(function (s) { return [s.letter, secMarks(s)]; }); }
    if (!sec2) {
      fill(0, 0, W, 4, PUR); fill(0, 4, W, 1.2, GOLD);
      if (o.logo) try { d.addImage(o.logo, "JPEG", M, 9, 21, 21); } catch (e) {}
      var tx = o.logo ? M + 21 + (CW - 21) / 2 : W / 2;
      T(o.name, tx, 17, 16.5, true, PUR, "center"); T(o.motto, tx, 23, 9.5, false, GREY, "center", true); if (o.line) T(o.line, tx, 28, 8, false, GREY, "center");
      ln(M, 33, W - M, 33, GOLD, 0.6);
      var l2 = (term ? term.toUpperCase() + " TERM EXAMINATION" : P.title) + (ses ? " " + ses + " ACADEMIC SESSION" : "");
      T(l2, W / 2, 41, 12, true, PUR, "center");
      if (term && P.title) T(P.title, W / 2, 46.5, 9.5, false, GREY, "center");
      fill(M, 50, CW, 9, LAV); fill(M, 50, 2.2, 9, TEAL);
      T("Subject: " + subj, M + 5, 56, 10.5, true, INK); T("Class: " + cls, M + CW * 0.52, 56, 10.5, true, INK); if (time) T("Time: " + time, W - M - 3, 56, 10.5, true, INK, "right");
      fillLine("Name:", M, 68, CW * 0.64); fillLine("Date:", M + CW * 0.68, 68, CW * 0.32);
      fillLine("Admission No.:", M, 77, CW * 0.45);
      T("Score:", M + CW * 0.55, 77, 9, true, GREY); box(M + CW * 0.55 + 12, 71.5, 15, 8.5, PUR, 0.3); T("/ " + (totalTxt || "___"), M + CW * 0.55 + 30, 77, 10, true, PUR);
      y = 86;
      if (P.instr.length) { var il = d.splitTextToSize(P.instr.join(" "), CW - 6); d.setFont("helvetica", "italic"); d.setFontSize(9); fill(M, y - 4, CW, il.length * 4.3 + 6, [250, 248, 253]); box(M, y - 4, CW, il.length * 4.3 + 6, [200, 196, 220], 0.2); T("Instructions: ", M + 3, y, 9, true, PUR); var iw = wid("Instructions: ", 9, true); il.forEach(function (t, k) { T(t, M + 3 + (k ? 0 : iw), y + k * 4.3, 9, false, GREY, null, true); }); y += il.length * 4.3 + 7; }
    } else {
      /* cover: left = candidate and examiner boxes, right = booklet front */
      var LX = M, LW = W / 2 - M - 6, RX = W / 2 + 6, RW = W / 2 - M - 6, cxr = RX + RW / 2;
      box(RX, 12, RW, H - 24, PUR, 0.7);
      if (o.logo) try { d.addImage(o.logo, "JPEG", cxr - 19, 20, 38, 38); } catch (e) {}
      var ny = 68; d.setFont("helvetica", "bold"); d.setFontSize(19); d.splitTextToSize(String(o.name).toUpperCase(), RW - 14).forEach(function (t) { T(t, cxr, ny, 19, true, PUR, "center"); ny += 8.2; });
      if (o.line) { d.setFont("helvetica", "normal"); d.setFontSize(8.5); d.splitTextToSize(o.line, RW - 16).forEach(function (t) { T(t, cxr, ny, 8.5, true, INK, "center"); ny += 4.2; }); }
      ny += 2; T((term ? term.toUpperCase() + " TERM EXAMINATION" : "EXAMINATION") + (ses ? " " + ses : ""), cxr, ny, 10.5, true, PUR, "center"); ny += 5;
      fill(RX + 3, ny, RW - 6, 7, [20, 16, 50]); T("QUESTION BOOKLET", RX + 5, ny + 5, 9.5, true, [255, 255, 255]); ny += 12;
      T("DO NOT OPEN UNTIL YOU ARE TOLD TO DO SO", RX + 5, ny, 8.5, true, INK); ny += 11;
      T("Subject: " + subj.toUpperCase(), cxr, ny, 14, true, PUR, "center"); ny += 8; T("Class: " + cls, cxr, ny, 12, true, INK, "center"); ny += 7.5; if (time) { T("Time: " + time, cxr, ny, 12, true, INK, "center"); ny += 8; }
      T("Instructions", RX + 5, ny, 10, true, INK); ln(RX + 5, ny + 1, RX + 5 + wid("Instructions", 10, true), ny + 1, INK, 0.3); ny += 6;
      var ins = []; P.instr.join(" ").split(/(?<=[.!?])\s+/).forEach(function (s) { if (s.trim()) ins.push(s.trim()); });
      ["Write your answers with a blue or black pen.", "Write clearly and neatly."].forEach(function (s) { if (ins.length < 6) ins.push(s); });
      ins.forEach(function (s, k) { var lines = d.splitTextToSize(s, RW - 24); T("(" + roman(k) + ")", RX + 6, ny, 9.5, false, INK); lines.forEach(function (t, j) { T(t, RX + 18, ny + j * 4.6, 9.5, false, INK); }); ny += lines.length * 4.6 + 1.6; });
      /* left: candidate details */
      T("CANDIDATE'S DETAILS", LX, 22, 11, true, PUR); ln(LX, 24, LX + LW, 24, GOLD, 0.6);
      var fy = 36; [["Candidate's name:", LW], ["Admission number:", LW], ["Class / Arm:", LW * 0.6], ["Date:", LW * 0.6], ["Signature:", LW * 0.7]].forEach(function (f) { fillLine(f[0], LX, fy, f[1]); fy += 11; });
      T("FOR EXAMINER'S USE ONLY", LX, fy + 8, 11, true, PUR); ln(LX, fy + 10, LX + LW, fy + 10, GOLD, 0.6);
      var ty = fy + 14, c1 = LX, c2 = LX + LW * 0.5, c3 = LX + LW * 0.75; fill(LX, ty, LW, 7, PUR);
      T("Section", c1 + 3, ty + 5, 9, true, [255, 255, 255]); T("Maximum", c2 + 3, ty + 5, 9, true, [255, 255, 255]); T("Score", c3 + 3, ty + 5, 9, true, [255, 255, 255]); ty += 7;
      secRows().forEach(function (r, k) { if (k % 2) fill(LX, ty, LW, 7, LAV); T("Section " + r[0], c1 + 3, ty + 5, 9.5, false, INK); T(r[1] ? String(r[1]) : "", c2 + 3, ty + 5, 9.5, false, INK); ln(LX, ty + 7, LX + LW, ty + 7, [200, 196, 220], 0.2); ty += 7; });
      fill(LX, ty, LW, 8, [233, 228, 246]); T("TOTAL", c1 + 3, ty + 5.6, 10, true, PUR); T(totalTxt, c2 + 3, ty + 5.6, 10, true, PUR); box(LX, ty - 7 * (secRows().length + 1), LW, 7 * (secRows().length + 1) + 8, PUR, 0.4); ln(c2, ty - 7 * (secRows().length + 1), c2, ty + 8, [200, 196, 220], 0.2); ln(c3, ty - 7 * (secRows().length + 1), c3, ty + 8, [200, 196, 220], 0.2);
      ty += 14; T("Examiner's name:", LX, ty, 9, true, GREY); ln(LX + wid("Examiner's name:", 9, true) + 2, ty + 0.8, LX + LW, ty + 0.8, PUR, 0.3);
      d.addPage(); runHead();
    }

    /* ---------- body ---------- */
    var SZ = sec2 ? 10 : 10.5, LH = SZ * 0.38 + 1.5, IND = 7.5;
    function sectionHead(s) {
      var t = "SECTION " + s.letter + ": " + s.head, lines = (d.setFont("helvetica", "bold"), d.setFontSize(9.5), d.splitTextToSize(t, CW - 7)), h = lines.length * 4.5 + 3.4;
      need(h + 16); y += 2; fill(cx(), y, CW, h, LAV); fill(cx(), y, 2, h, TEAL);
      lines.forEach(function (l, k) { T(l, cx() + 5, y + 4.6 + k * 4.5, 9.5, true, PUR); }); y += h + 3.5;
    }
    function question(it, ansN) {
      d.setFont("helvetica", "normal"); d.setFontSize(SZ);
      var tl = d.splitTextToSize(it.text, CW - IND), segs = [], lastW = d.getTextWidth(tl[tl.length - 1] || ""), pos = lastW + 3, row = tl.length - 1, avail = CW - IND, k;
      var optRows = [];
      it.opts.forEach(function (op) { var w = d.getTextWidth(op); if (pos + w <= avail) { segs.push({ t: op, x: pos, r: row }); pos += w + 6; } else { row++; pos = 0; if (w > avail) { d.splitTextToSize(op, avail).forEach(function (pl, j) { segs.push({ t: pl, x: 0, r: row + j }); }); row += d.splitTextToSize(op, avail).length - 1; pos = avail; } else { segs.push({ t: op, x: 0, r: row }); pos = w + 6; } } });
      var rows = row + 1 + it.parts.reduce(function (a, p) { return a + d.splitTextToSize(p, CW - IND - 3).length; }, 0), need2 = rows * LH + ansN * 7 + 2.4;
      need(Math.min(need2, 60));
      T(it.n + ".", cx(), y, SZ, true, PUR);
      tl.forEach(function (t, j) { T(t, cx() + IND, y + j * LH, SZ, false, INK); });
      segs.forEach(function (s) { T(s.t, cx() + IND + s.x, y + s.r * LH, SZ, false, INK); });
      y += (row + 1) * LH;
      it.parts.forEach(function (p) { d.splitTextToSize(p, CW - IND - 3).forEach(function (t, j) { need(LH); T(t, cx() + IND + 3, y, SZ, false, INK); y += LH; }); });
      for (k = 0; k < ansN; k++) { need(7); ln(cx() + IND, y + 2.6, cx() + CW, y + 2.6, [185, 180, 205], 0.2); y += 7; }
      y += 2.4;
    }
    function matching(it) {
      var half = (CW - IND) / 2 - 2, n = Math.max(it.a.length, it.b.length), hh = 0, rows = [];
      for (var i = 0; i < n; i++) { var a = d.splitTextToSize((i + 1) + ". " + (it.a[i] || ""), half), b = d.splitTextToSize("ABCDEFGHIJ"[i] + ". " + (it.b[i] || ""), half); rows.push([a, b]); }
      need(Math.min(rows.reduce(function (s, r) { return s + Math.max(r[0].length, r[1].length) * LH + 1; }, 8), 70));
      T("Column A", cx() + IND, y, SZ - 0.5, true, PUR); T("Column B", cx() + IND + half + 4, y, SZ - 0.5, true, PUR); y += LH;
      rows.forEach(function (r) { var h = Math.max(r[0].length, r[1].length); need(h * LH + 1); r[0].forEach(function (t, j) { T(t, cx() + IND, y + j * LH, SZ, false, INK); }); r[1].forEach(function (t, j) { T(t, cx() + IND + half + 4, y + j * LH, SZ, false, INK); }); y += h * LH + 1; });
      y += 3;
    }
    P.sections.forEach(function (s) {
      sectionHead(s);
      var ans = /THEORY/.test(s.head) ? (sec2 ? 0 : 5) : /SHORT/.test(s.head) ? (sec2 ? 0 : 2) : 0;
      s.items.forEach(function (it) { if (it.k === "q") question(it, ans); else if (it.k === "match") matching(it); else { d.setFont("helvetica", "normal"); d.setFontSize(SZ); d.splitTextToSize(it.text, CW).forEach(function (t) { need(LH); T(t, cx(), y, SZ, false, INK); y += LH; }); } });
    });
    need(12); y += 3; T("*** END OF PAPER ***", cx() + CW / 2, y, 9.5, true, PUR, "center"); y += 6;
    if (sec2) {
      d.addPage(); runHead(); T("ROUGH WORK", M, y, 11, true, PUR); for (var c = 0; c < 2; c++) for (var yy = y + 8; yy < BOT - 4; yy += 8) ln(M + c * (CW + GAP), yy, M + c * (CW + GAP) + CW, yy, [200, 196, 220], 0.2);
    }
    /* footer on every page (the cover of the booklet has none) */
    var n = d.getNumberOfPages();
    for (var k = 1; k <= n; k++) {
      if (sec2 && k === 1) continue;
      d.setPage(k); var h = d.pageSize().h; ln(M, h - 12, W - M, h - 12, GOLD, 0.4);
      T(subj + " | " + cls, M, h - 8, 8, false, GREY); T("Page " + (sec2 ? k - 1 : k) + " of " + (sec2 ? n - 1 : n), W / 2, h - 8, 8, false, GREY, "center"); if (k < n) T("Turn over >>", W - M, h - 8, 8, false, GREY, "right", true);
    }
    return d;
  }
  window.ExamPdf = { build: build, parse: parse };
})();
