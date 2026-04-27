import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function POST(request: Request) {
  try {
    // Check for admin secret to prevent unauthorized access
    const { secret } = await request.json()
    
    if (secret !== 'run-migration-003') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ 
        error: 'Missing Supabase credentials',
        details: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseServiceKey
        }
      }, { status: 500 })
    }

    // Create admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Read migration file
    const migrationPath = join(process.cwd(), '..', 'migrations', '003_add_subprojects.sql')
    const sql = readFileSync(migrationPath, 'utf8')

    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    const results = []

    // Execute each statement
    for (const statement of statements) {
      if (!statement) continue

      try {
        // Try to execute using raw SQL
        const { data, error } = await supabase.rpc('exec_sql', { sql: statement + ';' })
        
        if (error) {
          results.push({
            statement: statement.substring(0, 100),
            success: false,
            error: error.message
          })
        } else {
          results.push({
            statement: statement.substring(0, 100),
            success: true
          })
        }
      } catch (err) {
        results.push({
          statement: statement.substring(0, 100),
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return NextResponse.json({
      message: 'Migration execution completed',
      totalStatements: statements.length,
      successCount,
      failCount,
      results
    })

  } catch (err) {
    return NextResponse.json({ 
      error: 'Migration failed',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 })
  }
}
