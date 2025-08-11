import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { getDb } from '../../../lib/db'
import { users } from '../../../drizzle/schema'
import { and, eq, sql } from 'drizzle-orm'
import { jsonError } from '../../../lib/errors'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const db = getDb()
    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    if (!tenantId) return Response.json({ users: [] })
    const urlObj = new URL(req.url)
    const role = urlObj.searchParams.get('role') || undefined
    const q = urlObj.searchParams.get('q') || undefined
    const page = Math.max(parseInt(urlObj.searchParams.get('page') || '1', 10), 1)
    const perPage = Math.min(Math.max(parseInt(urlObj.searchParams.get('perPage') || '20', 10), 1), 200)
    const offset = (page - 1) * perPage
    const base = eq(users.tenantId, tenantId)
    const withRole = role ? and(base, eq(users.role, role)) : base
    const whereExpr = q ? and(withRole, sql`email ilike ${'%' + q + '%'}`) : withRole
    const rows = await db
      .select()
      .from(users)
      .where(whereExpr)
      .limit(perPage)
      .offset(offset)
    const totalRows = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(users)
      .where(whereExpr)
    const total = totalRows[0]?.count ?? 0
    return Response.json({ users: rows, total, page, perPage })
  } catch (err) {
    return jsonError(err, 'Failed to load users')
  }
}


