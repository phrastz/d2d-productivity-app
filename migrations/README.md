# Database Migrations

This folder contains SQL migration files for the DailyFlow Pro database.

## How to Run Migrations

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy & paste the content of the migration file (e.g., `001_create_notes_table.sql`)
5. Click **Run** to execute

### Option 2: Supabase CLI
```bash
# Make sure you're logged in
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run the migration
supabase db push

# Or run specific migration file
psql -h your-db-host -U postgres -d postgres -f migrations/001_create_notes_table.sql
```

## Migration Files

- `001_create_notes_table.sql` - Creates the `notes` table for comments/notes on tasks and projects

## Notes
- Always run migrations in order (001, 002, 003, etc.)
- Test migrations in a development environment first
- Backup your database before running migrations in production
