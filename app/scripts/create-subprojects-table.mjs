#!/usr/bin/env node

/**
 * Create sub_projects table using Supabase Management API
 * This bypasses the need for SQL execution by using the REST API
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Read environment variables from .env.local
const envPath = join(__dirname, '..', '.env.local')
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Try to read from .env.local if env vars not set
if (!supabaseUrl || !supabaseKey) {
  try {
    const envContent = readFileSync(envPath, 'utf8')
    const lines = envContent.split('\n')
    
    for (const line of lines) {
      const [key, ...valueParts] = line.split('=')
      const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '')
      
      if (key.trim() === 'NEXT_PUBLIC_SUPABASE_URL') {
        supabaseUrl = value
      } else if (key.trim() === 'SUPABASE_SERVICE_ROLE_KEY') {
        supabaseKey = value
      }
    }
  } catch (err) {
    console.error('Could not read .env.local:', err.message)
  }
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables')
  console.error('Please ensure .env.local contains:')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

console.log('🔧 Connecting to Supabase...')
console.log('   URL:', supabaseUrl)

// Extract project ref from URL
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
if (!projectRef) {
  console.error('❌ Could not extract project ref from URL')
  process.exit(1)
}

console.log('   Project:', projectRef)

// Read the migration SQL
const migrationPath = join(__dirname, '..', '..', 'migrations', '003_add_subprojects.sql')
const sql = readFileSync(migrationPath, 'utf8')

console.log('\n📝 Migration SQL loaded')
console.log('   File:', migrationPath)
console.log('   Size:', sql.length, 'bytes')

// Use Supabase Database API to execute SQL
async function executeMigration() {
  console.log('\n🚀 Executing migration via Supabase Database API...\n')

  try {
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      },
      body: JSON.stringify({
        query: sql
      })
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('❌ Migration failed:', result)
      
      // Try alternative: execute via PostgREST
      console.log('\n🔄 Trying alternative method (PostgREST)...\n')
      
      const pgResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          sql: sql
        })
      })

      if (!pgResponse.ok) {
        const pgError = await pgResponse.text()
        console.error('❌ Alternative method also failed:', pgError)
        console.log('\n⚠️  Manual migration required. Please run the SQL in Supabase Dashboard.')
        console.log('   Dashboard: https://supabase.com/dashboard/project/' + projectRef + '/editor')
        console.log('   SQL file: migrations/003_add_subprojects.sql')
        process.exit(1)
      } else {
        console.log('✅ Migration applied successfully (alternative method)!')
      }
    } else {
      console.log('✅ Migration applied successfully!')
      console.log('   Result:', result)
    }

    console.log('\n🎉 Database schema updated!')
    console.log('   - sub_projects table created')
    console.log('   - sub_project_id column added to tasks')
    console.log('   - RLS policies configured')
    console.log('   - Indexes created')

  } catch (err) {
    console.error('❌ Error:', err.message)
    console.log('\n⚠️  Please apply migration manually:')
    console.log('   1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/editor')
    console.log('   2. Open SQL Editor')
    console.log('   3. Copy and run: migrations/003_add_subprojects.sql')
    process.exit(1)
  }
}

executeMigration()
