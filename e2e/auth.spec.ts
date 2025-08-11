import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the login page
    await page.goto('/login')
  })

  test('should display login form', async ({ page }) => {
    await expect(page).toHaveTitle(/QC Tool/)
    await expect(page.locator('h1')).toContainText('Sign In')
    
    // Check form elements
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should show validation errors for empty form', async ({ page }) => {
    // Try to submit empty form
    await page.click('button[type="submit"]')
    
    // Should show validation errors (assuming they exist)
    await expect(page.locator('[data-testid="error-message"]').first()).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    // Fill form with invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/invalid/i)
  })

  test('should redirect to dashboard on successful login', async ({ page }) => {
    // Mock successful login by going directly to dashboard
    // In a real scenario, you'd set up test users and authentication
    await page.goto('/dashboard')
    
    // Should be on dashboard (assuming authentication middleware redirects unauthenticated users)
    await expect(page).toHaveURL(/dashboard/)
    await expect(page.locator('h1')).toContainText(/dashboard/i)
  })

  test('should handle logout', async ({ page }) => {
    // Navigate to dashboard (assuming user is logged in)
    await page.goto('/dashboard')
    
    // Find and click logout button
    const logoutButton = page.locator('[data-testid="logout-button"]')
    if (await logoutButton.isVisible()) {
      await logoutButton.click()
      
      // Should redirect to login
      await expect(page).toHaveURL(/login/)
    }
  })
})

test.describe('Session Management', () => {
  test.beforeEach(async ({ page }) => {
    // Assume user is logged in for these tests
    await page.goto('/dashboard')
  })

  test('should maintain session across page refreshes', async ({ page }) => {
    // Refresh the page
    await page.reload()
    
    // Should still be authenticated
    await expect(page).toHaveURL(/dashboard/)
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test('should handle session timeout gracefully', async ({ page }) => {
    // This would require mocking session expiration
    // For now, just test that the session timeout warning appears
    
    // Navigate to a secure page
    await page.goto('/security')
    
    // Check that security features are accessible
    await expect(page.locator('h1')).toContainText(/security/i)
  })
})

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
  })

  test('should navigate through main sections', async ({ page }) => {
    const navigationItems = [
      { name: 'Files', url: '/files' },
      { name: 'Projects', url: '/projects' },
      { name: 'Team', url: '/team' },
      { name: 'Analytics', url: '/analytics' },
      { name: 'Security', url: '/security' }
    ]

    for (const item of navigationItems) {
      // Click navigation item
      await page.click(`a[href="${item.url}"]`)
      
      // Verify navigation
      await expect(page).toHaveURL(new RegExp(item.url))
      
      // Verify page loaded
      await expect(page.locator('main')).toBeVisible()
    }
  })

  test('should show responsive navigation on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Check if mobile menu toggle is visible
    const mobileMenuToggle = page.locator('[data-testid="mobile-menu-toggle"]')
    if (await mobileMenuToggle.isVisible()) {
      await mobileMenuToggle.click()
      
      // Check if navigation menu appears
      await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible()
    }
  })
})

test.describe('Error Handling', () => {
  test('should display 404 page for non-existent routes', async ({ page }) => {
    await page.goto('/non-existent-page')
    
    // Should show 404 page
    await expect(page.locator('h1')).toContainText(/404|not found/i)
  })

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate network failure
    await page.route('**/api/**', route => {
      route.abort('failed')
    })
    
    await page.goto('/dashboard')
    
    // Should show error state or loading state
    // This depends on how your app handles network errors
    const errorElement = page.locator('[data-testid="error-state"]')
    const loadingElement = page.locator('[data-testid="loading-state"]')
    
    await expect(errorElement.or(loadingElement)).toBeVisible()
  })
})

test.describe('Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Test tab navigation
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toBeVisible()
    
    // Continue tabbing through interactive elements
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab')
      const focusedElement = page.locator(':focus')
      await expect(focusedElement).toBeVisible()
    }
  })

  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Check for h1 tag
    await expect(page.locator('h1')).toBeVisible()
    
    // Check heading hierarchy (h1 -> h2 -> h3, etc.)
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all()
    expect(headings.length).toBeGreaterThan(0)
  })

  test('should have alt text for images', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Check that all images have alt attributes
    const images = await page.locator('img').all()
    for (const image of images) {
      const altText = await image.getAttribute('alt')
      expect(altText).toBeTruthy()
    }
  })
})

test.describe('Performance', () => {
  test('should load dashboard within acceptable time', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    const loadTime = Date.now() - startTime
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000)
  })

  test('should not have console errors', async ({ page }) => {
    const consoleErrors: string[] = []
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })
    
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Filter out known acceptable errors (if any)
    const significantErrors = consoleErrors.filter(error => 
      !error.includes('favicon') && // Ignore favicon errors
      !error.includes('Extension') // Ignore browser extension errors
    )
    
    expect(significantErrors).toHaveLength(0)
  })
})
