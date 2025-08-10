import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { z } from 'zod'
import { getDb } from '../../../../lib/db'

export const runtime = 'nodejs'

const schema = z.object({
  key: z.string().min(1),
  originalName: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().nonnegative(),
  projectId: z.string().uuid().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { key, originalName, contentType, size, projectId } = schema.parse(body)

    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId ?? '00000000-0000-0000-0000-000000000000'
    type SessionUserExt = { id?: string }
    const uploadedBy = (session.user as unknown as SessionUserExt).id ?? null

    const publicBase = process.env.R2_PUBLIC_BASE_URL
    const fileUrl = publicBase ? `${publicBase}/${key}` : key

    const db = getDb()
    const { files } = db.schema
    
    const result = await db.insert(files).values({
      key,
      originalName,
      size: String(size),  // Schema expects string
      mimeType: contentType,
      url: fileUrl,
      status: 'COMPLETED',
      tenantId,
      projectId: projectId || null,
      uploadedBy,
    }).returning()
    return Response.json({ file: result[0] })
  } catch (err) {
    console.error('[files][confirm] error', err)
    const message = err instanceof Error ? err.message : 'Failed to save file'
    return Response.json({ error: message }, { status: 500 })
  }
}


