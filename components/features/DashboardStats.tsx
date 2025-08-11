import { headers } from 'next/headers'

export default async function DashboardStats() {
  const hdrs = await headers()
  const host = hdrs.get('host') || 'localhost:3000'
  const cookie = hdrs.get('cookie') || ''
  const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const url = `${proto}://${host}/api/stats`
  let stats = { projects: 0, files: 0, inQc: 0 }
  let error: string | null = null
  try {
    const res = await fetch(url, { cache: 'no-store', headers: { cookie } })
    if (res.ok) stats = await res.json()
    else error = 'Failed to load stats'
  } catch {
    error = 'Failed to load stats'
  }

  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="rounded-2xl bg-white shadow-sm p-6 text-center">
        <div className="text-xl font-semibold text-gray-900">{stats.projects}</div>
        <div className="text-sm text-gray-500">Projects</div>
      </div>
      <div className="rounded-2xl bg-white shadow-sm p-6 text-center">
        <div className="text-xl font-semibold text-gray-900">{stats.files}</div>
        <div className="text-sm text-gray-500">Files</div>
      </div>
      <div className="rounded-2xl bg-white shadow-sm p-6 text-center">
        <div className="text-xl font-semibold text-gray-900">{stats.inQc}</div>
        <div className="text-sm text-gray-500">In QC</div>
      </div>
      {error && (
        <div className="sm:col-span-3 text-center text-xs text-red-700 bg-red-50 border border-red-200 rounded-md p-2">{error}</div>
      )}
    </section>
  )
}


