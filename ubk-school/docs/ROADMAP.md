# Roadmap, Architecture and Role Matrix

## Target architecture (from the guide)
Next.js + React + TypeScript, Tailwind, PostgreSQL + Prisma, server-managed sessions, private object storage, Zod schemas shared by client and server, Vitest + Playwright tests.

The current front end is plain HTML/CSS/JS so it previews anywhere. Its design tokens, theme logic, translation keys, activity slideshow and content catalogue move into the Next.js app in Section 4 without redesign.

## Build sections

| # | Section | Contents | Status |
|---|---|---|---|
| 1 | Foundation | Tokens, Light/Night/System switch, EN/AR/HA + RTL, grouped home, activity slideshow | Done (preview) |
| 2 | Public pages | About, Academics, News, Events, Contact, Privacy, search | Done |
| 3 | Admissions | Info page, application form, uploads, reference no., status tracking | Done (live on Supabase) |
| 4 | Backend + Admin | Staff auth, roles, audit log, admissions manager (done). Website content manager (news, events, FAQ, school details in English/Arabic/Hausa, with AI draft/improve/translate) done. Still open: the later Next.js migration | Done |
| 5 | Parent portal | Parent sign-in, pupils, parent-to-child linking by the school, school notices by level (done). Email/SMS delivery and password self-service are not included | Done |
| 6 | Results and report sheets | Classes, subjects, teachers, score entry, approval, A4 sheets for Nursery & Primary and J.S.S., parent view, Student ID lookup (done). Finance modules (Financial Analysis, Financial Update) move to Section 7 | Done |
| 7 | Finance and receipts | Receipt upload, written payment requests, approval workflow with notes, CSV list (done; no payment gateway). Financial Analysis and Financial Update documents still planned | Partly done |
| 8 | Teacher tools | My Classes (done in Section 6), **Lesson Note AI** and **Exam Question Generator** (done, with starter prompts to be replaced by the school's own), Messages to Parents (planned) | Mostly done |
| 9 | Learning Centre | Videos, games, materials, quizzes, admin manager, teacher submissions | Built (role test pending) |
| 10 | PWA and deployment | Manifest, service worker, offline page, packager, hosting files | Built (needs real-device test) |
| 10 | Combine and harden | Integration, security, tests, backups, deployment | Planned |

### Deferred
- **External Link Management System (guide Phase 5):** removed from the current plan at the client's request. The guide text is kept and can be built later with the existing prompt.

## Teacher AI tools: how they will work
- **Lesson Note AI:** teacher enters class, subject, topic, duration and objectives, then receives a structured lesson note (objectives, materials, steps, activities, assessment) to edit and save.
- **Exam Question Generator:** teacher chooses class, subject, topic(s), question types and difficulty, then receives questions with a marking scheme and answer key to edit, print or export.
- The AI service is called from the server only. The key never reaches the browser.
- Output is a draft. Nothing is published automatically. No pupil names or records are sent to the AI service.
- Usage limits per teacher and an audit entry for each generation.
- Prompts and attributes will be supplied by the client when Section 8 starts.

## Role matrix (proposed; configurable in the app)

| Module | Super Admin | School Admin | Admissions | Finance | Teacher | Content Editor | Parent |
|---|---|---|---|---|---|---|---|
| Website content and slideshow | Yes | Yes | | | | Yes | |
| Admissions | Yes | Yes | Yes | | | | own |
| Pupils / classes | Yes | Yes | view | | assigned | | linked |
| Financial modules | Yes | Yes | | Yes | | | |
| Receipts / approvals | Yes | Yes | | Yes | | | own |
| ReportSheet | Yes | Yes | | Yes | enter | | approved |
| Lesson Note AI / Exam Generator | configure | configure | | | use | | |
| Learning resources | Yes | Yes | | | submit | Yes | view |
| Users, roles, audit, backups | Yes | | | | | | |

## Core data entities
users, roles, permissions, guardians, pupils, guardian_pupil_links, admissions, pages, news, events, activity_slides, programmes, classes, subjects, financial_analysis, financial_updates, report_sheets, payment_receipts, payment_approval_requests, approval_status_history, learning_resources, resource_categories, quizzes, quiz_questions, learning_attempts, ai_generations (tool, inputs, output, status, teacher, timestamps), notifications, translations, audit_logs, site_settings.

## Open items needing the school
- Approved photographs for each activity (the slideshow currently shows illustrations)
- Verified address, phone numbers, email, WhatsApp number, office hours
- Vision, mission, values, staff profiles, class list
- Review of Arabic and Hausa translations by fluent reviewers
- AI provider choice, monthly budget and the prompts/attributes for the two teacher AI tools
- Decision on which external report-sheet service, if any, to integrate
