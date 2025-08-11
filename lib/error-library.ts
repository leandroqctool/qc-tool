// Enterprise Error Library & Tracking System
import { neon } from '@neondatabase/serverless'
import { notificationManager } from './notifications'

export interface ErrorDefinition {
  id: string
  code: string // E.g., "FILE_001", "AUTH_002"
  title: string
  description: string
  category: ErrorCategory
  severity: 'low' | 'medium' | 'high' | 'critical'
  component: string // Which part of the system
  tags: string[]
  causes: ErrorCause[]
  solutions: ErrorSolution[]
  relatedErrors: string[]
  tenantId: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  metadata: {
    frequency: number
    lastOccurrence?: Date
    affectedUsers: number
    avgResolutionTime: number // minutes
    documentationUrl?: string
    videoUrl?: string
  }
}

export interface ErrorCategory {
  id: string
  name: string
  description: string
  color: string
  icon: string
  parentId?: string
}

export interface ErrorCause {
  id: string
  description: string
  likelihood: 'low' | 'medium' | 'high'
  conditions: string[]
  technicalDetails?: string
}

export interface ErrorSolution {
  id: string
  title: string
  description: string
  steps: SolutionStep[]
  difficulty: 'easy' | 'moderate' | 'advanced'
  estimatedTime: number // minutes
  requiresAdmin: boolean
  tags: string[]
  successRate: number // 0-1
  votes: {
    helpful: number
    notHelpful: number
  }
}

export interface SolutionStep {
  order: number
  title: string
  description: string
  type: 'action' | 'check' | 'warning' | 'info'
  code?: string
  screenshot?: string
}

export interface ErrorOccurrence {
  id: string
  errorId: string
  tenantId: string
  userId?: string
  sessionId: string
  timestamp: Date
  context: {
    url: string
    userAgent: string
    userId?: string
    component: string
    action: string
    metadata: Record<string, unknown>
  }
  stackTrace?: string
  resolved: boolean
  resolvedAt?: Date
  resolvedBy?: string
  resolution?: {
    solutionId: string
    timeToResolve: number // minutes
    wasHelpful: boolean
    feedback?: string
  }
}

export interface ErrorPattern {
  id: string
  name: string
  description: string
  conditions: PatternCondition[]
  occurrences: number
  trend: 'increasing' | 'stable' | 'decreasing'
  severity: 'low' | 'medium' | 'high' | 'critical'
  affectedComponents: string[]
  suggestedActions: string[]
  createdAt: Date
  lastDetected: Date
}

export interface PatternCondition {
  field: string
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in_range'
  value: unknown
  weight: number
}

export interface ErrorAnalytics {
  totalErrors: number
  resolvedErrors: number
  avgResolutionTime: number
  topErrors: {
    errorId: string
    title: string
    occurrences: number
    trend: number // percentage change
  }[]
  categoryBreakdown: {
    category: string
    count: number
    percentage: number
  }[]
  severityBreakdown: {
    severity: string
    count: number
    percentage: number
  }[]
  resolutionStats: {
    selfResolved: number
    supportResolved: number
    unresolved: number
  }
  patterns: ErrorPattern[]
  trends: {
    daily: { date: Date; count: number }[]
    weekly: { week: string; count: number }[]
    monthly: { month: string; count: number }[]
  }
}

// Error Library Manager
export class ErrorLibraryManager {
  private sql: ReturnType<typeof neon>

  constructor() {
    this.sql = neon(process.env.DATABASE_URL!)
  }

  // Error Definition Management
  async createErrorDefinition(error: Omit<ErrorDefinition, 'id' | 'createdAt' | 'updatedAt' | 'metadata'>): Promise<string> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const fullError: ErrorDefinition = {
      ...error,
      id: errorId,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        frequency: 0,
        affectedUsers: 0,
        avgResolutionTime: 0
      }
    }

    await this.storeErrorDefinition(fullError)
    console.log(`Error definition created: ${errorId}`)
    return errorId
  }

  // Track Error Occurrence
  async trackError(occurrence: Omit<ErrorOccurrence, 'id' | 'resolved' | 'resolvedAt' | 'resolvedBy'>): Promise<string> {
    const occurrenceId = `occ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const fullOccurrence: ErrorOccurrence = {
      ...occurrence,
      id: occurrenceId,
      resolved: false
    }

    await this.storeErrorOccurrence(fullOccurrence)

    // Update error definition metadata
    await this.updateErrorMetadata(occurrence.errorId)

    // Check for patterns
    await this.detectPatterns(occurrence.tenantId)

    // Check if this is a critical error requiring immediate attention
    const errorDef = await this.getErrorDefinition(occurrence.errorId)
    if (errorDef && errorDef.severity === 'critical') {
      await this.sendCriticalErrorAlert(errorDef, fullOccurrence)
    }

    console.log(`Error tracked: ${occurrenceId}`)
    return occurrenceId
  }

  // Search Errors
  async searchErrors(query: string, filters: {
    category?: string[]
    severity?: string[]
    component?: string[]
    resolved?: boolean
  }, tenantId: string): Promise<{
    errors: ErrorDefinition[]
    suggestions: ErrorDefinition[]
    total: number
  }> {
    console.log(`Searching errors: "${query}" in tenant: ${tenantId}`)

    const allErrors = await this.getErrors(tenantId, filters)
    
    // Simple text search - would use full-text search in production
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2)
    
    const matchingErrors = allErrors.filter(error => {
      const searchText = `${error.title} ${error.description} ${error.code} ${error.tags.join(' ')}`.toLowerCase()
      return searchTerms.some(term => searchText.includes(term))
    })

    // Get related/suggested errors
    const suggestions = await this.getSimilarErrors(matchingErrors[0]?.id || '', tenantId, 5)

    return {
      errors: matchingErrors,
      suggestions,
      total: matchingErrors.length
    }
  }

  // Get Error with Solutions
  async getErrorWithSolutions(errorId: string): Promise<{
    error: ErrorDefinition
    solutions: ErrorSolution[]
    recentOccurrences: ErrorOccurrence[]
    similarErrors: ErrorDefinition[]
  } | null> {
    const error = await this.getErrorDefinition(errorId)
    if (!error) return null

    const solutions = error.solutions.sort((a, b) => b.successRate - a.successRate)
    const recentOccurrences = await this.getRecentOccurrences(errorId, 10)
    const similarErrors = await this.getSimilarErrors(errorId, error.tenantId, 5)

    return {
      error,
      solutions,
      recentOccurrences,
      similarErrors
    }
  }

  // Mark Error as Resolved
  async resolveError(occurrenceId: string, solutionId: string, resolvedBy: string, wasHelpful: boolean, feedback?: string): Promise<void> {
    const occurrence = await this.getErrorOccurrence(occurrenceId)
    if (!occurrence) {
      throw new Error('Error occurrence not found')
    }

    const resolvedAt = new Date()
    const timeToResolve = Math.round((resolvedAt.getTime() - occurrence.timestamp.getTime()) / (1000 * 60))

    // Update occurrence
    occurrence.resolved = true
    occurrence.resolvedAt = resolvedAt
    occurrence.resolvedBy = resolvedBy
    occurrence.resolution = {
      solutionId,
      timeToResolve,
      wasHelpful,
      feedback
    }

    await this.updateErrorOccurrence(occurrence)

    // Update solution success rate
    await this.updateSolutionStats(solutionId, wasHelpful)

    // Update error definition metadata
    await this.updateErrorMetadata(occurrence.errorId)

    console.log(`Error resolved: ${occurrenceId}`)
  }

  // Pattern Detection
  async detectPatterns(tenantId: string): Promise<ErrorPattern[]> {
    console.log(`Detecting error patterns for tenant: ${tenantId}`)

    const recentOccurrences = await this.getRecentOccurrences('', 1000, tenantId)
    const patterns: ErrorPattern[] = []

    // Group by error type
    const errorGroups = this.groupOccurrencesByError(recentOccurrences)

    for (const [errorId, occurrences] of Object.entries(errorGroups)) {
      if (occurrences.length < 5) continue // Need minimum occurrences to detect pattern

      // Time-based patterns
      const timePattern = this.detectTimePattern(occurrences)
      if (timePattern) {
        patterns.push(timePattern)
      }

      // User-based patterns
      const userPattern = this.detectUserPattern(occurrences)
      if (userPattern) {
        patterns.push(userPattern)
      }

      // Context-based patterns
      const contextPattern = this.detectContextPattern(occurrences)
      if (contextPattern) {
        patterns.push(contextPattern)
      }
    }

    // Store detected patterns
    for (const pattern of patterns) {
      await this.storePattern(pattern)
    }

    return patterns
  }

  // Error Analytics
  async getErrorAnalytics(tenantId: string, period: { from: Date; to: Date }): Promise<ErrorAnalytics> {
    console.log(`Generating error analytics for tenant: ${tenantId}`)

    const occurrences = await this.getOccurrencesInPeriod(tenantId, period)
    const totalErrors = occurrences.length
    const resolvedErrors = occurrences.filter(o => o.resolved).length

    // Calculate average resolution time
    const resolvedOccurrences = occurrences.filter(o => o.resolved && o.resolution)
    const avgResolutionTime = resolvedOccurrences.length > 0
      ? resolvedOccurrences.reduce((sum, o) => sum + (o.resolution?.timeToResolve || 0), 0) / resolvedOccurrences.length
      : 0

    // Top errors
    const errorCounts = this.groupAndCount(occurrences, 'errorId')
    const topErrors = Object.entries(errorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([errorId, count]) => ({
        errorId,
        title: 'Error Title', // Would fetch from error definition
        occurrences: count,
        trend: 0 // Would calculate trend
      }))

    // Category breakdown
    const categoryBreakdown = await this.getCategoryBreakdown(occurrences)

    // Severity breakdown
    const severityBreakdown = await this.getSeverityBreakdown(occurrences)

    // Resolution stats
    const resolutionStats = {
      selfResolved: resolvedOccurrences.filter(o => o.resolvedBy === o.userId).length,
      supportResolved: resolvedOccurrences.filter(o => o.resolvedBy !== o.userId).length,
      unresolved: totalErrors - resolvedErrors
    }

    // Patterns
    const patterns = await this.getPatterns(tenantId, period)

    // Trends
    const trends = this.calculateTrends(occurrences, period)

    return {
      totalErrors,
      resolvedErrors,
      avgResolutionTime,
      topErrors,
      categoryBreakdown,
      severityBreakdown,
      resolutionStats,
      patterns,
      trends
    }
  }

  // AI-Powered Error Analysis
  async analyzeErrorWithAI(occurrenceId: string): Promise<{
    likelyCauses: string[]
    suggestedSolutions: string[]
    similarIssues: string[]
    preventionTips: string[]
  }> {
    console.log(`AI analyzing error occurrence: ${occurrenceId}`)

    const occurrence = await this.getErrorOccurrence(occurrenceId)
    if (!occurrence) {
      throw new Error('Error occurrence not found')
    }

    // Mock AI analysis - would integrate with AI service
    return {
      likelyCauses: [
        'Network connectivity issue',
        'Invalid user permissions',
        'Server overload during peak hours'
      ],
      suggestedSolutions: [
        'Retry the operation after a few minutes',
        'Check network connection',
        'Contact system administrator for permission review'
      ],
      similarIssues: [
        'Users experiencing timeouts during file upload',
        'Authentication failures in mobile app',
        'Database connection errors during maintenance'
      ],
      preventionTips: [
        'Implement retry logic with exponential backoff',
        'Add proper error handling for network failures',
        'Monitor system resources and scale proactively'
      ]
    }
  }

  // Helper Methods
  private async sendCriticalErrorAlert(error: ErrorDefinition, occurrence: ErrorOccurrence): Promise<void> {
    // Notify administrators
    const admins = await this.getAdminUsers(error.tenantId)
    
    for (const admin of admins) {
      await notificationManager.sendNotification({
        userId: admin.id,
        tenantId: error.tenantId,
        type: 'system_alert',
        title: `Critical Error: ${error.title}`,
        message: `A critical error has occurred in ${error.component}. Immediate attention required.`,
        data: {
          errorId: error.id,
          occurrenceId: occurrence.id,
          component: error.component,
          severity: error.severity
        },
        channels: ['email', 'in_app', 'slack'],
        priority: 'urgent',
        metadata: {
          source: 'error_tracking',
          entityType: 'error_occurrence',
          entityId: occurrence.id,
          actionUrl: `/errors/${error.id}`
        }
      })
    }
  }

  private groupOccurrencesByError(occurrences: ErrorOccurrence[]): Record<string, ErrorOccurrence[]> {
    return occurrences.reduce((groups, occurrence) => {
      if (!groups[occurrence.errorId]) {
        groups[occurrence.errorId] = []
      }
      groups[occurrence.errorId].push(occurrence)
      return groups
    }, {} as Record<string, ErrorOccurrence[]>)
  }

  private detectTimePattern(occurrences: ErrorOccurrence[]): ErrorPattern | null {
    // Detect if errors happen at specific times
    const hourCounts = Array(24).fill(0)
    
    occurrences.forEach(occ => {
      const hour = occ.timestamp.getHours()
      hourCounts[hour]++
    })

    const maxCount = Math.max(...hourCounts)
    const avgCount = hourCounts.reduce((sum, count) => sum + count, 0) / 24

    if (maxCount > avgCount * 3) { // Significant spike
      const peakHour = hourCounts.indexOf(maxCount)
      
      return {
        id: `pattern_time_${Date.now()}`,
        name: `Peak Errors at ${peakHour}:00`,
        description: `Errors spike significantly at ${peakHour}:00 (${maxCount} occurrences vs ${avgCount.toFixed(1)} average)`,
        conditions: [{
          field: 'timestamp.hour',
          operator: 'equals',
          value: peakHour,
          weight: 1.0
        }],
        occurrences: maxCount,
        trend: 'increasing',
        severity: maxCount > avgCount * 5 ? 'high' : 'medium',
        affectedComponents: [...new Set(occurrences.map(o => o.context.component))],
        suggestedActions: [
          'Investigate system load during peak hours',
          'Consider scaling resources',
          'Review scheduled tasks'
        ],
        createdAt: new Date(),
        lastDetected: new Date()
      }
    }

    return null
  }

  private detectUserPattern(occurrences: ErrorOccurrence[]): ErrorPattern | null {
    // Detect if specific users are disproportionately affected
    const userCounts = this.groupAndCount(occurrences, 'userId')
    const users = Object.keys(userCounts).filter(id => id && id !== 'undefined')
    
    if (users.length === 0) return null

    const maxUserErrors = Math.max(...Object.values(userCounts))
    const avgUserErrors = Object.values(userCounts).reduce((sum, count) => sum + count, 0) / users.length

    if (maxUserErrors > avgUserErrors * 3) {
      const affectedUser = Object.entries(userCounts).find(([, count]) => count === maxUserErrors)?.[0]
      
      return {
        id: `pattern_user_${Date.now()}`,
        name: 'User-Specific Error Pattern',
        description: `One user experiencing significantly more errors (${maxUserErrors} vs ${avgUserErrors.toFixed(1)} average)`,
        conditions: [{
          field: 'userId',
          operator: 'equals',
          value: affectedUser,
          weight: 1.0
        }],
        occurrences: maxUserErrors,
        trend: 'stable',
        severity: 'medium',
        affectedComponents: [...new Set(occurrences.filter(o => o.userId === affectedUser).map(o => o.context.component))],
        suggestedActions: [
          'Review user permissions and access',
          'Check user-specific configuration',
          'Investigate user behavior patterns'
        ],
        createdAt: new Date(),
        lastDetected: new Date()
      }
    }

    return null
  }

  private detectContextPattern(occurrences: ErrorOccurrence[]): ErrorPattern | null {
    // Detect patterns in context (browser, component, etc.)
    const componentCounts = this.groupAndCount(occurrences, 'context.component')
    const components = Object.keys(componentCounts)
    
    if (components.length === 0) return null

    const maxComponentErrors = Math.max(...Object.values(componentCounts))
    const avgComponentErrors = Object.values(componentCounts).reduce((sum, count) => sum + count, 0) / components.length

    if (maxComponentErrors > avgComponentErrors * 2) {
      const affectedComponent = Object.entries(componentCounts).find(([, count]) => count === maxComponentErrors)?.[0]
      
      return {
        id: `pattern_component_${Date.now()}`,
        name: 'Component-Specific Error Pattern',
        description: `High error rate in ${affectedComponent} component (${maxComponentErrors} vs ${avgComponentErrors.toFixed(1)} average)`,
        conditions: [{
          field: 'context.component',
          operator: 'equals',
          value: affectedComponent,
          weight: 1.0
        }],
        occurrences: maxComponentErrors,
        trend: 'increasing',
        severity: maxComponentErrors > avgComponentErrors * 4 ? 'high' : 'medium',
        affectedComponents: [affectedComponent || ''],
        suggestedActions: [
          `Review ${affectedComponent} component code`,
          'Check component dependencies',
          'Monitor component performance metrics'
        ],
        createdAt: new Date(),
        lastDetected: new Date()
      }
    }

    return null
  }

  private groupAndCount<T>(items: T[], key: keyof T): Record<string, number> {
    return items.reduce((counts, item) => {
      const value = String(item[key] || 'unknown')
      counts[value] = (counts[value] || 0) + 1
      return counts
    }, {} as Record<string, number>)
  }

  private calculateTrends(occurrences: ErrorOccurrence[], period: { from: Date; to: Date }): ErrorAnalytics['trends'] {
    const daily: { date: Date; count: number }[] = []
    const weekly: { week: string; count: number }[] = []
    const monthly: { month: string; count: number }[] = []

    // Group by day
    const dayGroups = occurrences.reduce((groups, occ) => {
      const day = occ.timestamp.toDateString()
      groups[day] = (groups[day] || 0) + 1
      return groups
    }, {} as Record<string, number>)

    Object.entries(dayGroups).forEach(([day, count]) => {
      daily.push({ date: new Date(day), count })
    })

    // Mock weekly and monthly data
    weekly.push({ week: 'Week 1', count: 25 })
    monthly.push({ month: 'January', count: 150 })

    return { daily, weekly, monthly }
  }

  // Database operations (placeholders)
  private async storeErrorDefinition(error: ErrorDefinition): Promise<void> {
    console.log(`Storing error definition: ${error.id}`)
  }

  private async getErrorDefinition(errorId: string): Promise<ErrorDefinition | null> {
    console.log(`Getting error definition: ${errorId}`)
    return null
  }

  private async getErrors(tenantId: string, filters: Record<string, unknown>): Promise<ErrorDefinition[]> {
    console.log(`Getting errors for tenant: ${tenantId}`)
    return []
  }

  private async storeErrorOccurrence(occurrence: ErrorOccurrence): Promise<void> {
    console.log(`Storing error occurrence: ${occurrence.id}`)
  }

  private async getErrorOccurrence(occurrenceId: string): Promise<ErrorOccurrence | null> {
    console.log(`Getting error occurrence: ${occurrenceId}`)
    return null
  }

  private async updateErrorOccurrence(occurrence: ErrorOccurrence): Promise<void> {
    console.log(`Updating error occurrence: ${occurrence.id}`)
  }

  private async updateErrorMetadata(errorId: string): Promise<void> {
    console.log(`Updating error metadata: ${errorId}`)
  }

  private async getSimilarErrors(errorId: string, tenantId: string, limit: number): Promise<ErrorDefinition[]> {
    console.log(`Getting similar errors for: ${errorId}`)
    return []
  }

  private async getRecentOccurrences(errorId: string, limit: number, tenantId?: string): Promise<ErrorOccurrence[]> {
    console.log(`Getting recent occurrences for error: ${errorId}`)
    return []
  }

  private async updateSolutionStats(solutionId: string, wasHelpful: boolean): Promise<void> {
    console.log(`Updating solution stats: ${solutionId}, helpful: ${wasHelpful}`)
  }

  private async storePattern(pattern: ErrorPattern): Promise<void> {
    console.log(`Storing error pattern: ${pattern.id}`)
  }

  private async getOccurrencesInPeriod(tenantId: string, period: { from: Date; to: Date }): Promise<ErrorOccurrence[]> {
    console.log(`Getting occurrences in period for tenant: ${tenantId}`)
    return []
  }

  private async getCategoryBreakdown(occurrences: ErrorOccurrence[]): Promise<{ category: string; count: number; percentage: number }[]> {
    return [
      { category: 'Authentication', count: 25, percentage: 30 },
      { category: 'File Upload', count: 20, percentage: 24 },
      { category: 'Database', count: 15, percentage: 18 }
    ]
  }

  private async getSeverityBreakdown(occurrences: ErrorOccurrence[]): Promise<{ severity: string; count: number; percentage: number }[]> {
    return [
      { severity: 'Low', count: 40, percentage: 50 },
      { severity: 'Medium', count: 25, percentage: 31 },
      { severity: 'High', count: 12, percentage: 15 },
      { severity: 'Critical', count: 3, percentage: 4 }
    ]
  }

  private async getPatterns(tenantId: string, period: { from: Date; to: Date }): Promise<ErrorPattern[]> {
    console.log(`Getting patterns for tenant: ${tenantId}`)
    return []
  }

  private async getAdminUsers(tenantId: string): Promise<{ id: string }[]> {
    const admins = await this.sql`SELECT id FROM users WHERE tenant_id = ${tenantId} AND role = 'admin'` as { id: string }[]
    return admins
  }
}

// Predefined Error Categories
export const ERROR_CATEGORIES: ErrorCategory[] = [
  { id: 'auth', name: 'Authentication', description: 'Login, permissions, and access issues', color: '#ef4444', icon: 'shield' },
  { id: 'file', name: 'File Operations', description: 'Upload, download, and file processing', color: '#f97316', icon: 'file' },
  { id: 'database', name: 'Database', description: 'Data storage and retrieval issues', color: '#eab308', icon: 'database' },
  { id: 'network', name: 'Network', description: 'Connectivity and API communication', color: '#22c55e', icon: 'wifi' },
  { id: 'ui', name: 'User Interface', description: 'Frontend rendering and interaction', color: '#3b82f6', icon: 'monitor' },
  { id: 'performance', name: 'Performance', description: 'Speed and resource utilization', color: '#8b5cf6', icon: 'zap' },
  { id: 'security', name: 'Security', description: 'Security vulnerabilities and breaches', color: '#ec4899', icon: 'lock' }
]

// Export error library manager instance
export const errorLibraryManager = new ErrorLibraryManager()
