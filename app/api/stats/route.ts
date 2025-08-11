import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { neon, neonConfig } from '@neondatabase/serverless'

// Simple in-memory cache per-tenant with short TTL to reduce DB hits on dashboard
type Counts = { projects: number; files: number; inQc: number }
const cache = new Map<string, { data: Counts; expiresAt: number }>()
const TTL_MS = 30_000

export const runtime = 'nodejs'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    if (!tenantId) return Response.json({ projects: 0, files: 0, inQc: 0 })

    // Serve from cache when fresh
    const now = Date.now()
    const cached = cache.get(tenantId)
    if (cached && cached.expiresAt > now) {
      return Response.json(cached.data, { headers: { 'Cache-Control': 'private, max-age=15' } })
    }

    const preferUnpooled = process.env.DB_USE_UNPOOLED === 'true'
    const unpooled = process.env.DATABASE_URL_UNPOOLED
    const pooled = process.env.DATABASE_URL

    const tryCounts = async (url: string | undefined) => {
      if (!url) throw new Error('DATABASE_URL not set')
      ;(neonConfig as unknown as { fetchTimeout?: number }).fetchTimeout = 30000
      const sql = neon(url)
      const [{ count: projects } = { count: 0 }] = (await sql`select count(*)::int as count from projects where tenant_id = ${tenantId}`) as unknown as Array<{ count: number }>
      const [{ count: files } = { count: 0 }] = (await sql`select count(*)::int as count from files where tenant_id = ${tenantId}`) as unknown as Array<{ count: number }>
      const [{ count: inQc } = { count: 0 }] = (await sql`select count(*)::int as count from qc_reviews where tenant_id = ${tenantId} and status = 'IN_QC'`) as unknown as Array<{ count: number }>
      return { projects, files, inQc }
    }

    try {
      const counts = await tryCounts(preferUnpooled ? (unpooled || pooled) : pooled)
      cache.set(tenantId, { data: counts, expiresAt: now + TTL_MS })
      return Response.json(counts, { headers: { 'Cache-Control': 'private, max-age=15' } })
    } catch {
      const counts = await tryCounts(preferUnpooled ? pooled : (unpooled || pooled))
      cache.set(tenantId, { data: counts, expiresAt: now + TTL_MS })
      return Response.json(counts, { headers: { 'Cache-Control': 'private, max-age=15' } })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load stats'
    return Response.json({ error: message }, { status: 500 })
  }
}


