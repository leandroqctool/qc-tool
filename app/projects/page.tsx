import { headers } from 'next/headers'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '../../lib/auth'
import EmptyState from '../../components/ui/EmptyState'
import CreateProjectDialog from '../../components/features/CreateProjectDialog'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'

type ProjectRow = {
  id: string
  name: string
  description: string | null
  status: string
}

export default async function ProjectsPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const searchParams = await props.searchParams
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const hdrs = await headers()
  const host = hdrs.get('host') || 'localhost:3000'
  const cookie = hdrs.get('cookie') || ''
  const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const status = searchParams['status']
  const q = searchParams['q']
  const sort = (searchParams['sort'] || 'createdAt') as 'createdAt' | 'name' | 'status'
  const order = (searchParams['order'] || 'desc') as 'asc' | 'desc'
  const page = parseInt(searchParams['page'] || '1', 10)
  const perPageParam = parseInt(searchParams['perPage'] || '12', 10)
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (q) params.set('q', q)
  if (sort) params.set('sort', sort)
  if (order) params.set('order', order)
  if (page > 1) params.set('page', String(page))
  if (perPageParam !== 12) params.set('perPage', String(perPageParam))
  const url = `${proto}://${host}/api/projects${params.toString() ? `?${params.toString()}` : ''}`
  let rows: Array<ProjectRow> = []
  let total = 0
  let perPage = 12
  try {
    const res = await fetch(url, { cache: 'no-store', headers: { cookie } })
    if (res.ok) {
      const data = (await res.json()) as { projects: Array<ProjectRow>; total?: number; page?: number; perPage?: number }
      rows = data.projects ?? []
      total = data.total ?? rows.length
      perPage = data.perPage ?? perPage
    }
  } catch {
    rows = []
  }
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Projects</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Manage your quality control projects
            </p>
          </div>
          <CreateProjectDialog />
        </div>

        {/* Search and Filters */}
        <div className="bg-[var(--surface)] rounded-2xl p-4 shadow-sm space-y-4">
          {/* Search */}
          <form action="/projects" method="get" className="w-full">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                name="q"
                defaultValue={q || ''}
                placeholder="Search projects..."
                className="flex-1"
              />
              <Button type="submit" variant="outline" className="sm:w-auto">
                Search
              </Button>
            </div>
            {status && <input type="hidden" name="status" value={status} />}
            {sort && <input type="hidden" name="sort" value={sort} />}
            {order && <input type="hidden" name="order" value={order} />} 
          </form>

          {/* Status Filters */}
          <div className="flex flex-wrap gap-2">
            {['ALL','CREATED','IN_PROGRESS','IN_QC','COMPLETED','ARCHIVED'].map(s => (
              <Badge
                key={s}
                variant={status === s || (s === 'ALL' && !status) ? 'default' : 'outline'}
              >
                <a
                  href={s==='ALL' ? '/projects' : `/projects?status=${s}`}
                  className="block"
                >
                  {s.replace('_',' ')}
                </a>
              </Badge>
            ))}
          </div>
        </div>
        {/* Sort Controls and Export */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-[var(--text-secondary)]">Sort by:</span>
            {[
              { k: 'createdAt', l: 'Created' },
              { k: 'name', l: 'Name' },
              { k: 'status', l: 'Status' },
            ].map((opt) => (
              <Badge
                key={opt.k}
                variant={sort === opt.k ? 'default' : 'outline'}
              >
                <a href={`/projects?${new URLSearchParams({ ...(status ? { status } : {}), ...(q ? { q } : {}), sort: opt.k as string, order, ...(perPageParam ? { perPage: String(perPageParam) } : {}) }).toString()}`}>
                  {opt.l}
                </a>
              </Badge>
            ))}
            <Badge variant="outline">
              <a href={`/projects?${new URLSearchParams({ ...(status ? { status } : {}), ...(q ? { q } : {}), sort, order: order === 'asc' ? 'desc' : 'asc', ...(perPageParam ? { perPage: String(perPageParam) } : {}) }).toString()}`}>
                {order === 'asc' ? '↑' : '↓'}
              </a>
            </Badge>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/projects/export${params.toString() ? `?${params.toString()}` : ''}`}>
              Export CSV
            </a>
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rows.map((p) => (
            <a key={p.id} href={`/projects/${p.id}`} className="relative overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-lg transition-all duration-300">
              <div className="relative h-40 bg-gradient-to-br from-[#0D99FF] to-[#6366F1]">
                <div className="absolute top-3 left-3">
                  <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-xs font-medium rounded-full">{p.status}</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-lg font-semibold text-white mb-1">{p.name}</h3>
                  <span className="bg-white text-gray-900 px-4 py-1.5 rounded-full text-xs font-medium">Open</span>
                </div>
              </div>
              {p.description && (
                <div className="p-4 text-sm text-gray-600 line-clamp-2">{p.description}</div>
              )}
            </a>
          ))}
          {rows.length === 0 && (
            <div className="col-span-full"><EmptyState title="No projects" description="Create your first project to get started." action={<CreateProjectDialog />} /></div>
          )}
        </div>
        {/* Pagination */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-[var(--border-light)]">
          <div className="text-sm text-[var(--text-secondary)]">
            Total: {total} projects
          </div>
          
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Button variant="outline" size="sm" asChild>
                <a href={`/projects?${new URLSearchParams({ ...(status ? { status } : {}), ...(q ? { q } : {}), page: String(page - 1), ...(perPageParam ? { perPage: String(perPageParam) } : {}), sort, order }).toString()}`}>
                  Previous
                </a>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
            )}
            
            <span className="text-sm text-[var(--text-secondary)] px-2">
              Page {page}
            </span>
            
            {page * perPage < total ? (
              <Button variant="outline" size="sm" asChild>
                <a href={`/projects?${new URLSearchParams({ ...(status ? { status } : {}), ...(q ? { q } : {}), page: String(page + 1), ...(perPageParam ? { perPage: String(perPageParam) } : {}), sort, order }).toString()}`}>
                  Next
                </a>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-[var(--text-secondary)]">Per page:</span>
            {[6,12,24].map((n) => (
              <Badge
                key={n}
                variant={perPage === n ? 'default' : 'outline'}
              >
                <a href={`/projects?${new URLSearchParams({ ...(status ? { status } : {}), ...(q ? { q } : {}), page: '1', perPage: String(n), sort, order }).toString()}`}>
                  {n}
                </a>
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}


