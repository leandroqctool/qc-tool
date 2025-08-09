import { NextRequest } from 'next/server'
import { createPresignedPutUrl } from '@/lib/r2'
import { z } from 'zod'

const schema = z.object({
  filename: z.string(),
  contentType: z.string(),
  size: z.number().int().positive(),
  projectId: z.string().uuid().optional(),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { filename, contentType } = schema.parse(body)

  const bucket = process.env.R2_BUCKET
  if (!bucket) return Response.json({ error: 'R2_BUCKET not set' }, { status: 500 })

  const key = `uploads/${Date.now()}-${filename}`
  const uploadUrl = await createPresignedPutUrl({ bucket, key, contentType })
  const publicBase = process.env.R2_PUBLIC_BASE_URL
  const fileUrl = publicBase ? `${publicBase}/${key}` : key

  return Response.json({ uploadUrl, fileRecord: { id: key, originalName: filename, url: fileUrl } })
}


