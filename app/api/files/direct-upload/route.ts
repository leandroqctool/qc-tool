import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { getR2Client } from '../../../../lib/r2'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getDb } from '../../../../lib/db'
import { files as filesTable } from '../../../../drizzle/schema'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const form = await req.formData()
    const file = form.get('file') as File | null
    const projectId = (form.get('projectId') as string) || undefined
    if (!file) return Response.json({ error: 'Missing file' }, { status: 400 })

    const bucket = process.env.R2_BUCKET
    if (!bucket) return Response.json({ error: 'R2_BUCKET not set' }, { status: 500 })

    const key = `${Date.now()}-${file.name}`
    const client = getR2Client()

    const arrayBuffer = await file.arrayBuffer()
    const body = Buffer.from(arrayBuffer)

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: file.type || 'application/octet-stream',
      })
    )

    // Best-effort DB metadata save
    try {
      const db = getDb()
      const tenantId = (session.user as unknown as { tenantId?: string }).tenantId ?? '00000000-0000-0000-0000-000000000000'
      type SessionUserExt = { id?: string }
      const uploadedBy = (session.user as unknown as SessionUserExt).id ?? null
      await db.insert(filesTable).values({
        key,
        originalName: file.name,
        size: String(file.size),
        mimeType: file.type || 'application/octet-stream',
        url: process.env.R2_PUBLIC_BASE_URL ? `${process.env.R2_PUBLIC_BASE_URL}/${key}` : `${bucket}/${key}`,
        tenantId,
        projectId: projectId ?? null,
        uploadedBy,
      })
    } catch {}

    const fileRecord = {
      id: key,
      originalName: file.name,
      url: process.env.R2_PUBLIC_BASE_URL ? `${process.env.R2_PUBLIC_BASE_URL}/${key}` : `${bucket}/${key}`,
    }
    return Response.json({ fileRecord })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    return Response.json({ error: message }, { status: 500 })
  }
}


