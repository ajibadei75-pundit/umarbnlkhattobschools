#!/usr/bin/env python3
"""Static page builder: stamps the shared head/header/footer/scripts (src/partials) and a page banner into
every page in src/pages/ and writes the finished HTML to the project root.

    python3 tools/build.py

Edit src/pages and src/partials, never the generated root *.html files.
(Replaced by the Next.js layout in the backend section.)

Meta block fields: title, desc, key (i18n key of the title), nav (header item), scripts (page scripts,
space separated), and for banner pages: h1, lead (i18n key), lead_en.
"""
import os, re, sys, html as H

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
SCHOOL = "Umar BN L Khattob Nursery & Primary School"
GENERAL = {'admissions', 'track', 'about', 'academics', 'news', 'events', 'contact', 'privacy'}

def rd(p):
    with open(p, encoding='utf-8') as f: return f.read()
def wr(p, s):
    with open(p, 'w', encoding='utf-8') as f: f.write(s)

head, header, footer, scripts = (rd(os.path.join(SRC, 'partials', n + '.html')) for n in ('head', 'header', 'footer', 'scripts'))
built = []
for name in sorted(os.listdir(os.path.join(SRC, 'pages'))):
    if not name.endswith('.html'): continue
    src = rd(os.path.join(SRC, 'pages', name))
    m = re.match(r'\s*<!--meta(.*?)-->\s*', src, re.S)
    if not m: sys.exit('missing <!--meta ... --> block in ' + name)
    meta = dict(re.findall(r'(\w+)="(.*?)"', m.group(1), re.S))
    body = src[m.end():].rstrip() + '\n'
    page = name[:-5]
    nav = meta.get('nav', page)

    hdr = re.sub(r'(<a href="[^"]+" data-nav="%s")' % re.escape(nav), r'\1 aria-current="page"', header)
    if nav in GENERAL:
        hdr = hdr.replace('<div class="nav-dd" data-nav="general"', '<div class="nav-dd is-current" data-nav="general"')

    banner = ''
    if meta.get('h1'):
        banner = (
            '    <section class="page-hero">\n      <div class="container">\n'
            '        <nav class="crumbs" aria-label="Breadcrumb" data-i18n-attr="aria-label:crumb.label"><ol>'
            '<li><a href="index.html" data-i18n="crumb.home">Home</a></li>'
            '<li><a href="index.html#general" data-i18n="nav.general">General</a></li>'
            '<li><span aria-current="page" data-i18n="%s">%s</span></li></ol></nav>\n'
            '        <h1 data-i18n="%s">%s</h1>\n        <p class="lead" data-i18n="%s">%s</p>\n'
            '      </div>\n    </section>\n'
        ) % (meta['key'], meta['h1'], meta['key'], meta['h1'], meta.get('lead', ''), meta.get('lead_en', ''))

    title = SCHOOL if page == 'index' else '%s | %s' % (meta.get('title', page.title()), SCHOOL)
    ps = ''.join('<script src="assets/js/%s.js"></script>\n  ' % s.replace('.js', '') for s in meta.get('scripts', '').split()).rstrip()
    out = (
        '<!doctype html>\n<html lang="en" dir="ltr" data-theme="system" data-title-key="%s">\n<head>\n  %s</head>\n<body class="page-%s">\n'
        '  <a class="skip-link" href="#main" data-i18n="skip">Skip to main content</a>\n\n  %s\n\n'
        '  <main id="main">\n%s%s  </main>\n\n  %s\n\n  %s\n</body>\n</html>\n'
    ) % (meta.get('key', ''), head.replace('<meta name="theme-color"', ('<meta name="robots" content="noindex,nofollow">\n  ' if meta.get('robots') else '') + '<meta name="theme-color"', 1).replace('{{title}}', H.escape(title, quote=False)).replace('{{desc}}', meta.get('desc', '')), page, hdr, banner, body, footer, scripts.replace('{{page_scripts}}', ps))
    wr(os.path.join(ROOT, page + '.html'), out)
    built.append(page + '.html')
print('built:', ', '.join(built))
