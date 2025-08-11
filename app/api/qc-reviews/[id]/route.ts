import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { getDb } from '../../../../lib/db'
import { qcReviews } from '../../../../drizzle/schema'
import { jsonError } from '../../../../lib/errors'
import { createAudit } from '../../../../lib/audit'
import { z } from 'zod'
import { eq } from 'drizzle-orm'

export const runtime = 'nodejs'

const updateSchema = z
  .object({
    status: z.enum(['IN_QC', 'APPROVED', 'REJECTED']).optional(),
    comments: z.string().max(5000).optional(),
  })
  .refine((v) => v.status !== undefined || v.comments !== undefined, {
    message: 'At least one field must be provided',
  })

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    const db = getDb()
    const url = new URL(req.url)
    const segments = url.pathname.split('/')
    const id = segments[segments.indexOf('qc-reviews') + 1]
    const rows = await db.select().from(qcReviews).where(eq(qcReviews.id, id))
    const safe = rows[0] as unknown as { tenantId: string } | undefined
    if (!safe) return Response.json({ error: 'Not found' }, { status: 404 })
    if (safe.tenantId !== tenantId) return Response.json({ error: 'Forbidden' }, { status: 403 })
    return Response.json({ review: safe })
  } catch (err) {
    return jsonError(err, 'Failed to load review')
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    const db = getDb()
    const url = new URL(req.url)
    const segments = url.pathname.split('/')
    const id = segments[segments.indexOf('qc-reviews') + 1]
    const body = await req.json()
    const data = updateSchema.parse(body)
    const updated = await db.update(qcReviews).set({ ...data }).where(eq(qcReviews.id, id)).returning()
    const safe = updated[0] as unknown as { tenantId: string } | undefined
    if (!safe) return Response.json({ error: 'Not found' }, { status: 404 })
    if (safe.tenantId !== tenantId) return Response.json({ error: 'Forbidden' }, { status: 403 })
    try {
      const userId = (session.user as unknown as { id?: string }).id || 'unknown'
      await createAudit(tenantId, userId, 'qc_review', id, 'update')
    } catch {}
    return Response.json({ review: updated[0] })
  } catch (err) {
    return jsonError(err, 'Failed to update review')
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    const db = getDb()
    const url = new URL(req.url)
    const segments = url.pathname.split('/')
    const id = segments[segments.indexOf('qc-reviews') + 1]
    // fetch to verify tenant ownership first
    const rows = await db.select().from(qcReviews).where(eq(qcReviews.id, id))
    const safe = rows[0] as unknown as { tenantId: string } | undefined
    if (!safe) return Response.json({ error: 'Not found' }, { status: 404 })
    if (safe.tenantId !== tenantId) return Response.json({ error: 'Forbidden' }, { status: 403 })
    await db.delete(qcReviews).where(eq(qcReviews.id, id))
    return Response.json({ ok: true })
  } catch (err) {
    return jsonError(err, 'Failed to delete review')
  }
}


