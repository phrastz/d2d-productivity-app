#!/usr/bin/env node

/**
 * Database Migration Helper
 * 
 * This script reads all migration files and outputs them in a format
 * ready to copy-paste into Supabase Dashboard SQL Editor.
 * 
 * Usage:
 *   node scripts/migrate.js
 * 
 * Note: Supabase doesn't allow direct SQL execution via API.
 * You must copy the output and paste it into the Supabase SQL Editor.
 */

const fs = require('fs')
const path = require('path')

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

// Get migrations directory
const migrationsDir = path.join(__dirname, '..', '..', 'migrations')

if (!fs.existsSync(migrationsDir)) {
  log(`❌ Migrations directory not found: ${migrationsDir}`, 'red')
  process.exit(1)
}

// Read all migration files
const migrationFiles = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .sort()

if (migrationFiles.length === 0) {
  log('⚠️  No migration files found', 'yellow')
  process.exit(0)
}

console.log('\n' + '='.repeat(70))
log('  📦 DATABASE MIGRATION HELPER', 'bright')
console.log('='.repeat(70))

log(`\n✓ Found ${migrationFiles.length} migration file(s):\n`, 'green')
migrationFiles.forEach((file, i) => {
  console.log(`   ${i + 1}. ${file}`)
})

log('\n' + '='.repeat(70), 'cyan')
log('  📋 COPY THE SQL BELOW AND PASTE INTO SUPABASE DASHBOARD', 'bright')
log('='.repeat(70) + '\n', 'cyan')

log('Steps:', 'yellow')
log('1. Go to: https://supabase.com/dashboard', 'yellow')
log('2. Select your project', 'yellow')
log('3. Click "SQL Editor" in sidebar', 'yellow')
log('4. Click "New query"', 'yellow')
log('5. Copy ALL the SQL below', 'yellow')
log('6. Paste and click "Run"', 'yellow')

console.log('\n' + '='.repeat(70))
log('  BEGIN SQL', 'green')
console.log('='.repeat(70) + '\n')

// Output all migrations
migrationFiles.forEach((file, index) => {
  const filePath = path.join(migrationsDir, file)
  const sql = fs.readFileSync(filePath, 'utf8')
  
  console.log(`-- ============================================================`)
  console.log(`-- Migration ${index + 1}/${migrationFiles.length}: ${file}`)
  console.log(`-- ============================================================\n`)
  console.log(sql)
  console.log('\n')
})

console.log('='.repeat(70))
log('  END SQL', 'green')
console.log('='.repeat(70) + '\n')

log('✅ All migrations ready to copy!', 'green')
log('\n💡 Tip: These migrations are idempotent (safe to run multiple times)', 'cyan')
log('   They use "IF NOT EXISTS" and "DROP IF EXISTS" clauses.\n', 'cyan')
