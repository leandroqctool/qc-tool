import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '../../lib/auth'
import DashboardLayout from '../../components/layout/DashboardLayout'
import MonitoringDashboard from '../../components/features/MonitoringDashboard'

export default async function MonitoringPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const userRole = (session.user as unknown as { role?: string }).role
  
  // Only admins can access monitoring
  if (userRole !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[var(--background)] p-6">
        <MonitoringDashboard />
      </div>
    </DashboardLayout>
  )
}
