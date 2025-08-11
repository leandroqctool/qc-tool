import CreateProjectDialog from './CreateProjectDialog'
import { headers } from 'next/headers'

export default async function ProjectsGrid() {
  const hdrs = await headers()
  const host = hdrs.get('host') || 'localhost:3000'
  const cookie = hdrs.get('cookie') || ''
  const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const url = `${proto}://${host}/api/projects?perPage=200`
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
        <div key={p.id} className="relative overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <div className="relative h-48 bg-gradient-to-br from-[var(--primary)] to-[#6366F1]">
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-xs font-medium rounded-full text-gray-800 shadow-sm">
                {p.status.replace('_', ' ')}
              </span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h3 className="text-xl font-semibold text-white mb-2 truncate">{p.name}</h3>
              <div className="flex items-center text-white/90 text-sm mb-4">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                Project #{p.id.slice(0, 8)}
              </div>
              <button className="bg-white text-gray-900 px-6 py-2.5 rounded-full text-sm font-medium hover:bg-gray-100 transition-colors flex items-center gap-2 shadow-sm">
                Start QC 
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          <div className="p-6 bg-white">
            {p.description ? (
              <p className="text-sm text-gray-600 line-clamp-2 mb-4">{p.description}</p>
            ) : (
              <p className="text-sm text-gray-400 mb-4">No description provided</p>
            )}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-gray-900">0</div>
                <div className="text-xs text-gray-500">Files</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">-</div>
                <div className="text-xs text-gray-500">Size</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">0%</div>
                <div className="text-xs text-gray-500">Complete</div>
              </div>
            </div>
          </div>
        </div>
      ))}
        {rows.length === 0 && (
          <div className="col-span-full text-center py-12">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-sm font-medium text-gray-900 mb-1">No projects yet</h3>
            <p className="text-sm text-gray-500">Get started by creating your first project</p>
          </div>
        )}
      </div>
    </div>
  )
}


