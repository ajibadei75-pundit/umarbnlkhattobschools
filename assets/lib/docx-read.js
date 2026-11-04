/* docx-read: reads the paragraphs of a Word (.docx) file in the browser, no server needed.
   A .docx is a zip; word/document.xml is inflated with the browser's DecompressionStream.
   DocxRead.paragraphs(file) -> Promise of [{ text, num }]; num is the list level (0, 1...) of an auto-numbered paragraph, or null. */
(function () {
  "use strict";
  function u16(b, o) { return b[o] | (b[o + 1] << 8); }
  function u32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }
  function inflate(data) {
    if (typeof DecompressionStream === "undefined") return Promise.reject(new Error("unsupported"));
    var ds = new DecompressionStream("deflate-raw"), w = ds.writable.getWriter(); w.write(data); w.close();
    return new Response(ds.readable).arrayBuffer();
  }
  function entry(buf, name) {
    var b = new Uint8Array(buf), e = b.length - 22;
    while (e >= 0 && u32(b, e) !== 0x06054b50) e--;
    if (e < 0) return Promise.reject(new Error("notzip"));
    var n = u16(b, e + 10), off = u32(b, e + 16);
    for (var i = 0; i < n; i++) {
      if (u32(b, off) !== 0x02014b50) break;
      var method = u16(b, off + 10), csz = u32(b, off + 20), nl = u16(b, off + 28), xl = u16(b, off + 30), cl = u16(b, off + 32), lh = u32(b, off + 42);
      var nm = new TextDecoder().decode(b.subarray(off + 46, off + 46 + nl));
      if (nm === name) {
        var st = lh + 30 + u16(b, lh + 26) + u16(b, lh + 28), data = b.subarray(st, st + csz);
        return method === 0 ? Promise.resolve(data.slice().buffer) : inflate(data);
      }
      off += 46 + nl + xl + cl;
    }
    return Promise.reject(new Error("nodoc"));
  }
  function paragraphs(file) {
    return file.arrayBuffer().then(function (buf) { return entry(buf, "word/document.xml"); }).then(function (ab) {
      var doc = new DOMParser().parseFromString(new TextDecoder().decode(ab), "application/xml"), out = [], ps = doc.getElementsByTagNameNS("*", "p");
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i], t = "", all = p.getElementsByTagNameNS("*", "*"), num = null;
        for (var k = 0; k < all.length; k++) {
          var ln = all[k].localName;
          if (ln === "t") t += all[k].textContent; else if (ln === "tab" || ln === "br") t += " ";
        }
        var np = p.getElementsByTagNameNS("*", "numPr")[0];
        if (np) { var lv = np.getElementsByTagNameNS("*", "ilvl")[0]; num = lv ? parseInt(lv.getAttribute("w:val"), 10) || 0 : 0; }
        out.push({ text: t, num: num });
      }
      return out;
    });
  }
  window.DocxRead = { paragraphs: paragraphs };
})();
