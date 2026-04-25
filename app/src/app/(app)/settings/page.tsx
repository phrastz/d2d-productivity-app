'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import TopNav from '@/components/layout/TopNav'
import { User, Loader2, Save, Database, Trash2, AlertTriangle } from 'lucide-react'
import { format, subDays, addDays } from 'date-fns'

export default function SettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setEmail(user.email ?? '')
        setFullName(user.user_metadata?.full_name ?? '')
      }
      setLoading(false)
    }
    loadProfile()
  }, [])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName }
    })

    setSaving(false)
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Profile updated successfully!' })
      // Small delay then clear message
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleLoadDemoData = async () => {
    if (!confirm('This will load sample projects and tasks. Continue?')) return
    
    setSeeding(true)
    setMessage(null)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const today = new Date()

      // 1. Create a Project
      const { data: project, error: pErr } = await supabase.from('projects').insert({
        owner_id: user.id,
        name: 'Website Redesign',
        description: 'Overhaul the corporate website with the new design system',
        start_date: format(subDays(today, 2), 'yyyy-MM-dd'),
        end_date: format(addDays(today, 14), 'yyyy-MM-dd'),
        status: 'active',
        progress_percentage: 0
      }).select().single()

      if (pErr) throw pErr

      // 2. Create Tasks
      await supabase.from('tasks').insert([
        {
          owner_id: user.id,
          project_id: project.id,
          title: 'Design mockups in Figma',
          description: 'Homepage and about page mockups',
          status: 'done',
          priority: 'high',
          category: 'Design',
          time_spent_minutes: 120
        },
        {
          owner_id: user.id,
          project_id: project.id,
          title: 'Setup Next.js project',
          status: 'in_progress',
          priority: 'high',
          category: 'Development',
          time_spent_minutes: 45
        },
        {
          owner_id: user.id,
          project_id: project.id,
          title: 'Write copy for landing page',
          status: 'todo',
          priority: 'medium',
          category: 'Content',
          due_date: format(addDays(today, 2), "yyyy-MM-dd'T'10:00")
        },
        {
          owner_id: user.id,
          title: 'Read 20 pages of book',
          status: 'todo',
          priority: 'low',
          is_habit: true,
          category: 'Personal'
        }
      ])

      // 3. Create Daily Logs (Past 3 days)
      await supabase.from('daily_logs').insert([
        {
          user_id: user.id,
          date: format(today, 'yyyy-MM-dd'),
          summary: 'Made good progress on the new project setup. Feeling productive.',
          mood: 'great'
        },
        {
          user_id: user.id,
          date: format(subDays(today, 1), 'yyyy-MM-dd'),
          summary: "Lots of meetings today, couldn't focus on deep work.",
          mood: 'okay'
        },
        {
          user_id: user.id,
          date: format(subDays(today, 2), 'yyyy-MM-dd'),
          summary: 'Started the new redesign project. Excited for the new tech stack!',
          mood: 'good'
        }
      ])

      setMessage({ type: 'success', text: 'Demo data loaded successfully! Check your dashboard.' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to load demo data' })
    } finally {
      setSeeding(false)
    }
  }

  if (loading) {
    return (
      <>
        <TopNav title="Settings" />
        <div className="p-6 flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </>
    )
  }

  return (
    <>
      <TopNav title="Settings" subtitle="Manage your account preferences" />
      
      <div className="p-6 max-w-2xl space-y-6 animate-fade-in">
        
        {message && (
          <div className={`p-4 rounded-xl flex items-center gap-3 text-sm ${
            message.type === 'success' 
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {message.text}
          </div>
        )}

        {/* Profile Section */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold gradient-text flex items-center gap-2 mb-6">
            <User className="w-5 h-5 text-primary" />
            Profile Settings
          </h2>
          
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'hsl(215 20% 55%)' }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full bg-secondary/30 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-muted-foreground cursor-not-allowed"
              />
              <p className="text-[10px] mt-1 text-muted-foreground">Email cannot be changed directly.</p>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'hsl(215 20% 55%)' }}>
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your name"
                className="w-full bg-secondary/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-primary text-white hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </form>
        </div>

        {/* Danger Zone / Utilities */}
        <div className="glass rounded-2xl p-6 border-red-500/10">
          <h2 className="text-lg font-semibold text-red-400 flex items-center gap-2 mb-6">
            <Database className="w-5 h-5" />
            Developer Tools
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-secondary/30">
              <div>
                <p className="text-sm font-medium text-foreground">Load Demo Data</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Populate your workspace with sample projects, tasks, and logs to test the UI.
                </p>
              </div>
              <button
                onClick={handleLoadDemoData}
                disabled={seeding}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all flex items-center gap-2 flex-shrink-0"
              >
                {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                Load Data
              </button>
            </div>
          </div>
        </div>

      </div>
    </>
  )
}
