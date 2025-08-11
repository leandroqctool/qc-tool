import { headers } from 'next/headers'

type LogRow = {
  id: string
  entityType: string
  entityId: string
  action: string
  userId: string
  createdAt: string
}

export default async function RecentActivity() {
  const hdrs = await headers()
  const host = hdrs.get('host') || 'localhost:3000'
  const cookie = hdrs.get('cookie') || ''
  const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const url = `${proto}://${host}/api/audit-logs?perPage=6&page=1`
  let rows: Array<LogRow> = []
  try {
    const res = await fetch(url, { cache: 'no-store', headers: { cookie } })
    if (res.ok) {
      const data = (await res.json()) as { logs: Array<LogRow> }
      rows = data.logs ?? []
    }
  } catch {}

  return (
    <section className="rounded-2xl bg-white shadow-sm p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        <a href="/audit-logs" className="text-sm text-[#0D99FF] hover:underline">View all</a>
      </div>
      <div className="divide-y">
        {rows.map((l) => (
          <div key={l.id} className="py-2 text-sm flex items-center justify-between">
            <div className="truncate">
              <span className="text-gray-900 font-medium">{l.action}</span>
              <span className="text-gray-600"> on {l.entityType} {l.entityId.slice(0,8)}</span>
            </div>
            <div className="text-xs text-gray-500">{new Date(l.createdAt).toLocaleString()}</div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="text-sm text-gray-500">No recent activity</div>
        )}
      </div>
    </section>
  )
}


