# 📘 PROMPT.md

## 🚀 PROJECT OVERVIEW
Build a **Next.js 14 (App Router + TypeScript)** full-stack **Learning Management System (LMS)** inspired by Kezakoo, integrated with:
- **Supabase** (Auth, Database, Storage, CRUD)
- **Cloudflare R2** (for video uploads and course media)
- **MailerSend API** (for transactional and notification emails)
- **Vercel MCP** + **GitHub MCP** (for automated build and deployment)
- Full **multi-language (EN/FR/AR)** support
- **Dark/Light mode**
- Role-based dashboards: **Admin**, **Student**, **Parent**, **Teacher**

The build must follow a **pre-build validation phase** to ensure all API keys are working before generating pages or running migrations.

---

## 🧩 PRE-BUILD CHECKLIST (REQUIRED)

Before building, **Copilot must**:

1. Prompt the user for these API keys:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_ACCESS_KEY_ID`
   - `CLOUDFLARE_SECRET_ACCESS_KEY`
   - `CLOUDFLARE_BUCKET_NAME`
   - `CLOUDFLARE_BUCKET_URL`
   - `MAILERSEND_API_KEY`
   - `VERCEL_PROJECT_ID` and `VERCEL_API_TOKEN`
   - `GITHUB_REPOSITORY` and `GITHUB_TOKEN`

2. Verify:
   - Supabase: `select now()` query test.
   - Cloudflare R2: upload + list test.
   - MailerSend: test email send to a sandbox address.
   - GitHub MCP: repo status check.
   - Vercel MCP: deployment API status.

3. Log test results in **`api_check.md`** with timestamps and success status.

Only proceed with schema creation and build after all services pass ✅.

---

## ⚙️ TECH STACK
| Layer | Technology |
|--------|-------------|
| Frontend | Next.js 14 + TypeScript |
| UI | Tailwind CSS + shadcn/ui + Framer Motion |
| Auth & DB | Supabase (PostgreSQL + RLS) |
| Storage | Cloudflare R2 |
| Mail | MailerSend API |
| Hosting | Vercel MCP + GitHub MCP |
| Localization | next-intl (EN, FR, AR) |
| Theme | next-themes (Dark/Light) |
| State | SWR / React Query + Supabase Client |

---

## 📬 MAILERSEND SETUP

### Environment Variable
```
MAILERSEND_API_KEY=your_mailersend_api_key
```

### Send Email Example (using fetch)
```ts
export async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.mailersend.com/v1/email", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.MAILERSEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: { email: "no-reply@yourdomain.com", name: "Your LMS Platform" },
      to: [{ email: to }],
      subject,
      html,
    }),
  });
  if (!res.ok) throw new Error("MailerSend failed: " + res.statusText);
}
```

Use MailerSend for:
- Password reset notifications
- Account activation confirmations
- Parent-student progress summaries
- Teacher onboarding invitations

---

## 🧱 DATABASE STRUCTURE (SQL)
[Same schema as before: profiles, teachers, courses, sections, lessons, quizzes, badges, progress, parent-student links]

---

## 🧠 AUTHENTICATION FLOW
- `/auth/login` → Supabase sign-in (with MailerSend optional OTP email)
- `/auth/signup` → Student registration with email confirmation
- `/auth/forgot-password` → Uses MailerSend to send reset link

MailerSend template IDs can be used in production for styled email delivery.

---

## 🌩️ CLOUD STORAGE
Cloudflare R2 for all media assets (video, course images, teacher avatars).  
Upload path:
```
courses/{courseId}/sections/{sectionId}/lessons/{lessonId}/{fileName}
```

---

## 🌍 MULTI-LANGUAGE (i18n)
- `next-intl` JSON messages for EN, FR, and AR
- RTL layout for Arabic
- Translations stored in `/messages`

---

## 🌓 THEME
- `next-themes` integration
- Dark/Light mode persisted in `profiles.theme`

---

## 📦 DEPLOYMENT WORKFLOW

### GitHub MCP
- Repo auto-synced with Copilot commits
- Actions auto-trigger build on push

### Vercel MCP
- Automatic environment setup from `.env.local`
- Instant redeploy after each push

### Pre-Build Tests
Copilot must:
- Ping Supabase endpoint
- Verify Cloudflare + MailerSend access
- Log in `api_check.md`
- Only proceed to schema + page generation after successful validation

---

## ✅ BUILD ORDER
1. 🔑 Validate APIs → generate `api_check.md`
2. 🧱 Apply Supabase schema
3. 🔐 Build Auth pages (login, signup, forgot password)
4. 🧭 Admin dashboard CRUD for:
   - Users, Courses, Sections, Lessons (with video upload), Quizzes
5. 🎓 Student, Parent, Teacher dashboards
6. 📬 Email events (MailerSend triggers)
7. 🌗 i18n + Theme system
8. 🚀 Auto-deploy via MCP integrations

---

## 🧩 FINAL GOAL
Deliver a **production-ready LMS** with verified integrations for:
- Supabase (auth + CRUD)
- Cloudflare R2 (videos)
- MailerSend (emails)
- Vercel MCP + GitHub MCP (deployment)
- Multi-language + Dark/Light themes
