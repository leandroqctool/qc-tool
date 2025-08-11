import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '../../lib/auth'
import DashboardLayout from '../../components/layout/DashboardLayout'
import SecurityDashboard from '../../components/features/SecurityDashboard'

export default async function SecurityPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
  
  if (!tenantId) redirect('/login')

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[var(--background)] p-6">
        <SecurityDashboard />
      </div>
    </DashboardLayout>
  )
}
