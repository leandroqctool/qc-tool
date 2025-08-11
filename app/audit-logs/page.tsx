import { headers } from 'next/headers'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '../../lib/auth'

type LogRow = {
  id: string
  entityType: string
  entityId: string
  action: string
  userId: string
  tenantId: string
  createdAt: string
}

export default async function AuditLogsPage(
  props: { searchParams: Promise<Record<string, string | undefined>> }
) {
  const searchParams = await props.searchParams
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const hdrs = await headers()
  const host = hdrs.get('host') || 'localhost:3000'
  const cookie = hdrs.get('cookie') || ''
  const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const page = parseInt(searchParams['page'] || '1', 10)
  const params = new URLSearchParams()
  params.set('page', String(page))
  const defaultAction = (await searchParams)['action']
  const defaultUserId = (await searchParams)['userId']
  if (defaultAction) params.set('action', defaultAction)
  if (defaultUserId) params.set('userId', defaultUserId)
  const url = `${proto}://${host}/api/audit-logs?${params.toString()}`
  let rows: Array<LogRow> = []
  let total = 0
  let perPage = 50
  try {
    const res = await fetch(url, { cache: 'no-store', headers: { cookie } })
    if (res.ok) {
      const data = (await res.json()) as { logs: Array<LogRow>; total?: number; page?: number; perPage?: number }
      rows = data.logs ?? []
      total = data.total ?? rows.length
      perPage = data.perPage ?? perPage
    }
  } catch {}

  const actionClass = (a: string) => {
    if (a === 'create' || a === 'invite') return 'bg-green-100 text-green-800'
    if (a === 'update') return 'bg-blue-100 text-blue-800'
    if (a === 'delete') return 'bg-red-100 text-red-800'
    return 'bg-gray-100 text-gray-800'
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-7xl px-4 py-6 space-y-4">
        <h1 className="text-2xl font-semibold">Audit Logs</h1>
        <form className="flex flex-wrap items-center gap-2 text-sm">
          <input name="action" defaultValue={defaultAction ?? ''} placeholder="Filter by action" className="px-3 py-1.5 rounded-lg border border-gray-300" />
          <input name="userId" defaultValue={defaultUserId ?? ''} placeholder="Filter by userId" className="px-3 py-1.5 rounded-lg border border-gray-300" />
          <button className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50">Apply</button>
        </form>
        <div className="rounded-2xl bg-white shadow-sm p-6">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">When</th>
                  <th className="py-2 pr-4">Entity</th>
                  <th className="py-2 pr-4">Action</th>
                  <th className="py-2 pr-4">By</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{new Date(l.createdAt).toLocaleString()}</td>
                    <td className="py-2 pr-4">{l.entityType} {l.entityId.slice(0,8)}</td>
                    <td className="py-2 pr-4"><span className={`px-2 py-0.5 rounded-full text-xs ${actionClass(l.action)}`}>{l.action}</span></td>
                    <td className="py-2 pr-4">{l.userId.slice(0,8)}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-gray-500">No audit entries</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center mt-4">
            <div className="text-xs text-gray-500">Total: {total}</div>
            <div className="flex justify-center gap-2">
              {page > 1 ? (
                <a href={`/audit-logs?${new URLSearchParams({ page: String(page - 1), ...(defaultAction ? { action: defaultAction } : {}), ...(defaultUserId ? { userId: defaultUserId } : {}) }).toString()}`} className="px-3 py-1 rounded border border-gray-300 text-sm">Prev</a>
              ) : (
                <span className="px-3 py-1 rounded border border-gray-200 text-sm text-gray-400" aria-disabled>Prev</span>
              )}
              {page * perPage < total ? (
                <a href={`/audit-logs?${new URLSearchParams({ page: String(page + 1), ...(defaultAction ? { action: defaultAction } : {}), ...(defaultUserId ? { userId: defaultUserId } : {}) }).toString()}`} className="px-3 py-1 rounded border border-gray-300 text-sm">Next</a>
              ) : (
                <span className="px-3 py-1 rounded border border-gray-200 text-sm text-gray-400" aria-disabled>Next</span>
              )}
            </div>
            <div>
              <a href={`/api/audit-logs/export?${params.toString()}`} className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm hover:bg-gray-50">Export CSV</a>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}


