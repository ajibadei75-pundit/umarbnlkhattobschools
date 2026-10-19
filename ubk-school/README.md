# Umar BN L Khattob Nursery & Primary School: Website & School Portal

Qur'an is our honour.

## Status: Sections 1 to 9 complete, packaged as an installable web app (PWA)

| Page | File | State |
|---|---|---|
| Home (hero activity slideshow, News/Events strip, the five sections) | `index.html` | Done |
| About the School | `about.html` | Done. Wording is **draft**; staff and facilities show honest empty states |
| Academics | `academics.html` | Done (draft wording) |
| News & Announcements | `news.html` | Done: search, categories, pinning, archive, scheduling, post pages, print |
| Events & Calendar | `events.html` | Done: calendar + list, keyboard navigation, .ics export, print |
| Contact & Support | `contact.html` | Done: school details, honest contact form, FAQ |
| Privacy Notice | `privacy.html` | Draft for school/legal review |
| Admissions | `admissions.html` | Done: 4-step online application, private document upload, reference number + one-time tracking code |
| Track application | `track.html` | Done: status and history by reference + code |
| Staff dashboard | `admin.html` | Done: staff sign-in, role-aware Overview, Admissions manager (search, filter, documents, decisions, CSV), Users and roles. English only for now |
| Parent portal, finance, teacher, learning | n/a | Not built yet (Sections 5 to 9). Cards say "Planned" and are not links |

Also: global search (`/` or Ctrl/Cmd+K), Light/Night/System theme, English/Arabic (RTL)/Hausa (Arabic and Hausa are drafts needing review).

## Run it

```
cd ubk-school && python3 -m http.server 8080
```

Or open `index.html` directly. `ubk-preview.html` (built by `tools/preview.py`) is the whole site in one file.

## Editing

Pages live in `src/pages/`, shared header/footer in `src/partials/`. After editing run:

```
python3 tools/build.py      # writes the root *.html files
python3 tools/preview.py    # optional: single-file preview
```

Never edit the generated root `*.html` files.

## Where to put real information

- `assets/js/site-config.js`: address, phones, email, WhatsApp number, map link, office hours, approved activity photos. Empty values show "To be confirmed by the school", and the contact form only offers WhatsApp/email once they are filled in.
- `assets/js/data.js`: news, events, FAQ, About and Academics wording. All of it is flagged **sample** until the school replaces it.

(Section 4 replaces both files with database tables managed from the admin dashboard.)

## Files

```
src/pages, src/partials   page and shared templates
tools/build.py, preview.py
assets/css  tokens.css (brand + themes), styles.css (base/home), pages.css (public pages)
assets/js   theme.js, core.js (shared), i18n*.js, data.js, site-config.js, one script per page
docs/       GUIDE-master-prompt.md, ROADMAP.md
```

## Backend (Admissions)

Supabase project **School** (`spwkinanpvlnbfthalbk`, eu-west-1). Applied migration `admissions_schema_v1`:

- Tables `admissions`, `admission_status_history`, `admission_rate`: row level security on, **no public policies**, so the browser can never read or list applications.
- `submit_application(jsonb)` validates every field on the server, rate-limits (5 per hour per connection), rejects bots (honeypot) and returns the reference + a random tracking code. Only a hash of the code is stored.
- `track_application(ref, code)` returns only the status, school message and history, for a matching pair (20 checks per hour per connection).
- Private storage bucket `admission-docs`: the public can upload (PDF/JPG/PNG, 5 MB) but never read or list. Staff access arrives with the admin dashboard.
- The website holds only the public (publishable) key in `assets/js/site-config.js`.

Until Section 4, the school changes a status by SQL (`update admissions set status = ..., public_note = ...`) and adds a row to `admission_status_history`.
Orphaned uploads (a file uploaded but the form not submitted) sit under `pending/`; the admin section adds a cleanup job.

## Staff access (Section 4)

Roles: super_admin, school_admin, admissions_officer, finance_officer, content_editor, teacher. Access is enforced by the database
(`staff` table, row level security, audited functions `admin_set_status`, `admin_add_staff`, `admin_set_staff_active`, `admin_list_staff`),
not by the page. A signed-in user who is not in `staff` can see nothing. All changes are written to `audit_log`.

**First super administrator:** create the user in Supabase (Authentication, Add user), then run once:

    insert into public.staff(user_id, role, full_name) select id, 'super_admin', 'Name' from auth.users where email = 'you@example.com';

After that, add other staff from the dashboard (Users and roles). In Supabase Authentication settings, turn **off** "Allow new users to sign up" so only invited staff can have accounts.

## Website content manager and AI (Section 4)

Dashboard, **Website content** tab (super administrator, school administrator, content editor): news, events, FAQ and school details, each with English, Arabic and Hausa fields. Items are saved as **Draft** unless set to **Published**; the public pages show only published items (news with a future date is scheduled). If nothing is published for a type, the site keeps its clearly labelled sample content.

**AI assistant** (draft from notes, improve wording, translate to Arabic or Hausa) runs in the Supabase edge function `content-ai`. It fills the form as a draft only; a person must read it and press Save. It uses Google Gemini when the secret `GEMINI_API_KEY` is set (optional `GEMINI_MODEL`, default `gemini-2.5-flash`), otherwise Anthropic when `ANTHROPIC_API_KEY` is set (optional `AI_MODEL`). To switch it on, add the secret in the Supabase dashboard (Edge Functions, Secrets). Never put the key in website files. Until the key is added the buttons say so honestly. Arabic and Hausa output must be checked by a fluent speaker before publishing.

**Fonts:** Arabic uses IBM Plex Sans Arabic (body) and Noto Naskh Arabic (school name, motto); Hausa uses Noto Sans, which has the letters ɓ ɗ ƙ ƴ. They load from Google Fonts when online, with system fallbacks offline.

## Secondary level

Secondary is now a third level next to Nursery and Primary: Academics tab, admission form and database (`admissions.level` and `submit_application` accept it), home resource filter and the admin level filter. The Secondary programme text and subject list are draft and carry the "draft" badge until the school confirms them.

## Parent portal (Section 5)

Page `parent.html`. Parents sign in with an account the school creates; they see only children linked to their account and the notices meant for them (all parents, or their children's levels). The browser never reads tables directly: one database function, `parent_overview()`, returns just that parent's data. Verified in SQL: a parent sees only their own child, drafts and future-dated notices are hidden, other accounts and anonymous visitors are blocked.

How the school sets a parent up (Dashboard, **Pupils and parents**, super administrator or school administrator):
1. In Supabase, Authentication, Add user: the parent's email and a password you give them. Keep public sign-ups off.
2. Add the pupil (or **Enrol from an application**, which copies the details).
3. **Give a parent access** with that email, then **Link** each child.
4. Write notices in **Website content, Parent notices** (audience, date, draft or published, with Arabic and Hausa and the AI helper).

Not included: parents cannot reset their own password (the office does it), and there is no email or SMS delivery, so notices are read in the portal only.


## Results and report sheets (Section 6)

Two separate sheets, one per section, so the two never mix:

- **Nursery & Primary**: per subject CA + Exam + remark; weight, height, attendance, affective ratings 1-5; class-teacher comment. Entered by the class teacher.
- **J.S.S. Statement of Result**: 1st CA, 2nd CA, Exam and tutor sign per subject; skills (9) and behaviour (15) rated A-E; sex shown. Subject teachers enter their own subject; the class teacher writes remarks.

The database refuses to mix them: a class offers only subjects of its own section, subject teachers exist only for J.S.S. classes, and a pupil with scores cannot be moved to the other section.

**First-time setup (Dashboard > Results and reports):**
1. Report settings: term, session (2026/2027), next term date, times school opened, head title, headings, address. Check the grading scale.
2. Classes and subjects: add each class (tick "offer all subjects"), adjust the subjects, add pupils as `Full name, Sex` lines.
3. Teachers: create staff users with role `teacher` (Users and roles), then assign class teachers and J.S.S. subject teachers.
4. Teachers enter scores under "My classes" and press "Submit for printing". The administrator approves (this locks the class), then prints or saves as PDF. "Send back" returns it with a note; "Reopen" unlocks it.

**Parents:** an approved class appears as "View result" on the parent portal, or anyone can use "Check a result" with Student ID + name + class (rate-limited, only for approved classes).

**Please note:**
- The watermark, right-click and blur on the parent view only discourage copying. They cannot stop a screenshot.
- Printing uses the browser (A4, "Save as PDF" in the print window). The stamp and the head's signature are left blank for hand signing. Teachers can upload their own signature image.
- The heading font (Alfa Slab One) loads from Google Fonts; offline it falls back to a similar bold serif.
- Check the printed sheets against your own forms before the first real term.


## Teacher tools: Lesson Note AI and Exam Question Generator (Section 8)

Dashboard > Teacher tools (teachers, school admins, super admins). The teacher fills in class, subject and topic; the assistant returns an editable DRAFT that can be saved (private to that teacher), copied, downloaded or printed. Exams print as a question paper and a separate marking scheme.

- Server function: `teacher-ai` (checks the caller's role in the database; keys never reach the browser). It uses the same `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` secret as `content-ai`.
- **The prompts in `teacher-ai` are starter prompts.** Replace the block marked `PROMPTS (edit here)` with the school's own, then redeploy.
- Qur'an, Arabic and Islamic Studies: the starter prompt tells the assistant not to write out verses or hadith from memory; teachers must verify every reference.
- Drafts live in the `ai_drafts` table, visible only to their owner.


## Payments: receipts and requests (Section 7)

Parents: Parent portal > Payments. A parent can send a receipt (amount, date, method, reference, photo/PDF up to 5 MB) or a written request for each linked child, and sees the status and the school's note.
Staff (finance officer, school admin, super admin): Dashboard > Payments. View the receipt, approve, reject (a reason is required) or move back to waiting, and download a CSV.

- **No payment gateway.** Money is paid outside the website. Approving only records that the proof was checked.
- Files are in the private `receipts` bucket (each parent can write only in their own folder; staff with a finance role can read all). Parents cannot read the table directly; everything goes through database functions that check the parent is linked to the child (limit 10 submissions per hour).
- Not built: email/SMS notices to parents, partial payments, fee schedules or balances.

## Learning Centre (Section 9)
Public page `learning.html` lists published videos, materials, quizzes and three built-in games (Arabic letters, counting, alphabet). Quizzes and games store nothing. YouTube and Vimeo videos embed privately; any other link opens in a new tab.
Staff manage items in the dashboard tab "Learning Centre". Teachers submit items as drafts or pending, and editors (super admin, school admin, content editor) publish them. Table `learning_items`, public bucket `learning` (10 MB). Quiz format in the editor: a question line, then options starting with `-`, the correct one with `*`, optional `Explain:` line, and a blank line between questions.
The role-by-role database test for this table is still to be run.

## Installable app and deployment (PWA)
The site installs on phones and computers (manifest, icons, service worker, offline page, install button in the footer). Pages already visited open offline. Sign-in, results, payments and forms need internet.
Build the upload folder with `python3 tools/package.py --domain https://your-domain`. See `DEPLOY.md` for hosting, Supabase settings and checks.


## Public website (Stage 1 of the restructure)
Public pages: Home, About, Academics, Gallery, Leadership, Admissions, News, Events, Learning Centre, Contact, Privacy.
All admission enquiries go to one number, set in `assets/js/site-config.js` (`admissions`): 08169383031 (call and WhatsApp).
Gallery photos come from table `gallery_items` and Leadership profiles from table `leaders` (both public-read when published, editor-write, photos in public bucket `gallery`). Until rows exist the pages show illustrations or a "coming soon" note. A manager screen for both is added with the admin stage.
Planned portal paths: /teacher, /parent, /student, /admin (Stages 2 to 5).
