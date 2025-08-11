import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { getDb } from '../../../../lib/db'
import { files as filesTable } from '../../../../drizzle/schema'
import { eq } from 'drizzle-orm'
import { jsonError } from '../../../../lib/errors'
import { getR2Client } from '../../../../lib/r2'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { z } from 'zod'
import { createAudit } from '../../../../lib/audit'

export const runtime = 'nodejs'

const updateSchema = z.object({
  projectId: z.string().uuid().nullable().optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'APPROVED', 'REJECTED']).optional(),
})

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    const db = getDb()
    const url = new URL(req.url)
    const segments = url.pathname.split('/')
    const id = segments[segments.indexOf('files') + 1]
    const body = await req.json()
    const data = updateSchema.parse(body)
    const rows = await db.select().from(filesTable).where(eq(filesTable.id, id))
    const exists = rows[0] as unknown as { tenantId: string } | undefined
    if (!exists) return Response.json({ error: 'Not found' }, { status: 404 })
    if (exists.tenantId !== tenantId) return Response.json({ error: 'Forbidden' }, { status: 403 })
    const updated = await db
      .update(filesTable)
      .set({ projectId: data.projectId ?? null, status: data.status })
      .where(eq(filesTable.id, id))
      .returning()
    try {
      const userId = (session.user as unknown as { id?: string }).id || 'unknown'
      await createAudit(tenantId, userId, 'file', id, 'update')
    } catch {}
    return Response.json({ file: updated[0] })
  } catch (err) {
    return jsonError(err, 'Failed to update file')
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    const db = getDb()
    const url = new URL(req.url)
    const segments = url.pathname.split('/')
    const id = segments[segments.indexOf('files') + 1]
    const rows = await db.select().from(filesTable).where(eq(filesTable.id, id))
    const row = rows[0] as unknown as {
      id: string
      key: string
      originalName: string
      size: string
      mimeType: string
      url: string
      status: string
      projectId: string | null
      tenantId: string
      uploadedBy: string | null
      createdAt: string
      updatedAt: string
    } | undefined
    if (!row) return Response.json({ error: 'Not found' }, { status: 404 })
    if (row.tenantId !== tenantId) return Response.json({ error: 'Forbidden' }, { status: 403 })
    return Response.json({ file: row })
  } catch (err) {
    return jsonError(err, 'Failed to load file')
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
    const id = segments[segments.indexOf('files') + 1]
    const rows = await db.select().from(filesTable).where(eq(filesTable.id, id))
    const row = rows[0] as unknown as {
      id: string
      key: string
      tenantId: string
    } | undefined
    if (!row) return Response.json({ error: 'Not found' }, { status: 404 })
    if (row.tenantId !== tenantId) return Response.json({ error: 'Forbidden' }, { status: 403 })

    // Delete from R2 (best-effort)
    try {
      const bucket = process.env.R2_BUCKET
      if (bucket) {
        const client = getR2Client()
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: row.key }))
      }
    } catch {}

    await db.delete(filesTable).where(eq(filesTable.id, id))
    try {
      const userId = (session.user as unknown as { id?: string }).id || 'unknown'
      await createAudit(tenantId, userId, 'file', id, 'delete')
    } catch {}
    return Response.json({ ok: true })
  } catch (err) {
    return jsonError(err, 'Failed to delete file')
  }
}


