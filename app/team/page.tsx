import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '../../lib/auth'
import DashboardLayout from '../../components/layout/DashboardLayout'
import TeamManagementDashboard from '../../components/features/TeamManagementDashboard'

export default async function TeamPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
  const userRole = (session.user as unknown as { role?: string }).role
  
  if (!tenantId) redirect('/login')

  // Check if user has team management access
  if (userRole !== 'admin' && userRole !== 'manager') {
    redirect('/dashboard')
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[var(--background)] p-6">
        <TeamManagementDashboard />
      </div>
    </DashboardLayout>
  )
}
