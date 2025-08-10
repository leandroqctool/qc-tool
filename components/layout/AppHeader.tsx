"use client"
import { useState } from 'react'
import { Bell, Menu, Search } from 'lucide-react'

type Props = {
  onToggleSidebar?: () => void
}

export default function AppHeader({ onToggleSidebar }: Props) {
  const [query, setQuery] = useState('')
  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-7xl px-4 h-14 flex items-center gap-3">
        <button
          aria-label="Toggle sidebar"
          onClick={onToggleSidebar}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <Menu className="h-5 w-5 text-gray-700" />
        </button>
        <div className="flex-1 flex justify-center">
          <div className="relative w-full max-w-lg">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search files, projects..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0D99FF]"
            />
          </div>
        </div>
        <button className="p-2 rounded-lg hover:bg-gray-100">
          <Bell className="h-5 w-5 text-gray-700" />
        </button>
        <div className="ml-1 h-8 w-8 rounded-full bg-gray-200" aria-label="Avatar" />
      </div>
    </header>
  )
}


