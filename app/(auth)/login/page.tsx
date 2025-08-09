'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const res = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (res?.ok) {
      router.push('/dashboard')
    } else {
      setError('Invalid credentials')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="w-full max-w-md bg-white shadow-sm rounded-2xl p-8">
        <h1 className="text-2xl font-semibold text-center text-[var(--text-primary)]">Sign in</h1>
        <p className="mt-2 text-center text-sm text-[var(--text-secondary)]">Access your QC Tool account</p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0D99FF]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)]">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0D99FF]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#0D99FF] text-white py-2.5 font-medium hover:bg-[#0B87E5] disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  )
}


