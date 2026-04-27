# 🔐 Authentication Troubleshooting Guide

## Problem: Registration Creates No User in auth.users

---

## ✅ FIXES APPLIED:

### 1. **Added Detailed Logging to Register Page**
- ✅ Now captures full `data` and `error` from `signUp()`
- ✅ Logs user object and session
- ✅ Shows detailed error messages in console

### 2. **Added Detailed Logging to Login Page**
- ✅ Captures full response from `signInWithPassword()`
- ✅ Helps diagnose login issues

### 3. **Created Verification SQL Script**
- ✅ `VERIFY_AUTH_SETUP.sql` - Run this in Supabase SQL Editor
- ✅ Checks if trigger exists
- ✅ Checks if profiles table is configured
- ✅ Includes fix scripts if trigger is missing

---

## 🔍 DIAGNOSTIC STEPS:

### Step 1: Check Supabase Email Confirmation Settings

**Most Common Issue:** Email confirmation is enabled but not configured

1. Go to: **Supabase Dashboard → Authentication → Settings**
2. Scroll to **"Email Auth"** section
3. Check **"Enable email confirmations"** setting

**Options:**
- **If DISABLED:** Users are created immediately (recommended for testing)
- **If ENABLED:** Users must click email link before account is active

**For Testing:** Disable email confirmations temporarily

---

### Step 2: Verify Environment Variables

Check that `.env.local` contains:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**How to verify:**
1. Open `.env.local` in the `app/` directory
2. Confirm both variables exist
3. Confirm URL matches your Supabase project
4. Confirm anon key is correct (copy from Supabase Dashboard → Settings → API)

**If missing or wrong:**
- Copy correct values from Supabase Dashboard
- Restart dev server after updating

---

### Step 3: Run Database Verification

1. Open **Supabase Dashboard → SQL Editor**
2. Copy and paste **`VERIFY_AUTH_SETUP.sql`**
3. Click **"Run"**

**Expected Results:**
- ✅ Profiles table exists with 5 columns
- ✅ Trigger `on_auth_user_created` exists
- ✅ Function `handle_new_user` exists
- ✅ 3 RLS policies on profiles table

**If trigger is missing:**
- Run the "RECREATE TRIGGER" section from `VERIFY_AUTH_SETUP.sql`

---

### Step 4: Test Registration with Console Open

1. **Open browser DevTools** (F12)
2. Go to **Console** tab
3. Navigate to `/register`
4. Fill out registration form
5. Click "Create account"
6. **Watch the console output**

**What to look for:**

```javascript
=== SIGNUP RESPONSE ===
Data: { user: {...}, session: {...} }
Error: null
User: { id: "...", email: "...", ... }
Session: { access_token: "...", ... }
=======================
Signup successful! User ID: abc-123-def
```

**If you see an error:**
- Copy the full error message
- Check error details below

---

## 🐛 COMMON ERRORS AND FIXES:

### Error 1: "Email not confirmed"
```
Error: Email not confirmed
```

**Cause:** Email confirmation is enabled in Supabase settings

**Fix:**
1. Go to Supabase Dashboard → Authentication → Settings
2. Disable "Enable email confirmations"
3. OR check your email for confirmation link
4. OR manually confirm user in Supabase Dashboard → Authentication → Users

---

### Error 2: "User already registered"
```
Error: User already registered
```

**Cause:** Email already exists in database

**Fix:**
1. Use a different email
2. OR delete existing user from Supabase Dashboard → Authentication → Users
3. OR try logging in instead of registering

---

### Error 3: "Invalid API key"
```
Error: Invalid API key
```

**Cause:** Wrong `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`

**Fix:**
1. Go to Supabase Dashboard → Settings → API
2. Copy the **"anon" / "public"** key
3. Update `.env.local`
4. Restart dev server

---

### Error 4: No error but no user created
```
Data: { user: null, session: null }
Error: null
```

**Cause:** Email confirmation required but user didn't confirm

**Fix:**
1. Check email inbox for confirmation link
2. OR disable email confirmations in Supabase settings
3. OR check Supabase Dashboard → Authentication → Users
   - User might be there but "Email Confirmed" = false

---

### Error 5: User created but no profile
```
User exists in auth.users
Profile does NOT exist in public.profiles
```

**Cause:** Auto-profile creation trigger not working

**Fix:**
1. Run `VERIFY_AUTH_SETUP.sql` to check trigger
2. If trigger missing, run the RECREATE TRIGGER section
3. Manually create missing profiles:

```sql
INSERT INTO public.profiles (user_id, full_name)
SELECT id, raw_user_meta_data->>'full_name' 
FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM public.profiles);
```

---

## 🧪 TESTING CHECKLIST:

After applying fixes:

- [ ] Restart dev server: `npm run dev`
- [ ] Open browser with DevTools (F12)
- [ ] Go to `/register`
- [ ] Fill out form with NEW email
- [ ] Submit and watch console
- [ ] Check for "Signup successful!" message
- [ ] Verify user in Supabase Dashboard → Authentication → Users
- [ ] Verify profile in Supabase Dashboard → Table Editor → profiles
- [ ] Try logging in with the new account

---

## 📊 VERIFICATION QUERIES:

Run these in Supabase SQL Editor:

```sql
-- Check total users
SELECT COUNT(*) FROM auth.users;

-- Check total profiles
SELECT COUNT(*) FROM public.profiles;

-- Check users without profiles
SELECT u.id, u.email, u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.user_id
WHERE p.user_id IS NULL;

-- Check email confirmation status
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🔧 QUICK FIXES:

### Reset Everything and Start Fresh:

```sql
-- WARNING: This deletes ALL users and profiles!
-- Only use for testing/development

-- Delete all profiles
DELETE FROM public.profiles;

-- Delete all users (Supabase Dashboard → Authentication → Users → Delete)
-- Or use Supabase Dashboard to delete users manually
```

### Manually Create Profile for Existing User:

```sql
-- Replace USER_ID and NAME with actual values
INSERT INTO public.profiles (user_id, full_name)
VALUES ('your-user-id-here', 'Your Name')
ON CONFLICT (user_id) DO NOTHING;
```

---

## 📞 NEXT STEPS:

1. **Run `VERIFY_AUTH_SETUP.sql`** first
2. **Check email confirmation settings** in Supabase
3. **Test registration** with console open
4. **Share console output** if still having issues

---

## ✅ SUCCESS INDICATORS:

You'll know auth is working when:
- ✅ Console shows "Signup successful! User ID: ..."
- ✅ User appears in Supabase Dashboard → Authentication → Users
- ✅ Profile appears in Supabase Dashboard → Table Editor → profiles
- ✅ Can login with the new account
- ✅ Redirected to `/dashboard` after login

---

**Last Updated:** 2026-04-27
