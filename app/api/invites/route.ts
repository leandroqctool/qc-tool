import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { z } from 'zod'
import { enforceRateLimit } from '../../../lib/rateLimit'
import { getDb } from '../../../lib/db'
import { users } from '../../../drizzle/schema'
import { createAudit } from '../../../lib/audit'

export const runtime = 'nodejs'

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['TENANT_ADMIN','QC_MANAGER','QC_OPERATOR','CLIENT_MANAGER']),
})

// Minimal invite: directly create inactive user with temp password hash placeholder (for MVP, avoid email send)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as unknown as { role?: string }).role || ''
  const allowed = ['TENANT_ADMIN', 'SUPER_ADMIN']
  if (!allowed.includes(role)) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
  if (!tenantId) return Response.json({ error: 'Missing tenant' }, { status: 400 })
  const body = await req.json()
  const data = inviteSchema.parse(body)
  // Basic IP-based rate limit for invites
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
  const key = `invite:${tenantId}:${ip}`
  const { ok, resetAt } = enforceRateLimit(key, 5, 10 * 60 * 1000)
  if (!ok) return Response.json({ error: 'Rate limit exceeded', resetAt }, { status: 429 })

  // For MVP, we prevent duplicate emails; relies on unique constraint migration
  try {
    const db = getDb()
    const tempPassword = 'TEMP-RESET-REQUIRED'
    const created = await db
      .insert(users)
      .values({ email: data.email, passwordHash: tempPassword, role: data.role, tenantId })
      .returning()
    try {
      const userId = (session.user as unknown as { id?: string }).id || 'unknown'
      await createAudit(tenantId, userId, 'user', created[0].id as unknown as string, 'invite')
    } catch {}
    return Response.json({ user: created[0] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to invite user'
    return Response.json({ error: message }, { status: 500 })
  }
}


