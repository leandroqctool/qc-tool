import { headers } from 'next/headers'
import Link from 'next/link'

type ProjectRow = {
  id: string
  name: string
  description: string | null
  status: string
}

export default async function RecentProjects() {
  const hdrs = await headers()
  const host = hdrs.get('host') || 'localhost:3000'
  const cookie = hdrs.get('cookie') || ''
  const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const url = `${proto}://${host}/api/projects?perPage=6&page=1`
  let rows: Array<ProjectRow> = []
  try {
    const res = await fetch(url, { cache: 'no-store', headers: { cookie } })
    if (res.ok) {
      const data = (await res.json()) as { projects: Array<ProjectRow> }
      rows = data.projects ?? []
    }
  } catch {}

  return (
    <section className="rounded-2xl bg-white shadow-sm p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">Recent Projects</h3>
        <Link href="/projects" className="text-sm text-[#0D99FF] hover:underline">View all</Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`} className="rounded-xl border border-gray-200 hover:border-gray-300 p-4 transition-colors">
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm px-2 py-0.5 bg-gray-100 rounded-full">{p.status}</div>
            </div>
            <div className="text-gray-900 font-medium">{p.name}</div>
            {p.description && <div className="text-xs text-gray-600 line-clamp-2 mt-1">{p.description}</div>}
          </Link>
        ))}
        {rows.length === 0 && <div className="text-sm text-gray-500">No recent projects</div>}
      </div>
    </section>
  )
}


