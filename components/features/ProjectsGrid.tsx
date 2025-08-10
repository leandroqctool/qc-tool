import CreateProjectDialog from './CreateProjectDialog'
import { headers } from 'next/headers'

export default async function ProjectsGrid() {
  const hdrs = await headers()
  const host = hdrs.get('host') || 'localhost:3000'
  const cookie = hdrs.get('cookie') || ''
  const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const url = `${proto}://${host}/api/projects`
  type ProjectRow = {
    id: string
    name: string
    description: string | null
    status: string
  }
  let rows: Array<ProjectRow> = []
  try {
    const res = await fetch(url, { cache: 'no-store', headers: { cookie } })
    if (res.ok) {
      const data = (await res.json()) as { projects: Array<ProjectRow> }
      rows = data.projects ?? []
    }
  } catch {
    rows = []
  }
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Projects</h2>
        {/* Client create button already present in header; duplicating here for convenience */}
        <CreateProjectDialog />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {rows.map((p) => (
        <div key={p.id} className="relative overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-lg transition-all duration-300">
          <div className="relative h-40 bg-gradient-to-br from-[#0D99FF] to-[#6366F1]">
            <div className="absolute top-3 left-3">
              <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-xs font-medium rounded-full">{p.status}</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="text-lg font-semibold text-white mb-1">{p.name}</h3>
              <button className="bg-white text-gray-900 px-4 py-1.5 rounded-full text-xs font-medium hover:bg-gray-100">Start QC</button>
            </div>
          </div>
          {p.description && (
            <div className="p-4 text-sm text-gray-600 line-clamp-2">{p.description}</div>
          )}
        </div>
      ))}
        {rows.length === 0 && <div className="text-sm text-gray-500">No projects yet</div>}
      </div>
    </div>
  )
}


