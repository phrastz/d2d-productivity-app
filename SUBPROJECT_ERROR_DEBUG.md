# 🐛 Sub-Project Creation Error Debugging

## Problem: Empty Error Object When Creating Sub-Project

**Error:** `Error creating sub-project: {}` (empty object)

**Root Cause:** Schema cache issue + insufficient error logging

---

## ✅ FIXES APPLIED:

### 1. **Enhanced Error Logging in `useSubProjects.ts`**

#### Before:
```typescript
if (error) throw error
// ...
catch (err) {
  console.error('Error creating sub-project:', err)
  return null  // ❌ Swallows error
}
```

#### After:
```typescript
if (error) {
  // Log full error details
  console.error('=== SUPABASE ERROR DETAILS ===')
  console.error('Code:', error.code)
  console.error('Message:', error.message)
  console.error('Details:', error.details)
  console.error('Hint:', error.hint)
  console.error('Full error object:', JSON.stringify(error, null, 2))
  console.error('==============================')
  throw error
}
// ...
catch (err) {
  console.error('Error creating sub-project:', err)
  throw err  // ✅ Re-throw for UI to handle
}
```

### 2. **Enhanced Error Handling in UI (`projects/[id]/page.tsx`)**

#### Before:
```typescript
const result = await createSubProject(projectId, name)
if (result) {
  // success
}
// ❌ No error handling
```

#### After:
```typescript
try {
  const result = await createSubProject(projectId, name)
  if (result) {
    console.log('✅ Sub-project created successfully!')
    // success
  }
} catch (err: any) {
  console.error('❌ Failed to create sub-project:', err)
  
  // Show detailed error to user
  const errorMessage = err?.message || err?.hint || err?.details || JSON.stringify(err)
  alert(`Error creating sub-project:\n\n${errorMessage}\n\nCheck console for full details.`)
}
```

### 3. **Added Graceful Fallback for order_index Query**

```typescript
// Get the highest order_index (with graceful fallback)
let nextOrderIndex = 0
try {
  const { data: existing } = await supabase
    .from('sub_projects')
    .select('order_index')
    .eq('project_id', projectId)
    .order('order_index', { ascending: false })
    .limit(1)

  nextOrderIndex = existing && existing.length > 0 ? existing[0].order_index + 1 : 0
} catch (err) {
  console.warn('Could not fetch existing sub-projects, using 0:', err)
}
```

### 4. **Added Insert Data Logging**

```typescript
const insertData = {
  project_id: projectId,
  name: name.trim(),
  description: description?.trim() || null,
  priority,
  status: 'not_started',
  order_index: nextOrderIndex,
  owner_id: userId,
}

console.log('Attempting to insert sub-project:', insertData)
```

---

## 🧪 TESTING INSTRUCTIONS:

### Step 1: Open Browser DevTools
1. Press **F12** to open DevTools
2. Go to **Console** tab
3. Clear console (click 🚫 icon)

### Step 2: Navigate to Project Detail
1. Go to `http://localhost:3000/projects`
2. Click any project
3. Watch console for any warnings

### Step 3: Try Creating Sub-Project
1. Click **"+ Add Sub Project"** button
2. Enter a name (e.g., "Test Sub-Project")
3. Click **"Create"**
4. **Watch the console output carefully**

### Step 4: Capture Error Details

**You should see one of these:**

#### ✅ Success:
```
Attempting to insert sub-project: { project_id: "...", name: "Test", ... }
Sub-project created successfully: { id: "...", name: "Test", ... }
✅ Sub-project created successfully!
```

#### ❌ Error (with full details):
```
Attempting to insert sub-project: { project_id: "...", name: "Test", ... }
=== SUPABASE ERROR DETAILS ===
Code: 42P01
Message: relation "public.sub_projects" does not exist
Details: ...
Hint: ...
Full error object: { ... }
==============================
❌ Failed to create sub-project: [Error object]
```

**Alert dialog will show the error message**

---

## 🔍 COMMON ERROR CODES:

### `42P01` - Relation does not exist
**Meaning:** Table not found in schema cache

**Fix:**
```sql
-- Run in Supabase SQL Editor
NOTIFY pgrst, 'reload schema';
```

Or wait 10 seconds and try again.

### `23503` - Foreign key violation
**Meaning:** Referenced project doesn't exist or user doesn't own it

**Fix:** Verify project exists and user is authenticated

### `23505` - Unique violation
**Meaning:** Duplicate entry (shouldn't happen with UUIDs)

**Fix:** Check database for duplicates

### `42501` - Insufficient privilege
**Meaning:** RLS policy blocking insert

**Fix:** Check RLS policies on `sub_projects` table

---

## 📊 WHAT TO SHARE:

After testing, please share:

1. **Full console output** (copy all text from console)
2. **Error code** (e.g., `42P01`)
3. **Error message** (full text)
4. **Error details** (if any)
5. **Error hint** (if any)
6. **Alert dialog message** (what you see on screen)

---

## 🔧 POSSIBLE FIXES (based on error):

### If Error Code is `42P01`:
**Schema cache issue**

```sql
-- Run in Supabase SQL Editor
NOTIFY pgrst, 'reload schema';

-- Or restart Supabase project:
-- Dashboard → Settings → General → Pause → Resume
```

### If Error Code is `23503`:
**Foreign key issue**

```sql
-- Verify project exists
SELECT id, name FROM projects WHERE id = 'your-project-id';

-- Verify user owns project
SELECT id, name FROM projects 
WHERE id = 'your-project-id' 
AND owner_id = 'your-user-id';
```

### If Error Code is `42501`:
**RLS policy issue**

```sql
-- Check policies
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'sub_projects';

-- Should have INSERT policy for users
```

### If No Error Code (empty object):
**Network or client issue**

- Check browser network tab
- Check Supabase project status
- Verify environment variables

---

## 🎯 EXPECTED OUTCOME:

After these fixes, you will see:
- ✅ Detailed error messages in console
- ✅ Error alert shown to user
- ✅ Specific error code and message
- ✅ Actionable information to fix the issue

**No more empty error objects!**

---

## 📝 FILES MODIFIED:

1. **`src/hooks/useSubProjects.ts`**
   - Added detailed error logging
   - Changed return type from `SubProject | null` to `SubProject`
   - Re-throw errors instead of returning null
   - Added graceful fallback for order_index query
   - Added insert data logging

2. **`src/app/(app)/projects/[id]/page.tsx`**
   - Wrapped createSubProject in try-catch
   - Show error alert to user
   - Log success/failure clearly

---

**Last Updated:** 2026-04-27
