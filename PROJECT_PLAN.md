## QC Tool — Project Plan (Vercel + Next.js 15 + NextAuth + Neon + R2)

This plan guides the greenfield rebuild, starting with a CSS smoke test then iterating toward MVP.

### Milestones

- M0 — Foundation & Tailwind CSS Verification
- M1 — Auth (NextAuth Credentials, invite-only) + Protected Routes
- M2 — Database (Neon + Drizzle) + Migrations
- M3 — Storage (Cloudflare R2) Presigned Uploads
- M4 — Layout, Navigation, and UI Shell (Radix + Tailwind)
- M5 — Projects, Files, QC Reviews MVP
- M6 — Hardening (Validation, Errors, Rate Limiting, Observability)

---

### M0 — Foundation & CSS Smoke Test

Tasks
- Bootstrap Next.js 15 app (App Router, TS, Tailwind v4)
- Add tokens in `app/globals.css` (see `ui.md`)
- Create `app/page.tsx` with a primary button and text styles
- Verify locally: `npm run dev` → http://localhost:3000
- Verify build: `npm run build`
- Push to GitHub → create Vercel project → set domain and deploy

Acceptance
- Tailwind styles render locally and on Vercel

---

### M1 — Auth (NextAuth Credentials, invite-only)

Tasks
- Add `app/api/auth/[...nextauth]/route.ts` with Credentials provider
- Add `lib/auth.ts` and `app/components/SessionProvider`
- Create `(auth)/login` page; redirect unauthenticated users to login (no sign-up)
- GOD creates first Tenant + Tenant Admin credentials; Tenant Admin invites users
- Add `NEXTAUTH_URL` and `NEXTAUTH_SECRET` envs (local + Vercel)

Acceptance
- Sign-in works locally; protected dashboard redirects properly

---

### M2 — Database (Neon + Drizzle)

Tasks
- Set `drizzle/schema.ts` for `users`, `projects`, `files`, `qc_reviews`, `invites`, `audit_logs` with role enum: GOD, TENANT, QC_HEAD, QC_MANAGER, QC_COORDINATOR, QC_OPERATOR, CLIENT_HEAD, CLIENT_MANAGER, CLIENT_CONTENTOWNER, AGENCY_MANAGER, AGENCY_CREATOR
- Configure `drizzle.config.ts` and `lib/db.ts` (Neon HTTP + drizzle)
- `npm run db:generate` → apply SQL in Neon console
- Build succeeds; sample query runs server-side

Acceptance
- Neon connected; migrations applied; queries succeed

---

### M3 — Storage (Cloudflare R2)

Tasks
- Implement `lib/r2.ts` (S3 client with R2 endpoint)
- `POST app/api/files/upload-url/route.ts` validates (Zod) and returns presigned URL(s)
- Client file upload component (progress + errors); metadata saved in DB
- Env: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL`
 - Support large files with S3 Multipart Upload

Acceptance
- Presigned upload works; file accessible via public URL; record stored

---

### M4 — Layout & Shell

Tasks
- Header with search + avatar; collapsible sidebar
- Cards grid on dashboard (enterprise-modern)
- Radix primitives for dialog, select, tabs, toast
- Ensure accessibility and keyboard navigation

Acceptance
- Responsive, accessible layout with clean design

---

### M5 — Projects, Files, QC Reviews MVP

Tasks
- Projects CRUD + status badges
- Files listing + attach to projects
- QC review flow pages
- Zod validation for all forms

Acceptance
- End-to-end flows work for basic usage

---

### M6 — Hardening

Tasks
- Central error handling; security headers; input validation everywhere
- (Optional) Rate limiting with Upstash (defer)
- Loading states, error boundaries
- Observability hooks

Acceptance
- Stable builds; smooth UX; no console errors; verified in Production

---

### Operating Notes

- Develop locally at http://localhost:3000 and commit frequently
- Push to GitHub triggers Vercel Preview deploys; test before merging to main
- After production deploys, verify Tailwind and critical paths


