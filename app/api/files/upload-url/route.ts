import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { createPresignedPutUrl } from '../../../../lib/r2'
import { jsonError } from '../../../../lib/errors'
import { enforceRateLimit } from '../../../../lib/rateLimit'
// (DB save deferred to /api/files/confirm)
import { z } from 'zod'

const schema = z.object({
  filename: z.string(),
  contentType: z.string(),
  size: z.number().int().positive(),
  projectId: z.string().uuid().optional(),
})

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId || 'unknown'
    const { ok, resetAt } = enforceRateLimit(`presign:${tenantId}:${ip}`, 100, 60 * 1000)
    if (!ok) return Response.json({ error: 'Rate limit exceeded', resetAt }, { status: 429 })
    const body = await req.json()
    const { filename, contentType } = schema.parse(body)

    const bucket = process.env.R2_BUCKET
    if (!bucket) return Response.json({ error: 'R2_BUCKET not set' }, { status: 500 })

    // Use path-style URLs → final path will be /<bucket>/<key>
    // So the key should NOT include the bucket/prefix
    const key = `${Date.now()}-${filename}`
    const uploadUrl = await createPresignedPutUrl({ bucket, key, contentType })
    const publicBase = process.env.R2_PUBLIC_BASE_URL
    const fileUrl = publicBase ? `${publicBase}/${key}` : `${bucket}/${key}`

  // Persist file metadata
    // Defer DB write to a separate endpoint to avoid blocking on DB latency
    return Response.json({ uploadUrl, fileRecord: { id: key, originalName: filename, url: fileUrl } })
  } catch (err) {
    console.error('[files][upload-url] error', err)
    return jsonError(err, 'Failed to create upload URL')
  }
}


