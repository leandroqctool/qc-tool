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
    const { ok, resetAt } = enforceRateLimit(`export:files:${tenantId}:${ip}`, 20, 60 * 1000)
    if (!ok) return new Response(`Rate limit exceeded. Try again at ${new Date(resetAt).toISOString()}`, { status: 429 })

    const preferUnpooled = process.env.DB_USE_UNPOOLED === 'true'
    const unpooled = process.env.DATABASE_URL_UNPOOLED
    const pooled = process.env.DATABASE_URL

    const urlObj = new URL(req.url)
    const projectIdParam = urlObj.searchParams.get('projectId')
    const typeParam = urlObj.searchParams.get('type') // image | video | pdf | zip | other
    const statusParam = urlObj.searchParams.get('status')

    type Row = {
      id: string
      key: string
      original_name: string
      size: string
      mime_type: string
      url: string
      status: string
      project_id: string | null
      created_at: string
      uploaded_by: string | null
    }

    const tryQuery = async (dbUrl: string | undefined) => {
      if (!dbUrl) throw new Error('DATABASE_URL not set')
      ;(neonConfig as unknown as { fetchTimeout?: number }).fetchTimeout = 60000
      const sql = neon(dbUrl)
      const rows = (await sql`
        select id, key, original_name, size, mime_type, url, status, project_id, created_at, uploaded_by
        from files
        where tenant_id = ${tenantId}
        ${projectIdParam ? sql`and project_id = ${projectIdParam}` : sql``}
        ${typeParam === 'image' ? sql`and mime_type like 'image/%'` : sql``}
        ${typeParam === 'video' ? sql`and mime_type like 'video/%'` : sql``}
        ${typeParam === 'pdf' ? sql`and mime_type = 'application/pdf'` : sql``}
        ${typeParam === 'zip' ? sql`and mime_type = 'application/zip'` : sql``}
        ${statusParam ? sql`and status = ${statusParam}` : sql``}
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

    const header = ['id','originalName','size','mimeType','url','status','projectId','uploadedBy','createdAt']
    const lines = [header.join(',')]
    for (const r of rows) {
      const vals = [
        r.id,
        r.original_name,
        r.size,
        r.mime_type,
        r.url,
        r.status,
        r.project_id || '',
        r.uploaded_by || '',
        r.created_at,
      ]
      // Simple CSV escaping for commas and quotes
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
        'Content-Disposition': 'attachment; filename="files_export.csv"',
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Export failed'
    return new Response(`Error: ${msg}`, { status: 500 })
  }
}


