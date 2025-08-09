import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <div className="text-sm text-[var(--text-secondary)]">Signed in as {session.user?.email}</div>
        </header>
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white shadow-sm p-6 text-center">
            <div className="text-xl font-semibold text-gray-900">—</div>
            <div className="text-sm text-gray-500">Projects</div>
          </div>
          <div className="rounded-2xl bg-white shadow-sm p-6 text-center">
            <div className="text-xl font-semibold text-gray-900">—</div>
            <div className="text-sm text-gray-500">Files</div>
          </div>
          <div className="rounded-2xl bg-white shadow-sm p-6 text-center">
            <div className="text-xl font-semibold text-gray-900">—</div>
            <div className="text-sm text-gray-500">In QC</div>
          </div>
        </section>
      </div>
    </main>
  )
}


