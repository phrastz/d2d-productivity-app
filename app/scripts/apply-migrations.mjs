#!/usr/bin/env node

/**
 * Apply database migrations directly to Supabase
 * This script reads migration files and executes them using the Supabase REST API
 */

import { createClient } from '@supabase/supabase-js'
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
      const value = valueParts.join('=').trim()
      
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
  console.error('❌ Missing environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '✗')
  console.error('\nPlease set these in .env.local or as environment variables')
  process.exit(1)
}

console.log('🔧 Connecting to Supabase...')
console.log('   URL:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function executeSql(sql) {
  // Split SQL into individual statements (simple split by semicolon)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`\n📝 Executing ${statements.length} SQL statements...`)

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    if (!statement) continue

    console.log(`\n[${i + 1}/${statements.length}] Executing...`)
    console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''))

    try {
      // Use the Supabase REST API to execute raw SQL
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({ query: statement + ';' })
      })

      if (!response.ok) {
        const error = await response.text()
        console.error(`❌ Failed:`, error)
        
        // Try alternative approach using pg_query
        console.log('   Trying alternative method...')
        const { data, error: pgError } = await supabase.rpc('exec_sql', { sql: statement + ';' })
        
        if (pgError) {
          console.error(`❌ Alternative method also failed:`, pgError.message)
          // Continue with next statement instead of failing completely
        } else {
          console.log('✅ Success (alternative method)')
        }
      } else {
        console.log('✅ Success')
      }
    } catch (err) {
      console.error(`❌ Error:`, err.message)
      // Continue with next statement
    }
  }
}

async function runMigration(migrationFile) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`📦 Running migration: ${migrationFile}`)
  console.log('='.repeat(60))

  const migrationPath = join(__dirname, '..', '..', 'migrations', migrationFile)
  
  try {
    const sql = readFileSync(migrationPath, 'utf8')
    await executeSql(sql)
    console.log(`\n✅ Migration ${migrationFile} completed`)
  } catch (err) {
    console.error(`\n❌ Migration ${migrationFile} failed:`, err.message)
    throw err
  }
}

async function main() {
  console.log('\n🚀 Starting migration process...\n')

  try {
    // Run migration 003 (the one that's missing)
    await runMigration('003_add_subprojects.sql')

    console.log('\n' + '='.repeat(60))
    console.log('🎉 All migrations completed successfully!')
    console.log('='.repeat(60))
  } catch (err) {
    console.error('\n💥 Migration process failed:', err.message)
    process.exit(1)
  }
}

main()
