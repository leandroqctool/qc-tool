import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { reviewCreateSchema } from '../../../lib/validation'
import { jsonError } from '../../../lib/errors'
import { neon, neonConfig } from '@neondatabase/serverless'
import { createAudit } from '../../../lib/audit'
import { enforceRateLimit } from '../../../lib/rateLimit'
import { getDb } from '../../../lib/db'
import { qcReviews } from '../../../drizzle/schema'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const tenantIdFromSession = (session.user as unknown as { tenantId?: string }).tenantId || 'unknown'
    const { ok, resetAt } = enforceRateLimit(`review:${tenantIdFromSession}:${ip}`, 60, 60 * 1000)
    if (!ok) return Response.json({ error: 'Rate limit exceeded', resetAt }, { status: 429 })
    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    if (!tenantId) return Response.json({ reviews: [] })

    const url = new URL(req.url)
    const projectId = url.searchParams.get('projectId')
    const fileId = url.searchParams.get('fileId')
    const status = url.searchParams.get('status')
    const sort = (url.searchParams.get('sort') || 'createdAt') as 'createdAt' | 'status'
    const order = (url.searchParams.get('order') || 'desc') as 'asc' | 'desc'
    const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10), 1)
    const perPage = Math.min(Math.max(parseInt(url.searchParams.get('perPage') || '20', 10), 1), 200)
    const offset = (page - 1) * perPage

    const tryQuery = async (dbUrl: string | undefined) => {
      if (!dbUrl) throw new Error('DATABASE_URL not set')
      ;(neonConfig as unknown as { fetchTimeout?: number }).fetchTimeout = 30000
      const sql = neon(dbUrl)
      type Row = {
        id: string
        project_id: string | null
        file_id: string | null
        status: string
        comments: string | null
        reviewer_id: string | null
        tenant_id: string
        created_at: string
        updated_at: string
      }
      const orderBy =
        sort === 'status'
          ? sql`${order === 'asc' ? sql`status asc` : sql`status desc`}`
          : sql`${order === 'asc' ? sql`created_at asc` : sql`created_at desc`}`
      const rows = (await sql`
        select id, project_id, file_id, status, comments, reviewer_id, tenant_id, created_at, updated_at
        from qc_reviews
        where tenant_id = ${tenantId}
        ${projectId ? sql`and project_id = ${projectId}` : sql``}
        ${fileId ? sql`and file_id = ${fileId}` : sql``}
        ${status ? sql`and status = ${status}` : sql``}
        order by ${orderBy}
        limit ${perPage} offset ${offset}
      `) as unknown as Row[]
      const countRows = (await sql`
        select count(*)::int as count
        from qc_reviews
        where tenant_id = ${tenantId}
        ${projectId ? sql`and project_id = ${projectId}` : sql``}
        ${fileId ? sql`and file_id = ${fileId}` : sql``}
        ${status ? sql`and status = ${status}` : sql``}
      `) as unknown as Array<{ count: number }>
      const total = countRows[0]?.count ?? 0
      return {
        rows: rows.map(r => ({
          id: r.id,
          projectId: r.project_id,
          fileId: r.file_id,
          status: r.status,
          comments: r.comments,
          reviewerId: r.reviewer_id,
          tenantId: r.tenant_id,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        })),
        total,
      }
    }

    const preferUnpooled = process.env.DB_USE_UNPOOLED === 'true'
    const unpooled = process.env.DATABASE_URL_UNPOOLED
    const pooled = process.env.DATABASE_URL
    try {
      const { rows, total } = await tryQuery(preferUnpooled ? (unpooled || pooled) : pooled)
      return Response.json({ reviews: rows, total, page, perPage })
    } catch {
      const { rows, total } = await tryQuery(preferUnpooled ? pooled : (unpooled || pooled))
      return Response.json({ reviews: rows, total, page, perPage })
    }
  } catch (err) {
    return jsonError(err, 'Failed to load reviews')
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const tenantIdForRate = (session.user as unknown as { tenantId?: string }).tenantId || 'unknown'
    const limited = enforceRateLimit(`review:create:${tenantIdForRate}:${ip}`, 30, 60 * 1000)
    if (!limited.ok) return Response.json({ error: 'Rate limit exceeded', resetAt: limited.resetAt }, { status: 429 })
    const db = getDb()
    const json = await req.json()
    const body = reviewCreateSchema.parse(json)
    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    type Reviewer = { id?: string }
    const reviewerId = (session.user as unknown as Reviewer).id ?? null
    type ReviewInsert = typeof qcReviews.$inferInsert
    const toInsert: ReviewInsert = {
      projectId: body.projectId ?? null,
      fileId: body.fileId ?? null,
      stage: 'QC', // Default stage
      action: 'APPROVE', // Default action
      status: (body.status as ReviewInsert['status']) ?? 'PENDING',
      comments: body.comments ?? null,
      reviewerId: reviewerId as ReviewInsert['reviewerId'],
      tenantId: tenantId as ReviewInsert['tenantId'],
    }
    const inserted = await db.insert(qcReviews).values(toInsert).returning()
    try {
      const userId = (session.user as unknown as { id?: string }).id || 'unknown'
      await createAudit(tenantId!, userId, 'qc_review', inserted[0].id as unknown as string, 'create')
    } catch {}
    return Response.json({ review: inserted[0] })
  } catch (err) {
    return jsonError(err, 'Failed to create review')
  }
}


