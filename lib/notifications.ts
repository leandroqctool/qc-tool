// Enterprise Notification System
import { neon } from '@neondatabase/serverless'

export interface NotificationConfig {
  enabled: boolean
  channels: NotificationChannel[]
  preferences: NotificationPreferences
  templates: NotificationTemplate[]
  rateLimiting: {
    maxPerHour: number
    maxPerDay: number
  }
}

export interface NotificationChannel {
  type: 'email' | 'sms' | 'push' | 'slack' | 'webhook' | 'in_app'
  name: string
  enabled: boolean
  config: Record<string, unknown>
  priority: number
}

export interface NotificationPreferences {
  userId: string
  tenantId: string
  channels: {
    email: boolean
    sms: boolean
    push: boolean
    inApp: boolean
  }
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly'
  categories: {
    qc_updates: boolean
    project_updates: boolean
    system_alerts: boolean
    team_mentions: boolean
    deadlines: boolean
    security: boolean
  }
  quietHours: {
    enabled: boolean
    start: string // HH:MM
    end: string   // HH:MM
    timezone: string
  }
}

export interface NotificationTemplate {
  id: string
  name: string
  type: NotificationType
  channel: string
  subject: string
  body: string
  variables: string[]
  active: boolean
}

export interface Notification {
  id: string
  userId: string
  tenantId: string
  type: NotificationType
  title: string
  message: string
  data: Record<string, unknown>
  channels: string[]
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read'
  scheduledFor?: Date
  sentAt?: Date
  readAt?: Date
  expiresAt?: Date
  metadata: {
    source: string
    entityType?: string
    entityId?: string
    actionUrl?: string
  }
}

export type NotificationType = 
  | 'qc_review_assigned'
  | 'qc_review_completed'
  | 'qc_review_rejected'
  | 'file_uploaded'
  | 'file_approved'
  | 'file_failed'
  | 'project_created'
  | 'project_updated'
  | 'project_deadline'
  | 'team_mention'
  | 'comment_added'
  | 'system_alert'
  | 'security_alert'
  | 'backup_completed'
  | 'backup_failed'

export interface NotificationDigest {
  userId: string
  tenantId: string
  type: 'hourly' | 'daily' | 'weekly'
  period: {
    start: Date
    end: Date
  }
  notifications: Notification[]
  summary: {
    total: number
    unread: number
    byType: Record<string, number>
    byPriority: Record<string, number>
  }
}

// Notification Manager Class
export class NotificationManager {
  private sql: ReturnType<typeof neon>

  constructor() {
    this.sql = neon(process.env.DATABASE_URL!)
  }

  // Send notification
  async sendNotification(notification: Omit<Notification, 'id' | 'status' | 'sentAt'>): Promise<string> {
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const fullNotification: Notification = {
      ...notification,
      id: notificationId,
      status: 'pending',
      sentAt: new Date()
    }

    try {
      // Get user preferences
      const preferences = await this.getUserPreferences(notification.userId)
      
      // Check if user wants this type of notification
      if (!this.shouldSendNotification(fullNotification, preferences)) {
        console.log(`Notification skipped due to user preferences: ${notificationId}`)
        return notificationId
      }

      // Filter channels based on preferences
      const enabledChannels = this.filterChannelsByPreferences(notification.channels, preferences)
      
      if (enabledChannels.length === 0) {
        console.log(`No enabled channels for notification: ${notificationId}`)
        return notificationId
      }

      // Store notification
      await this.storeNotification({ ...fullNotification, channels: enabledChannels })

      // Send through each enabled channel
      for (const channel of enabledChannels) {
        try {
          await this.sendThroughChannel(fullNotification, channel)
        } catch (error) {
          console.error(`Failed to send notification ${notificationId} through ${channel}:`, error)
        }
      }

      // Update status
      await this.updateNotificationStatus(notificationId, 'sent')
      
      console.log(`Notification sent successfully: ${notificationId}`)
      return notificationId

    } catch (error) {
      console.error(`Failed to send notification ${notificationId}:`, error)
      await this.updateNotificationStatus(notificationId, 'failed')
      throw error
    }
  }

  // Send bulk notifications
  async sendBulkNotifications(notifications: Array<Omit<Notification, 'id' | 'status' | 'sentAt'>>): Promise<string[]> {
    const results: string[] = []
    
    for (const notification of notifications) {
      try {
        const id = await this.sendNotification(notification)
        results.push(id)
      } catch (error) {
        console.error('Failed to send bulk notification:', error)
      }
    }
    
    return results
  }

  // Send through specific channel
  private async sendThroughChannel(notification: Notification, channel: string): Promise<void> {
    switch (channel) {
      case 'email':
        await this.sendEmail(notification)
        break
      case 'sms':
        await this.sendSMS(notification)
        break
      case 'push':
        await this.sendPush(notification)
        break
      case 'slack':
        await this.sendSlack(notification)
        break
      case 'webhook':
        await this.sendWebhook(notification)
        break
      case 'in_app':
        await this.sendInApp(notification)
        break
      default:
        console.warn(`Unknown notification channel: ${channel}`)
    }
  }

  // Email notifications
  private async sendEmail(notification: Notification): Promise<void> {
    console.log(`Sending email notification: ${notification.id}`)
    
    // Get user email
    const user = await this.getUser(notification.userId)
    if (!user?.email) {
      throw new Error('User email not found')
    }

    // Get email template
    const template = await this.getTemplate(notification.type, 'email')
    
    const emailContent = {
      to: user.email,
      subject: this.renderTemplate(template?.subject || notification.title, notification.data),
      html: this.renderTemplate(template?.body || notification.message, notification.data),
      metadata: {
        notificationId: notification.id,
        userId: notification.userId,
        type: notification.type
      }
    }

    // Send email (implement with your email provider)
    console.log('Email content:', emailContent)
    
    // Example with Resend (if configured)
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'noreply@qctool.com',
          to: emailContent.to,
          subject: emailContent.subject,
          html: emailContent.html
        })
      } catch (error) {
        console.error('Failed to send email via Resend:', error)
      }
    }
  }

  // SMS notifications
  private async sendSMS(notification: Notification): Promise<void> {
    console.log(`Sending SMS notification: ${notification.id}`)
    
    // Get user phone
    const user = await this.getUser(notification.userId)
    if (!user?.phone) {
      throw new Error('User phone not found')
    }

    // Get SMS template
    const template = await this.getTemplate(notification.type, 'sms')
    const message = this.renderTemplate(template?.body || notification.message, notification.data)

    // Send SMS (implement with your SMS provider)
    console.log(`SMS to ${user.phone}: ${message}`)
  }

  // Push notifications
  private async sendPush(notification: Notification): Promise<void> {
    console.log(`Sending push notification: ${notification.id}`)
    
    // Implement push notification logic
    // This would integrate with services like Firebase, OneSignal, etc.
  }

  // Slack notifications
  private async sendSlack(notification: Notification): Promise<void> {
    console.log(`Sending Slack notification: ${notification.id}`)
    
    // Get Slack webhook URL
    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (!webhookUrl) {
      throw new Error('Slack webhook URL not configured')
    }

    const slackMessage = {
      text: notification.title,
      attachments: [{
        color: this.getPriorityColor(notification.priority),
        fields: [{
          title: 'Message',
          value: notification.message,
          short: false
        }],
        footer: 'QC Tool',
        ts: Math.floor(Date.now() / 1000)
      }]
    }

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackMessage)
      })
    } catch (error) {
      console.error('Failed to send Slack notification:', error)
      throw error
    }
  }

  // Webhook notifications
  private async sendWebhook(notification: Notification): Promise<void> {
    console.log(`Sending webhook notification: ${notification.id}`)
    
    const webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL
    if (!webhookUrl) {
      throw new Error('Webhook URL not configured')
    }

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notification)
      })
    } catch (error) {
      console.error('Failed to send webhook notification:', error)
      throw error
    }
  }

  // In-app notifications
  private async sendInApp(notification: Notification): Promise<void> {
    console.log(`Storing in-app notification: ${notification.id}`)
    
    // In-app notifications are just stored in the database
    // They'll be retrieved by the frontend when needed
    await this.storeNotification(notification)
  }

  // Generate notification digest
  async generateDigest(userId: string, type: 'hourly' | 'daily' | 'weekly'): Promise<NotificationDigest> {
    const now = new Date()
    let start: Date
    
    switch (type) {
      case 'hourly':
        start = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case 'daily':
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case 'weekly':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
    }

    const notifications = await this.getNotificationsInPeriod(userId, start, now)
    
    const summary = {
      total: notifications.length,
      unread: notifications.filter(n => !n.readAt).length,
      byType: this.groupByProperty(notifications, 'type'),
      byPriority: this.groupByProperty(notifications, 'priority')
    }

    const user = await this.getUser(userId)
    const tenantId = user?.tenantId || ''

    return {
      userId,
      tenantId,
      type,
      period: { start, end: now },
      notifications,
      summary
    }
  }

  // Send digest
  async sendDigest(userId: string, type: 'hourly' | 'daily' | 'weekly'): Promise<void> {
    const digest = await this.generateDigest(userId, type)
    
    if (digest.notifications.length === 0) {
      console.log(`No notifications for ${type} digest: ${userId}`)
      return
    }

    const preferences = await this.getUserPreferences(userId)
    
    // Check if user wants digest notifications
    if (preferences.frequency !== type && preferences.frequency !== 'immediate') {
      return
    }

    // Create digest notification
    await this.sendNotification({
      userId,
      tenantId: digest.tenantId,
      type: 'system_alert',
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Digest - ${digest.summary.total} notifications`,
      message: this.renderDigestMessage(digest),
      data: { digest },
      channels: preferences.channels.email ? ['email'] : ['in_app'],
      priority: 'low',
      metadata: {
        source: 'digest_system',
        entityType: 'digest',
        entityId: `${type}_${Date.now()}`
      }
    })
  }

  // Helper methods
  private shouldSendNotification(notification: Notification, preferences: NotificationPreferences): boolean {
    // Check if category is enabled
    const categoryMap: Record<string, keyof NotificationPreferences['categories']> = {
      'qc_review_assigned': 'qc_updates',
      'qc_review_completed': 'qc_updates',
      'qc_review_rejected': 'qc_updates',
      'project_created': 'project_updates',
      'project_updated': 'project_updates',
      'project_deadline': 'deadlines',
      'team_mention': 'team_mentions',
      'comment_added': 'team_mentions',
      'system_alert': 'system_alerts',
      'security_alert': 'security'
    }

    const category = categoryMap[notification.type]
    if (category && !preferences.categories[category]) {
      return false
    }

    // Check quiet hours
    if (preferences.quietHours.enabled) {
      const now = new Date()
      const currentTime = now.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: preferences.quietHours.timezone 
      })
      
      const start = preferences.quietHours.start
      const end = preferences.quietHours.end
      
      if (currentTime >= start && currentTime <= end) {
        return false
      }
    }

    return true
  }

  private filterChannelsByPreferences(channels: string[], preferences: NotificationPreferences): string[] {
    return channels.filter(channel => {
      switch (channel) {
        case 'email': return preferences.channels.email
        case 'sms': return preferences.channels.sms
        case 'push': return preferences.channels.push
        case 'in_app': return preferences.channels.inApp
        default: return true
      }
    })
  }

  private renderTemplate(template: string, data: Record<string, unknown>): string {
    let rendered = template
    
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`
      rendered = rendered.replace(new RegExp(placeholder, 'g'), String(value))
    })
    
    return rendered
  }

  private renderDigestMessage(digest: NotificationDigest): string {
    const { summary } = digest
    
    let message = `You have ${summary.total} notification(s) from the last ${digest.type}:\n\n`
    
    Object.entries(summary.byType).forEach(([type, count]) => {
      message += `• ${type.replace('_', ' ')}: ${count}\n`
    })
    
    if (summary.unread > 0) {
      message += `\n${summary.unread} unread notification(s)`
    }
    
    return message
  }

  private getPriorityColor(priority: string): string {
    switch (priority) {
      case 'urgent': return '#ff0000'
      case 'high': return '#ff6600'
      case 'medium': return '#ffaa00'
      case 'low': return '#00aa00'
      default: return '#cccccc'
    }
  }

  private groupByProperty(items: Notification[], property: keyof Notification): Record<string, number> {
    return items.reduce((acc, item) => {
      const key = String(item[property])
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  // Database operations (placeholders)
  private async storeNotification(notification: Notification): Promise<void> {
    console.log(`Storing notification: ${notification.id}`)
    // Implementation would store in database
  }

  private async updateNotificationStatus(id: string, status: Notification['status']): Promise<void> {
    console.log(`Updating notification status: ${id} -> ${status}`)
    // Implementation would update database
  }

  private async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    // Return default preferences for now
    return {
      userId,
      tenantId: 'default',
      channels: {
        email: true,
        sms: false,
        push: true,
        inApp: true
      },
      frequency: 'immediate',
      categories: {
        qc_updates: true,
        project_updates: true,
        system_alerts: true,
        team_mentions: true,
        deadlines: true,
        security: true
      },
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
        timezone: 'America/New_York'
      }
    }
  }

  private async getUser(userId: string): Promise<{ email?: string; phone?: string; tenantId?: string } | null> {
    try {
      const users = await this.sql`SELECT email, phone, tenant_id as "tenantId" FROM users WHERE id = ${userId}`
      return users[0] as { email?: string; phone?: string; tenantId?: string } || null
    } catch (error) {
      console.error('Failed to get user:', error)
      return null
    }
  }

  private async getTemplate(type: NotificationType, channel: string): Promise<NotificationTemplate | null> {
    // Return default template for now
    return {
      id: `${type}_${channel}`,
      name: `${type} ${channel}`,
      type,
      channel,
      subject: '{{title}}',
      body: '{{message}}',
      variables: ['title', 'message'],
      active: true
    }
  }

  private async getNotificationsInPeriod(userId: string, start: Date, end: Date): Promise<Notification[]> {
    // Return empty array for now - would query database
    return []
  }
}

// Quick notification helpers
export async function notifyQCReviewAssigned(userId: string, tenantId: string, data: { fileName: string; reviewerName: string; dueDate: string }): Promise<void> {
  const notificationManager = new NotificationManager()
  
  await notificationManager.sendNotification({
    userId,
    tenantId,
    type: 'qc_review_assigned',
    title: 'New QC Review Assigned',
    message: `You have been assigned to review "${data.fileName}". Due: ${data.dueDate}`,
    data,
    channels: ['email', 'in_app', 'push'],
    priority: 'medium',
    metadata: {
      source: 'qc_system',
      entityType: 'qc_review',
      actionUrl: '/qc-reviews'
    }
  })
}

export async function notifyFileUploaded(userId: string, tenantId: string, data: { fileName: string; uploaderName: string; projectName: string }): Promise<void> {
  const notificationManager = new NotificationManager()
  
  await notificationManager.sendNotification({
    userId,
    tenantId,
    type: 'file_uploaded',
    title: 'New File Uploaded',
    message: `${data.uploaderName} uploaded "${data.fileName}" to project "${data.projectName}"`,
    data,
    channels: ['in_app'],
    priority: 'low',
    metadata: {
      source: 'file_system',
      entityType: 'file',
      actionUrl: '/files'
    }
  })
}

export async function notifySystemAlert(userId: string, tenantId: string, data: { alertType: string; message: string; severity: string }): Promise<void> {
  const notificationManager = new NotificationManager()
  
  await notificationManager.sendNotification({
    userId,
    tenantId,
    type: 'system_alert',
    title: `System Alert: ${data.alertType}`,
    message: data.message,
    data,
    channels: ['email', 'in_app', 'slack'],
    priority: data.severity === 'critical' ? 'urgent' : 'high',
    metadata: {
      source: 'monitoring_system',
      entityType: 'alert',
      actionUrl: '/monitoring'
    }
  })
}

// Export notification manager instance
export const notificationManager = new NotificationManager()
