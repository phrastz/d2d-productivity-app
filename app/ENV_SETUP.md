# 🔐 Environment Setup Guide

This document explains all required environment variables and how to set them up.

---

## Required Environment Variables

Your `.env.local` file should contain the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

---

## 📍 Where to Find These Values

### 1. Go to Supabase Dashboard
- Visit: https://supabase.com/dashboard
- Select your **D2D Tracking** project

### 2. Navigate to Settings → API
- Click **"Settings"** in the left sidebar
- Click **"API"** tab

### 3. Copy the Values

#### **NEXT_PUBLIC_SUPABASE_URL**
- Found under: **"Project URL"**
- Example: `https://abcdefghijk.supabase.co`
- ✅ This is safe to expose in client-side code

#### **NEXT_PUBLIC_SUPABASE_ANON_KEY**
- Found under: **"Project API keys" → "anon" → "public"**
- This is a long JWT token
- ✅ This is safe to expose in client-side code

#### **SUPABASE_SERVICE_ROLE_KEY** ⚠️
- Found under: **"Project API keys" → "service_role"**
- Click **"Reveal"** to see the key
- This is a long JWT token
- ⚠️ **NEVER commit this to git or expose it client-side**
- ⚠️ **This key has admin access to your database**

---

## 🛠️ Setup Steps

### Step 1: Create `.env.local` file
```bash
# In the app directory
cd app
touch .env.local  # or create manually
```

### Step 2: Add the variables
Open `.env.local` and paste:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Replace the values with your actual keys from Supabase Dashboard.

### Step 3: Verify
```bash
# Check that the file exists and is gitignored
ls -la .env.local

# The file should NOT appear in git status
git status
```

✅ `.env.local` should be listed in `.gitignore` and NOT tracked by git.

---

## 🚀 Running Database Migrations

### Option 1: Automated Helper (Recommended)
```bash
node scripts/migrate.js
```

This will:
- ✅ Read all migration files from `/migrations` folder
- ✅ Output them in order (001, 002, 003...)
- ✅ Provide copy-paste ready SQL
- ✅ Show you the Supabase Dashboard link

Then:
1. Copy the SQL output
2. Go to Supabase Dashboard → SQL Editor
3. Paste and click "Run"

### Option 2: Manual Migration
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click **"SQL Editor"** in sidebar
4. Click **"New query"**
5. Open migration file (e.g., `migrations/003_add_subprojects.sql`)
6. Copy the entire SQL content
7. Paste into SQL Editor
8. Click **"Run"**

### Option 3: Supabase CLI (Advanced)
If you have Supabase CLI installed:

```bash
# Link to your project (one-time)
npx supabase link --project-ref your-project-ref

# Apply all migrations
npx supabase db push

# Or apply specific migration
npx supabase db execute --file migrations/003_add_subprojects.sql
```

---

## 🔒 Security Best Practices

### ✅ DO:
- Keep `.env.local` in `.gitignore`
- Use `SUPABASE_SERVICE_ROLE_KEY` only in server-side code
- Use `NEXT_PUBLIC_*` variables for client-side code
- Rotate keys if they're ever exposed

### ❌ DON'T:
- Commit `.env.local` to git
- Share your service role key
- Use service role key in client-side code
- Hardcode keys in source files

---

## 🐛 Troubleshooting

### "Missing environment variables" error
- ✅ Check that `.env.local` exists in the `app/` directory
- ✅ Check that all three variables are set
- ✅ Restart your dev server after adding variables

### "Unauthorized" errors
- ✅ Verify the keys are correct (copy-paste from Supabase Dashboard)
- ✅ Check for extra spaces or newlines in the keys
- ✅ Ensure you're using the correct project

### Migration fails
- ✅ Check that you have the service role key set
- ✅ Verify you're connected to the internet
- ✅ Try running the SQL manually in Supabase Dashboard

---

## 📚 Additional Resources

- [Supabase Environment Variables](https://supabase.com/docs/guides/getting-started/local-development#environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)

---

**Last Updated:** 2026-04-27
