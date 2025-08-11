import FileUpload from '../../../components/features/FileUpload'
import ProjectStatusMenu from '../../../components/features/ProjectStatusMenu'
import NewReviewDialog from '../../../components/features/NewReviewDialog'
import { headers } from 'next/headers'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '../../../lib/auth'

type ProjectRow = {
  id: string
  name: string
  description: string | null
  status: string
}

type FileRow = {
  id: string
  originalName: string
  size: string
  mimeType: string
  status: string
}

type ReviewRow = {
  id: string
  status: string
  comments: string | null
}

export default async function ProjectDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const hdrs = await headers()
  const host = hdrs.get('host') || 'localhost:3000'
  const cookie = hdrs.get('cookie') || ''
  const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const base = `${proto}://${host}`

  let project: ProjectRow | null = null
  try {
    const res = await fetch(`${base}/api/projects/${id}`, { cache: 'no-store', headers: { cookie } })
    if (res.ok) {
      const data = (await res.json()) as { project: ProjectRow }
      project = data.project
    }
  } catch {}

  let files: Array<FileRow> = []
  try {
    const res = await fetch(`${base}/api/files/list?projectId=${id}`, { cache: 'no-store', headers: { cookie } })
    if (res.ok) {
      const data = (await res.json()) as { files: Array<FileRow> }
      files = data.files ?? []
    }
  } catch {}

  let reviews: Array<ReviewRow> = []
  try {
    const res = await fetch(`${base}/api/qc-reviews?projectId=${id}`, { cache: 'no-store', headers: { cookie } })
    if (res.ok) {
      const data = (await res.json()) as { reviews: Array<ReviewRow> }
      reviews = data.reviews ?? []
    }
  } catch {}

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        {project ? (
          <div className="rounded-2xl bg-white shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold">{project.name}</h1>
                {project.description && <p className="text-sm text-gray-600 mt-1">{project.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                <NewReviewDialog defaultProjectId={id} />
                <ProjectStatusMenu projectId={id} status={project.status} />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">Project not found</div>
        )}

        <div className="rounded-2xl bg-white shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Files</h3>
          <div className="mb-4"><FileUpload projectId={id} /></div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Size</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {files.map((f) => (
                  <tr key={f.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 truncate max-w-[360px]">{f.originalName}</td>
                    <td className="py-2 pr-4">{f.size}</td>
                    <td className="py-2 pr-4">{f.mimeType}</td>
                    <td className="py-2 pr-4">{f.status}</td>
                  </tr>
                ))}
                {files.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-gray-500">No files for this project</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Reviews</h3>
            <a href={`/qc-reviews?status=IN_QC`} className="text-sm text-[#0D99FF] hover:underline">View all</a>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Comments</th>
                  <th className="py-2 pr-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{r.status}</td>
                    <td className="py-2 pr-4 truncate max-w-[360px]">{r.comments ?? '—'}</td>
                    <td className="py-2 pr-4"><a href={`/qc-reviews/${r.id}`} className="text-[#0D99FF] hover:underline">Open</a></td>
                  </tr>
                ))}
                {reviews.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-4 text-gray-500">No reviews yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}


