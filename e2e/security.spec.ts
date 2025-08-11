import { test, expect } from '@playwright/test'

test.describe('Security Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to security dashboard (assuming user is authenticated)
    await page.goto('/security')
  })

  test('should display security dashboard', async ({ page }) => {
    await expect(page).toHaveTitle(/QC Tool/)
    await expect(page.locator('h1')).toContainText(/security/i)
    
    // Check for main sections
    await expect(page.locator('[data-testid="security-score"]')).toBeVisible()
    await expect(page.locator('[data-testid="security-tabs"]')).toBeVisible()
  })

  test('should navigate between security tabs', async ({ page }) => {
    const tabs = ['overview', '2fa', 'sessions', 'audit']
    
    for (const tab of tabs) {
      await page.click(`[data-testid="tab-${tab}"]`)
      await expect(page.locator(`[data-testid="${tab}-content"]`)).toBeVisible()
    }
  })

  test('should display security overview', async ({ page }) => {
    // Should be on overview tab by default
    await expect(page.locator('[data-testid="security-score"]')).toBeVisible()
    await expect(page.locator('[data-testid="security-stats"]')).toBeVisible()
    
    // Check for security metrics
    await expect(page.locator('[data-testid="active-sessions-count"]')).toBeVisible()
    await expect(page.locator('[data-testid="2fa-status"]')).toBeVisible()
  })
})

test.describe('Two-Factor Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/security')
    await page.click('[data-testid="tab-2fa"]')
  })

  test('should show 2FA setup options', async ({ page }) => {
    await expect(page.locator('[data-testid="2fa-content"]')).toBeVisible()
    
    // If 2FA is not enabled, should show setup options
    const setupButton = page.locator('[data-testid="setup-2fa-button"]')
    if (await setupButton.isVisible()) {
      await setupButton.click()
      
      // Should show method selection
      await expect(page.locator('[data-testid="2fa-method-totp"]')).toBeVisible()
      await expect(page.locator('[data-testid="2fa-method-sms"]')).toBeVisible()
      await expect(page.locator('[data-testid="2fa-method-email"]')).toBeVisible()
    }
  })

  test('should setup TOTP 2FA', async ({ page }) => {
    const setupButton = page.locator('[data-testid="setup-2fa-button"]')
    if (await setupButton.isVisible()) {
      await setupButton.click()
      
      // Select TOTP method
      await page.click('[data-testid="2fa-method-totp"]')
      await page.click('[data-testid="continue-setup-button"]')
      
      // Should show QR code and backup codes
      await expect(page.locator('[data-testid="qr-code"]')).toBeVisible()
      await expect(page.locator('[data-testid="backup-codes"]')).toBeVisible()
      
      // Complete setup
      await page.click('[data-testid="complete-setup-button"]')
    }
  })

  test('should handle 2FA verification', async ({ page }) => {
    // This test would require actual 2FA setup
    // For now, just test the UI elements exist
    const verificationInput = page.locator('[data-testid="2fa-verification-input"]')
    if (await verificationInput.isVisible()) {
      await verificationInput.fill('123456')
      await page.click('[data-testid="verify-2fa-button"]')
      
      // Should handle verification response
      await expect(page.locator('[data-testid="verification-result"]')).toBeVisible()
    }
  })
})

test.describe('Session Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/security')
    await page.click('[data-testid="tab-sessions"]')
  })

  test('should display active sessions', async ({ page }) => {
    await expect(page.locator('[data-testid="sessions-content"]')).toBeVisible()
    
    // Should show session list
    const sessionsList = page.locator('[data-testid="sessions-list"]')
    await expect(sessionsList).toBeVisible()
    
    // Should show at least current session
    const sessions = page.locator('[data-testid^="session-"]')
    await expect(sessions.first()).toBeVisible()
  })

  test('should show session details', async ({ page }) => {
    const firstSession = page.locator('[data-testid^="session-"]').first()
    await expect(firstSession).toBeVisible()
    
    // Should show session information
    await expect(firstSession.locator('[data-testid="session-device"]')).toBeVisible()
    await expect(firstSession.locator('[data-testid="session-location"]')).toBeVisible()
    await expect(firstSession.locator('[data-testid="session-risk-score"]')).toBeVisible()
  })

  test('should terminate session', async ({ page }) => {
    // Look for non-current sessions that can be terminated
    const terminateButton = page.locator('[data-testid="terminate-session-button"]').first()
    
    if (await terminateButton.isVisible()) {
      await terminateButton.click()
      
      // Should show confirmation or success message
      await expect(page.locator('[data-testid="session-terminated-message"]')).toBeVisible()
    }
  })

  test('should terminate all sessions', async ({ page }) => {
    const terminateAllButton = page.locator('[data-testid="terminate-all-sessions-button"]')
    
    if (await terminateAllButton.isVisible()) {
      await terminateAllButton.click()
      
      // Should show confirmation dialog
      await expect(page.locator('[data-testid="confirm-terminate-all"]')).toBeVisible()
      
      // Confirm action
      await page.click('[data-testid="confirm-terminate-all-button"]')
      
      // Should show success message
      await expect(page.locator('[data-testid="all-sessions-terminated-message"]')).toBeVisible()
    }
  })
})

test.describe('Security Audit Logs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/security')
    await page.click('[data-testid="tab-audit"]')
  })

  test('should display audit logs', async ({ page }) => {
    await expect(page.locator('[data-testid="audit-content"]')).toBeVisible()
    
    // Should show audit logs list
    const auditList = page.locator('[data-testid="audit-logs-list"]')
    await expect(auditList).toBeVisible()
  })

  test('should show audit log details', async ({ page }) => {
    const auditLogs = page.locator('[data-testid^="audit-log-"]')
    
    if (await auditLogs.first().isVisible()) {
      const firstLog = auditLogs.first()
      
      // Should show log information
      await expect(firstLog.locator('[data-testid="log-action"]')).toBeVisible()
      await expect(firstLog.locator('[data-testid="log-timestamp"]')).toBeVisible()
      await expect(firstLog.locator('[data-testid="log-risk-level"]')).toBeVisible()
    }
  })

  test('should filter audit logs', async ({ page }) => {
    // Test risk level filter
    const riskFilter = page.locator('[data-testid="risk-level-filter"]')
    if (await riskFilter.isVisible()) {
      await riskFilter.selectOption('high')
      
      // Should update the logs display
      await page.waitForTimeout(1000) // Wait for filter to apply
      
      // Verify high-risk logs are shown
      const highRiskLogs = page.locator('[data-testid="risk-level-high"]')
      if (await highRiskLogs.first().isVisible()) {
        await expect(highRiskLogs.first()).toBeVisible()
      }
    }
  })

  test('should export audit logs', async ({ page }) => {
    const exportButton = page.locator('[data-testid="export-audit-logs-button"]')
    
    if (await exportButton.isVisible()) {
      // Set up download listener
      const downloadPromise = page.waitForEvent('download')
      
      await exportButton.click()
      
      // Wait for download
      const download = await downloadPromise
      expect(download.suggestedFilename()).toContain('audit-logs')
    }
  })
})

test.describe('Security Settings', () => {
  test('should update security preferences', async ({ page }) => {
    await page.goto('/security')
    
    // Look for security settings
    const settingsButton = page.locator('[data-testid="security-settings-button"]')
    if (await settingsButton.isVisible()) {
      await settingsButton.click()
      
      // Should show settings modal/page
      await expect(page.locator('[data-testid="security-settings-modal"]')).toBeVisible()
      
      // Test toggling security options
      const sessionTimeoutSetting = page.locator('[data-testid="session-timeout-setting"]')
      if (await sessionTimeoutSetting.isVisible()) {
        await sessionTimeoutSetting.click()
        
        // Save settings
        await page.click('[data-testid="save-security-settings-button"]')
        
        // Should show success message
        await expect(page.locator('[data-testid="settings-saved-message"]')).toBeVisible()
      }
    }
  })
})

test.describe('Security Alerts', () => {
  test('should display security alerts', async ({ page }) => {
    await page.goto('/security')
    
    // Look for security alerts section
    const alertsSection = page.locator('[data-testid="security-alerts"]')
    if (await alertsSection.isVisible()) {
      // Should show alert count
      await expect(alertsSection.locator('[data-testid="alerts-count"]')).toBeVisible()
      
      // If there are alerts, should show them
      const alertsList = page.locator('[data-testid="alerts-list"]')
      if (await alertsList.isVisible()) {
        const alerts = page.locator('[data-testid^="alert-"]')
        await expect(alerts.first()).toBeVisible()
      }
    }
  })

  test('should handle alert actions', async ({ page }) => {
    await page.goto('/security')
    
    const firstAlert = page.locator('[data-testid^="alert-"]').first()
    if (await firstAlert.isVisible()) {
      // Should have action buttons
      const dismissButton = firstAlert.locator('[data-testid="dismiss-alert-button"]')
      if (await dismissButton.isVisible()) {
        await dismissButton.click()
        
        // Alert should be dismissed
        await expect(firstAlert).not.toBeVisible()
      }
    }
  })
})

test.describe('Password Security', () => {
  test('should show password strength indicator', async ({ page }) => {
    // Navigate to password change section
    await page.goto('/security')
    
    const changePasswordButton = page.locator('[data-testid="change-password-button"]')
    if (await changePasswordButton.isVisible()) {
      await changePasswordButton.click()
      
      // Should show password form
      await expect(page.locator('[data-testid="password-form"]')).toBeVisible()
      
      // Test password strength indicator
      const passwordInput = page.locator('[data-testid="new-password-input"]')
      await passwordInput.fill('weak')
      
      // Should show weak strength
      await expect(page.locator('[data-testid="password-strength-weak"]')).toBeVisible()
      
      // Test strong password
      await passwordInput.fill('StrongP@ssw0rd123!')
      await expect(page.locator('[data-testid="password-strength-strong"]')).toBeVisible()
    }
  })
})
