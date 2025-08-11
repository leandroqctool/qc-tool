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
    const allowed = ['TENANT_ADMIN', 'QC_MANAGER', 'SUPER_ADMIN']
    if (!allowed.includes(role)) return new Response('Forbidden', { status: 403 })

    const ip = ({} as unknown as { headers: Headers }).headers?.get?.('x-forwarded-for') || '127.0.0.1'
    const { ok, resetAt } = enforceRateLimit(`export:audit:${tenantId}:${ip}`, 20, 60 * 1000)
    if (!ok) return new Response(`Rate limit exceeded. Try again at ${new Date(resetAt).toISOString()}`, { status: 429 })

    const preferUnpooled = process.env.DB_USE_UNPOOLED === 'true'
    const unpooled = process.env.DATABASE_URL_UNPOOLED
    const pooled = process.env.DATABASE_URL

    const urlObj = new URL(req.url)
    const action = urlObj.searchParams.get('action') || undefined
    const userId = urlObj.searchParams.get('userId') || undefined

    type Row = {
      id: string
      entity_type: string
      entity_id: string
      action: string
      user_id: string
      created_at: string
    }

    const tryQuery = async (dbUrl: string | undefined) => {
      if (!dbUrl) throw new Error('DATABASE_URL not set')
      ;(neonConfig as unknown as { fetchTimeout?: number }).fetchTimeout = 60000
      const sql = neon(dbUrl)
      const rows = (await sql`
        select id, entity_type, entity_id, action, user_id, created_at
        from audit_logs
        where tenant_id = ${tenantId}
        ${action ? sql`and action = ${action}` : sql``}
        ${userId ? sql`and user_id = ${userId}` : sql``}
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

    const header = ['id','entityType','entityId','action','userId','createdAt']
    const lines = [header.join(',')]
    for (const r of rows) {
      const vals = [r.id, r.entity_type, r.entity_id, r.action, r.user_id, r.created_at]
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
        'Content-Disposition': 'attachment; filename="audit_logs_export.csv"',
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Export failed'
    return new Response(`Error: ${msg}`, { status: 500 })
  }
}


