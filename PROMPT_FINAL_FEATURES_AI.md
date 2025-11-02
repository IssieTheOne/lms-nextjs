# 📘 PROMPT_FINAL_FEATURES_AI.md

## 🚀 PROJECT PURPOSE
This prompt defines all functional requirements for the **LMS platform**.  
Infrastructure (Supabase, Vercel, Cloudflare R2, MailerSend, DeepSeek API) is already configured.  
This phase focuses purely on **feature implementation**, **CRUDs**, **AI integration**, and **UX/UI** logic.

---

## 🧠 STRUCTURE OVERVIEW
Admin defines the hierarchy and pushes to production:
```
Academic Year → Language → Specialty → Course → Section → Lesson → Quiz
```
Courses are assigned XP values, badges, and media uploads.  
Each student automatically sees courses based on assigned packages (academic year + language + specialty).  
Parents can track progress, teachers can manage assigned courses, and AI chat assists students contextually.

---

## 👤 USER ROLES AND PERMISSIONS

| Role | Abilities |
|------|------------|
| **Admin** | Create/edit academic years, languages, specialties, courses, sections, lessons, quizzes. Manage badges, assign teachers, view analytics. |
| **Teacher** | Access assigned courses, manage sections, lessons, quizzes. Optional activation by admin. |
| **Student** | Learn through assigned courses, complete quizzes, gain XP and badges, use AI chat assistant. |
| **Parent** | Track student progress, quiz performance, and achievements. |
| **AI Agent (DeepSeek)** | Context-aware assistant for each course page. |

---

## 🧱 DATABASE SCHEMA (ENGLISH)

```sql
-- ACADEMIC YEARS
create table academic_years (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  created_at timestamp default now()
);

-- LANGUAGES
create table languages (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  code text unique, -- e.g. 'ar', 'biof', 'en'
  created_at timestamp default now()
);

-- SPECIALTIES
create table specialties (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  language_id uuid references languages(id) on delete cascade,
  created_at timestamp default now()
);

-- COURSES
create table courses (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  image_url text,
  academic_year_id uuid references academic_years(id),
  language_id uuid references languages(id),
  xp_value int default 100,
  teacher_id uuid references users(id),
  created_at timestamp default now()
);

-- COURSE ↔ SPECIALTY (many-to-many)
create table course_specialties (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid references courses(id) on delete cascade,
  specialty_id uuid references specialties(id) on delete cascade
);

-- SECTIONS
create table sections (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid references courses(id) on delete cascade,
  title text not null,
  order_index int default 0,
  created_at timestamp default now()
);

-- LESSONS
create table lessons (
  id uuid primary key default uuid_generate_v4(),
  section_id uuid references sections(id) on delete cascade,
  title text not null,
  content text,
  video_url text,
  order_index int default 0,
  created_at timestamp default now()
);

-- QUIZZES
create table quizzes (
  id uuid primary key default uuid_generate_v4(),
  section_id uuid references sections(id) on delete cascade,
  title text not null,
  data jsonb,
  created_at timestamp default now()
);

-- BADGES
create table badges (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  icon_url text,
  xp_reward int default 50,
  created_at timestamp default now()
);

-- USER ↔ BADGES
create table user_badges (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  badge_id uuid references badges(id),
  awarded_at timestamp default now()
);

-- PARENT-STUDENT LINKS
create table parent_student_links (
  id uuid primary key default uuid_generate_v4(),
  parent_id uuid references users(id) on delete cascade,
  student_id uuid references users(id) on delete cascade
);
```

---

## 🧩 ADMIN PANEL FEATURES

1. **Academic Year Management**
   - CRUD interface to add/edit/delete years.
   - Assign languages to each year.

2. **Language Management**
   - Admin can define available teaching languages (Arabic, BIOF, English, etc.).

3. **Specialty Management**
   - Linked to a language.
   - Reusable across years.

4. **Course Management**
   - Assign year, language, and specialties.
   - Upload course thumbnail (Cloudflare R2).
   - Set XP and badges.
   - Assign (or create) a teacher — default inactive.
   - Publish to make visible.

5. **Course Builder**
   - Add **sections** dynamically.
   - Add **lessons** with video upload, markdown text, and attachments.
   - Add **quizzes** (JSON question builder).
   - Real-time autosave.
   - Inline order management for sections/lessons.

6. **Reports & Analytics**
   - View student activity, XP earned, badges, quiz scores.
   - Filter by course, year, or specialty.

---

## 🎓 STUDENT EXPERIENCE

- Dashboard showing assigned courses by year/language/specialty.
- XP progress bar + badges showcase.
- Continue learning section.
- Quiz results and progress per course.
- “Recently viewed” lessons.
- Chat assistant available for every course page.

---

## 👪 PARENT EXPERIENCE

- Dashboard listing linked students.
- Each child’s learning summary:
  - Courses taken
  - Quiz completion
  - XP and badges earned

---

## 🧑‍🏫 TEACHER EXPERIENCE

- View courses assigned to them.
- Edit course structure (sections/lessons/quizzes).
- Monitor student performance (aggregated data).
- Teacher accounts created by admin, inactive until activation.

---

## 💬 AI CHAT INTEGRATION (DEEPSEEK)

### Overview
- Appears as a collapsible chat widget on the **right side** of the screen.
- Available globally, but provides **contextual answers** when inside a course page.

### Logic
- On `/course/[id]`, fetch lessons + quizzes → embed as context.
- Send prompt to DeepSeek API with metadata:
  ```json
  {
    "user": "student_id",
    "course_id": "uuid",
    "language": "ar/en/fr",
    "context": "current lesson text or quiz data"
  }
  ```
- Responses tailored to the active course.
- Support for multi-language replies (based on user language preference).

### Placeholder Code
```ts
const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: "You are a helpful course tutor." },
      { role: "user", content: "Explain this topic again in simpler terms." }
    ],
  })
});
```

---

## 🏆 GAMIFICATION & BADGES

- Students earn **XP** for:
  - Completing lessons
  - Finishing quizzes
  - Achieving high scores
- Admin can define custom **badges** (name, icon, XP bonus).
- Visual animation for unlocked badges.
- Stored in `user_badges` table.

---

## 🧭 DEVELOPMENT ORDER

1. Admin CRUD: Academic Years, Languages, Specialties.
2. Course management (assign year, language, specialty, teacher).
3. Course builder: Section → Lesson → Quiz CRUD.
4. Parent-student linking system.
5. XP + Badge system.
6. AI chat assistant (DeepSeek API integration).
7. Reporting and analytics.

---

## ✅ OUTPUT EXPECTATION

Copilot should:
- Generate backend (Supabase) queries for all CRUDs.
- Build frontend pages for admin and student dashboards.
- Integrate Cloudflare R2 for uploads.
- Add AI chat widget (DeepSeek API).
- Add badge XP logic.
- Make all dashboards responsive and multi-language ready.
