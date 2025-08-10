import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { z } from 'zod'
import { eq, desc } from 'drizzle-orm'
import { getDb } from '../../../lib/db'
import { neon, neonConfig } from '@neondatabase/serverless'

export const runtime = 'nodejs'

const createProjectSchema = z.object({
  name: z.string().min(3),
  description: z.string().max(1000).optional(),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    
    const db = getDb()
    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    if (!tenantId) return Response.json({ projects: [] })
    
    const { projects } = db.schema
    const result = await db
      .select()
      .from(projects)
      .where(eq(projects.tenantId, tenantId))
      .orderBy(desc(projects.createdAt))
    
    return Response.json({ projects: result })
  } catch (err) {
    console.error('[projects][GET] error', err)
    const message = err instanceof Error ? err.message : 'Failed to load projects'
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    
    const body = await req.json()
    const parsed = createProjectSchema.parse(body)
    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    if (!tenantId) return Response.json({ error: 'Missing tenant' }, { status: 400 })

    const tryInsert = async (url: string | undefined) => {
      if (!url) throw new Error('DATABASE_URL not set')
      ;(neonConfig as unknown as { fetchTimeout?: number }).fetchTimeout = 30000
      const sql = neon(url)
      const rows = await sql<{
        id: string
        name: string
        description: string | null
        status: string
        tenant_id: string
        created_at: string
        updated_at: string
      }[]>`
        insert into projects (name, description, tenant_id)
        values (${parsed.name}, ${parsed.description ?? null}, ${tenantId})
        returning id, name, description, status, tenant_id, created_at, updated_at
      `
      return rows[0]
    }

    const preferUnpooled = process.env.DB_USE_UNPOOLED === 'true'
    const unpooled = process.env.DATABASE_URL_UNPOOLED
    const pooled = process.env.DATABASE_URL

    try {
      const row = await tryInsert(preferUnpooled ? (unpooled || pooled) : pooled)
      return Response.json({ project: {
        id: row.id,
        name: row.name,
        description: row.description,
        status: row.status,
        tenantId: row.tenant_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      } })
    } catch {
      const row = await tryInsert(preferUnpooled ? pooled : (unpooled || pooled))
      return Response.json({ project: {
        id: row.id,
        name: row.name,
        description: row.description,
        status: row.status,
        tenantId: row.tenant_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      } })
    }
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'errors' in (err as Record<string, unknown>)) {
      return Response.json({ error: 'Invalid input' }, { status: 400 })
    }
    console.error('[projects][POST] error', err)
    const message = err instanceof Error ? err.message : 'Failed to create project'
    return Response.json({ error: message }, { status: 500 })
  }
}


