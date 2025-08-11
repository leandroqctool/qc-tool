import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '../../lib/auth'
import FileUpload from '../../components/features/FileUpload'
import DashboardLayout from '../../components/layout/DashboardLayout'
import FileList from '../../components/features/FileList'
import ProjectsGrid from '../../components/features/ProjectsGrid'
import CreateProjectDialog from '../../components/features/CreateProjectDialog'
import FilesTable from '../../components/features/FilesTable'
import QCReviews from '../../components/features/QCReviews'
import UsersTable from '../../components/features/UsersTable'
import NewReviewDialog from '../../components/features/NewReviewDialog'
import DashboardStats from '../../components/features/DashboardStats'
import RecentProjects from '../../components/features/RecentProjects'
import RecentFiles from '../../components/features/RecentFiles'
import RecentActivity from '../../components/features/RecentActivity'
import UserPresence from '../../components/features/UserPresence'
import AIInsights from '../../components/features/AIInsights'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--text-primary)]">Dashboard</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Welcome back, {session.user?.email?.split('@')[0]}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <CreateProjectDialog />
            <NewReviewDialog />
          </div>
        </div>

        {/* Stats Section */}
        <DashboardStats />

        {/* Quick Upload Section */}
        <section className="bg-[var(--surface)] rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Quick Upload</h2>
          <FileUpload />
        </section>

        {/* Main Content Grid - Responsive */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <section>
              <RecentProjects />
            </section>
            <section>
              <RecentFiles />
            </section>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <section>
              <AIInsights />
            </section>
            <section>
              <UserPresence showDetails={true} maxUsers={5} />
            </section>
            <section>
              <RecentActivity />
            </section>
            <section className="xl:hidden">
              {/* Show on mobile/tablet, hidden on xl+ */}
              <QCReviews />
            </section>
          </div>
        </div>

        {/* Full Width Sections */}
        <section>
          <ProjectsGrid />
        </section>

        <section>
          <FilesTable />
        </section>

        <section className="hidden xl:block">
          {/* Hidden on mobile/tablet, show on xl+ */}
          <QCReviews />
        </section>

        <section>
          <UsersTable />
        </section>

        {/* Legacy FileList - keeping for backward compatibility */}
        <section className="hidden">
          <FileList />
        </section>
      </div>
    </DashboardLayout>
  )
}


