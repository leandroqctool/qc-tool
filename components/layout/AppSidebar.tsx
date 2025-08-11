"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Folder, 
  Grid3X3, 
  Home, 
  Users, 
  CheckCircle, 
  ChevronLeft, 
  ChevronRight,
  FileText,
  BarChart3,
  Shield,
  Activity
} from 'lucide-react'

interface AppSidebarProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export default function AppSidebar({ collapsed = false, onToggleCollapse }: AppSidebarProps) {
  const pathname = usePathname()

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Files', href: '/files', icon: Folder },
    { name: 'Projects', href: '/projects', icon: Grid3X3 },
    { name: 'QC Reviews', href: '/qc-reviews', icon: CheckCircle },
    { name: 'Forms', href: '/forms', icon: FileText },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Team', href: '/team', icon: Users },
    { name: 'Security', href: '/security', icon: Shield },
    { name: 'Monitoring', href: '/monitoring', icon: Activity },
    { name: 'Users', href: '/users', icon: Users },
    { name: 'Audit Logs', href: '/audit-logs', icon: FileText },
  ]

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <aside className={`h-full border-r border-[var(--border-light)] bg-[var(--surface)] transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Logo/Brand Section */}
      <div className="p-4 border-b border-[var(--border-light)]">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold text-[var(--text-primary)]">QC Tool</span>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center mx-auto">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${active 
                  ? 'bg-[var(--primary-light)] text-[var(--primary)] border border-[var(--primary)]/20' 
                  : 'text-[var(--text-secondary)] hover:bg-gray-50 hover:text-[var(--text-primary)]'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
              title={collapsed ? item.name : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Collapse Toggle Button */}
      <div className="absolute bottom-4 left-4 right-4">
        <button
          onClick={onToggleCollapse}
          className={`
            w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
            text-[var(--text-secondary)] hover:bg-gray-50 hover:text-[var(--text-primary)]
            transition-colors
            ${collapsed ? 'justify-center' : ''}
          `}
          title={collapsed ? (collapsed ? 'Expand sidebar' : 'Collapse sidebar') : undefined}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}


