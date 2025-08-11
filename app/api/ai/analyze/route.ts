import { getServerSession } from 'next-auth'
import { NextRequest } from 'next/server'
import { authOptions } from '../../../../lib/auth'
import { jsonError } from '../../../../lib/errors'
import { enforceRateLimit } from '../../../../lib/rateLimit'
import { analyzeFileQuality, type AIAnalysisResult } from '../../../../lib/ai-analysis'
import { getDb } from '../../../../lib/db'
import { files } from '../../../../drizzle/schema'
import { createAudit } from '../../../../lib/audit'

export const runtime = 'nodejs'

// Analyze a file with AI
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    const userId = (session.user as unknown as { id?: string }).id
    
    if (!tenantId || !userId) return Response.json({ error: 'No tenant access' }, { status: 403 })

    // Rate limiting - AI analysis is expensive
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const { ok, resetAt } = enforceRateLimit(`ai-analysis:${tenantId}:${ip}`, 10, 60 * 1000) // 10 per minute
    if (!ok) return Response.json({ error: 'Rate limit exceeded', resetAt }, { status: 429 })

    const { fileId } = await req.json()

    if (!fileId) {
      return Response.json({ error: 'File ID is required' }, { status: 400 })
    }

    const db = getDb()

    // Get file details
    const fileData = await db
      .select()
      .from(files)
      .where(db.operators.eq(files.id, fileId))
      .limit(1)

    if (fileData.length === 0) {
      return Response.json({ error: 'File not found' }, { status: 404 })
    }

    const file = fileData[0]

    // Check tenant access
    // if (file.tenantId && file.tenantId !== tenantId) {
    //   return Response.json({ error: 'Access denied' }, { status: 403 })
    // }

    // Run AI analysis
    const analysis: AIAnalysisResult = await analyzeFileQuality(
      file.id,
      file.originalName,
      file.url,
      file.mimeType,
      tenantId
    )

    // Store analysis results (simplified - in production you'd have a dedicated table)
    // For now, we'll just create an audit log
    await createAudit(
      tenantId,
      userId,
      'file',
      file.id,
      'ai_analysis_completed'
    )

    return Response.json({
      success: true,
      analysis
    })
  } catch (error) {
    return jsonError(error, 'Failed to analyze file')
  }
}

// Get cached analysis results
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    if (!tenantId) return Response.json({ error: 'No tenant access' }, { status: 403 })

    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const { ok, resetAt } = enforceRateLimit(`ai-results:${tenantId}:${ip}`, 50, 60 * 1000)
    if (!ok) return Response.json({ error: 'Rate limit exceeded', resetAt }, { status: 429 })

    const { searchParams } = new URL(req.url)
    const fileId = searchParams.get('fileId')

    if (!fileId) {
      return Response.json({ error: 'File ID is required' }, { status: 400 })
    }

    // For this demo, we'll generate fresh analysis each time
    // In production, you'd check for cached results first
    const db = getDb()

    const fileData = await db
      .select()
      .from(files)
      .where(db.operators.eq(files.id, fileId))
      .limit(1)

    if (fileData.length === 0) {
      return Response.json({ error: 'File not found' }, { status: 404 })
    }

    const file = fileData[0]

    // Return mock analysis for demo
    const analysis: AIAnalysisResult = await analyzeFileQuality(
      file.id,
      file.originalName,
      file.url,
      file.mimeType,
      tenantId
    )

    return Response.json({
      analysis,
      cached: false,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return jsonError(error, 'Failed to get analysis results')
  }
}
