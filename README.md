# Files Confession

An anonymous confession website where anyone can share their thoughts publicly without revealing their identity. Confessions are automatically posted to a Facebook page twice a day.

## Features

- Submit confessions anonymously on website — no login required
- Character limit of 10,000 characters per confession
- Confession feed with unique numbering (#1, #2, ...) on facebook page
- Rate limiting — 1 submission per IP every 5 minutes
- Basic profanity filtering
- Auto-post to Facebook page at 11:00 AM and 7:00 PM (Bangkok time) via GitHub Actions
- Monthly archive — exports previous month's confessions to CSV, stores in Supabase Storage, then deletes from database

## Tech Stack

- **Frontend & API** — Next.js 14 (TypeScript), hosted on Vercel
- **Database** — Supabase (PostgreSQL)
- **Automation** — GitHub Actions (scheduled workflows)
- **Facebook posting** — Facebook Graph API
- **Code quality** — ESLint, Prettier, Husky (auto-fix on commit)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/suychakriya/files-confession-facebook-automation.git
cd files-confession-facebook-automation
npm install
```

### 2. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Go to **Settings → API** and copy your credentials

### 3. Set up Facebook

1. Create a Business app at [developers.facebook.com](https://developers.facebook.com)
2. Add `pages_manage_posts` and `pages_read_engagement` permissions
3. Generate a Page Access Token via Graph API Explorer
4. Get your Facebook Page ID from your page's About section

### 4. Configure environment variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

FACEBOOK_PAGE_ID=your-facebook-page-id
FACEBOOK_PAGE_ACCESS_TOKEN=your-page-access-token
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## GitHub Actions Setup

Add the following secrets to your GitHub repository under **Settings → Secrets → Actions**:

| Secret                       | Description                |
| ---------------------------- | -------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`   | Supabase project URL       |
| `SUPABASE_SERVICE_ROLE_KEY`  | Supabase service role key  |
| `FACEBOOK_PAGE_ID`           | Facebook page ID           |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | Facebook page access token |

## Automated Workflows

### Post to Facebook

- Runs daily at **11:00 AM** and **7:00 PM** (Bangkok, UTC+7)
- Fetches all unposted confessions from the database
- Posts each one to the Facebook page as `#filesConfessions1`, `#filesConfessions2`, etc.
- Marks them as posted in the database
- Can be triggered manually from the Actions tab

### Monthly Archive

- Runs on the **3rd of every month**
- Exports previous month's confessions to a CSV file
- Uploads the CSV to Supabase Storage (archives bucket)
- Deletes those confessions from the database to free up space
- Can be triggered manually from the Actions tab

## Manual Scripts

```bash
# Post confessions to Facebook now
npm run post-to-facebook

# Archive and delete previous month's confessions
npm run archive-confessions
```

## Code Quality

This project uses **ESLint**, **Prettier**, and **Husky** to automatically format and lint code on every commit.

- **Prettier** — formats indentation, spacing, and code style
- **ESLint** — catches code quality issues
- **Husky** — runs both automatically as a pre-commit hook

No manual setup needed — it runs automatically when you `git commit`.

## Deployment

Deploy to Vercel:

```bash
npx vercel
```

Add the same environment variables in the Vercel dashboard under **Settings → Environment Variables**.

## Database Schema

```sql
CREATE TABLE confessions (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  confession_number BIGINT      GENERATED ALWAYS AS IDENTITY,
  content           TEXT        NOT NULL,
  ip_hash           TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  is_posted         BOOLEAN     DEFAULT FALSE NOT NULL,
  posted_at         TIMESTAMPTZ
);
```
