/* pdf-lite: a tiny PDF writer (A4, Helvetica, JPEG pictures) used for lesson notes and exam papers.
   About 5 KB instead of a 366 KB library. Units are millimetres, y counts down from the top of the page.
   Text must be Latin-1 (the caller converts other characters). API: window.PdfLite.create() */
(function () {
  "use strict";
  var MM = 72 / 25.4, PW = 595.28, PH = 841.89;
  var W = {
    r: "278 278 355 556 556 889 667 191 333 333 389 584 278 333 278 278 556 556 556 556 556 556 556 556 556 556 278 278 584 584 584 556 1015 667 667 722 722 667 611 778 722 278 500 667 556 833 722 778 667 778 722 667 611 722 667 944 667 667 611 278 278 278 469 556 333 556 556 500 556 556 278 556 556 222 222 500 222 833 556 556 556 556 333 500 278 556 500 722 500 500 500 334 260 334 584".split(" "),
    b: "278 333 474 556 556 889 722 238 333 333 389 584 278 333 278 278 556 556 556 556 556 556 556 556 556 556 333 333 584 584 584 611 975 722 722 722 722 667 611 778 722 278 556 722 611 833 722 778 667 778 722 667 611 722 667 944 667 667 611 333 278 333 584 556 333 556 611 556 611 556 333 611 611 278 278 556 278 889 611 611 611 611 389 556 333 611 556 778 556 556 500 389 280 389 584".split(" ")
  };
  var FONTS = { normal: ["F1", "r", "Helvetica"], bold: ["F2", "b", "Helvetica-Bold"], italic: ["F3", "r", "Helvetica-Oblique"] };
  function f2(n) { return (Math.round(n * 100) / 100).toString(); }
  function esc(s) { return String(s).replace(/[\\()]/g, "\\$&"); }
  function col(c) { return c.map(function (v) { return f2(v / 255); }).join(" "); }

  function create() {
    var pages = [{ ops: [] }], cur = pages[0], font = "normal", size = 11, tc = [0, 0, 0], fc = [0, 0, 0], dc = [0, 0, 0], lw = 0.3, imgs = [];
    function width(str, sz, f) { var t = W[FONTS[f || font][1]], w = 0; for (var i = 0; i < str.length; i++) { var c = str.charCodeAt(i); w += (c >= 32 && c <= 126 ? +t[c - 32] : 556); } return w * sz / 1000 / MM; }
    var d = {
      setFont: function (_n, st) { font = FONTS[st] ? st : "normal"; },
      setFontSize: function (s) { size = s; },
      setTextColor: function (r, g, b) { tc = [r, g, b]; },
      setFillColor: function (r, g, b) { fc = [r, g, b]; },
      setDrawColor: function (r, g, b) { dc = [r, g, b]; },
      setLineWidth: function (w) { lw = w; },
      addPage: function () { cur = { ops: [] }; pages.push(cur); },
      getNumberOfPages: function () { return pages.length; },
      setPage: function (n) { cur = pages[n - 1]; },
      rect: function (x, y, w, h) { cur.ops.push(col(fc) + " rg " + f2(x * MM) + " " + f2(PH - (y + h) * MM) + " " + f2(w * MM) + " " + f2(h * MM) + " re f"); },
      line: function (x1, y1, x2, y2) { cur.ops.push(col(dc) + " RG " + f2(lw * MM) + " w " + f2(x1 * MM) + " " + f2(PH - y1 * MM) + " m " + f2(x2 * MM) + " " + f2(PH - y2 * MM) + " l S"); },
      text: function (str, x, y, o) {
        str = String(str); var w = width(str, size);
        if (o && o.align === "center") x -= w / 2; else if (o && o.align === "right") x -= w;
        cur.ops.push("BT " + col(tc) + " rg /" + FONTS[font][0] + " " + f2(size) + " Tf " + f2(x * MM) + " " + f2(PH - y * MM) + " Td (" + esc(str) + ") Tj ET");
      },
      getTextWidth: function (s) { return width(String(s), size); },
      splitTextToSize: function (str, max) {
        var out = [];
        String(str).split("\n").forEach(function (para) {
          var words = para.split(" "), line = "";
          words.forEach(function (w) {
            var t = line ? line + " " + w : w;
            if (width(t, size) <= max || !line) {
              if (!line && width(w, size) > max) { var chunk = ""; for (var i = 0; i < w.length; i++) { if (width(chunk + w[i], size) > max && chunk) { out.push(chunk); chunk = ""; } chunk += w[i]; } line = chunk; } else line = t;
            } else { out.push(line); line = w; }
          });
          out.push(line);
        });
        return out;
      },
      addImage: function (url, _fmt, x, y, w, h) {
        var b64 = String(url).split(",")[1] || "", bin = atob(b64), n = bin.length, a = new Uint8Array(n), i, pw = 0, ph = 0, nc = 3;
        for (i = 0; i < n; i++) a[i] = bin.charCodeAt(i);
        if (a[0] !== 0xFF || a[1] !== 0xD8) throw new Error("JPEG only");
        i = 2; while (i < n) { if (a[i] !== 0xFF) { i++; continue; } var m = a[i + 1]; if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) { ph = a[i + 5] * 256 + a[i + 6]; pw = a[i + 7] * 256 + a[i + 8]; nc = a[i + 9]; break; } i += 2 + a[i + 2] * 256 + a[i + 3]; }
        if (!pw || (nc !== 1 && nc !== 3)) throw new Error("unsupported JPEG");
        imgs.push({ data: a, w: pw, h: ph, nc: nc }); var k = imgs.length;
        cur.ops.push("q " + f2(w * MM) + " 0 0 " + f2(h * MM) + " " + f2(x * MM) + " " + f2(PH - (y + h) * MM) + " cm /Im" + k + " Do Q");
        (cur.im = cur.im || []).push(k);
      },
      output: function () {
        var parts = [], len = 0, offs = [];
        function put(s) { var a; if (typeof s === "string") { a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) & 255; } else a = s; parts.push(a); len += a.length; }
        function obj(n, body) { offs[n] = len; put(n + " 0 obj\n"); put(body); put("\nendobj\n"); }
        put("%PDF-1.4\n");
        var np = pages.length, first = 6 + imgs.length; // objects: 1 catalog, 2 pages, 3-5 fonts, then images, then page+content pairs
        obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
        obj(2, "<< /Type /Pages /Count " + np + " /Kids [" + pages.map(function (_p, i) { return (first + i * 2) + " 0 R"; }).join(" ") + "] >>");
        ["normal", "bold", "italic"].forEach(function (f, i) { obj(3 + i, "<< /Type /Font /Subtype /Type1 /BaseFont /" + FONTS[f][2] + " /Encoding /WinAnsiEncoding >>"); });
        imgs.forEach(function (im, i) {
          var n = 6 + i; offs[n] = len; put(n + " 0 obj\n<< /Type /XObject /Subtype /Image /Width " + im.w + " /Height " + im.h + " /ColorSpace /" + (im.nc === 1 ? "DeviceGray" : "DeviceRGB") + " /BitsPerComponent 8 /Filter /DCTDecode /Length " + im.data.length + " >>\nstream\n"); put(im.data); put("\nendstream\nendobj\n");
        });
        pages.forEach(function (p, i) {
          var pn = first + i * 2, cn = pn + 1, stream = p.ops.join("\n");
          obj(pn, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + PW + " " + PH + "] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >>" + (p.im ? " /XObject << " + p.im.map(function (k) { return "/Im" + k + " " + (5 + k) + " 0 R"; }).join(" ") + " >>" : "") + " >> /Contents " + cn + " 0 R >>");
          obj(cn, "<< /Length " + stream.length + " >>\nstream\n" + stream + "\nendstream");
        });
        var total = first + np * 2, xref = len;
        put("xref\n0 " + total + "\n0000000000 65535 f \n");
        for (var n = 1; n < total; n++) put(("0000000000" + offs[n]).slice(-10) + " 00000 n \n");
        put("trailer\n<< /Size " + total + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF");
        var out = new Uint8Array(len), pos = 0; parts.forEach(function (a) { out.set(a, pos); pos += a.length; });
        return out;
      },
      save: function (name) {
        var url = URL.createObjectURL(new Blob([d.output()], { type: "application/pdf" })), a = document.createElement("a");
        a.href = url; a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
      }
    };
    return d;
  }
  window.PdfLite = { create: create };
})();
