# MASTER SOFTWARE DEVELOPMENT PROMPT
## Umar BN L Khattob Nursery & Primary School Website and School Management Portal

> This file is the project's governing guide. Every build section is checked against it.

### Client change log (applied to the current build plan)

- **Removed from the current plan: External Link Management System (Phase 5)** and its home-page card. The Phase 5 text below is kept unchanged so it can be built later from this prompt when requested. Other modules that mention shared links should not depend on it until then.
- **Added to the Teacher side: Lesson Note AI and Exam Question Generator.** Prompts and attributes for both will be supplied when that section is reached. Output is always an editable draft that a teacher reviews.
- **No repeated modules:** each module is listed once, under the role that uses it. Teacher report entry happens inside ReportSheet, and teacher resource uploads inside Learning Resources, using teacher permissions.

### PROJECT OBJECTIVE

Act as a senior full-stack software engineer, UI/UX designer, database architect, security engineer, and education technology consultant.

Design and build a complete, production-oriented, mobile-first website and school management portal for:

**School Name:** Umar BN L Khattob Nursery & Primary School
**Specialisation:** Nursery education, primary education, Qur'anic studies, and Arabic studies.
**Motto:** Qur'an is our honour.
**Primary audience:** Parents, guardians, pupils, prospective families, teachers, school administrators, and the general public.
**Primary market:** Nigeria, with support for international accessibility.

Use the uploaded school logo as the primary branding reference. Preserve its identity and use its colour palette consistently.

Do not build only a static landing page or a non-functional prototype. Build a properly structured application with functional navigation, authentication, role-based access, database persistence, form validation, file handling, admin-controlled content, tests, and deployment documentation.

Work through the phases below in order. Complete each phase, test it, and document its status before proceeding. If the environment cannot support a feature, explain the limitation rather than pretending it works.

---

# PHASE 1: BRAND IDENTITY AND DESIGN SYSTEM

Use these starting colour tokens:

- Primary purple: #302078
- Lavender: #C5B9DE
- Teal: #16A6A3
- Gold: #D5A43B
- Burgundy: #A52D35
- White: #FFFFFF

Centralise them as editable design tokens.

## Appearance modes
1. Light Mode. 2. Dark/Night Mode. 3. System Mode (follows the OS).

- Accessible selector in desktop header and mobile navigation, with sun, moon and monitor icons plus text labels or accessible descriptions.
- Persist manual selection locally; in System Mode respond to OS changes.
- Tokens for background, surface, text, border, focus and accent in each theme.
- Every page, form, table, modal, dropdown, chart, dashboard, video section and learning resource follows the theme.
- No flash of the wrong theme on first load.
- Readable contrast in both themes. Never invert or distort the school logo.

## Visual style
Professional, contemporary, trustworthy, child-friendly, academically serious. Clear typography and hierarchy, generous spacing, rounded cards, subtle shadows, restrained Islamic geometric patterns, authentic school photography supplied or approved by the school, consistent components. Do not overuse patterns, animation, gradients, gold or burgundy.

---

# PHASE 2: TECHNICAL FOUNDATION

Preferred stack: Next.js + React + TypeScript; Tailwind CSS with design tokens; accessible reusable components; secure server-side logic and API endpoints; PostgreSQL; Prisma (or equivalent) with migrations; secure server-managed sessions, password hashing, account recovery; private object storage; shared client/server validation schemas; unit, integration and end-to-end tests.

If an established stack exists, inspect it first and adapt.

Set up: clear structure, environment variable management, schema and migrations, seed data, centralised error handling, structured logging, automated backup strategy, deployment documentation. Never expose secret keys, storage credentials or privileged database access in frontend code.

---

# PHASE 3: PUBLIC WEBSITE

Working navigation and admin-managed content.

- **3.1 Home:** logo, name, motto, welcome, hero image, Apply for Admission, Explore Our School, programme highlights, Qur'anic/Arabic highlights, news, events, parent portal access, Learning Centre access, contact, footer.
- **3.2 About:** introduction, vision, mission, philosophy, values, Qur'anic/Arabic approach, approved staff profiles, facilities, gallery. Do not invent history, achievements, qualifications, accreditation or leadership details; administrators enter verified information.
- **3.3 Academics:** Nursery, Primary, classes and subjects, Qur'anic studies, Arabic, other approved subjects, teaching approach, resources. Admin-managed.
- **3.4 Admissions:** information, requirements, steps, application form, guardian contact, necessary child fields only, document uploads, reference number, status tracking, admin review and communication, instructions for families who prefer to visit.
- **3.5 News and Announcements:** news, notices, exams, holidays, achievements, activities; scheduling, pinning, categories, archiving.
- **3.6 Events and Calendar:** events, exams, parent-teacher meetings, holidays, recitation events; calendar and list views, details, printable calendars.
- **3.7 Contact and Support:** verified address, official phones and email, contact form with spam protection, office hours, map link, WhatsApp link (admin-configured official number), FAQ.

---

# PHASE 4: CENTRAL ADMINISTRATOR DASHBOARD

Secure responsive dashboard with sidebar, summary cards, searchable tables, filters, clear actions.

Modules: 1 Overview; 2 Website Pages and Content; 3 Admissions; 4 News and Announcements; 5 Events and Calendar; 6 Parent and Guardian Accounts; 7 Pupils and Class Records; 8 Academic Programmes and Subjects; 9 External Link Manager; 10 Financial Analysis; 11 Financial Update; 12 ReportSheet; 13 Payment Receipt Submissions; 14 Payment Approval Requests; 15 Learning Resources Management; 16 Kiddies' Videos; 17 Educational Games; 18 Learning Materials; 19 Quizzes and Activities; 20 Notifications and Messages; 21 Language and Translation Management; 22 Users, Roles, and Permissions; 23 Audit Logs; 24 Website Settings; 25 Security, Backups, and System Health.

The overview shows permission-appropriate information only. Every module has a functional page, purpose, validation, access controls and working database operations.

---

# PHASE 5: EXTERNAL LINK MANAGEMENT SYSTEM

One reusable, database-backed service. Administrators add, edit, activate, deactivate, schedule, reorder and remove links without code changes.

Fields: title, description, URL, category/module, target audience, display location, optional icon, optional thumbnail, active status, publication start/expiry, display order, created/updated by and timestamps.

Locations: public website, parent portal, admin dashboard, financial modules, Learning Centre, school activities, resource pages.

Validate URLs, restrict unsafe protocols, apply role-based access, open links safely, never assume a third-party site is trustworthy. Search, category and status filters, and a preview of where each link appears. Use the same shared service across all modules.

---

# PHASE 6: FINANCIAL MODULES

Three separate modules with their own navigation, forms, permissions and metadata, using shared services where appropriate.

- **6.1 Financial Analysis:** resource list, add/edit, authorised documents, external analysis links, visibility and permissions, publication/expiry dates, search and filter, audit trail.
- **6.2 Financial Update:** title, description, date, category, status, supporting documents, optional link, draft → review → publish → archive, restricted visibility, search.
- **6.3 ReportSheet:** title, session and term, class/audience, approved URL or uploaded document, publication status, visibility, expiry/archive, search, access logging for sensitive reports.

Do not expose confidential accounts, internal analysis or individual pupil reports publicly. Do not assume an external report-sheet service is integrated until its API, credentials and access rules are configured and tested.

---

# PHASE 7: PARENT AND GUARDIAN PORTAL

Secure login and recovery; profile; linked children only; announcements; events; admissions tracking; approved reports if enabled; receipt submissions; written payment approval requests; status tracking and responses; Learning Centre; notifications; secure logout.

Use a verified process to link guardians to pupils. No access to another family's records by guessing IDs or changing URLs. Simple enough for users with limited digital experience.

---

# PHASE 8: PAYMENT RECEIPTS AND APPROVAL REQUESTS

**Do not implement a payment gateway, card processing, online transfers or direct payment collection.** The school handles payments outside the website. The portal only manages supporting evidence and approval requests.

**Receipt submission:** select linked child, payment description, amount claimed, payment date, transaction reference, receipt image/PDF, note, unique reference number, status and authorised responses. Validate type and size; store privately; scan where supported; prevent public access.

**Written approval request:** category, related child, description, amount and date, evidence, extra information, reference number.

**Statuses:** Submitted, Under Review, More Information Required, Approved, Rejected.

Staff review, add private internal notes, request information, record decisions and respond. Parents see only appropriate status and approved responses. Record who changed each status and when. Never label a payment verified merely because a receipt was uploaded.

---

# PHASE 9: LEARNING CENTRE

Available from the public site and parent portal.

- **A. Kiddies' Videos:** alphabet and phonics, numbers, colours and shapes, basic Arabic, age-appropriate Qur'anic learning, teacher-approved content.
- **B. Educational Games:** alphabet, number, memory/matching, vocabulary, Arabic letter recognition.
- **C. Learning Materials:** worksheets, notes, revision, approved past questions, reading, PDFs, Arabic and Qur'anic materials.
- **D. Quizzes and Activities:** multiple choice, fill-in-the-gap, matching, practice tests, immediate feedback, optional progress tracking.

Filters: level (Nursery, Primary, JSS, SSS, General), class, subject, resource type, language, topic. Show only levels and classes the school configures.

Administrators add, edit, preview, publish, unpublish, archive; upload files; configure video embeds/links; assign age group, class, subject, topic, language; thumbnails, descriptions, accessibility info; recommended flag; moderation; link review; public or restricted access.

Use official or properly licensed resources. Do not scrape copyrighted material. Use safe embeds. Progress tracking stores only necessary data, visible only to the pupil, authorised guardian and permitted staff.

---

# PHASE 10: MULTILINGUAL SUPPORT

English, Arabic, Hausa. Language selector in navigation and portal. Translate labels, menus, buttons, forms, validation messages and notifications. Admin-managed translations. Arabic right-to-left layout (navigation, alignment, icons, forms, tables, reading order). Fonts supporting all three languages. Consistent underlying data across languages. Language designation on resources. Do not machine-translate official policies or religious content without review. Switching must work across the website and portal.

---

# PHASE 11: NIGERIAN USER EXPERIENCE AND ACCESSIBILITY

Smartphones to desktops. Low bandwidth, affordable phones, limited digital literacy, clear forms, compressed responsive media, lazy loading, pagination, clear loading/empty/success/error states, keyboard navigation, visible focus, screen-reader labels, contrast, large touch targets, printable notices and calendars, friendly errors.

No autoplay with sound. Offer links when embeds are too heavy. WhatsApp, email and SMS only where configured; never claim delivery without provider confirmation.

---

# PHASE 12: SECURITY AND PRIVACY

Server-side authorisation on every protected action; RBAC; secure password hashing; session expiry and secure cookies; login rate limiting; input validation and output encoding; protection against common web vulnerabilities; CSRF protection; secure upload validation and private storage; audit logs for sensitive actions; data minimisation and retention; backups and recovery; consent and privacy notices; restricted access to children's records, receipts, finance and individual reports.

Roles: Super Administrator, School Administrator, Admissions Officer, Bursary/Finance Officer, Teacher, Content Editor, Parent/Guardian. Permissions configurable by role; no role automatically gets every module. Never place passwords, secrets, private file URLs or sensitive pupil data in public code, URLs, logs or unrestricted API responses.

---

# PHASE 13: DATABASE DESIGN

Entities: users; roles and permissions; parent/guardian profiles; pupils; guardian-pupil relationships; admissions; website pages; news; events; programmes; classes and subjects; external links; financial analysis; financial updates; ReportSheet; payment receipts; payment approval requests; approval status history; learning resources; categories; games; videos and media metadata; quizzes and questions; learning attempts and progress; notifications; translations; audit logs; website settings.

Foreign keys, indexes, constraints, timestamps, transactions. File binaries in secure storage; metadata in the database. Migrations and safe seed data. No real pupil data or production credentials in samples.

---

# PHASE 14: ADMIN WORKFLOWS AND USABILITY

Every admin form: clear labels, required-field validation, useful errors, save and cancel, confirmation before destructive actions, loading and success indicators, search/filter/pagination, responsive layout, server permission checks. Draft, preview, approval, publication and archive workflows. Reuse shared components and services. All visible buttons and links must work; no placeholder controls that appear functional.

---

# PHASE 15: TESTING AND QUALITY ASSURANCE

Test: responsiveness; Light/Dark/System; theme persistence and OS changes; English, Arabic RTL, Hausa; authentication and roles; guardian-pupil linking; admissions; news and events; external links (create, publish, expire, visibility); finance modules; receipt and approval workflows; Learning Centre filtering and publishing; file validation and private access; database persistence and migrations; notifications and integration failures; accessibility and keyboard use; security and unauthorised access; error, loading, empty and poor-network states.

Automate where possible. Report what passed, failed or could not be run.

---

# PHASE 16: DEPLOYMENT AND HANDOVER

Deliver: source code; working frontend and backend; schema and migrations; seed data; `.env.example`; setup instructions; production deployment guide; backup and recovery instructions; admin setup procedure; role and permission guide; parent user guide; external links guide; finance modules guide; receipt and approval guide; Learning Centre guide; testing report; known limitations and outstanding configuration.

Use staging before production. Configure HTTPS, backups, private storage, logging, monitoring and production secrets. Do not claim the site is live or integrations work unless deployed and verified.

---

# REQUIRED DEVELOPMENT SEQUENCE

1. Inspect the existing project and available tools.
2. Present architecture, sitemap, navigation, role matrix, database entities, plan.
3. Design system, reusable components, responsive layouts, three-mode theme.
4. Public website and content management.
5. Authentication, roles, permissions, parent portal.
6. Central external link service.
7. Financial Analysis, Financial Update, ReportSheet.
8. Receipt submission and payment approval workflows.
9. Learning Centre and resource manager.
10. English, Arabic, Hausa, RTL, accessibility, low-bandwidth optimisation.
11. Migrations, notifications, logging, security controls, backups.
12. Automated and manual tests, fixes, documentation of results.
13. Deployment and handover documentation.

At each step: explain what was implemented, list files or modules changed, run available tests, identify unresolved dependencies. Do not assume an untested feature works.

## FINAL ACCEPTANCE CRITERIA

- Coherent, professional brand identity.
- Light, Dark and System Mode work throughout.
- Public website and parent portal are responsive.
- Administrators manage content and external links without editing code.
- Financial Analysis, Financial Update and ReportSheet have their own working modules.
- Parents securely submit receipts and approval requests without any payment gateway.
- Learning Centre supports approved videos, games, materials and quizzes.
- English, Arabic RTL and Hausa properly supported.
- Permissions protect pupil, parent, financial and receipt data.
- Database operations, forms and workflows work end to end.
- Tests and deployment documentation supplied.
- No fake integrations, non-functional buttons, fabricated school facts or exposed sensitive data.
