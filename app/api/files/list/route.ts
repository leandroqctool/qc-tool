import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { neon, neonConfig } from '@neondatabase/serverless'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    
    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    if (!tenantId) return Response.json({ files: [] })

    const tryQuery = async (url: string | undefined) => {
      if (!url) throw new Error('DATABASE_URL not set')
      ;(neonConfig as unknown as { fetchTimeout?: number }).fetchTimeout = 30000
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
      const rows = (await sql`
        select id, key, original_name, size, mime_type, url, status, project_id, tenant_id, uploaded_by, created_at, updated_at
        from files
        where tenant_id = ${tenantId}
        order by created_at desc
      `) as unknown as DbRow[]
      // Map to camelCase expected by UI if needed
      return rows.map(r => ({
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
      }))
    }

    // Prefer unpooled locally, with fallback to pooled
    const preferUnpooled = process.env.DB_USE_UNPOOLED === 'true'
    const unpooled = process.env.DATABASE_URL_UNPOOLED
    const pooled = process.env.DATABASE_URL

    try {
      const files = await tryQuery(preferUnpooled ? (unpooled || pooled) : pooled)
      return Response.json({ files })
    } catch {
      // Retry once with the other URL
      const files = await tryQuery(preferUnpooled ? pooled : (unpooled || pooled))
      return Response.json({ files })
    }
  } catch (err) {
    console.error('[files][list] error', err)
    const message = err instanceof Error ? err.message : 'Failed to load files'
    return Response.json({ error: message }, { status: 500 })
  }
}


