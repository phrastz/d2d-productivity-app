'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Zap, Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    setLoading(false)
    if (error) { setError(error.message); return }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="animate-fade-in text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: 'rgba(139,92,246,0.15)', border: '2px solid rgba(139,92,246,0.3)' }}
        >
          <CheckCircle2 className="w-8 h-8" style={{ color: 'hsl(250 84% 65%)' }} />
        </div>
        <h2 className="text-xl font-bold mb-2 gradient-text">Check your email</h2>
        <p className="text-sm mb-6" style={{ color: 'hsl(215 20% 55%)' }}>
          We sent a password reset link to <strong style={{ color: 'hsl(213 31% 91%)' }}>{email}</strong>
        </p>
        <Link
          href="/login"
          className="flex items-center justify-center gap-2 text-sm font-medium"
          style={{ color: 'hsl(250 84% 65%)' }}
        >
          <ArrowLeft className="w-4 h-4" /> Back to sign in
        </Link>
      </div>
    )
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
        <h1 className="text-2xl font-bold gradient-text">Reset password</h1>
        <p className="text-sm mt-1" style={{ color: 'hsl(215 20% 55%)' }}>
          We&apos;ll send you a recovery link
        </p>
      </div>

      <div className="glass rounded-2xl p-8" style={{ border: '1px solid hsl(222 47% 15%)' }}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'hsl(215 20% 55%)' }}>
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'hsl(215 20% 55%)' }} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm transition-all focus:outline-none"
                style={{
                  background: 'hsl(222 47% 13%)',
                  border: '1px solid hsl(222 47% 15%)',
                  color: 'hsl(213 31% 91%)',
                }}
                onFocus={e => e.target.style.borderColor = 'hsl(250 84% 65%)'}
                onBlur={e => e.target.style.borderColor = 'hsl(222 47% 15%)'}
              />
            </div>
          </div>

          {error && (
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm animate-fade-in"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgb(252,165,165)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, hsl(250 84% 65%), hsl(270 84% 60%))',
              boxShadow: '0 4px 20px rgba(139,92,246,0.4)',
            }}
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
              : 'Send reset link'
            }
          </button>
        </form>

        <div className="mt-5 text-center">
          <Link
            href="/login"
            className="flex items-center justify-center gap-1.5 text-xs transition-colors"
            style={{ color: 'hsl(215 20% 55%)' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
