# Going live: Umar BN L Khattob School website

The website is static files plus a Supabase backend. You need three things: a domain name, a place to host the files over HTTPS, and your Supabase project.

## 1. Build the upload folder

```
python3 tools/package.py --domain https://www.YOUR-DOMAIN
```

This creates `dist/`. Upload the **contents** of `dist/` (not the folder itself) to the web root. Never upload `src/`, `tools/` or `docs/`.
If you do not have the domain yet, run without `--domain`. The sitemap and canonical links are then skipped, so run it again once you know the address.

## 2. Choose a host (any one of these)

| Host | What to do |
|---|---|
| Netlify or Cloudflare Pages | Drag `dist/` into the dashboard. `_headers` is applied automatically. |
| Vercel | Import the `dist/` folder. `vercel.json` is applied automatically. |
| cPanel or shared hosting | Upload the contents of `dist/` to `public_html`. `.htaccess` is applied automatically. Turn on the free SSL certificate. |

HTTPS is required. Without it the app install and the offline mode will not work, and sign-in is unsafe.

## 3. Supabase settings (dashboard)

1. Authentication > URL Configuration: set **Site URL** to your domain and add it under **Redirect URLs**.
2. Authentication > Providers > Email: turn **public sign-ups off** if staff and parents are created by the school.
3. Create the first super administrator (the SQL is in `README.md`).
4. Edge Functions > Secrets: add `GEMINI_API_KEY` (or `ANTHROPIC_API_KEY`) so Teacher tools can write. Create a **new** key. Do not reuse any key that was pasted in chat.
5. If your Supabase project address is not `spwkinanpvlnbfthalbk.supabase.co`, edit `assets/js/site-config.js` and run `tools/package.py --supabase https://YOUR-PROJECT.supabase.co`.

## 4. School details to replace

Sign in as an administrator and open Settings: real address, phone numbers and email. Nothing in the site invents these.
Arabic and Hausa text are drafts: have a native speaker review them before launch.

## 5. After upload: check

- Open the site on a phone. The browser should offer "Install" or "Add to Home Screen". The footer also has an install button.
- Turn on airplane mode and reopen a page you already visited. It should still open. Other pages show the "You are offline" page.
- Visit `/admin.html`, sign in, and open each tab you use.
- Run Lighthouse (Chrome DevTools) for PWA, accessibility and performance.

## 6. Updating later

Change files in `src/`, run `python3 tools/build.py`, then `python3 tools/package.py` again and upload the new `dist/`. Each package gets a new build id, so phones pick up the update on the next visit.

## Known limits

- Fonts load from Google Fonts. Offline, the browser falls back to standard fonts.
- The Learning Centre database rules were checked by listing the policies but not by a full role-by-role test. Test with a teacher account before launch.
- No payment gateway exists. Parents upload proof of payments made elsewhere.
