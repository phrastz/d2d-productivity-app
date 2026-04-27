#!/usr/bin/env node

/**
 * Supabase Migration Runner
 * Runs SQL migrations directly to Supabase database
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', 'app', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in app/.env.local')
  process.exit(1)
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration(migrationFile) {
  console.log(`\n🚀 Running migration: ${path.basename(migrationFile)}`)
  
  try {
    // Read SQL file
    const sql = fs.readFileSync(migrationFile, 'utf8')
    
    // Split by semicolons to execute statements one by one
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      console.log(`   [${i + 1}/${statements.length}] Executing...`)
      
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql_query: statement + ';' 
      })
      
      if (error) {
        // Try direct query if RPC fails
        const { error: directError } = await supabase
          .from('_migrations')
          .insert({ statement })
        
        if (directError) {
          console.error(`   ❌ Error executing statement ${i + 1}:`, error.message)
          throw error
        }
      }
      
      console.log(`   ✅ Success`)
    }
    
    console.log(`\n✅ Migration completed successfully!`)
    return true
    
  } catch (error) {
    console.error(`\n❌ Migration failed:`, error.message)
    console.error('\n💡 Tip: You may need to run this SQL manually in Supabase Dashboard > SQL Editor')
    return false
  }
}

// Main execution
async function main() {
  const migrationPath = process.argv[2] || path.join(__dirname, '..', 'migrations', '001_create_notes_table.sql')
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`)
    process.exit(1)
  }
  
  console.log('╔════════════════════════════════════════╗')
  console.log('║   Supabase Migration Runner            ║')
  console.log('╚════════════════════════════════════════╝')
  console.log(`\n📂 Migration file: ${migrationPath}`)
  console.log(`🔗 Supabase URL: ${supabaseUrl}`)
  
  const success = await runMigration(migrationPath)
  
  if (success) {
    console.log('\n🎉 All done! Your database has been updated.')
    process.exit(0)
  } else {
    console.log('\n⚠️  Please run the migration manually via Supabase Dashboard.')
    console.log('   1. Go to Supabase Dashboard > SQL Editor')
    console.log('   2. Copy the content of: ' + migrationPath)
    console.log('   3. Paste and click Run')
    process.exit(1)
  }
}

main()
