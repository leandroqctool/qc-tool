"use client"
import { useEffect, useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { Bell, Menu, Search } from 'lucide-react'
import Link from 'next/link'
import { UserPresenceIndicator } from '../features/UserPresence'

type Props = {
  onToggleSidebar?: () => void
}

export default function AppHeader({ onToggleSidebar }: Props) {
  const [query, setQuery] = useState('')
  const { data: session } = useSession()
  const debouncedQuery = useDebounce(query, 300)
  useEffect(() => {
    const value = debouncedQuery.trim()
    if (value.length === 0) return
    const url = `/projects?q=${encodeURIComponent(value)}`
    window.history.replaceState(null, '', url)
  }, [debouncedQuery])
  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    const value = query.trim()
    if (value.length === 0) return
    window.location.href = `/projects?q=${encodeURIComponent(value)}`
  }
  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-7xl px-4 h-14 flex items-center gap-3">
        <button
          id="sidebar-toggle"
          aria-label="Toggle sidebar"
          onClick={onToggleSidebar}
          className="p-2 rounded-lg hover:bg-gray-100 md:hidden"
        >
          <Menu className="h-5 w-5 text-gray-700" />
        </button>
        <div className="flex-1 flex justify-center">
          <form onSubmit={onSearchSubmit} className="relative w-full max-w-lg">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0D99FF]"
            />
          </form>
        </div>
        <Link href="/projects" className="p-2 rounded-lg hover:bg-gray-100 text-sm text-gray-700">Projects</Link>
        <UserPresenceIndicator />
        <button className="p-2 rounded-lg hover:bg-gray-100">
          <Bell className="h-5 w-5 text-gray-700" />
        </button>
        <div className="flex items-center gap-2">
          {session?.user?.email && (
            <span className="hidden sm:inline text-xs text-gray-600">{session.user.email}</span>
          )}
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-xs"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}

function useDebounce<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}


