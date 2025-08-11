import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { neon, neonConfig } from '@neondatabase/serverless'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return new Response('Unauthorized', { status: 401 })
    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    if (!tenantId) return new Response('No tenant', { status: 400 })

    const preferUnpooled = process.env.DB_USE_UNPOOLED === 'true'
    const unpooled = process.env.DATABASE_URL_UNPOOLED
    const pooled = process.env.DATABASE_URL

    const urlObj = new URL(req.url)
    const role = urlObj.searchParams.get('role') || undefined

    type Row = { id: string; email: string; role: string; created_at: string }
    const tryQuery = async (dbUrl: string | undefined) => {
      if (!dbUrl) throw new Error('DATABASE_URL not set')
      ;(neonConfig as unknown as { fetchTimeout?: number }).fetchTimeout = 60000
      const sql = neon(dbUrl)
      const rows = (await sql`
        select id, email, role, created_at
        from users
        where tenant_id = ${tenantId}
        ${role ? sql`and role = ${role}` : sql``}
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

    const header = ['id','email','role','createdAt']
    const lines = [header.join(',')]
    for (const r of rows) {
      const vals = [r.id, r.email, r.role, r.created_at]
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
        'Content-Disposition': 'attachment; filename="users_export.csv"',
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Export failed'
    return new Response(`Error: ${msg}`, { status: 500 })
  }
}


