"use client"
import { useState, useEffect } from 'react'
import AppHeader from './AppHeader'
import AppSidebar from './AppSidebar'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Close sidebar on mobile when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById('sidebar')
      const toggleButton = document.getElementById('sidebar-toggle')
      
      if (
        sidebarOpen &&
        sidebar &&
        !sidebar.contains(event.target as Node) &&
        toggleButton &&
        !toggleButton.contains(event.target as Node)
      ) {
        setSidebarOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [sidebarOpen])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [sidebarOpen])

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const toggleCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed)
    setSidebarOpen(false) // Close mobile sidebar when collapsing
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <AppHeader onToggleSidebar={toggleSidebar} />
      
      <div className="flex">
        {/* Sidebar Overlay for Mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-20 bg-gray-600 bg-opacity-50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          id="sidebar"
          className={`
            fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out
            md:relative md:transform-none md:transition-all md:duration-300
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            ${sidebarCollapsed ? 'md:w-16' : 'md:w-64'}
            w-64
          `}
        >
          <AppSidebar 
            collapsed={sidebarCollapsed} 
            onToggleCollapse={toggleCollapse}
          />
        </div>

        {/* Main Content */}
        <div 
          className={`
            flex-1 transition-all duration-300 ease-in-out
            ${sidebarCollapsed ? 'md:ml-0' : 'md:ml-0'}
          `}
        >
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
