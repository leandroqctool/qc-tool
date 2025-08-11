import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { neon, neonConfig } from '@neondatabase/serverless'
import dns from 'node:dns'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    
    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    if (!tenantId) return Response.json({ files: [] })

    const tryQuery = async (url: string | undefined) => {
      if (!url) throw new Error('DATABASE_URL not set')
      // Prefer IPv4 to avoid DNS v6 timeouts in local/dev and extend timeout for large result sets
      try {
        (dns as unknown as { setDefaultResultOrder?: (order: string) => void }).setDefaultResultOrder?.('ipv4first')
      } catch {}
      ;(neonConfig as unknown as { fetchTimeout?: number }).fetchTimeout = 60000
      const sql = neon(url)
      type DbRow = {
        id: string
        key: string
        original_name: string
        size: string
        mime_type: string
        url: string
        status: string
        project_id: string | null
        tenant_id: string
        uploaded_by: string | null
        created_at: string
        updated_at: string
      }
      const urlObj = new URL(req.url)
      const projectIdParam = urlObj.searchParams.get('projectId')
      const typeParam = urlObj.searchParams.get('type') // image | video | pdf | zip | other
      const statusParam = urlObj.searchParams.get('status')
      const qParam = urlObj.searchParams.get('q')
      const page = Math.max(parseInt(urlObj.searchParams.get('page') || '1', 10), 1)
      const perPage = Math.min(Math.max(parseInt(urlObj.searchParams.get('perPage') || '20', 10), 1), 200)
      const offset = (page - 1) * perPage
      const sort = (urlObj.searchParams.get('sort') || 'createdAt').toLowerCase()
      const order = (urlObj.searchParams.get('order') || 'desc').toLowerCase()
      const sortExpr =
        sort === 'name' ? sql`original_name` :
        sort === 'type' ? sql`mime_type` :
        sort === 'size' ? sql`size` :
        sql`created_at`
      const orderAsc = order === 'asc'
      const rows = (await sql`
        select id, key, original_name, size, mime_type, url, status, project_id, tenant_id, uploaded_by, created_at, updated_at
        from files
        where tenant_id = ${tenantId}
        ${projectIdParam ? sql`and project_id = ${projectIdParam}` : sql``}
        ${qParam ? sql`and original_name ilike ${'%' + qParam + '%'}` : sql``}
        ${typeParam === 'image' ? sql`and mime_type like 'image/%'` : sql``}
        ${typeParam === 'video' ? sql`and mime_type like 'video/%'` : sql``}
        ${typeParam === 'pdf' ? sql`and mime_type = 'application/pdf'` : sql``}
        ${typeParam === 'zip' ? sql`and mime_type = 'application/zip'` : sql``}
        ${statusParam ? sql`and status = ${statusParam}` : sql``}
        order by ${sortExpr} ${orderAsc ? sql`asc` : sql`desc`}
        limit ${perPage} offset ${offset}
      `) as unknown as DbRow[]
      const countRows = (await sql`
        select count(*)::int as count
        from files
        where tenant_id = ${tenantId}
        ${projectIdParam ? sql`and project_id = ${projectIdParam}` : sql``}
        ${qParam ? sql`and original_name ilike ${'%' + qParam + '%'}` : sql``}
        ${typeParam === 'image' ? sql`and mime_type like 'image/%'` : sql``}
        ${typeParam === 'video' ? sql`and mime_type like 'video/%'` : sql``}
        ${typeParam === 'pdf' ? sql`and mime_type = 'application/pdf'` : sql``}
        ${typeParam === 'zip' ? sql`and mime_type = 'application/zip'` : sql``}
        ${statusParam ? sql`and status = ${statusParam}` : sql``}
      `) as unknown as Array<{ count: number }>
      const total = countRows[0]?.count ?? 0
      return {
        rows: rows.map(r => ({
        id: r.id,
        key: r.key,
        originalName: r.original_name,
        size: r.size,
        mimeType: r.mime_type,
        url: r.url,
        status: r.status,
        projectId: r.project_id,
        tenantId: r.tenant_id,
        uploadedBy: r.uploaded_by,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        })),
        total,
      }
    }

    // Prefer unpooled locally, with fallback to pooled
    const preferUnpooled = process.env.DB_USE_UNPOOLED === 'true'
    const unpooled = process.env.DATABASE_URL_UNPOOLED
    const pooled = process.env.DATABASE_URL

    try {
      const { rows, total } = await tryQuery(preferUnpooled ? (unpooled || pooled) : pooled)
      const urlObj = new URL(req.url)
      const page = Math.max(parseInt(urlObj.searchParams.get('page') || '1', 10), 1)
      const perPage = Math.min(Math.max(parseInt(urlObj.searchParams.get('perPage') || '20', 10), 1), 200)
      return Response.json({ files: rows, total, page, perPage })
    } catch {
      // Retry once with the other URL; if still failing, switch preference for next call
      const { rows, total } = await tryQuery(preferUnpooled ? pooled : (unpooled || pooled))
      const urlObj = new URL(req.url)
      const page = Math.max(parseInt(urlObj.searchParams.get('page') || '1', 10), 1)
      const perPage = Math.min(Math.max(parseInt(urlObj.searchParams.get('perPage') || '20', 10), 1), 200)
      return Response.json({ files: rows, total, page, perPage })
    }
  } catch (err) {
    console.error('[files][list] error', err)
    const message = err instanceof Error ? err.message : 'Failed to load files'
    return Response.json({ error: message }, { status: 500 })
  }
}


