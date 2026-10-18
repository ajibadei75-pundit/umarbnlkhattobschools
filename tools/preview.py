#!/usr/bin/env python3
"""Builds ONE self-contained file (ubk-preview.html) that contains every page with its CSS, JS and images inlined,
so the whole site can be clicked through from a single file, e.g. in a chat preview. Links between pages work.

    python3 tools/build.py && python3 tools/preview.py [output.html]
"""
import os, re, sys, json, base64

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(ROOT), 'ubk-preview.html')
PAGES = ['index', 'admin', 'admissions', 'track', 'about', 'academics', 'news', 'events', 'contact', 'privacy', 'parent']
MIME = {'.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png'}

def rd(p, mode='r'):
    with open(os.path.join(ROOT, p), mode, **({} if 'b' in mode else {'encoding': 'utf-8'})) as f: return f.read()
def uri(p):
    return 'data:%s;base64,%s' % (MIME[os.path.splitext(p)[1]], base64.b64encode(rd(p, 'rb')).decode())

css_cache = {}
def css(path):
    if path not in css_cache:
        c = rd(path)
        c = re.sub(r'url\(["\']?\.\./img/([\w.-]+)["\']?\)', lambda m: 'url("%s")' % uri('assets/img/' + m.group(1)), c)
        css_cache[path] = c
    return css_cache[path]

acts = {n[:-4]: uri('assets/img/activities/' + n) for n in os.listdir(os.path.join(ROOT, 'assets/img/activities')) if n.endswith('.svg')}
act_script = '<script>window.UBK_ACT_IMG=%s;</script>' % json.dumps(acts)
logo, logo_fb = uri('assets/img/logo.jpg'), uri('assets/img/logo-fallback.svg')

def inline(html):
    html = re.sub(r'<link rel="stylesheet" href="(assets/css/[\w.-]+)">', lambda m: '<style>%s</style>' % css(m.group(1)), html)
    def js(m):
        code = rd(m.group(1)).replace('</script', '<\\/script')
        return '<script>%s</script>' % code + (act_script if m.group(1).endswith('data.js') else '')
    html = re.sub(r'<script src="(assets/js/[\w.-]+)"></script>', js, html)
    html = html.replace('src="assets/img/logo.jpg"', 'src="%s"' % logo).replace('src="assets/img/logo-fallback.svg"', 'src="%s"' % logo_fb)
    html = html.replace('href="assets/img/logo-fallback.svg"', 'href="%s"' % logo_fb)
    return html

pages = {p: inline(rd(p + '.html')) for p in PAGES}

SHELL = r'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Umar BN L Khattob Nursery &amp; Primary School</title>
<style>html,body{margin:0;height:100%;background:#302078}iframe{border:0;width:100%;height:100%;display:block;background:#fff}</style></head>
<body><iframe id="f" title="School website"></iframe>
<script>
(function () {
  var PAGES = __PAGES__, f = document.getElementById("f"), state = {}, cur = "index";
  function boot() { try { var b = f.contentWindow.UBK_BOOT; if (b) state = { theme: b.theme, lang: b.lang }; } catch (e) {} }
  function go(page, hash) {
    if (!PAGES[page]) return;
    boot();
    if (page === cur && f.contentDocument && f.contentDocument.body && f.contentDocument.body.className) {
      if (hash) { f.contentWindow.location.hash = hash; scroll(hash); } else f.contentWindow.scrollTo(0, 0);
      return;
    }
    cur = page;
    f.onload = function () { wire(); if (hash) { f.contentWindow.location.hash = hash; setTimeout(function () { scroll(hash); }, 60); } try { document.title = f.contentDocument.title; } catch (e) {} };
    f.srcdoc = PAGES[page].replace("<head>", "<head><script>window.__UBK=" + JSON.stringify(state) + ";<\/script>");
  }
  function scroll(hash) {
    var d = f.contentDocument, el = d && d.getElementById(hash.replace(/^#/, ""));
    if (el && /^#[\w-]+$/.test(hash)) el.scrollIntoView();
  }
  function wire() {
    var d = f.contentDocument;
    d.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a[href]"); if (!a) return;
      var h = a.getAttribute("href"), m = /^(index|admin|admissions|track|about|academics|news|events|contact|privacy|parent)\.html(#.*)?$/.exec(h);
      if (m) { e.preventDefault(); go(m[1], m[2] || ""); }
      else if (/^https?:/.test(h)) { a.target = "_blank"; }
    }, true);
  }
  go("index", "");
})();
</script></body></html>'''
out = SHELL.replace('__PAGES__', json.dumps(pages).replace('</', '<\\/'))
with open(OUT, 'w', encoding='utf-8') as fh: fh.write(out)
print('wrote', OUT, '%.0f KB' % (len(out.encode()) / 1024))
