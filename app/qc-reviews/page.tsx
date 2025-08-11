import { headers } from 'next/headers'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '../../lib/auth'
import EmptyState from '../../components/ui/EmptyState'

type ReviewRow = {
  id: string
  status: string
  comments: string | null
  fileId: string | null
  projectId: string | null
}

export default async function QCReviewsPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const searchParams = await props.searchParams
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const hdrs = await headers()
  const host = hdrs.get('host') || 'localhost:3000'
  const cookie = hdrs.get('cookie') || ''
  const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const status = searchParams['status']
  const sort = (searchParams['sort'] || 'createdAt') as 'createdAt' | 'status'
  const order = (searchParams['order'] || 'desc') as 'asc' | 'desc'
  const page = parseInt(searchParams['page'] || '1', 10)
  const perPageParam = parseInt(searchParams['perPage'] || '20', 10)
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (sort) params.set('sort', sort)
  if (order) params.set('order', order)
  if (page > 1) params.set('page', String(page))
  if (perPageParam !== 20) params.set('perPage', String(perPageParam))
  const url = `${proto}://${host}/api/qc-reviews${params.toString() ? `?${params.toString()}` : ''}`
  let rows: Array<ReviewRow> = []
  let total = 0
  let perPage = 20
  try {
    const res = await fetch(url, { cache: 'no-store', headers: { cookie } })
    if (res.ok) {
      const data = (await res.json()) as { reviews: Array<ReviewRow>; total?: number; page?: number; perPage?: number }
      rows = data.reviews ?? []
      total = data.total ?? rows.length
      perPage = data.perPage ?? perPage
    }
  } catch {
    rows = []
  }
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-7xl px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">QC Reviews</h1>
          <div className="flex items-center gap-2 text-sm">
            {['ALL','IN_QC','APPROVED','REJECTED'].map(s => (
              <a key={s} href={s==='ALL'? '/qc-reviews' : `/qc-reviews?status=${s}`} className="px-3 py-1 rounded-full border border-gray-300 hover:bg-gray-50">{s.replace('_',' ')}</a>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between -mt-2 text-sm">
          <div className="flex items-center gap-2">
            <span>Sort:</span>
            {[
              { k: 'createdAt', l: 'Created' },
              { k: 'status', l: 'Status' },
            ].map((opt) => (
              <a key={opt.k} href={`/qc-reviews?${new URLSearchParams({ ...(status ? { status } : {}), sort: opt.k as string, order, ...(perPageParam ? { perPage: String(perPageParam) } : {}) }).toString()}`} className={`px-2 py-1 rounded ${sort === opt.k ? 'bg-gray-100' : 'hover:bg-gray-50'}`}>{opt.l}</a>
            ))}
            <a href={`/qc-reviews?${new URLSearchParams({ ...(status ? { status } : {}), sort, order: order === 'asc' ? 'desc' : 'asc', ...(perPageParam ? { perPage: String(perPageParam) } : {}) }).toString()}`} className="px-2 py-1 rounded hover:bg-gray-50">{order === 'asc' ? '▲' : '▼'}</a>
          </div>
          <a href={`/api/qc-reviews/export${params.toString() ? `?${params.toString()}` : ''}`} className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm hover:bg-gray-50">Export CSV</a>
        </div>
        <div className="rounded-2xl bg-white shadow-sm p-6">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Comments</th>
                  <th className="py-2 pr-4">File</th>
                  <th className="py-2 pr-4">Project</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{r.status}</td>
                    <td className="py-2 pr-4 truncate max-w-[360px]"><a href={`/qc-reviews/${r.id}`} className="hover:underline">{r.comments ?? '—'}</a></td>
                    <td className="py-2 pr-4">{r.fileId ?? '—'}</td>
                    <td className="py-2 pr-4">{r.projectId ?? '—'}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4">
                      <EmptyState title="No reviews" description="Create a review from a project or adjust filters." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <div className="text-xs text-gray-500">Total: {total}</div>
          <div className="flex justify-center gap-2">
            {page > 1 ? (
              <a href={`/qc-reviews?${new URLSearchParams({ ...(status ? { status } : {}), page: String(page - 1), ...(perPageParam ? { perPage: String(perPageParam) } : {}), sort, order }).toString()}`} className="px-3 py-1 rounded border border-gray-300 text-sm">Prev</a>
            ) : (
              <span className="px-3 py-1 rounded border border-gray-200 text-sm text-gray-400" aria-disabled>Prev</span>
            )}
            {page * perPage < total ? (
              <a href={`/qc-reviews?${new URLSearchParams({ ...(status ? { status } : {}), page: String(page + 1), ...(perPageParam ? { perPage: String(perPageParam) } : {}), sort, order }).toString()}`} className="px-3 py-1 rounded border border-gray-300 text-sm">Next</a>
            ) : (
              <span className="px-3 py-1 rounded border border-gray-200 text-sm text-gray-400" aria-disabled>Next</span>
            )}
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <span>Per page:</span>
            {[10,20,50].map((n) => (
              <a key={n} href={`/qc-reviews?${new URLSearchParams({ ...(status ? { status } : {}), page: '1', perPage: String(n), sort, order }).toString()}`} className={`px-2 py-0.5 rounded ${perPage === n ? 'bg-gray-100' : 'hover:bg-gray-50'}`}>{n}</a>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}


