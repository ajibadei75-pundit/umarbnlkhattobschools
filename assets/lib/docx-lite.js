/* docx-lite: builds a branded Word (.docx) file in the browser, no library. DocxLite.make(opts) -> Promise<Blob>.
   opts: {name, motto, line, running, text, exam, logo (ArrayBuffer|null)}. Plain text in; tab = table columns; ALL-CAPS line = heading. */
(function () {
  "use strict";
  var PUR = "302078", GOLD = "D5A43B", TINT = "F3F0FC";
  var T = (function () { var t = [], c, n, k; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = T[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  var enc = new TextEncoder();
  function zip(files) {
    var parts = [], cen = [], off = 0;
    files.forEach(function (f) {
      var nm = enc.encode(f.n), d = f.d instanceof Uint8Array ? f.d : enc.encode(f.d), c = crc(d), h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint32(14, c, true); h.setUint32(18, d.length, true); h.setUint32(22, d.length, true); h.setUint16(26, nm.length, true);
      parts.push(new Uint8Array(h.buffer), nm, d);
      var e = new DataView(new ArrayBuffer(46));
      e.setUint32(0, 0x02014b50, true); e.setUint16(4, 20, true); e.setUint16(6, 20, true); e.setUint16(8, 0x0800, true); e.setUint32(16, c, true); e.setUint32(20, d.length, true); e.setUint32(24, d.length, true); e.setUint16(28, nm.length, true); e.setUint32(42, off, true);
      cen.push(new Uint8Array(e.buffer), nm); off += 30 + nm.length + d.length;
    });
    var cl = cen.reduce(function (a, b) { return a + b.length; }, 0), z = new DataView(new ArrayBuffer(22));
    z.setUint32(0, 0x06054b50, true); z.setUint16(8, files.length, true); z.setUint16(10, files.length, true); z.setUint32(12, cl, true); z.setUint32(16, off, true);
    return new Blob(parts.concat(cen, [new Uint8Array(z.buffer)]), { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  }
  function x(s) { return String(s == null ? "" : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  var AR = /[؀-ۿݐ-ݿ]/;
  function run(t, o) {
    o = o || {}; var rp = (o.b ? "<w:b/>" : "") + (o.i ? "<w:i/>" : "") + (o.c ? '<w:color w:val="' + o.c + '"/>' : "") + (o.sz ? '<w:sz w:val="' + o.sz + '"/>' : "") + (AR.test(t) ? '<w:rtl/><w:rFonts w:cs="Noto Naskh Arabic"/>' : "");
    return "<w:r>" + (rp ? "<w:rPr>" + rp + "</w:rPr>" : "") + '<w:t xml:space="preserve">' + x(t) + "</w:t></w:r>";
  }
  function para(runs, o) {
    o = o || {};
    return "<w:p><w:pPr>" + (o.keep ? "<w:keepNext/>" : "") + (o.style ? '<w:pStyle w:val="' + o.style + '"/>' : "") + (o.bdr ? '<w:pBdr><w:bottom w:val="single" w:sz="' + o.bdr[1] + '" w:space="4" w:color="' + o.bdr[0] + '"/></w:pBdr>' : "") + (o.shd ? '<w:shd w:val="clear" w:color="auto" w:fill="' + o.shd + '"/>' : "") +
      '<w:spacing w:before="' + (o.before || 0) + '" w:after="' + (o.after == null ? 80 : o.after) + '"/>' + (o.ind ? '<w:ind w:left="' + o.ind + '"/>' : "") + (o.bidi ? "<w:bidi/>" : "") + (o.jc ? '<w:jc w:val="' + o.jc + '"/>' : "") + "</w:pPr>" + runs + "</w:p>";
  }
  var NB = '<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders>';
  function cols(cs) {
    var w = Math.floor(9500 / cs.length);
    return '<w:tbl><w:tblPr><w:tblW w:w="9500" w:type="dxa"/>' + NB + '<w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>' + cs.map(function () { return '<w:gridCol w:w="' + w + '"/>'; }).join("") + "</w:tblGrid><w:tr>" +
      cs.map(function (c) { return '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/></w:tcPr>' + para(run(c.trim()), { after: 20, ind: 200 }) + "</w:tc>"; }).join("") + "</w:tr></w:tbl>";
  }
  function box(l1, l2) {
    var B = function (n) { return "<w:" + n + ' w:val="single" w:sz="8" w:space="0" w:color="' + PUR + '"/>'; };
    return '<w:tbl><w:tblPr><w:tblW w:w="9500" w:type="dxa"/><w:tblBorders>' + B("top") + B("left") + B("bottom") + B("right") + '</w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="9500"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="9500" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="' + TINT + '"/></w:tcPr>' +
      para(run(l1, { b: 1, sz: 21 }), { after: 60, before: 60 }) + para(run(l2, { sz: 21 }), { after: 60 }) + "</w:tc></w:tr></w:tbl>" + para("", { after: 120 });
  }
  function head(o, imgOk) {
    var logo = imgOk ? '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="720000" cy="731000"/><wp:docPr id="1" name="Logo" descr="School logo"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="1" name="logo.jpg"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdL"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="720000" cy="731000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>' : "";
    return '<w:tbl><w:tblPr><w:tblW w:w="9500" w:type="dxa"/>' + NB + '<w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="1300"/><w:gridCol w:w="8200"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="1300" w:type="dxa"/></w:tcPr>' + para(logo, { after: 0 }) + '</w:tc><w:tc><w:tcPr><w:tcW w:w="8200" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>' +
      para(run(o.name, { b: 1, c: PUR, sz: 34 }), { after: 20 }) + para(run(o.motto, { i: 1, c: "5A5A5A", sz: 22 }), { after: 20 }) + (o.line ? para(run(o.line, { c: "5A5A5A", sz: 17 }), { after: 0 }) : "") + "</w:tc></w:tr></w:tbl>" + para("", { after: 120, bdr: [PUR, 18] }) + para("", { after: 160, bdr: [GOLD, 8] });
  }
  function body(o) {
    var L = String(o.text || "").replace(/\r/g, "").split("\n"), out = [], i = 0;
    if (L[0] && L[0].trim() && L[0] === L[0].toUpperCase() && /[A-Z]/.test(L[0])) { out.push(para(run(L[0].trim(), { b: 1, c: PUR, sz: 30 }), { jc: "center", after: 120, keep: 1 })); i = 1; }
    if (o.exam && i === 1 && /^Class:/.test(L[1] || "")) { out.push(box(L[1].replace(/\s{3,}/g, "   |   "), L[2] || "")); i = 3; }
    for (; i < L.length; i++) {
      var ln = L[i], t = ln.trim();
      if (!t) { out.push(para("", { after: 40 })); continue; }
      var ar = AR.test(t);
      if (ln.indexOf("\t") > -1) { out.push(cols(ln.split("\t"))); continue; }
      if (t.length > 2 && /[A-Z]/.test(t) && t === t.toUpperCase() && !/^\d/.test(t) && t.length < 90) { out.push(para(run(t, { b: 1, c: PUR, sz: 24 }), { before: 200, after: 80, keep: 1, bdr: [GOLD, 6] })); continue; }
      var m = t.match(/^((?:Step|Example|Question|Answer|Class|Topic|Teacher|Pupils?)\b[^:]{0,24}:)\s*(.*)$/);
      if (m) { out.push(para(run(m[1] + " ", { b: 1, c: PUR }) + run(m[2]), { bidi: ar })); continue; }
      var bl = t.match(/^[-•]\s+(.*)$/);
      out.push(para((bl ? run("•  ") : "") + run(bl ? bl[1] : t), { ind: bl ? 360 : /^\s{2,}/.test(ln) ? 360 : 0, bidi: ar }));
    }
    return out.join("");
  }
  var NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';
  var FIELD = function (c) { return '<w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:instrText xml:space="preserve"> ' + c + ' </w:instrText></w:r><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t>1</w:t></w:r><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r>'; };
  function make(o) {
    var logo = o.logo ? new Uint8Array(o.logo) : null, doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ' + NS + "><w:body>" + head(o, !!logo) + body(o) +
      '<w:sectPr><w:footerReference w:type="default" r:id="rIdF"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="1200" w:bottom="1000" w:left="1200" w:header="500" w:footer="500"/></w:sectPr></w:body></w:document>';
    var foot = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ' + NS + ">" + para(run(o.running || o.name, { c: "5A5A5A", sz: 16 }) + run("     Page ", { c: "5A5A5A", sz: 16 }) + FIELD("PAGE") + run(" of ", { c: "5A5A5A", sz: 16 }) + FIELD("NUMPAGES"), { jc: "center", after: 0, bdr: [GOLD, 6] }).replace("<w:pBdr><w:bottom", "<w:pBdr><w:top").replace('w:val="single" w:sz="6" w:space="4"', 'w:val="single" w:sz="6" w:space="4"').replace("</w:bottom>", "") + "</w:ftr>";
    var files = [
      { n: "[Content_Types].xml", d: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>' },
      { n: "_rels/.rels", d: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
      { n: "word/_rels/document.xml.rels", d: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdS" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdF" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>' + (logo ? '<Relationship Id="rIdL" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.jpg"/>' : "") + "</Relationships>" },
      { n: "word/styles.xml", d: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Noto Naskh Arabic"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>' },
      { n: "word/footer1.xml", d: foot }, { n: "word/document.xml", d: doc }];
    if (logo) files.push({ n: "word/media/logo.jpg", d: logo });
    return zip(files);
  }
  window.DocxLite = { make: function (o) { return Promise.resolve(make(o)); } };
})();
