import { getServerSession } from 'next-auth'
import { NextRequest } from 'next/server'
import { authOptions } from '../../../../../lib/auth'
import { jsonError } from '../../../../../lib/errors'
import { neon } from '@neondatabase/serverless'
import { enforceRateLimit } from '../../../../../lib/rateLimit'

export const runtime = 'nodejs'

// Get annotations for a file
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    if (!tenantId) return Response.json({ error: 'No tenant access' }, { status: 403 })

    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const { ok, resetAt } = enforceRateLimit(`annotations:${tenantId}:${ip}`, 100, 60 * 1000)
    if (!ok) return Response.json({ error: 'Rate limit exceeded', resetAt }, { status: 429 })

    const { id: fileId } = await context.params
    const sql = neon(process.env.DATABASE_URL!)

    // Get annotations
    const annotations = await sql`
      SELECT 
        id,
        type,
        data,
        resolved,
        user_id,
        user_name,
        created_at,
        updated_at
      FROM file_annotations 
      WHERE file_id = ${fileId} AND tenant_id = ${tenantId}
      ORDER BY created_at DESC
    `

    // Get comments
    const comments = await sql`
      SELECT 
        c.id,
        c.annotation_id,
        c.text,
        c.user_id,
        c.user_name,
        c.parent_id,
        c.created_at
      FROM annotation_comments c
      JOIN file_annotations a ON c.annotation_id = a.id
      WHERE a.file_id = ${fileId} AND a.tenant_id = ${tenantId}
      ORDER BY c.created_at ASC
    `

    return Response.json({
      annotations: annotations.map(a => ({
        id: a.id,
        type: a.type,
        ...JSON.parse(a.data),
        resolved: a.resolved,
        userId: a.user_id,
        userName: a.user_name,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
      })),
      comments: comments.map(c => ({
        id: c.id,
        annotationId: c.annotation_id,
        text: c.text,
        userId: c.user_id,
        userName: c.user_name,
        parentId: c.parent_id,
        createdAt: c.created_at,
      }))
    })
  } catch (error) {
    return jsonError(error, 'Failed to fetch annotations')
  }
}

// Save annotations for a file
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    const userId = (session.user as unknown as { id?: string }).id
    const userName = session.user?.name || session.user?.email?.split('@')[0] || 'Unknown'
    
    if (!tenantId || !userId) return Response.json({ error: 'No tenant access' }, { status: 403 })

    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const { ok, resetAt } = enforceRateLimit(`annotations:save:${tenantId}:${ip}`, 20, 60 * 1000)
    if (!ok) return Response.json({ error: 'Rate limit exceeded', resetAt }, { status: 429 })

    const { id: fileId } = await context.params
    const { annotations, comments } = await req.json()
    
    const sql = neon(process.env.DATABASE_URL!)

    // Create annotations table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS file_annotations (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        file_id UUID NOT NULL,
        type TEXT NOT NULL,
        data JSONB NOT NULL,
        resolved BOOLEAN DEFAULT false,
        user_id UUID NOT NULL,
        user_name TEXT NOT NULL,
        tenant_id UUID NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS annotation_comments (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        annotation_id UUID NOT NULL,
        text TEXT NOT NULL,
        user_id UUID NOT NULL,
        user_name TEXT NOT NULL,
        parent_id UUID,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Clear existing annotations for this file
    await sql`DELETE FROM annotation_comments WHERE annotation_id IN (
      SELECT id FROM file_annotations WHERE file_id = ${fileId} AND tenant_id = ${tenantId}
    )`
    await sql`DELETE FROM file_annotations WHERE file_id = ${fileId} AND tenant_id = ${tenantId}`

    // Insert new annotations
    for (const annotation of annotations) {
      const { id, type, userId: annotationUserId, userName: annotationUserName, createdAt, updatedAt, resolved, ...data } = annotation
      
      await sql`
        INSERT INTO file_annotations (
          id, file_id, type, data, resolved, user_id, user_name, tenant_id, created_at, updated_at
        ) VALUES (
          ${id}, ${fileId}, ${type}, ${JSON.stringify(data)}, ${resolved || false}, 
          ${annotationUserId || userId}, ${annotationUserName || userName}, ${tenantId}, 
          ${createdAt || new Date()}, ${updatedAt || new Date()}
        )
      `
    }

    // Insert new comments
    for (const comment of comments) {
      await sql`
        INSERT INTO annotation_comments (
          id, annotation_id, text, user_id, user_name, parent_id, created_at
        ) VALUES (
          ${comment.id}, ${comment.annotationId}, ${comment.text}, 
          ${comment.userId}, ${comment.userName}, ${comment.parentId || null}, 
          ${comment.createdAt || new Date()}
        )
      `
    }

    return Response.json({ success: true })
  } catch (error) {
    return jsonError(error, 'Failed to save annotations')
  }
}
