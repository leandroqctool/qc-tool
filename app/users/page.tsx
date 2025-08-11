import UsersTable from '../../components/features/UsersTable'
import InviteUserDialog from '../../components/features/InviteUserDialog'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '../../lib/auth'
import Link from 'next/link'

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const paramsObj = await searchParams
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const role = (session.user as unknown as { role?: string }).role || ''
  if (!['TENANT_ADMIN','SUPER_ADMIN'].includes(role)) redirect('/dashboard')
  const page = parseInt(paramsObj.page || '1', 10)
  const perPage = parseInt(paramsObj.perPage || '20', 10)
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-7xl px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Users</h1>
          <InviteUserDialog />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <form action="/users" method="get" className="mr-2">
            <input name="q" defaultValue={paramsObj.q || ''} placeholder="Search email..." className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm" />
            {paramsObj.role && <input type="hidden" name="role" value={paramsObj.role} />}
          </form>
          {[['ALL','All'],['TENANT_ADMIN','Tenant Admin'],['QC_MANAGER','QC Manager'],['QC_OPERATOR','QC Operator'],['CLIENT_MANAGER','Client Manager']].map(([val,label]) => (
            <a key={val} href={val==='ALL'? '/users' : `/users?role=${val}`} className="px-3 py-1 rounded-full border border-gray-300 hover:bg-gray-50">{label}</a>
          ))}
        </div>
        <div className="flex items-center justify-end -mt-2">
          <Link href={`/api/users/export${new URLSearchParams({ ...(paramsObj.role ? { role: paramsObj.role } : {}), ...(paramsObj.q ? { q: paramsObj.q } : {}) }).toString() ? `?${new URLSearchParams({ ...(paramsObj.role ? { role: paramsObj.role } : {}), ...(paramsObj.q ? { q: paramsObj.q } : {}) }).toString()}` : ''}`} className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm hover:bg-gray-50">Export CSV</Link>
        </div>
        <UsersTable role={paramsObj.role} page={page} perPage={perPage} q={paramsObj.q} />
      </div>
    </main>
  )
}


