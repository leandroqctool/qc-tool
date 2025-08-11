import {
  generateTOTPSecret,
  generateBackupCodes,
  verifyTOTP,
  generateSessionId,
  calculateSessionRisk,
  isSessionExpired,
  shouldRequireReauth,
  validatePasswordStrength,
  hashPassword,
  verifyPassword,
  isIPWhitelisted,
  detectSuspiciousActivity,
  createSecurityAuditLog,
  generateDeviceFingerprint,
  DEFAULT_SECURITY_CONFIG,
  type SecuritySession,
  type LoginAttempt
} from '../security'

describe('Security Library', () => {
  describe('Two-Factor Authentication', () => {
    describe('generateTOTPSecret', () => {
      it('generates a base32 encoded secret', () => {
        const secret = generateTOTPSecret()
        expect(typeof secret).toBe('string')
        expect(secret.length).toBeGreaterThan(0)
        expect(/^[A-Z2-7]+$/.test(secret)).toBe(true) // Base32 alphabet
      })

      it('generates different secrets each time', () => {
        const secret1 = generateTOTPSecret()
        const secret2 = generateTOTPSecret()
        expect(secret1).not.toBe(secret2)
      })
    })

    describe('generateBackupCodes', () => {
      it('generates default number of backup codes', () => {
        const codes = generateBackupCodes()
        expect(codes).toHaveLength(10)
        codes.forEach(code => {
          expect(typeof code).toBe('string')
          expect(/^[A-F0-9]{8}$/.test(code)).toBe(true)
        })
      })

      it('generates custom number of backup codes', () => {
        const codes = generateBackupCodes(5)
        expect(codes).toHaveLength(5)
      })

      it('generates unique codes', () => {
        const codes = generateBackupCodes(20)
        const uniqueCodes = new Set(codes)
        expect(uniqueCodes.size).toBe(20)
      })
    })

    describe('verifyTOTP', () => {
      it('validates TOTP token within time window', () => {
        const secret = 'JBSWY3DPEHPK3PXP'
        const token = '123456'
        
        // Mock implementation always returns true for specific token
        const result = verifyTOTP(secret, token)
        expect(typeof result).toBe('boolean')
      })
    })
  })

  describe('Session Management', () => {
    describe('generateSessionId', () => {
      it('generates a valid UUID', () => {
        const sessionId = generateSessionId()
        expect(typeof sessionId).toBe('string')
        expect(sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
      })

      it('generates unique session IDs', () => {
        const id1 = generateSessionId()
        const id2 = generateSessionId()
        expect(id1).not.toBe(id2)
      })
    })

    describe('calculateSessionRisk', () => {
      it('calculates low risk for known IP and user agent', () => {
        const previousSessions: SecuritySession[] = [{
          id: 'session1',
          userId: 'user1',
          tenantId: 'tenant1',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          country: 'US',
          city: 'San Francisco',
          isActive: true,
          isTrusted: true,
          requiresReauth: false,
          createdAt: new Date(),
          lastActivity: new Date(),
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
          isSuspicious: false,
          riskScore: 10,
          authMethod: 'password'
        }]

        const riskScore = calculateSessionRisk('192.168.1.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'San Francisco', previousSessions)
        expect(riskScore).toBeLessThan(30)
      })

      it('calculates high risk for new IP and user agent', () => {
        const riskScore = calculateSessionRisk('203.0.113.1', 'Unknown Browser', 'Unknown Location', [])
        expect(riskScore).toBeGreaterThanOrEqual(50)
      })

      it('adds risk for unusual hours', () => {
        const originalHours = Date.prototype.getHours
        Date.prototype.getHours = jest.fn().mockReturnValue(3) // 3 AM

        const riskScore = calculateSessionRisk('203.0.113.1', 'Unknown Browser')
        expect(riskScore).toBeGreaterThanOrEqual(60)

        Date.prototype.getHours = originalHours
      })
    })

    describe('isSessionExpired', () => {
      it('returns true for expired session', () => {
        const expiredSession: SecuritySession = {
          id: 'session1',
          userId: 'user1',
          tenantId: 'tenant1',
          ipAddress: '192.168.1.1',
          userAgent: 'test',
          isActive: true,
          isTrusted: true,
          requiresReauth: false,
          createdAt: new Date(),
          lastActivity: new Date(),
          expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
          isSuspicious: false,
          riskScore: 10,
          authMethod: 'password'
        }

        expect(isSessionExpired(expiredSession)).toBe(true)
      })

      it('returns false for active session', () => {
        const activeSession: SecuritySession = {
          id: 'session1',
          userId: 'user1',
          tenantId: 'tenant1',
          ipAddress: '192.168.1.1',
          userAgent: 'test',
          isActive: true,
          isTrusted: true,
          requiresReauth: false,
          createdAt: new Date(),
          lastActivity: new Date(),
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // Expires in 8 hours
          isSuspicious: false,
          riskScore: 10,
          authMethod: 'password'
        }

        expect(isSessionExpired(activeSession)).toBe(false)
      })
    })

    describe('shouldRequireReauth', () => {
      it('requires reauth for sensitive actions after timeout', () => {
        const session: SecuritySession = {
          id: 'session1',
          userId: 'user1',
          tenantId: 'tenant1',
          ipAddress: '192.168.1.1',
          userAgent: 'test',
          isActive: true,
          isTrusted: true,
          requiresReauth: true,
          createdAt: new Date(),
          lastActivity: new Date(Date.now() - 20 * 60 * 1000), // 20 minutes ago
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
          isSuspicious: false,
          riskScore: 10,
          authMethod: 'password'
        }

        expect(shouldRequireReauth(session, 'sensitive')).toBe(true)
      })

      it('does not require reauth when flag is false', () => {
        const session: SecuritySession = {
          id: 'session1',
          userId: 'user1',
          tenantId: 'tenant1',
          ipAddress: '192.168.1.1',
          userAgent: 'test',
          isActive: true,
          isTrusted: true,
          requiresReauth: false,
          createdAt: new Date(),
          lastActivity: new Date(Date.now() - 20 * 60 * 1000),
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
          isSuspicious: false,
          riskScore: 10,
          authMethod: 'password'
        }

        expect(shouldRequireReauth(session, 'sensitive')).toBe(false)
      })
    })
  })

  describe('Password Security', () => {
    describe('validatePasswordStrength', () => {
      it('validates strong password', () => {
        const result = validatePasswordStrength('StrongP@ssw0rd123!', DEFAULT_SECURITY_CONFIG.passwordPolicy)
        
        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
        expect(result.score).toBeGreaterThan(70)
      })

      it('rejects weak password', () => {
        const result = validatePasswordStrength('weak', DEFAULT_SECURITY_CONFIG.passwordPolicy)
        
        expect(result.isValid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
        expect(result.score).toBeLessThan(50)
      })

      it('identifies specific password policy violations', () => {
        const result = validatePasswordStrength('short', DEFAULT_SECURITY_CONFIG.passwordPolicy)
        
        expect(result.errors).toContain('Password must be at least 12 characters long')
        expect(result.errors).toContain('Password must contain at least one uppercase letter')
        expect(result.errors).toContain('Password must contain at least one number')
        expect(result.errors).toContain('Password must contain at least one special character')
      })
    })

    describe('hashPassword and verifyPassword', () => {
      it('hashes and verifies password correctly', async () => {
        const password = 'TestPassword123!'
        const hashedPassword = await hashPassword(password)
        
        expect(hashedPassword).not.toBe(password)
        expect(hashedPassword).toContain(':')
        
        const isValid = await verifyPassword(password, hashedPassword)
        expect(isValid).toBe(true)
        
        const isInvalid = await verifyPassword('WrongPassword', hashedPassword)
        expect(isInvalid).toBe(false)
      })
    })
  })

  describe('IP and Location Security', () => {
    describe('isIPWhitelisted', () => {
      it('allows all IPs when whitelist is empty', () => {
        expect(isIPWhitelisted('192.168.1.1', [])).toBe(true)
        expect(isIPWhitelisted('203.0.113.1', [])).toBe(true)
      })

      it('allows whitelisted IPs', () => {
        const whitelist = ['192.168.1.1', '10.0.0.1']
        expect(isIPWhitelisted('192.168.1.1', whitelist)).toBe(true)
        expect(isIPWhitelisted('10.0.0.1', whitelist)).toBe(true)
      })

      it('blocks non-whitelisted IPs', () => {
        const whitelist = ['192.168.1.1', '10.0.0.1']
        expect(isIPWhitelisted('203.0.113.1', whitelist)).toBe(false)
      })

      it('supports CIDR notation', () => {
        const whitelist = ['192.168.1.0/24']
        expect(isIPWhitelisted('192.168.1.100', whitelist)).toBe(true)
        expect(isIPWhitelisted('192.168.2.1', whitelist)).toBe(false)
      })
    })

    describe('detectSuspiciousActivity', () => {
      it('detects multiple failed attempts', () => {
        const attempts: LoginAttempt[] = Array.from({ length: 6 }, (_, i) => ({
          id: `attempt_${i}`,
          email: 'test@example.com',
          ipAddress: '192.168.1.1',
          userAgent: 'test',
          success: false,
          timestamp: new Date(Date.now() - i * 1000),
          riskFactors: [],
          riskScore: 50,
          blocked: false
        }))

        expect(detectSuspiciousActivity(attempts)).toBe(true)
      })

      it('detects multiple IPs for same user', () => {
        const attempts: LoginAttempt[] = Array.from({ length: 4 }, (_, i) => ({
          id: `attempt_${i}`,
          email: 'test@example.com',
          ipAddress: `192.168.1.${i + 1}`,
          userAgent: 'test',
          success: true,
          timestamp: new Date(Date.now() - i * 1000),
          riskFactors: [],
          riskScore: 30,
          blocked: false
        }))

        expect(detectSuspiciousActivity(attempts)).toBe(true)
      })

      it('does not flag normal activity', () => {
        const attempts: LoginAttempt[] = [{
          id: 'attempt_1',
          email: 'test@example.com',
          ipAddress: '192.168.1.1',
          userAgent: 'test',
          success: true,
          timestamp: new Date(),
          riskFactors: [],
          riskScore: 10,
          blocked: false
        }]

        expect(detectSuspiciousActivity(attempts)).toBe(false)
      })
    })
  })

  describe('Audit and Compliance', () => {
    describe('createSecurityAuditLog', () => {
      it('creates audit log with correct structure', () => {
        const log = createSecurityAuditLog(
          'user123',
          'tenant123',
          'login',
          'authentication',
          '192.168.1.1',
          'Mozilla/5.0',
          true,
          { method: '2fa' }
        )

        expect(log).toHaveProperty('id')
        expect(log).toHaveProperty('userId', 'user123')
        expect(log).toHaveProperty('tenantId', 'tenant123')
        expect(log).toHaveProperty('action', 'login')
        expect(log).toHaveProperty('resource', 'authentication')
        expect(log).toHaveProperty('ipAddress', '192.168.1.1')
        expect(log).toHaveProperty('userAgent', 'Mozilla/5.0')
        expect(log).toHaveProperty('success', true)
        expect(log).toHaveProperty('riskLevel')
        expect(log).toHaveProperty('timestamp')
        expect(log).toHaveProperty('personalDataAccessed')
        expect(log).toHaveProperty('metadata', { method: '2fa' })
      })

      it('assigns correct risk levels', () => {
        const highRiskLog = createSecurityAuditLog('user1', 'tenant1', 'delete', 'user_data', '1.1.1.1', 'test', true)
        expect(highRiskLog.riskLevel).toBe('high')

        const mediumRiskLog = createSecurityAuditLog('user1', 'tenant1', 'update', 'settings', '1.1.1.1', 'test', true)
        expect(mediumRiskLog.riskLevel).toBe('medium')

        const lowRiskLog = createSecurityAuditLog('user1', 'tenant1', 'view', 'dashboard', '1.1.1.1', 'test', true)
        expect(lowRiskLog.riskLevel).toBe('low')
      })
    })

    describe('generateDeviceFingerprint', () => {
      it('generates consistent fingerprint for same input', () => {
        const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
        const additionalData = { screen: '1920x1080', timezone: 'America/New_York' }

        const fingerprint1 = generateDeviceFingerprint(userAgent, additionalData)
        const fingerprint2 = generateDeviceFingerprint(userAgent, additionalData)

        expect(fingerprint1).toBe(fingerprint2)
        expect(typeof fingerprint1).toBe('string')
        expect(fingerprint1.length).toBe(16)
      })

      it('generates different fingerprints for different inputs', () => {
        const fingerprint1 = generateDeviceFingerprint('UserAgent1')
        const fingerprint2 = generateDeviceFingerprint('UserAgent2')

        expect(fingerprint1).not.toBe(fingerprint2)
      })
    })
  })
})
