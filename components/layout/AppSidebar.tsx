"use client"
import Link from 'next/link'
import { Folder, Grid3X3, Home, Users } from 'lucide-react'

export default function AppSidebar() {
  return (
    <aside className={`w-60 border-r border-gray-200 bg-white`}> 
      <nav className="p-4 space-y-1 text-sm text-gray-700">
        <Link className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100" href="/">
          <Home className="h-4 w-4" /> Dashboard
        </Link>
        <a className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100" href="#">
          <Folder className="h-4 w-4" /> Files
        </a>
        <a className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100" href="#">
          <Grid3X3 className="h-4 w-4" /> Projects
        </a>
        <a className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100" href="#">
          <Users className="h-4 w-4" /> Users
        </a>
      </nav>
    </aside>
  )
}


