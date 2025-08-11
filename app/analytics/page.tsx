import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '../../lib/auth'
import DashboardLayout from '../../components/layout/DashboardLayout'
import ExecutiveDashboard from '../../components/features/ExecutiveDashboard'

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
  const userRole = (session.user as unknown as { role?: string }).role
  
  if (!tenantId) redirect('/login')

  // Check if user has analytics access
  if (userRole !== 'admin' && userRole !== 'manager') {
    redirect('/dashboard')
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[var(--background)] p-6">
        <ExecutiveDashboard />
      </div>
    </DashboardLayout>
  )
}
