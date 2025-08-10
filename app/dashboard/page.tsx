import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '../../lib/auth'
import FileUpload from '../../components/features/FileUpload'
import AppHeader from '../../components/layout/AppHeader'
import AppSidebar from '../../components/layout/AppSidebar'
import FileList from '../../components/features/FileList'
import ProjectsGrid from '../../components/features/ProjectsGrid'
import CreateProjectDialog from '../../components/features/CreateProjectDialog'
import FilesTable from '../../components/features/FilesTable'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <AppHeader />
      <div className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
        <div className="hidden md:block"><AppSidebar /></div>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-semibold">Dashboard</h1>
            <div className="flex items-center gap-3">
              <CreateProjectDialog />
              <div className="text-sm text-[var(--text-secondary)]">Signed in as {session.user?.email}</div>
            </div>
          </div>
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
          <section>
            <div className="mt-4">
              <FileUpload />
            </div>
          </section>

          <section>
            {/* Server component listing recent files from R2 */}
            {/* FileList is an async server component and can be rendered directly */}
            <FileList />
          </section>

          <section>
            <ProjectsGrid />
          </section>

          <section>
            <FilesTable />
          </section>
        </div>
      </div>
    </main>
  )
}


