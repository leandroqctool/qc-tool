import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { getDb } from '../../../lib/db'
import { auditLogs } from '../../../drizzle/schema'
import { and, desc, eq, sql } from 'drizzle-orm'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as unknown as { role?: string }).role || ''
  // Restrict to admins/managers
  const allowed = ['TENANT_ADMIN', 'QC_MANAGER', 'SUPER_ADMIN']
  if (!allowed.includes(role)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
  if (!tenantId) return Response.json({ logs: [] })

  const url = new URL(req.url)
  const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10), 1)
  const perPage = Math.min(Math.max(parseInt(url.searchParams.get('perPage') || '50', 10), 1), 200)
  const offset = (page - 1) * perPage
  const action = url.searchParams.get('action') || undefined
  const userIdFilter = url.searchParams.get('userId') || undefined

  try {
    const db = getDb()
    const base = eq(auditLogs.tenantId, tenantId)
    const withAction = action ? and(base, eq(auditLogs.action, action)) : base
    const whereExpr = userIdFilter ? and(withAction, eq(auditLogs.userId, userIdFilter)) : withAction
    const rows = await db
      .select()
      .from(auditLogs)
      .where(whereExpr)
      .orderBy(desc(auditLogs.createdAt))
      .limit(perPage)
      .offset(offset)
    const totalRows = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(auditLogs)
      .where(whereExpr)
    const total = totalRows[0]?.count ?? 0
    return Response.json({ logs: rows, total, page, perPage })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load audit logs'
    return Response.json({ error: message }, { status: 500 })
  }
}


