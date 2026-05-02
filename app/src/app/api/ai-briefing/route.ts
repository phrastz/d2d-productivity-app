import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const today = new Date().toISOString().split('T')[0]
    
    const [tasksRes, projectsRes, habitsRes] = await Promise.all([
      supabase.from('tasks')
        .select('title, status, priority, due_date, progress_percent')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase.from('projects')
        .select('name, status, progress_percentage')
        .eq('owner_id', user.id)
        .eq('status', 'active')
        .limit(10),
      supabase.from('tasks')
        .select('title, status')
        .eq('owner_id', user.id)
        .eq('is_habit', true)
        .limit(10)
    ])

    const tasks = tasksRes.data || []
    const projects = projectsRes.data || []
    const habits = habitsRes.data || []

    const overdueTasks = tasks.filter(t => 
      t.due_date && t.due_date < today && t.status !== 'done'
    )
    const todayTasks = tasks.filter(t => t.due_date === today)
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress')

    const prompt = `You are a friendly productivity assistant for DailyFlow Pro app.
    
Today is ${new Date().toLocaleDateString('en-US', { 
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
})}.

User's current data:
- Active projects: ${projects.map(p => `${p.name} (${p.progress_percentage}%)`).join(', ') || 'None'}
- Tasks due today: ${todayTasks.map(t => t.title).join(', ') || 'None'}
- Overdue tasks: ${overdueTasks.map(t => t.title).join(', ') || 'None'}
- In progress: ${inProgressTasks.map(t => t.title).join(', ') || 'None'}
- Habits tracked: ${habits.length}

Write a friendly morning briefing (max 120 words):
1. Warm greeting with today's date
2. Top 3 priorities for today
3. Warning if overdue tasks exist
4. Quick habit reminder
5. One motivational closing line

Be warm, conversational, and encouraging.`

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.1-8b-instant',
      max_tokens: 300,
      temperature: 0.7,
    })

    const briefing = completion.choices[0]?.message?.content || ''

    return NextResponse.json({ 
      briefing, 
      generatedAt: new Date().toISOString() 
    })
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('AI Briefing error:', errMsg)
    return NextResponse.json(
      { error: errMsg }, 
      { status: 500 }
    )
  }
}
