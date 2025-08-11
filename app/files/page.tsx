import { headers } from 'next/headers'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '../../lib/auth'
import EmptyState from '../../components/ui/EmptyState'
import DashboardLayout from '../../components/layout/DashboardLayout'

type FileRow = {
  id: string
  originalName: string
  size: string
  mimeType: string
  status: string
}

export default async function FilesPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const searchParams = await props.searchParams
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const hdrs = await headers()
  const host = hdrs.get('host') || 'localhost:3000'
  const cookie = hdrs.get('cookie') || ''
  const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const type = searchParams['type']
  const status = searchParams['status']
  const sort = (searchParams['sort'] || 'createdAt') as 'createdAt' | 'name' | 'type' | 'size'
  const order = (searchParams['order'] || 'desc') as 'asc' | 'desc'
  const q = searchParams['q']
  const params = new URLSearchParams()
  if (type) params.set('type', type)
  if (status) params.set('status', status)
  if (sort) params.set('sort', sort)
  if (order) params.set('order', order)
  if (q) params.set('q', q)
  const page = parseInt(searchParams['page'] || '1', 10)
  if (page > 1) params.set('page', String(page))
  const url = `${proto}://${host}/api/files/list${params.toString() ? `?${params.toString()}` : ''}`
  let rows: Array<FileRow> = []
  let total = 0
  let perPage = 20
  try {
    const res = await fetch(url, { cache: 'no-store', headers: { cookie } })
    if (res.ok) {
      const data = (await res.json()) as { files: Array<FileRow>; total?: number; page?: number; perPage?: number }
      rows = data.files ?? []
      total = data.total ?? rows.length
      perPage = data.perPage ?? perPage
    }
  } catch {
    rows = []
  }
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Files</h1>
          <div className="flex items-center gap-2 text-sm">
            {['ALL','image','video','pdf','zip'].map(t => (
              <a key={t} href={t==='ALL'? '/files' : `/files?type=${t}`} className="px-3 py-1 rounded-full border border-gray-300 hover:bg-gray-50">{t.toUpperCase()}</a>
            ))}
            {['ALL','PENDING','COMPLETED','APPROVED','REJECTED'].map(s => (
              <a key={s} href={s==='ALL'? '/files' : `/files?status=${s}`} className="px-3 py-1 rounded-full border border-gray-300 hover:bg-gray-50">{s.replace('_',' ')}</a>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-white shadow-sm p-6">
          <div className="flex items-center justify-between mb-2 text-xs text-gray-600 gap-2">
            <a
              href={`/api/files/export${params.toString() ? `?${params.toString()}` : ''}`}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm hover:bg-gray-50"
            >
              Export CSV
            </a>
            <form action="/files" method="get" className="ml-auto flex items-center gap-2">
              <input name="q" defaultValue={q || ''} placeholder="Search files..." className="px-2 py-1 rounded border border-gray-300" />
              {type && <input type="hidden" name="type" value={type} />}
              {status && <input type="hidden" name="status" value={status} />}
              {sort && <input type="hidden" name="sort" value={sort} />}
              {order && <input type="hidden" name="order" value={order} />}
            </form>
            <span>Sort:</span>
            {[
              { k: 'createdAt', l: 'Created' },
              { k: 'name', l: 'Name' },
              { k: 'type', l: 'Type' },
              { k: 'size', l: 'Size' },
            ].map((opt) => (
              <a
                key={opt.k}
                href={`/files?${new URLSearchParams({ ...(type ? { type } : {}), ...(status ? { status } : {}), ...(q ? { q } : {}), sort: opt.k as 'createdAt' | 'name' | 'type' | 'size', order }).toString()}`}
                className={`px-2 py-1 rounded ${sort === (opt.k as 'createdAt' | 'name' | 'type' | 'size') ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
              >
                {opt.l}
              </a>
            ))}
            <a
              href={`/files?${new URLSearchParams({ ...(type ? { type } : {}), ...(status ? { status } : {}), ...(q ? { q } : {}), sort, order: (order === 'asc' ? 'desc' : 'asc') as 'asc' | 'desc' }).toString()}`}
              className="px-2 py-1 rounded hover:bg-gray-50"
            >
              {order === 'asc' ? '▲' : '▼'}
            </a>
          </div>
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
                {rows.map((f) => (
                  <tr key={f.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 truncate max-w-[360px]"><a href={`/files/${f.id}`} className="text-[#0D99FF] hover:underline">{f.originalName}</a></td>
                    <td className="py-2 pr-4">{f.size}</td>
                    <td className="py-2 pr-4">{f.mimeType}</td>
                    <td className="py-2 pr-4">{f.status}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4">
                      <EmptyState title="No files" description="Upload files or adjust your filters to see results." action={<a href="#upload" className="inline-flex px-3 py-1.5 rounded-lg bg-[#0D99FF] text-white text-sm">Upload files</a>} />
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
              <a href={`/files${type ? `?type=${type}&` : '?'}${status ? `status=${status}&` : ''}page=${page - 1}`} className="px-3 py-1 rounded border border-gray-300 text-sm">Prev</a>
            ) : (
              <span className="px-3 py-1 rounded border border-gray-200 text-sm text-gray-400" aria-disabled>Prev</span>
            )}
            {page * perPage < total ? (
              <a href={`/files${type ? `?type=${type}&` : '?'}${status ? `status=${status}&` : ''}page=${page + 1}`} className="px-3 py-1 rounded border border-gray-300 text-sm">Next</a>
            ) : (
              <span className="px-3 py-1 rounded border border-gray-200 text-sm text-gray-400" aria-disabled>Next</span>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}


