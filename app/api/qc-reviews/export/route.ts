import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { neon, neonConfig } from '@neondatabase/serverless'
import { enforceRateLimit } from '../../../../lib/rateLimit'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return new Response('Unauthorized', { status: 401 })
    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    if (!tenantId) return new Response('No tenant', { status: 400 })
    const role = (session.user as unknown as { role?: string }).role || ''
    const allowed = ['TENANT_ADMIN','QC_MANAGER','SUPER_ADMIN']
    if (!allowed.includes(role)) return new Response('Forbidden', { status: 403 })
    const ip = (req.headers as unknown as { get: (h: string) => string | null }).get('x-forwarded-for') || '127.0.0.1'
    const { ok, resetAt } = enforceRateLimit(`export:reviews:${tenantId}:${ip}`, 20, 60 * 1000)
    if (!ok) return new Response(`Rate limit exceeded. Try again at ${new Date(resetAt).toISOString()}`, { status: 429 })

    const preferUnpooled = process.env.DB_USE_UNPOOLED === 'true'
    const unpooled = process.env.DATABASE_URL_UNPOOLED
    const pooled = process.env.DATABASE_URL

    const urlObj = new URL(req.url)
    const status = urlObj.searchParams.get('status')
    const projectId = urlObj.searchParams.get('projectId')
    const fileId = urlObj.searchParams.get('fileId')

    type Row = {
      id: string
      project_id: string | null
      file_id: string | null
      status: string
      comments: string | null
      created_at: string
    }

    const tryQuery = async (dbUrl: string | undefined) => {
      if (!dbUrl) throw new Error('DATABASE_URL not set')
      ;(neonConfig as unknown as { fetchTimeout?: number }).fetchTimeout = 60000
      const sql = neon(dbUrl)
      const rows = (await sql`
        select id, project_id, file_id, status, comments, created_at
        from qc_reviews
        where tenant_id = ${tenantId}
        ${status ? sql`and status = ${status}` : sql``}
        ${projectId ? sql`and project_id = ${projectId}` : sql``}
        ${fileId ? sql`and file_id = ${fileId}` : sql``}
        order by created_at desc
      `) as unknown as Row[]
      return rows
    }

    let rows: Array<Row> = []
    try {
      rows = await tryQuery(preferUnpooled ? (unpooled || pooled) : pooled)
    } catch {
      rows = await tryQuery(preferUnpooled ? pooled : (unpooled || pooled))
    }

    const header = ['id','projectId','fileId','status','comments','createdAt']
    const lines = [header.join(',')]
    for (const r of rows) {
      const vals = [r.id, r.project_id ?? '', r.file_id ?? '', r.status, r.comments ?? '', r.created_at]
      const escaped = vals.map((v) => {
        const s = String(v ?? '')
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
      })
      lines.push(escaped.join(','))
    }

    const csv = lines.join('\n')
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="reviews_export.csv"',
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Export failed'
    return new Response(`Error: ${msg}`, { status: 500 })
  }
}


