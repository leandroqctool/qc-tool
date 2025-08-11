// no NextRequest needed
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { getDb } from '../../../../lib/db'
import { projects } from '../../../../drizzle/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { createAudit } from '../../../../lib/audit'
import { jsonError } from '../../../../lib/errors'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const db = getDb()
    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    const url = new URL(req.url)
    const segments = url.pathname.split('/')
    const id = segments[segments.indexOf('projects') + 1]
    const rows = await db.select().from(projects).where(eq(projects.id, id))
    const row = rows[0] as unknown as { tenantId: string } | undefined
    if (!row) return Response.json({ error: 'Not found' }, { status: 404 })
    if (row.tenantId !== tenantId) return Response.json({ error: 'Forbidden' }, { status: 403 })
    return Response.json({ project: row })
  } catch (err) {
    return jsonError(err, 'Failed to load project')
  }
}

const updateSchema = z
  .object({
    name: z.string().min(3).max(100).optional(),
    description: z.string().max(1000).optional(),
    status: z.enum(['CREATED','IN_PROGRESS','IN_QC','COMPLETED','ARCHIVED']).optional(),
  })
  .refine((v) => v.name !== undefined || v.description !== undefined || v.status !== undefined, {
    message: 'At least one field must be provided',
  })

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const db = getDb()
    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    const body = await req.json()
    const data = updateSchema.parse(body)
    const url = new URL(req.url)
    const segments = url.pathname.split('/')
    const id = segments[segments.indexOf('projects') + 1]
    const updated = await db
      .update(projects)
      .set({ ...data })
      .where(eq(projects.id, id))
      .returning()
    const safe = updated[0] as unknown as { tenantId: string } | undefined
    if (!safe) return Response.json({ error: 'Not found' }, { status: 404 })
    if (safe.tenantId !== tenantId) return Response.json({ error: 'Forbidden' }, { status: 403 })
    try {
      const userId = (session.user as unknown as { id?: string }).id || 'unknown'
      await createAudit(tenantId!, userId, 'project', id, 'update')
    } catch {}
    return Response.json({ project: updated[0] })
  } catch (err) {
    return jsonError(err, 'Failed to update project')
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const db = getDb()
    const url = new URL(req.url)
    const segments = url.pathname.split('/')
    const id = segments[segments.indexOf('projects') + 1]
    await db.delete(projects).where(eq(projects.id, id))
    return Response.json({ ok: true })
  } catch (err) {
    return jsonError(err, 'Failed to delete project')
  }
}


