import { getServerSession } from 'next-auth'
import { NextRequest } from 'next/server'
import { authOptions } from '../../../../lib/auth'
import { jsonError } from '../../../../lib/errors'
import { gdprManager } from '../../../../lib/gdpr-compliance'

export const runtime = 'nodejs'

// Record consent
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = (session.user as unknown as { id?: string }).id
    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    
    if (!userId || !tenantId) {
      return Response.json({ error: 'Invalid session' }, { status: 400 })
    }

    const {
      consentType,
      consentText,
      version = '1.0'
    } = await req.json()

    if (!consentType || !['data_processing', 'marketing', 'analytics', 'cookies', 'third_party_sharing'].includes(consentType)) {
      return Response.json({ error: 'Invalid consent type' }, { status: 400 })
    }

    const consentId = await gdprManager.recordConsent({
      tenantId,
      userId,
      consentType,
      status: 'granted',
      grantedAt: new Date(),
      consentText: consentText || `User consent for ${consentType}`,
      version,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown'
    })

    return Response.json({
      success: true,
      message: 'Consent recorded successfully',
      consentId,
      consentType,
      grantedAt: new Date()
    })

  } catch (error) {
    return jsonError(error, 'Failed to record consent')
  }
}

// Get user consents
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = (session.user as unknown as { id?: string }).id
    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    
    if (!userId || !tenantId) {
      return Response.json({ error: 'Invalid session' }, { status: 400 })
    }

    // Mock consent records - would query database
    const consents = [
      {
        id: 'consent_123',
        consentType: 'data_processing',
        status: 'granted',
        grantedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        consentText: 'I consent to the processing of my personal data for QC services',
        version: '1.0'
      },
      {
        id: 'consent_124',
        consentType: 'marketing',
        status: 'withdrawn',
        grantedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        withdrawnAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        consentText: 'I consent to receiving marketing communications',
        version: '1.0'
      }
    ]

    return Response.json({
      consents,
      total: consents.length
    })

  } catch (error) {
    return jsonError(error, 'Failed to fetch consents')
  }
}

// Withdraw consent
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = (session.user as unknown as { id?: string }).id
    
    if (!userId) {
      return Response.json({ error: 'Invalid session' }, { status: 400 })
    }

    const { consentId } = await req.json()
    
    if (!consentId) {
      return Response.json({ error: 'Consent ID is required' }, { status: 400 })
    }

    await gdprManager.withdrawConsent(consentId, userId, 'user_action')

    return Response.json({
      success: true,
      message: 'Consent withdrawn successfully',
      consentId,
      withdrawnAt: new Date()
    })

  } catch (error) {
    return jsonError(error, 'Failed to withdraw consent')
  }
}
