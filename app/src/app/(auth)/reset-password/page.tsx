'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Zap, Lock, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }

    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) { setError(error.message); return }
    setDone(true)
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  if (done) {
    return (
      <div className="animate-fade-in text-center py-8">
        <CheckCircle2 className="w-12 h-12 mx-auto mb-4" style={{ color: '#10b981' }} />
        <h2 className="text-xl font-bold gradient-text mb-2">Password updated!</h2>
        <p className="text-sm" style={{ color: 'hsl(215 20% 55%)' }}>Redirecting to dashboard…</p>
      </div>
    )
  }

  const inputStyle = {
    background: 'hsl(222 47% 13%)',
    border: '1px solid hsl(222 47% 15%)',
    color: 'hsl(213 31% 91%)',
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col items-center mb-8">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 animate-pulse-glow"
          style={{ background: 'linear-gradient(135deg, hsl(250 84% 65%), hsl(280 84% 55%))' }}
        >
          <Zap className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold gradient-text">New password</h1>
        <p className="text-sm mt-1" style={{ color: 'hsl(215 20% 55%)' }}>Enter your new password below</p>
      </div>

      <div className="glass rounded-2xl p-8" style={{ border: '1px solid hsl(222 47% 15%)' }}>
        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'hsl(215 20% 55%)' }}>New password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'hsl(215 20% 55%)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                required
                autoFocus
                className="w-full pl-10 pr-11 py-3 rounded-xl text-sm transition-all focus:outline-none"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'hsl(250 84% 65%)'}
                onBlur={e => e.target.style.borderColor = 'hsl(222 47% 15%)'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2"
                style={{ color: 'hsl(215 20% 55%)' }}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'hsl(215 20% 55%)' }}>Confirm password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'hsl(215 20% 55%)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Re-enter password"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm transition-all focus:outline-none"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'hsl(250 84% 65%)'}
                onBlur={e => e.target.style.borderColor = 'hsl(222 47% 15%)'}
              />
            </div>
          </div>

          {error && (
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgb(252,165,165)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white mt-2 transition-all disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, hsl(250 84% 65%), hsl(270 84% 60%))',
              boxShadow: '0 4px 20px rgba(139,92,246,0.4)',
            }}
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</> : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}
