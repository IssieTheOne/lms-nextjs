# LMS SaaS

A full-stack Learning Management System built with Next.js 16, Supabase, Cloudflare R2, and MailerSend.

## Features

- Multi-role authentication (Admin, Teacher, Student, Parent)
- Course management with video uploads
- Progress tracking and badges
- Multi-language support (EN/FR/AR)
- Dark/Light theme
- Email notifications
- File uploads to Cloudflare R2

## Tech Stack

- Frontend: Next.js 16 + TypeScript + Tailwind CSS + shadcn/ui
- Backend: Supabase (Auth, Database, Storage)
- Storage: Cloudflare R2
- Email: MailerSend
- Deployment: Vercel + GitHub

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see .env.local.example)
4. Run the development server: `npm run dev`

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in the values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CLOUDFLARE_*` keys
- `MAILERSEND_API_KEY`
- etc.

## Database Schema

Run the SQL in `supabase/schema.sql` in your Supabase dashboard.

## Deployment

The project is deployed on Vercel and accessible at: [Your Vercel URL]

Deploy to Vercel with the GitHub integration.
