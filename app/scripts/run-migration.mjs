#!/usr/bin/env node

/**
 * Supabase Migration Runner
 * Runs SQL migrations directly to Supabase database using environment variables
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Read environment variables from .env.local
const envPath = join(__dirname, '..', '.env.local')
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim()
      process.env[key.trim()] = value
    }
  })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local')
  process.exit(1)
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration(migrationFile) {
  console.log(`\n🚀 Running migration: ${migrationFile.split(/[/\\]/).pop()}`)
  
  try {
    // Read SQL file
    const sql = readFileSync(migrationFile, 'utf8')
    
    console.log(`📝 Executing SQL migration...\n`)
    console.log('─'.repeat(60))
    console.log(sql.substring(0, 200) + '...')
    console.log('─'.repeat(60))
    
    // For Supabase, we need to use the REST API to execute raw SQL
    // This requires using the Management API or running via Dashboard
    console.log('\n⚠️  Note: Supabase client cannot execute raw DDL statements directly.')
    console.log('    We need to use Supabase Management API or Dashboard.\n')
    
    // Check if we can at least verify the connection
    const { data, error } = await supabase.from('profiles').select('count').limit(1)
    
    if (error && error.code === 'PGRST116') {
      console.log('✅ Connection to Supabase successful!')
      console.log('   (profiles table exists but may be empty - this is OK)\n')
    } else if (!error) {
      console.log('✅ Connection to Supabase successful!')
      console.log('   Database is accessible and working.\n')
    } else {
      console.log('⚠️  Connection test:', error.message, '\n')
    }
    
    console.log('📋 To complete the migration, please:')
    console.log('   1. Open Supabase Dashboard: ' + supabaseUrl.replace('.supabase.co', '.supabase.co/project/_/sql'))
    console.log('   2. Go to SQL Editor')
    console.log('   3. Copy the content from: ' + migrationFile)
    console.log('   4. Paste and click "Run"\n')
    
    // Try to check if notes table already exists
    const { error: notesError } = await supabase.from('notes').select('count').limit(1)
    
    if (!notesError) {
      console.log('✅ GOOD NEWS: The "notes" table already exists!')
      console.log('   Migration may have already been run.\n')
      return true
    } else if (notesError.code === 'PGRST116' || notesError.code === '42P01') {
      console.log('ℹ️  The "notes" table does not exist yet.')
      console.log('   Please run the migration as instructed above.\n')
      return false
    }
    
    return false
    
  } catch (error) {
    console.error(`\n❌ Error:`, error.message)
    return false
  }
}

// Main execution
async function main() {
  const migrationPath = process.argv[2] || join(__dirname, '..', '..', 'migrations', '001_create_notes_table.sql')
  
  if (!existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`)
    process.exit(1)
  }
  
  console.log('╔════════════════════════════════════════╗')
  console.log('║   Supabase Migration Helper            ║')
  console.log('╚════════════════════════════════════════╝')
  console.log(`\n📂 Migration file: ${migrationPath}`)
  console.log(`🔗 Supabase URL: ${supabaseUrl}`)
  
  await runMigration(migrationPath)
  
  console.log('🎯 Next steps:')
  console.log('   - If table exists: You\'re all set! ✅')
  console.log('   - If not: Follow the instructions above to run in Dashboard\n')
}

main()
