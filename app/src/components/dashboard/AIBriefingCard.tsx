'use client'
import { useState } from 'react'
import { Sparkles, RefreshCw, X } from 'lucide-react'

export default function AIBriefingCard() {
  const [briefing, setBriefing] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const generateBriefing = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai-briefing', { method: 'POST' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setBriefing(data.briefing)
    } catch (err) {
      setError('Failed to generate briefing. Check your API key.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-violet-200 dark:border-violet-500/30 
      bg-gradient-to-br from-violet-50 to-purple-50 
      dark:from-violet-950/30 dark:to-purple-950/30 p-4 mb-4">
      
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-500 
            flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-medium text-slate-900 dark:text-white text-sm">
            AI Morning Briefing
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full 
            bg-violet-100 dark:bg-violet-900/50 
            text-violet-600 dark:text-violet-300">
            Powered by Groq
          </span>
        </div>
        <button 
          onClick={() => setDismissed(true)}
          className="text-slate-400 hover:text-slate-600 
            dark:hover:text-slate-200 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {!briefing && !loading && (
        <div className="text-center py-3">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-3">
            Get your personalized daily briefing powered by Groq AI
          </p>
          <button
            onClick={generateBriefing}
            className="inline-flex items-center gap-2 px-4 py-2 
              rounded-lg bg-violet-500 hover:bg-violet-600 
              text-white text-sm font-medium transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Generate Morning Briefing
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-3 py-4">
          <RefreshCw className="w-4 h-4 text-violet-500 animate-spin" />
          <span className="text-slate-500 dark:text-slate-400 text-sm">
            Groq is analyzing your tasks...
          </span>
        </div>
      )}

      {error && (
        <div className="text-red-500 dark:text-red-400 text-sm py-2">
          {error}
          <button 
            onClick={generateBriefing}
            className="ml-2 underline">
            Try again
          </button>
        </div>
      )}

      {briefing && (
        <div>
          <p className="text-slate-700 dark:text-slate-200 text-sm 
            leading-relaxed whitespace-pre-line">
            {briefing}
          </p>
          <button
            onClick={generateBriefing}
            className="mt-3 inline-flex items-center gap-1 text-xs 
              text-violet-500 hover:text-violet-700 
              dark:hover:text-violet-300 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Regenerate
          </button>
        </div>
      )}
    </div>
  )
}
