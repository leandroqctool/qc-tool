import { getServerSession } from 'next-auth'
import { NextRequest } from 'next/server'
import { authOptions } from '../../../../../lib/auth'
import { jsonError } from '../../../../../lib/errors'
import { enforceRateLimit } from '../../../../../lib/rateLimit'
import { 
  generateTOTPSecret, 
  generateBackupCodes,
  type TwoFactorSetup 
} from '../../../../../lib/security'

export const runtime = 'nodejs'

// Setup 2FA for user
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = (session.user as unknown as { id?: string }).id
    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    
    if (!userId || !tenantId) return Response.json({ error: 'Authentication failed' }, { status: 403 })

    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const { ok, resetAt } = enforceRateLimit(`2fa-setup:${userId}:${ip}`, 3, 60 * 1000)
    if (!ok) return Response.json({ error: 'Rate limit exceeded', resetAt }, { status: 429 })

    const { method, phoneNumber, email } = await req.json()

    // Validate method
    if (!['totp', 'sms', 'email'].includes(method)) {
      return Response.json({ error: 'Invalid 2FA method' }, { status: 400 })
    }

    // Validate required fields
    if (method === 'sms' && !phoneNumber) {
      return Response.json({ error: 'Phone number required for SMS 2FA' }, { status: 400 })
    }
    
    if (method === 'email' && !email) {
      return Response.json({ error: 'Email required for email 2FA' }, { status: 400 })
    }

    // Generate 2FA setup
    const setup: Partial<TwoFactorSetup> = {
      userId,
      method: method as 'totp' | 'sms' | 'email',
      backupCodes: generateBackupCodes(),
      isVerified: false,
      createdAt: new Date()
    }

    if (method === 'totp') {
      setup.secret = generateTOTPSecret()
    }
    
    if (method === 'sms') {
      setup.phoneNumber = phoneNumber
    }
    
    if (method === 'email') {
      setup.email = email
    }

    // In a real implementation, you would:
    // 1. Store the setup in the database
    // 2. Send verification code (SMS/Email) or return QR code (TOTP)
    // 3. Generate QR code for TOTP setup

    let response: Record<string, unknown> = {
      success: true,
      method,
      backupCodes: setup.backupCodes,
      setupId: `setup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    if (method === 'totp') {
      // Generate QR code URL for TOTP apps
      const issuer = 'QC Tool'
      const accountName = session.user?.email || userId
      const otpauthURL = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${setup.secret}&issuer=${encodeURIComponent(issuer)}`
      
      response = {
        ...response,
        secret: setup.secret,
        qrCodeURL: otpauthURL,
        manualEntryKey: setup.secret
      }
    } else if (method === 'sms' || method === 'email') {
      // Generate and send verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
      
      response = {
        ...response,
        message: `Verification code sent to ${method === 'sms' ? phoneNumber : email}`,
        verificationRequired: true
      }
      
      // In production, send actual SMS/email here
      console.log(`2FA verification code for ${userId}: ${verificationCode}`)
    }

    return Response.json(response)
  } catch (error) {
    return jsonError(error, 'Failed to setup 2FA')
  }
}

// Verify 2FA setup
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = (session.user as unknown as { id?: string }).id
    const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
    
    if (!userId || !tenantId) return Response.json({ error: 'Authentication failed' }, { status: 403 })

    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const { ok, resetAt } = enforceRateLimit(`2fa-verify:${userId}:${ip}`, 5, 5 * 60 * 1000)
    if (!ok) return Response.json({ error: 'Rate limit exceeded', resetAt }, { status: 429 })

    const { setupId, verificationCode, token } = await req.json()

    if (!setupId) {
      return Response.json({ error: 'Setup ID required' }, { status: 400 })
    }

    // In a real implementation, you would:
    // 1. Fetch the setup from database using setupId
    // 2. Verify the code/token based on method
    // 3. Mark setup as verified and activate 2FA
    // 4. Invalidate any existing sessions to force re-auth

    // Mock verification - in production, implement proper verification
    const isValid = verificationCode === '123456' || token === '123456'
    
    if (!isValid) {
      return Response.json({ error: 'Invalid verification code' }, { status: 400 })
    }

    return Response.json({
      success: true,
      message: '2FA successfully enabled',
      enabled: true,
      activatedAt: new Date().toISOString()
    })
  } catch (error) {
    return jsonError(error, 'Failed to verify 2FA setup')
  }
}

// Get 2FA status
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = (session.user as unknown as { id?: string }).id
    
    if (!userId) return Response.json({ error: 'Authentication failed' }, { status: 403 })

    // In a real implementation, fetch from database
    // Mock response
    const twoFactorStatus = {
      enabled: false,
      methods: [],
      backupCodesRemaining: 0,
      lastUsed: null,
      setupRequired: false
    }

    return Response.json(twoFactorStatus)
  } catch (error) {
    return jsonError(error, 'Failed to get 2FA status')
  }
}
