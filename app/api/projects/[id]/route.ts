// no NextRequest needed
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { getDb } from '../../../../lib/db'
import { projects } from '../../../../drizzle/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

export const runtime = 'nodejs'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().max(1000).optional(),
  status: z.string().optional(),
})

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getDb()
  const body = await req.json()
  const data = updateSchema.parse(body)
  const url = new URL(req.url)
  const segments = url.pathname.split('/')
  const id = segments[segments.indexOf('projects') + 1]
  const updated = await db.update(projects).set({ ...data }).where(eq(projects.id, id)).returning()
  return Response.json({ project: updated[0] })
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getDb()
  const url = new URL(req.url)
  const segments = url.pathname.split('/')
  const id = segments[segments.indexOf('projects') + 1]
  await db.delete(projects).where(eq(projects.id, id))
  return Response.json({ ok: true })
}


