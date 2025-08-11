import { headers } from 'next/headers'

type UserRow = {
  id: string
  email: string
  role: string
}

export default async function UsersTable({ role, page: pageProp = 1, perPage: perPageProp = 20, q }: { role?: string; page?: number; perPage?: number; q?: string }) {
  const hdrs = await headers()
  const host = hdrs.get('host') || 'localhost:3000'
  const cookie = hdrs.get('cookie') || ''
  const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const params = new URLSearchParams({ ...(role ? { role } : {}), page: String(pageProp), perPage: String(perPageProp), ...(q ? { q } : {}) })
  const url = `${proto}://${host}/api/users${params.toString() ? `?${params.toString()}` : ''}`
  let rows: Array<UserRow> = []
  let total = 0
  let page = pageProp
  let perPage = perPageProp
  try {
    const res = await fetch(url, { cache: 'no-store', headers: { cookie } })
    if (res.ok) {
      const data = (await res.json()) as { users: Array<UserRow>; total?: number; page?: number; perPage?: number }
      rows = data.users ?? []
      total = data.total ?? rows.length
      page = data.page ?? page
      perPage = data.perPage ?? perPage
    }
  } catch {
    rows = []
  }
  return (
    <div className="rounded-2xl bg-white shadow-sm p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">Users</h3>
        <InviteUserButton />
      </div>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Role</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="py-2 pr-4">{u.email}</td>
                <td className="py-2 pr-4">
                  <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100">{u.role.replace('_',' ')}</span>
                </td>
                <td className="py-2 pr-4"><ChangeUserRole userId={u.id} currentRole={u.role} /></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={2} className="py-4 text-gray-500">No users</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="flex justify-between items-center mt-3">
          <div className="text-xs text-gray-500">Total: {total}</div>
          <div className="flex justify-center gap-2">
            {page > 1 ? (
              <a href={`/users?${new URLSearchParams({ ...(role ? { role } : {}), page: String(page - 1), perPage: String(perPage), ...(q ? { q } : {}) }).toString()}`} className="px-3 py-1 rounded border border-gray-300 text-sm">Prev</a>
            ) : (
              <span className="px-3 py-1 rounded border border-gray-200 text-sm text-gray-400" aria-disabled>Prev</span>
            )}
            {page * perPage < total ? (
              <a href={`/users?${new URLSearchParams({ ...(role ? { role } : {}), page: String(page + 1), perPage: String(perPage), ...(q ? { q } : {}) }).toString()}`} className="px-3 py-1 rounded border border-gray-300 text-sm">Next</a>
            ) : (
              <span className="px-3 py-1 rounded border border-gray-200 text-sm text-gray-400" aria-disabled>Next</span>
            )}
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <span>Per page:</span>
            {[10,20,50].map((n) => (
              <a key={n} href={`/users?${new URLSearchParams({ ...(role ? { role } : {}), page: '1', perPage: String(n), ...(q ? { q } : {}) }).toString()}`} className={`px-2 py-0.5 rounded ${perPage === n ? 'bg-gray-100' : 'hover:bg-gray-50'}`}>{n}</a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function InviteUserButton() {
  return (
    <form
      action={async (formData) => {
        'use server'
        const email = String(formData.get('email') || '')
        const role = String(formData.get('role') || 'TENANT')
        if (!email) return
        await fetch('/api/invites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, role }),
        })
      }}
      className="flex items-center gap-2"
    >
      <input name="email" type="email" placeholder="Invite email" className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D99FF]" />
      <select name="role" className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
        <option value="TENANT_ADMIN">Tenant Admin</option>
        <option value="QC_MANAGER">QC Manager</option>
        <option value="QC_OPERATOR">QC Operator</option>
        <option value="CLIENT_MANAGER">Client Manager</option>
      </select>
      <button className="px-3 py-1.5 rounded-lg bg-[#0D99FF] text-white text-sm">Invite</button>
    </form>
  )
}

function ChangeUserRole({ userId, currentRole }: { userId: string; currentRole: string }) {
  return (
    <form
      action={async (formData) => {
        'use server'
        const role = String(formData.get('role') || '')
        if (!role) return
        await fetch(`/api/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        })
      }}
      className="flex items-center gap-2"
    >
      <select name="role" defaultValue={currentRole} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
        <option value="TENANT_ADMIN">Tenant Admin</option>
        <option value="QC_MANAGER">QC Manager</option>
        <option value="QC_OPERATOR">QC Operator</option>
        <option value="CLIENT_MANAGER">Client Manager</option>
      </select>
      <button className="px-3 py-1.5 rounded-lg bg-[#0D99FF] text-white text-sm">Save</button>
    </form>
  )
}


