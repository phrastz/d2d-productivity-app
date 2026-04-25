'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Zap, Mail, Lock, User, Eye, EyeOff, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react'

export default function RegisterPage() {
  const supabase = createClient()
  const router = useRouter()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const passwordStrength = () => {
    if (password.length === 0) return 0
    let score = 0
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    return score
  }

  const strength = passwordStrength()
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength]
  const strengthColor = ['', '#ef4444', '#f59e0b', '#3b82f6', '#10b981'][strength]

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setSuccess(true)
  }

  if (success) {
    return (
      <div className="animate-fade-in text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: 'rgba(16,185,129,0.15)', border: '2px solid rgba(16,185,129,0.3)' }}
        >
          <CheckCircle2 className="w-8 h-8" style={{ color: '#10b981' }} />
        </div>
        <h2 className="text-xl font-bold mb-2 gradient-text">Check your email!</h2>
        <p className="text-sm mb-1" style={{ color: 'hsl(215 20% 55%)' }}>
          We sent a confirmation link to
        </p>
        <p className="text-sm font-semibold mb-6" style={{ color: 'hsl(213 31% 91%)' }}>{email}</p>
        <div
          className="glass rounded-2xl p-5 text-sm"
          style={{ border: '1px solid hsl(222 47% 15%)', color: 'hsl(215 20% 55%)' }}
        >
          Click the link in the email to activate your account, then{' '}
          <Link href="/login" className="font-semibold" style={{ color: 'hsl(250 84% 70%)' }}>
            sign in here →
          </Link>
        </div>
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
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 animate-pulse-glow"
          style={{ background: 'linear-gradient(135deg, hsl(250 84% 65%), hsl(280 84% 55%))' }}
        >
          <Zap className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold gradient-text">Create account</h1>
        <p className="text-sm mt-1" style={{ color: 'hsl(215 20% 55%)' }}>
          Start your productivity journey
        </p>
      </div>

      {/* Card */}
      <div className="glass rounded-2xl p-8" style={{ border: '1px solid hsl(222 47% 15%)' }}>
        <form onSubmit={handleRegister} className="space-y-4">

          {/* Full Name */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'hsl(215 20% 55%)' }}>
              Full name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'hsl(215 20% 55%)' }} />
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your full name"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm transition-all focus:outline-none"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'hsl(250 84% 65%)'}
                onBlur={e => e.target.style.borderColor = 'hsl(222 47% 15%)'}
              />
            </div>
          </div>

          {/* Email */}
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
                autoComplete="email"
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm transition-all focus:outline-none"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'hsl(250 84% 65%)'}
                onBlur={e => e.target.style.borderColor = 'hsl(222 47% 15%)'}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'hsl(215 20% 55%)' }}>
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'hsl(215 20% 55%)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                required
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

            {/* Password strength bar */}
            {password.length > 0 && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className="flex-1 h-1 rounded-full transition-all duration-300"
                      style={{ background: i <= strength ? strengthColor : 'hsl(222 47% 15%)' }}
                    />
                  ))}
                </div>
                <p className="text-[10px]" style={{ color: strengthColor }}>{strengthLabel}</p>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'hsl(215 20% 55%)' }}>
              Confirm password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'hsl(215 20% 55%)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm transition-all focus:outline-none"
                style={{
                  ...inputStyle,
                  borderColor: confirmPassword && confirmPassword !== password
                    ? 'rgba(239,68,68,0.5)'
                    : confirmPassword && confirmPassword === password
                    ? 'rgba(16,185,129,0.5)'
                    : 'hsl(222 47% 15%)',
                }}
                onFocus={e => e.target.style.borderColor = 'hsl(250 84% 65%)'}
                onBlur={e => {
                  e.target.style.borderColor = confirmPassword && confirmPassword !== password
                    ? 'rgba(239,68,68,0.5)'
                    : 'hsl(222 47% 15%)'
                }}
              />
              {confirmPassword && confirmPassword === password && (
                <CheckCircle2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#10b981' }} />
              )}
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
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            style={{
              background: 'linear-gradient(135deg, hsl(250 84% 65%), hsl(270 84% 60%))',
              boxShadow: '0 4px 20px rgba(139,92,246,0.4)',
            }}
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</>
              : <><span>Create account</span><ArrowRight className="w-4 h-4" /></>
            }
          </button>
        </form>

        {/* Sign in link */}
        <div
          className="rounded-xl p-3 mt-5 text-xs text-center"
          style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)', color: 'hsl(215 20% 55%)' }}
        >
          Already have an account?{' '}
          <Link href="/login" className="font-semibold" style={{ color: 'hsl(250 84% 70%)' }}>
            Sign in →
          </Link>
        </div>
      </div>
    </div>
  )
}
