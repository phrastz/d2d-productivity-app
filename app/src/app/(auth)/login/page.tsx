'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Zap, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="animate-fade-in">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 animate-pulse-glow"
          style={{ background: 'linear-gradient(135deg, hsl(250 84% 65%), hsl(280 84% 55%))' }}
        >
          <Zap className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold gradient-text">Welcome back</h1>
        <p className="text-sm mt-1" style={{ color: 'hsl(215 20% 55%)' }}>
          Sign in to your D2D workspace
        </p>
      </div>

      {/* Card */}
      <div className="glass rounded-2xl p-8" style={{ border: '1px solid hsl(222 47% 15%)' }}>
        <form onSubmit={handleLogin} className="space-y-5">

          {/* Email */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'hsl(215 20% 55%)' }}>
              Email address
            </label>
            <div className="relative">
              <Mail
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'hsl(215 20% 55%)' }}
              />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
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

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium" style={{ color: 'hsl(215 20% 55%)' }}>
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs transition-colors hover:opacity-80"
                style={{ color: 'hsl(250 84% 65%)' }}
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'hsl(215 20% 55%)' }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full pl-10 pr-11 py-3 rounded-xl text-sm transition-all focus:outline-none"
                style={{
                  background: 'hsl(222 47% 13%)',
                  border: '1px solid hsl(222 47% 15%)',
                  color: 'hsl(213 31% 91%)',
                }}
                onFocus={e => e.target.style.borderColor = 'hsl(250 84% 65%)'}
                onBlur={e => e.target.style.borderColor = 'hsl(222 47% 15%)'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors hover:opacity-80"
                style={{ color: 'hsl(215 20% 55%)' }}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm animate-fade-in"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgb(252,165,165)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, hsl(250 84% 65%), hsl(270 84% 60%))',
              boxShadow: '0 4px 20px rgba(139,92,246,0.4)',
            }}
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
              : <><span>Sign in</span><ArrowRight className="w-4 h-4" /></>
            }
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px" style={{ background: 'hsl(222 47% 15%)' }} />
          <span className="text-xs" style={{ color: 'hsl(215 20% 45%)' }}>or</span>
          <div className="flex-1 h-px" style={{ background: 'hsl(222 47% 15%)' }} />
        </div>

        {/* Demo login hint */}
        <div
          className="rounded-xl p-3 text-xs text-center"
          style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)', color: 'hsl(215 20% 55%)' }}
        >
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-semibold" style={{ color: 'hsl(250 84% 70%)' }}>
            Create one free →
          </Link>
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-xs mt-6" style={{ color: 'hsl(215 20% 40%)' }}>
        By signing in, you agree to our Terms of Service
      </p>
    </div>
  )
}
