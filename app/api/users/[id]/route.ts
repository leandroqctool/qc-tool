import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { getDb } from '../../../../lib/db'
import { users } from '../../../../drizzle/schema'
import { eq } from 'drizzle-orm'
import { jsonError } from '../../../../lib/errors'
import { z } from 'zod'
import { enforceRateLimit } from '../../../../lib/rateLimit'
import { createAudit } from '../../../../lib/audit'

export const runtime = 'nodejs'

const updateSchema = z.object({
  role: z.enum(['TENANT_ADMIN','QC_MANAGER','QC_OPERATOR','CLIENT_MANAGER']),
})

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const ip = (req.headers as unknown as { get: (h: string) => string | null }).get('x-forwarded-for') || '127.0.0.1'
    const actorRole = (session.user as unknown as { role?: string }).role || ''
    const allowed = ['TENANT_ADMIN','SUPER_ADMIN']
    if (!allowed.includes(actorRole)) return Response.json({ error: 'Forbidden' }, { status: 403 })
    const { ok, resetAt } = enforceRateLimit(`user-role-change:${ip}`, 20, 10 * 60 * 1000)
    if (!ok) return Response.json({ error: 'Rate limit exceeded', resetAt }, { status: 429 })
    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    const db = getDb()
    const url = new URL(req.url)
    const segments = url.pathname.split('/')
    const id = segments[segments.indexOf('users') + 1]
    const body = await req.json()
    const data = updateSchema.parse(body)
    // ensure target user belongs to same tenant
    const rows = await db.select().from(users).where(eq(users.id, id))
    const target = rows[0] as unknown as { tenantId: string } | undefined
    if (!target) return Response.json({ error: 'Not found' }, { status: 404 })
    if (target.tenantId !== tenantId) return Response.json({ error: 'Forbidden' }, { status: 403 })
    const updated = await db.update(users).set({ role: data.role }).where(eq(users.id, id)).returning()
    try {
      const userId = (session.user as unknown as { id?: string }).id || 'unknown'
      await createAudit(tenantId!, userId, 'user', id, 'update')
    } catch {}
    return Response.json({ user: updated[0] })
  } catch (err) {
    return jsonError(err, 'Failed to update user')
  }
}


