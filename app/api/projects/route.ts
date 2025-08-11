import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
// z schema imported in lib/validation
import { projectCreateSchema } from '../../../lib/validation'
// eq imported elsewhere when using drizzle builder
import { neon, neonConfig } from '@neondatabase/serverless'
import { jsonError } from '../../../lib/errors'
import { createAudit } from '../../../lib/audit'

export const runtime = 'nodejs'

// legacy schema kept for reference; validation uses projectCreateSchema

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    if (!tenantId) return Response.json({ projects: [] })

    const urlObj = new URL(req.url)
    const search = urlObj.searchParams.get('q')?.toLowerCase()
    const statusFilter = urlObj.searchParams.get('status') ?? undefined
    const sort = (urlObj.searchParams.get('sort') ?? 'createdAt') as 'createdAt' | 'name' | 'status'
    const order = (urlObj.searchParams.get('order') ?? 'desc') as 'asc' | 'desc'
    const page = Math.max(parseInt(urlObj.searchParams.get('page') || '1', 10), 1)
    const perPage = Math.min(Math.max(parseInt(urlObj.searchParams.get('perPage') || '12', 10), 1), 100)
    const offset = (page - 1) * perPage

    const trySelect = async (url: string | undefined) => {
      if (!url) throw new Error('DATABASE_URL not set')
      ;(neonConfig as unknown as { fetchTimeout?: number }).fetchTimeout = 30000
      const sql = neon(url)
      type DbRow = {
        id: string
        name: string
        description: string | null
        status: string
        tenant_id: string
        created_at: string
        updated_at: string
      }
      const orderBy =
        sort === 'name'
          ? sql`${order === 'asc' ? sql`name asc` : sql`name desc`}`
          : sort === 'status'
          ? sql`${order === 'asc' ? sql`status asc` : sql`status desc`}`
          : sql`${order === 'asc' ? sql`created_at asc` : sql`created_at desc`}`
      const rows = (await sql`
        select id, name, description, status, tenant_id, created_at, updated_at
        from projects
        where tenant_id = ${tenantId}
        ${statusFilter ? sql`and status = ${statusFilter}` : sql``}
        order by ${orderBy}
        limit ${perPage} offset ${offset}
      `) as unknown as DbRow[]
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        status: r.status,
        tenantId: r.tenant_id,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }))
    }

    const preferUnpooled = process.env.DB_USE_UNPOOLED === 'true'
    const unpooled = process.env.DATABASE_URL_UNPOOLED
    const pooled = process.env.DATABASE_URL

    let resultRaw
    try {
      resultRaw = await trySelect(preferUnpooled ? (unpooled || pooled) : pooled)
    } catch {
      resultRaw = await trySelect(preferUnpooled ? pooled : (unpooled || pooled))
    }

    const result = search
      ? resultRaw.filter((p) =>
          (p.name?.toLowerCase() ?? '').includes(search) || (p.description?.toLowerCase() ?? '').includes(search)
        )
      : resultRaw

    // Total count for pagination
    const tryCount = async (url: string | undefined) => {
      if (!url) throw new Error('DATABASE_URL not set')
      ;(neonConfig as unknown as { fetchTimeout?: number }).fetchTimeout = 30000
      const sql = neon(url)
      type CRow = { count: number }
      const rows = (await sql`
        select count(*)::int as count from projects where tenant_id = ${tenantId} ${statusFilter ? sql`and status = ${statusFilter}` : sql``}
      `) as unknown as CRow[]
      return rows[0]?.count ?? 0
    }
    let total = 0
    try {
      total = await tryCount(preferUnpooled ? (unpooled || pooled) : pooled)
    } catch {
      total = await tryCount(preferUnpooled ? pooled : (unpooled || pooled))
    }

    return Response.json({ projects: result, total, page, perPage })
  } catch (err) {
    console.error('[projects][GET] error', err)
    return jsonError(err, 'Failed to load projects')
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    
    const body = await req.json()
  const parsed = projectCreateSchema.parse(body)
    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    if (!tenantId) return Response.json({ error: 'Missing tenant' }, { status: 400 })

    const tryInsert = async (url: string | undefined) => {
      if (!url) throw new Error('DATABASE_URL not set')
      ;(neonConfig as unknown as { fetchTimeout?: number }).fetchTimeout = 30000
      const sql = neon(url)
      type DbRow = {
        id: string
        name: string
        description: string | null
        status: string
        tenant_id: string
        created_at: string
        updated_at: string
      }
      const rows = (await sql`
        insert into projects (name, description, tenant_id)
        values (${parsed.name}, ${parsed.description ?? null}, ${tenantId})
        returning id, name, description, status, tenant_id, created_at, updated_at
      `) as unknown as DbRow[]
      return rows[0]
    }

    const preferUnpooled = process.env.DB_USE_UNPOOLED === 'true'
    const unpooled = process.env.DATABASE_URL_UNPOOLED
    const pooled = process.env.DATABASE_URL

    try {
      const row = await tryInsert(preferUnpooled ? (unpooled || pooled) : pooled)
      try {
        const userId = (session.user as unknown as { id?: string }).id || 'unknown'
        await createAudit(tenantId, userId, 'project', row.id, 'create')
      } catch {}
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
      try {
        const userId = (session.user as unknown as { id?: string }).id || 'unknown'
        await createAudit(tenantId, userId, 'project', row.id, 'create')
      } catch {}
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
    return jsonError(err, 'Failed to create project')
  }
}


