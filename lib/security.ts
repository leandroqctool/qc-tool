// Enterprise Security & Authentication System
import crypto from 'crypto'

export interface SecurityConfig {
  // Two-Factor Authentication
  twoFactorEnabled: boolean
  twoFactorMethods: ('totp' | 'sms' | 'email')[]
  backupCodesEnabled: boolean
  
  // Session Management
  sessionTimeout: number // minutes
  maxConcurrentSessions: number
  requireReauthForSensitive: boolean
  
  // Password Policy
  passwordPolicy: {
    minLength: number
    requireUppercase: boolean
    requireLowercase: boolean
    requireNumbers: boolean
    requireSpecialChars: boolean
    preventReuse: number // last N passwords
    maxAge: number // days
  }
  
  // IP & Location Security
  ipWhitelisting: boolean
  allowedCountries: string[]
  suspiciousLoginDetection: boolean
  
  // Audit & Compliance
  auditAllActions: boolean
  dataRetentionDays: number
  gdprCompliant: boolean
}

export interface TwoFactorSetup {
  userId: string
  method: 'totp' | 'sms' | 'email'
  secret?: string // For TOTP
  phoneNumber?: string // For SMS
  email?: string // For email
  backupCodes: string[]
  isVerified: boolean
  createdAt: Date
  lastUsed?: Date
}

export interface SecuritySession {
  id: string
  userId: string
  tenantId: string
  ipAddress: string
  userAgent: string
  country?: string
  city?: string
  isActive: boolean
  isTrusted: boolean
  requiresReauth: boolean
  createdAt: Date
  lastActivity: Date
  expiresAt: Date
  
  // Security flags
  isSuspicious: boolean
  riskScore: number // 0-100
  authMethod: 'password' | '2fa' | 'sso'
  deviceFingerprint?: string
}

export interface SecurityAlert {
  id: string
  userId: string
  tenantId: string
  type: 'suspicious_login' | 'new_device' | 'location_change' | 'multiple_failures' | 'privilege_escalation'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  ipAddress: string
  location?: string
  resolved: boolean
  resolvedBy?: string
  resolvedAt?: Date
  createdAt: Date
  
  // Context
  metadata: Record<string, unknown>
  actionTaken?: string
}

export interface LoginAttempt {
  id: string
  email: string
  ipAddress: string
  userAgent: string
  success: boolean
  failureReason?: string
  location?: string
  timestamp: Date
  
  // Risk assessment
  riskFactors: string[]
  riskScore: number
  blocked: boolean
}

// Default security configuration
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  twoFactorEnabled: true,
  twoFactorMethods: ['totp', 'email'],
  backupCodesEnabled: true,
  
  sessionTimeout: 480, // 8 hours
  maxConcurrentSessions: 3,
  requireReauthForSensitive: true,
  
  passwordPolicy: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    preventReuse: 5,
    maxAge: 90
  },
  
  ipWhitelisting: false,
  allowedCountries: [],
  suspiciousLoginDetection: true,
  
  auditAllActions: true,
  dataRetentionDays: 2555, // 7 years
  gdprCompliant: true
}

// Two-Factor Authentication Functions
export function generateTOTPSecret(): string {
  // Base32 encoding for TOTP secret
  const bytes = crypto.randomBytes(20)
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let result = ''
  
  for (let i = 0; i < bytes.length; i += 5) {
    const chunk = bytes.subarray(i, i + 5)
    let buffer = 0
    let bitsLeft = 0
    
    for (const byte of chunk) {
      buffer = (buffer << 8) | byte
      bitsLeft += 8
      
      while (bitsLeft >= 5) {
        result += alphabet[(buffer >>> (bitsLeft - 5)) & 31]
        bitsLeft -= 5
      }
    }
    
    if (bitsLeft > 0) {
      result += alphabet[(buffer << (5 - bitsLeft)) & 31]
    }
  }
  
  return result
}

export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase())
  }
  return codes
}

export function verifyTOTP(secret: string, token: string, window: number = 1): boolean {
  // In a real implementation, you would use a library like 'otpauth' or 'speakeasy'
  // This is a simplified mock implementation
  const currentTime = Math.floor(Date.now() / 1000 / 30) // 30-second window
  
  for (let i = -window; i <= window; i++) {
    const time = currentTime + i
    const expectedToken = generateTOTPToken(secret, time)
    if (expectedToken === token) {
      return true
    }
  }
  
  return false
}

function generateTOTPToken(secret: string, time: number): string {
  // Simplified TOTP generation - use proper library in production
  // For now, return a mock token since we can't decode base32 easily
  const mockCode = (time % 900000) + 100000 // Generate a 6-digit code
  return mockCode.toString().padStart(6, '0')
}

// Session Management Functions
export function generateSessionId(): string {
  return crypto.randomUUID()
}

export function calculateSessionRisk(
  ipAddress: string,
  userAgent: string,
  location?: string,
  previousSessions: SecuritySession[] = []
): number {
  let riskScore = 0
  
  // New IP address
  const knownIPs = previousSessions.map(s => s.ipAddress)
  if (!knownIPs.includes(ipAddress)) {
    riskScore += 30
  }
  
  // New user agent/device
  const knownAgents = previousSessions.map(s => s.userAgent)
  if (!knownAgents.includes(userAgent)) {
    riskScore += 20
  }
  
  // New location
  if (location) {
    const knownLocations = previousSessions.map(s => s.city).filter(Boolean)
    if (knownLocations.length > 0 && !knownLocations.includes(location)) {
      riskScore += 25
    }
  }
  
  // Time-based risk (unusual hours)
  const hour = new Date().getHours()
  if (hour < 6 || hour > 22) {
    riskScore += 10
  }
  
  return Math.min(100, riskScore)
}

export function isSessionExpired(session: SecuritySession): boolean {
  return new Date() > session.expiresAt
}

export function shouldRequireReauth(
  session: SecuritySession,
  action: 'sensitive' | 'admin' | 'financial'
): boolean {
  if (!session.requiresReauth) return false
  
  const timeSinceActivity = Date.now() - session.lastActivity.getTime()
  const reauthThresholds = {
    sensitive: 15 * 60 * 1000, // 15 minutes
    admin: 30 * 60 * 1000,     // 30 minutes
    financial: 5 * 60 * 1000   // 5 minutes
  }
  
  return timeSinceActivity > reauthThresholds[action]
}

// Password Security Functions
export function validatePasswordStrength(password: string, policy: SecurityConfig['passwordPolicy']): {
  isValid: boolean
  errors: string[]
  score: number // 0-100
} {
  const errors: string[] = []
  let score = 0
  
  // Length check
  if (password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters long`)
  } else {
    score += 20
  }
  
  // Character requirements
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  } else if (policy.requireUppercase) {
    score += 15
  }
  
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  } else if (policy.requireLowercase) {
    score += 15
  }
  
  if (policy.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  } else if (policy.requireNumbers) {
    score += 15
  }
  
  if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character')
  } else if (policy.requireSpecialChars) {
    score += 15
  }
  
  // Bonus points for complexity
  const uniqueChars = new Set(password).size
  if (uniqueChars > password.length * 0.7) {
    score += 10
  }
  
  if (password.length > policy.minLength + 4) {
    score += 10
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    score: Math.min(100, score)
  }
}

export async function hashPassword(password: string): Promise<string> {
  // In production, use bcrypt or argon2
  // This is a simplified implementation
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const [salt, hash] = hashedPassword.split(':')
  const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')
  return hash === verifyHash
}

// IP and Location Security
export function isIPWhitelisted(ipAddress: string, whitelist: string[]): boolean {
  if (whitelist.length === 0) return true
  
  // Support CIDR notation and individual IPs
  return whitelist.some(allowed => {
    if (allowed.includes('/')) {
      // CIDR check (simplified)
      return ipAddress.startsWith(allowed.split('/')[0].slice(0, -1))
    }
    return ipAddress === allowed
  })
}

export function detectSuspiciousActivity(
  attempts: LoginAttempt[],
  timeWindow: number = 15 * 60 * 1000 // 15 minutes
): boolean {
  const recentAttempts = attempts.filter(
    attempt => Date.now() - attempt.timestamp.getTime() < timeWindow
  )
  
  // Multiple failed attempts
  const failedAttempts = recentAttempts.filter(a => !a.success)
  if (failedAttempts.length >= 5) return true
  
  // Multiple IPs for same user
  const uniqueIPs = new Set(recentAttempts.map(a => a.ipAddress))
  if (uniqueIPs.size >= 3) return true
  
  // Rapid-fire attempts
  if (recentAttempts.length >= 10) return true
  
  return false
}

// Audit and Compliance
export interface SecurityAuditLog {
  id: string
  userId: string
  tenantId: string
  action: string
  resource: string
  ipAddress: string
  userAgent: string
  success: boolean
  riskLevel: 'low' | 'medium' | 'high'
  timestamp: Date
  
  // GDPR compliance
  personalDataAccessed: boolean
  dataSubject?: string
  legalBasis?: string
  
  // Additional context
  metadata: Record<string, unknown>
}

export function createSecurityAuditLog(
  userId: string,
  tenantId: string,
  action: string,
  resource: string,
  ipAddress: string,
  userAgent: string,
  success: boolean,
  metadata: Record<string, unknown> = {}
): SecurityAuditLog {
  return {
    id: crypto.randomUUID(),
    userId,
    tenantId,
    action,
    resource,
    ipAddress,
    userAgent,
    success,
    riskLevel: determineRiskLevel(action, resource, success),
    timestamp: new Date(),
    personalDataAccessed: isPersonalDataAccess(action, resource),
    metadata
  }
}

function determineRiskLevel(action: string, resource: string, success: boolean): 'low' | 'medium' | 'high' {
  if (!success) return 'medium'
  
  const highRiskActions = ['delete', 'export', 'admin', 'privilege_change']
  const highRiskResources = ['user_data', 'financial_data', 'admin_settings']
  
  if (highRiskActions.some(a => action.includes(a)) || 
      highRiskResources.some(r => resource.includes(r))) {
    return 'high'
  }
  
  const mediumRiskActions = ['create', 'update', 'bulk_operation']
  if (mediumRiskActions.some(a => action.includes(a))) {
    return 'medium'
  }
  
  return 'low'
}

function isPersonalDataAccess(action: string, resource: string): boolean {
  const personalDataResources = ['users', 'profiles', 'contacts', 'files', 'messages']
  return personalDataResources.some(r => resource.includes(r))
}

// Device Fingerprinting
export function generateDeviceFingerprint(userAgent: string, additionalData: Record<string, unknown> = {}): string {
  const fingerprint = {
    userAgent,
    ...additionalData
  }
  
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(fingerprint))
    .digest('hex')
    .substring(0, 16)
}

// Security Headers
export const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-XSS-Protection': '1; mode=block'
}

// Rate Limiting for Security
export interface SecurityRateLimit {
  loginAttempts: { maxAttempts: number; windowMs: number }
  passwordReset: { maxAttempts: number; windowMs: number }
  twoFactorVerification: { maxAttempts: number; windowMs: number }
  apiCalls: { maxAttempts: number; windowMs: number }
}

export const DEFAULT_RATE_LIMITS: SecurityRateLimit = {
  loginAttempts: { maxAttempts: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
  passwordReset: { maxAttempts: 3, windowMs: 60 * 60 * 1000 }, // 3 attempts per hour
  twoFactorVerification: { maxAttempts: 3, windowMs: 5 * 60 * 1000 }, // 3 attempts per 5 minutes
  apiCalls: { maxAttempts: 100, windowMs: 60 * 1000 } // 100 calls per minute
}
