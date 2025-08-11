// Enterprise Time Tracking & Productivity System
import { neon } from '@neondatabase/serverless'
import { notificationManager } from './notifications'

export interface TimeEntry {
  id: string
  userId: string
  userName: string
  tenantId: string
  projectId?: string
  projectName?: string
  fileId?: string
  fileName?: string
  taskId?: string
  taskName?: string
  category: 'qc_review' | 'annotation' | 'revision' | 'meeting' | 'admin' | 'research' | 'training' | 'other'
  description?: string
  startTime: Date
  endTime?: Date
  duration?: number // seconds
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  tags: string[]
  billable: boolean
  hourlyRate?: number
  metadata: {
    source: 'manual' | 'automatic' | 'import'
    device: string
    location?: string
    screenshots?: string[]
    activityLevel?: number // 0-100
    keystrokes?: number
    mouseClicks?: number
    applications?: string[]
  }
  createdAt: Date
  updatedAt: Date
}

export interface TimeSession {
  id: string
  userId: string
  tenantId: string
  startTime: Date
  endTime?: Date
  totalDuration: number // seconds
  entries: TimeEntry[]
  status: 'active' | 'completed'
  productivity: {
    activeTime: number // seconds of active work
    idleTime: number // seconds of idle time
    breakTime: number // seconds of breaks
    productivityScore: number // 0-100
  }
  goals: {
    targetHours: number
    achievedHours: number
    efficiency: number // 0-100
  }
}

export interface ProductivityMetrics {
  userId: string
  userName: string
  period: { from: Date; to: Date }
  totalHours: number
  billableHours: number
  productivityScore: number
  efficiency: number
  breakdown: {
    category: string
    hours: number
    percentage: number
    billableHours: number
  }[]
  dailyTrends: {
    date: Date
    hours: number
    productivityScore: number
    topActivity: string
  }[]
  timeDistribution: {
    morningHours: number   // 6-12
    afternoonHours: number // 12-18
    eveningHours: number   // 18-24
    preferredWorkingHours: string
  }
  comparisons: {
    previousPeriod: {
      totalHours: number
      change: number // percentage
    }
    teamAverage: {
      totalHours: number
      position: 'above' | 'below' | 'average'
    }
  }
}

export interface TeamProductivityReport {
  period: { from: Date; to: Date }
  teamMetrics: {
    totalTeamHours: number
    averageHoursPerPerson: number
    totalBillableHours: number
    averageProductivityScore: number
    utilizationRate: number // percentage of available time used
  }
  memberPerformance: ProductivityMetrics[]
  projectBreakdown: {
    projectId: string
    projectName: string
    totalHours: number
    teamMembers: number
    averageHoursPerMember: number
    completionRate: number
  }[]
  insights: {
    type: 'peak_hours' | 'low_productivity' | 'overtime_alert' | 'efficiency_trend'
    message: string
    data: Record<string, unknown>
    actionRequired: boolean
  }[]
}

export interface TimeTrackingSettings {
  userId: string
  tenantId: string
  preferences: {
    autoStart: boolean
    autoStop: boolean
    idleThreshold: number // minutes
    breakReminders: boolean
    breakInterval: number // minutes
    dailyGoal: number // hours
    weeklyGoal: number // hours
    overtimeAlert: boolean
    screenshotFrequency: number // minutes, 0 = disabled
    activityMonitoring: boolean
  }
  notifications: {
    timeGoalReached: boolean
    idleTimeAlert: boolean
    overtimeWarning: boolean
    dailySummary: boolean
    weeklySummary: boolean
  }
  integrations: {
    calendar: boolean
    projectManagement: boolean
    invoicing: boolean
  }
  updatedAt: Date
}

export interface TimeReport {
  id: string
  type: 'daily' | 'weekly' | 'monthly' | 'custom'
  period: { from: Date; to: Date }
  userId?: string
  projectId?: string
  tenantId: string
  generatedAt: Date
  data: {
    summary: {
      totalHours: number
      billableHours: number
      nonBillableHours: number
      overtimeHours: number
      productivityScore: number
    }
    entries: TimeEntry[]
    charts: {
      dailyHours: { date: Date; hours: number }[]
      categoryBreakdown: { category: string; hours: number; percentage: number }[]
      projectDistribution: { project: string; hours: number; percentage: number }[]
    }
    insights: string[]
  }
  exportFormats: ('pdf' | 'excel' | 'csv')[]
}

// Time Tracking Manager
export class TimeTrackingManager {
  private sql: ReturnType<typeof neon>
  private activeTimers: Map<string, NodeJS.Timeout> = new Map()

  constructor() {
    this.sql = neon(process.env.DATABASE_URL!)
  }

  // Time Entry Management
  async startTimeEntry(entry: Omit<TimeEntry, 'id' | 'endTime' | 'duration' | 'status' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const entryId = `time_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Stop any active timers for this user
    await this.stopActiveTimers(entry.userId)

    const fullEntry: TimeEntry = {
      ...entry,
      id: entryId,
      startTime: new Date(),
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await this.storeTimeEntry(fullEntry)

    // Set up automatic tracking
    this.setupAutomaticTracking(fullEntry)

    console.log(`Time tracking started: ${entryId}`)
    return entryId
  }

  // Stop Time Entry
  async stopTimeEntry(entryId: string): Promise<void> {
    const entry = await this.getTimeEntry(entryId)
    if (!entry || entry.status !== 'active') {
      throw new Error('Time entry not found or not active')
    }

    const endTime = new Date()
    const duration = Math.round((endTime.getTime() - entry.startTime.getTime()) / 1000)

    entry.endTime = endTime
    entry.duration = duration
    entry.status = 'completed'
    entry.updatedAt = new Date()

    await this.updateTimeEntry(entry)

    // Clear automatic tracking
    this.clearAutomaticTracking(entryId)

    // Update productivity metrics
    await this.updateProductivityMetrics(entry.userId, entry.tenantId)

    console.log(`Time tracking stopped: ${entryId} (${this.formatDuration(duration)})`)
  }

  // Pause/Resume Time Entry
  async pauseTimeEntry(entryId: string): Promise<void> {
    const entry = await this.getTimeEntry(entryId)
    if (!entry || entry.status !== 'active') {
      throw new Error('Time entry not found or not active')
    }

    entry.status = 'paused'
    entry.updatedAt = new Date()

    await this.updateTimeEntry(entry)
    this.clearAutomaticTracking(entryId)

    console.log(`Time tracking paused: ${entryId}`)
  }

  async resumeTimeEntry(entryId: string): Promise<void> {
    const entry = await this.getTimeEntry(entryId)
    if (!entry || entry.status !== 'paused') {
      throw new Error('Time entry not found or not paused')
    }

    entry.status = 'active'
    entry.updatedAt = new Date()

    await this.updateTimeEntry(entry)
    this.setupAutomaticTracking(entry)

    console.log(`Time tracking resumed: ${entryId}`)
  }

  // Manual Time Entry
  async createManualTimeEntry(entry: Omit<TimeEntry, 'id' | 'status' | 'createdAt' | 'updatedAt'> & { duration: number }): Promise<string> {
    const entryId = `time_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const fullEntry: TimeEntry = {
      ...entry,
      id: entryId,
      status: 'completed',
      metadata: {
        ...entry.metadata,
        source: 'manual'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await this.storeTimeEntry(fullEntry)
    await this.updateProductivityMetrics(entry.userId, entry.tenantId)

    console.log(`Manual time entry created: ${entryId}`)
    return entryId
  }

  // Get User's Active Time Entry
  async getActiveTimeEntry(userId: string): Promise<TimeEntry | null> {
    const entries = await this.getUserTimeEntries(userId, { status: 'active' })
    return entries.length > 0 ? entries[0] : null
  }

  // Time Sessions
  async startTimeSession(userId: string, tenantId: string, targetHours: number = 8): Promise<string> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const session: TimeSession = {
      id: sessionId,
      userId,
      tenantId,
      startTime: new Date(),
      totalDuration: 0,
      entries: [],
      status: 'active',
      productivity: {
        activeTime: 0,
        idleTime: 0,
        breakTime: 0,
        productivityScore: 0
      },
      goals: {
        targetHours,
        achievedHours: 0,
        efficiency: 0
      }
    }

    await this.storeTimeSession(session)
    console.log(`Time session started: ${sessionId}`)
    return sessionId
  }

  // Productivity Analytics
  async getProductivityMetrics(userId: string, period: { from: Date; to: Date }): Promise<ProductivityMetrics> {
    console.log(`Getting productivity metrics for user: ${userId}`)

    const entries = await this.getUserTimeEntries(userId, { period })
    const user = await this.getUser(userId)

    const totalSeconds = entries.reduce((sum, entry) => sum + (entry.duration || 0), 0)
    const totalHours = totalSeconds / 3600

    const billableEntries = entries.filter(e => e.billable)
    const billableHours = billableEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 3600

    // Calculate productivity score based on activity levels
    const productivityScore = entries.length > 0
      ? entries.reduce((sum, entry) => sum + (entry.metadata.activityLevel || 50), 0) / entries.length
      : 0

    // Efficiency: ratio of productive time to total time
    const efficiency = totalHours > 0 ? (productivityScore / 100) * 100 : 0

    // Category breakdown
    const categoryBreakdown = this.calculateCategoryBreakdown(entries)

    // Daily trends
    const dailyTrends = this.calculateDailyTrends(entries, period)

    // Time distribution
    const timeDistribution = this.calculateTimeDistribution(entries)

    // Comparisons (mock data)
    const comparisons = {
      previousPeriod: {
        totalHours: totalHours * 0.9, // Mock 10% improvement
        change: 10
      },
      teamAverage: {
        totalHours: 35, // Mock team average
        position: totalHours > 35 ? 'above' as const : totalHours < 35 ? 'below' as const : 'average' as const
      }
    }

    return {
      userId,
      userName: user?.name || 'Unknown User',
      period,
      totalHours,
      billableHours,
      productivityScore,
      efficiency,
      breakdown: categoryBreakdown,
      dailyTrends,
      timeDistribution,
      comparisons
    }
  }

  // Team Productivity Report
  async generateTeamProductivityReport(tenantId: string, period: { from: Date; to: Date }): Promise<TeamProductivityReport> {
    console.log(`Generating team productivity report for tenant: ${tenantId}`)

    const users = await this.getTeamUsers(tenantId)
    const memberPerformance: ProductivityMetrics[] = []

    // Get metrics for each team member
    for (const user of users) {
      const metrics = await this.getProductivityMetrics(user.id, period)
      memberPerformance.push(metrics)
    }

    // Calculate team metrics
    const totalTeamHours = memberPerformance.reduce((sum, m) => sum + m.totalHours, 0)
    const averageHoursPerPerson = users.length > 0 ? totalTeamHours / users.length : 0
    const totalBillableHours = memberPerformance.reduce((sum, m) => sum + m.billableHours, 0)
    const averageProductivityScore = users.length > 0
      ? memberPerformance.reduce((sum, m) => sum + m.productivityScore, 0) / users.length
      : 0

    // Calculate utilization rate (assuming 40 hours per week per person)
    const workingDays = this.calculateWorkingDays(period)
    const expectedHours = users.length * workingDays * 8 // 8 hours per day
    const utilizationRate = expectedHours > 0 ? (totalTeamHours / expectedHours) * 100 : 0

    // Project breakdown (mock data)
    const projectBreakdown = [
      { projectId: 'proj_1', projectName: 'Marketing Campaign', totalHours: 120, teamMembers: 3, averageHoursPerMember: 40, completionRate: 85 },
      { projectId: 'proj_2', projectName: 'Product Launch', totalHours: 180, teamMembers: 4, averageHoursPerMember: 45, completionRate: 92 }
    ]

    // Generate insights
    const insights = this.generateTeamInsights(memberPerformance, {
      totalTeamHours,
      averageHoursPerPerson,
      totalBillableHours,
      averageProductivityScore,
      utilizationRate
    })

    return {
      period,
      teamMetrics: {
        totalTeamHours,
        averageHoursPerPerson,
        totalBillableHours,
        averageProductivityScore,
        utilizationRate
      },
      memberPerformance,
      projectBreakdown,
      insights
    }
  }

  // Time Tracking Settings
  async updateTimeTrackingSettings(userId: string, tenantId: string, settings: Partial<TimeTrackingSettings>): Promise<void> {
    const currentSettings = await this.getTimeTrackingSettings(userId, tenantId)
    
    const updatedSettings: TimeTrackingSettings = {
      ...currentSettings,
      ...settings,
      userId,
      tenantId,
      updatedAt: new Date()
    }

    await this.storeTimeTrackingSettings(updatedSettings)
    console.log(`Time tracking settings updated for user: ${userId}`)
  }

  // Reports
  async generateTimeReport(config: {
    type: TimeReport['type']
    period: { from: Date; to: Date }
    userId?: string
    projectId?: string
    tenantId: string
  }): Promise<TimeReport> {
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const entries = await this.getTimeEntries({
      tenantId: config.tenantId,
      userId: config.userId,
      projectId: config.projectId,
      period: config.period
    })

    const totalSeconds = entries.reduce((sum, entry) => sum + (entry.duration || 0), 0)
    const totalHours = totalSeconds / 3600

    const billableEntries = entries.filter(e => e.billable)
    const billableHours = billableEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 3600
    const nonBillableHours = totalHours - billableHours

    // Calculate overtime (assuming 8 hours per day)
    const workingDays = this.calculateWorkingDays(config.period)
    const standardHours = workingDays * 8
    const overtimeHours = Math.max(0, totalHours - standardHours)

    const productivityScore = entries.length > 0
      ? entries.reduce((sum, entry) => sum + (entry.metadata.activityLevel || 50), 0) / entries.length
      : 0

    // Generate charts data
    const dailyHours = this.calculateDailyHours(entries, config.period)
    const categoryBreakdown = this.calculateCategoryBreakdown(entries)
    const projectDistribution = this.calculateProjectDistribution(entries)

    // Generate insights
    const insights = this.generateReportInsights(entries, {
      totalHours,
      billableHours,
      productivityScore,
      overtimeHours
    })

    const report: TimeReport = {
      id: reportId,
      type: config.type,
      period: config.period,
      userId: config.userId,
      projectId: config.projectId,
      tenantId: config.tenantId,
      generatedAt: new Date(),
      data: {
        summary: {
          totalHours,
          billableHours,
          nonBillableHours,
          overtimeHours,
          productivityScore
        },
        entries,
        charts: {
          dailyHours,
          categoryBreakdown,
          projectDistribution
        },
        insights
      },
      exportFormats: ['pdf', 'excel', 'csv']
    }

    await this.storeTimeReport(report)
    console.log(`Time report generated: ${reportId}`)
    return report
  }

  // Automatic Tracking
  private setupAutomaticTracking(entry: TimeEntry): void {
    const settings = this.getTimeTrackingSettings(entry.userId, entry.tenantId)
    
    // Set up idle detection
    const idleTimer = setInterval(async () => {
      await this.checkIdleTime(entry)
    }, 60000) // Check every minute

    this.activeTimers.set(entry.id, idleTimer)
  }

  private clearAutomaticTracking(entryId: string): void {
    const timer = this.activeTimers.get(entryId)
    if (timer) {
      clearInterval(timer)
      this.activeTimers.delete(entryId)
    }
  }

  private async checkIdleTime(entry: TimeEntry): Promise<void> {
    const settings = await this.getTimeTrackingSettings(entry.userId, entry.tenantId)
    
    // Mock idle detection - would integrate with system APIs
    const lastActivity = Date.now() - 5 * 60 * 1000 // 5 minutes ago
    const idleThreshold = settings.preferences.idleThreshold * 60 * 1000
    
    if (Date.now() - lastActivity > idleThreshold) {
      await this.pauseTimeEntry(entry.id)
      
      // Send idle notification
      await notificationManager.sendNotification({
        userId: entry.userId,
        tenantId: entry.tenantId,
        type: 'system_alert',
        title: 'Idle Time Detected',
        message: 'Your time tracking has been paused due to inactivity',
        data: { entryId: entry.id },
        channels: ['in_app'],
        priority: 'low',
        metadata: {
          source: 'time_tracking',
          entityType: 'time_entry',
          entityId: entry.id
        }
      })
    }
  }

  // Helper Methods
  private calculateCategoryBreakdown(entries: TimeEntry[]): ProductivityMetrics['breakdown'] {
    const categories = entries.reduce((acc, entry) => {
      const category = entry.category
      if (!acc[category]) {
        acc[category] = { totalSeconds: 0, billableSeconds: 0 }
      }
      acc[category].totalSeconds += entry.duration || 0
      if (entry.billable) {
        acc[category].billableSeconds += entry.duration || 0
      }
      return acc
    }, {} as Record<string, { totalSeconds: number; billableSeconds: number }>)

    const totalSeconds = entries.reduce((sum, entry) => sum + (entry.duration || 0), 0)

    return Object.entries(categories).map(([category, data]) => ({
      category,
      hours: data.totalSeconds / 3600,
      percentage: totalSeconds > 0 ? (data.totalSeconds / totalSeconds) * 100 : 0,
      billableHours: data.billableSeconds / 3600
    }))
  }

  private calculateDailyTrends(entries: TimeEntry[], period: { from: Date; to: Date }): ProductivityMetrics['dailyTrends'] {
    const dailyData = entries.reduce((acc, entry) => {
      const date = entry.startTime.toDateString()
      if (!acc[date]) {
        acc[date] = { seconds: 0, activities: [], productivitySum: 0, count: 0 }
      }
      acc[date].seconds += entry.duration || 0
      acc[date].activities.push(entry.category)
      acc[date].productivitySum += entry.metadata.activityLevel || 50
      acc[date].count++
      return acc
    }, {} as Record<string, { seconds: number; activities: string[]; productivitySum: number; count: number }>)

    return Object.entries(dailyData).map(([dateStr, data]) => ({
      date: new Date(dateStr),
      hours: data.seconds / 3600,
      productivityScore: data.count > 0 ? data.productivitySum / data.count : 0,
      topActivity: this.getMostFrequent(data.activities)
    }))
  }

  private calculateTimeDistribution(entries: TimeEntry[]): ProductivityMetrics['timeDistribution'] {
    const distribution = { morning: 0, afternoon: 0, evening: 0 }

    entries.forEach(entry => {
      const hour = entry.startTime.getHours()
      const duration = entry.duration || 0

      if (hour >= 6 && hour < 12) {
        distribution.morning += duration
      } else if (hour >= 12 && hour < 18) {
        distribution.afternoon += duration
      } else if (hour >= 18 && hour < 24) {
        distribution.evening += duration
      }
    })

    const total = distribution.morning + distribution.afternoon + distribution.evening
    const preferredWorkingHours = total > 0
      ? distribution.morning > distribution.afternoon && distribution.morning > distribution.evening
        ? 'Morning (6AM-12PM)'
        : distribution.afternoon > distribution.evening
          ? 'Afternoon (12PM-6PM)'
          : 'Evening (6PM-12AM)'
      : 'Not enough data'

    return {
      morningHours: distribution.morning / 3600,
      afternoonHours: distribution.afternoon / 3600,
      eveningHours: distribution.evening / 3600,
      preferredWorkingHours
    }
  }

  private calculateDailyHours(entries: TimeEntry[], period: { from: Date; to: Date }): { date: Date; hours: number }[] {
    const dailyHours: { date: Date; hours: number }[] = []
    
    const currentDate = new Date(period.from)
    while (currentDate <= period.to) {
      const dayEntries = entries.filter(entry => 
        entry.startTime.toDateString() === currentDate.toDateString()
      )
      
      const totalSeconds = dayEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0)
      
      dailyHours.push({
        date: new Date(currentDate),
        hours: totalSeconds / 3600
      })
      
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return dailyHours
  }

  private calculateProjectDistribution(entries: TimeEntry[]): { project: string; hours: number; percentage: number }[] {
    const projects = entries.reduce((acc, entry) => {
      const project = entry.projectName || 'No Project'
      acc[project] = (acc[project] || 0) + (entry.duration || 0)
      return acc
    }, {} as Record<string, number>)

    const totalSeconds = Object.values(projects).reduce((sum, seconds) => sum + seconds, 0)

    return Object.entries(projects).map(([project, seconds]) => ({
      project,
      hours: seconds / 3600,
      percentage: totalSeconds > 0 ? (seconds / totalSeconds) * 100 : 0
    }))
  }

  private generateTeamInsights(memberPerformance: ProductivityMetrics[], teamMetrics: TeamProductivityReport['teamMetrics']): TeamProductivityReport['insights'] {
    const insights: TeamProductivityReport['insights'] = []

    // Peak hours analysis
    const allDailyTrends = memberPerformance.flatMap(m => m.dailyTrends)
    const hourlyData = allDailyTrends.reduce((acc, trend) => {
      const hour = trend.date.getHours()
      acc[hour] = (acc[hour] || 0) + trend.hours
      return acc
    }, {} as Record<number, number>)

    const peakHour = Object.entries(hourlyData).reduce((max, [hour, hours]) => 
      hours > max.hours ? { hour: parseInt(hour), hours } : max
    , { hour: 9, hours: 0 })

    insights.push({
      type: 'peak_hours',
      message: `Team is most productive at ${peakHour.hour}:00 with ${peakHour.hours.toFixed(1)} hours of work`,
      data: { peakHour: peakHour.hour, peakHours: peakHour.hours },
      actionRequired: false
    })

    // Low productivity alert
    const lowProductivityMembers = memberPerformance.filter(m => m.productivityScore < 60)
    if (lowProductivityMembers.length > 0) {
      insights.push({
        type: 'low_productivity',
        message: `${lowProductivityMembers.length} team members have productivity scores below 60%`,
        data: { members: lowProductivityMembers.map(m => m.userName) },
        actionRequired: true
      })
    }

    // Overtime alert
    const overtimeMembers = memberPerformance.filter(m => m.totalHours > 45) // More than 45 hours per week
    if (overtimeMembers.length > 0) {
      insights.push({
        type: 'overtime_alert',
        message: `${overtimeMembers.length} team members are working overtime`,
        data: { members: overtimeMembers.map(m => ({ name: m.userName, hours: m.totalHours })) },
        actionRequired: true
      })
    }

    return insights
  }

  private generateReportInsights(entries: TimeEntry[], summary: TimeReport['data']['summary']): string[] {
    const insights: string[] = []

    if (summary.overtimeHours > 0) {
      insights.push(`${summary.overtimeHours.toFixed(1)} hours of overtime recorded`)
    }

    if (summary.productivityScore > 80) {
      insights.push('High productivity score indicates efficient time usage')
    } else if (summary.productivityScore < 60) {
      insights.push('Low productivity score suggests room for improvement')
    }

    const billablePercentage = summary.totalHours > 0 ? (summary.billableHours / summary.totalHours) * 100 : 0
    if (billablePercentage > 80) {
      insights.push('Excellent billable hours ratio')
    } else if (billablePercentage < 50) {
      insights.push('Consider increasing billable work percentage')
    }

    return insights
  }

  private calculateWorkingDays(period: { from: Date; to: Date }): number {
    let workingDays = 0
    const currentDate = new Date(period.from)
    
    while (currentDate <= period.to) {
      const dayOfWeek = currentDate.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
        workingDays++
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return workingDays
  }

  private getMostFrequent(items: string[]): string {
    const counts = items.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(counts).reduce((max, [item, count]) => 
      count > max.count ? { item, count } : max
    , { item: 'none', count: 0 }).item
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  // Database operations (placeholders)
  private async storeTimeEntry(entry: TimeEntry): Promise<void> {
    console.log(`Storing time entry: ${entry.id}`)
  }

  private async getTimeEntry(entryId: string): Promise<TimeEntry | null> {
    console.log(`Getting time entry: ${entryId}`)
    return null
  }

  private async updateTimeEntry(entry: TimeEntry): Promise<void> {
    console.log(`Updating time entry: ${entry.id}`)
  }

  private async getUserTimeEntries(userId: string, filters?: { status?: string; period?: { from: Date; to: Date } }): Promise<TimeEntry[]> {
    console.log(`Getting time entries for user: ${userId}`)
    return []
  }

  private async getTimeEntries(filters: { tenantId: string; userId?: string; projectId?: string; period: { from: Date; to: Date } }): Promise<TimeEntry[]> {
    console.log(`Getting time entries with filters`)
    return []
  }

  private async stopActiveTimers(userId: string): Promise<void> {
    console.log(`Stopping active timers for user: ${userId}`)
  }

  private async updateProductivityMetrics(userId: string, tenantId: string): Promise<void> {
    console.log(`Updating productivity metrics for user: ${userId}`)
  }

  private async storeTimeSession(session: TimeSession): Promise<void> {
    console.log(`Storing time session: ${session.id}`)
  }

  private async getUser(userId: string): Promise<{ id: string; name: string } | null> {
    console.log(`Getting user: ${userId}`)
    return { id: userId, name: 'User Name' }
  }

  private async getTeamUsers(tenantId: string): Promise<{ id: string; name: string }[]> {
    console.log(`Getting team users for tenant: ${tenantId}`)
    return [
      { id: 'user_1', name: 'John Smith' },
      { id: 'user_2', name: 'Sarah Johnson' }
    ]
  }

  private async getTimeTrackingSettings(userId: string, tenantId: string): Promise<TimeTrackingSettings> {
    return {
      userId,
      tenantId,
      preferences: {
        autoStart: false,
        autoStop: true,
        idleThreshold: 10,
        breakReminders: true,
        breakInterval: 60,
        dailyGoal: 8,
        weeklyGoal: 40,
        overtimeAlert: true,
        screenshotFrequency: 0,
        activityMonitoring: true
      },
      notifications: {
        timeGoalReached: true,
        idleTimeAlert: true,
        overtimeWarning: true,
        dailySummary: true,
        weeklySummary: true
      },
      integrations: {
        calendar: false,
        projectManagement: false,
        invoicing: false
      },
      updatedAt: new Date()
    }
  }

  private async storeTimeTrackingSettings(settings: TimeTrackingSettings): Promise<void> {
    console.log(`Storing time tracking settings for user: ${settings.userId}`)
  }

  private async storeTimeReport(report: TimeReport): Promise<void> {
    console.log(`Storing time report: ${report.id}`)
  }
}

// Export time tracking manager instance
export const timeTrackingManager = new TimeTrackingManager()
