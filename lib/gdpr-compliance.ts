// GDPR Compliance System - Data Privacy & Protection
import { neon } from '@neondatabase/serverless'
import { notificationManager } from './notifications'

export interface DataRetentionPolicy {
  id: string
  name: string
  description: string
  tenantId: string
  dataType: 'user_data' | 'file_data' | 'audit_logs' | 'messages' | 'forms' | 'analytics' | 'backups'
  retentionPeriod: number // days
  deletionMethod: 'soft_delete' | 'hard_delete' | 'anonymize'
  active: boolean
  legalBasis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests'
  createdAt: Date
  updatedAt: Date
  lastExecuted?: Date
}

export interface DataSubjectRequest {
  id: string
  tenantId: string
  userId: string
  requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection'
  status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'expired'
  description: string
  submittedAt: Date
  completedAt?: Date
  handledBy?: string
  verificationMethod: 'email' | 'phone' | 'identity_document'
  verificationStatus: 'pending' | 'verified' | 'failed'
  dataExportUrl?: string
  metadata: {
    ipAddress: string
    userAgent: string
    requestSource: 'user_portal' | 'email' | 'support_ticket'
    urgency: 'standard' | 'urgent'
    legalDeadline: Date
  }
}

export interface ConsentRecord {
  id: string
  tenantId: string
  userId: string
  consentType: 'data_processing' | 'marketing' | 'analytics' | 'cookies' | 'third_party_sharing'
  status: 'granted' | 'withdrawn' | 'expired'
  grantedAt: Date
  withdrawnAt?: Date
  expiresAt?: Date
  consentText: string
  version: string
  ipAddress: string
  userAgent: string
  withdrawalMethod?: 'user_action' | 'automatic' | 'admin_action'
}

export interface DataProcessingRecord {
  id: string
  tenantId: string
  userId?: string
  activityType: 'data_collection' | 'data_processing' | 'data_transfer' | 'data_deletion' | 'data_access'
  dataTypes: string[]
  purpose: string
  legalBasis: string
  processingLocation: string
  retentionPeriod?: number
  thirdPartySharing: boolean
  thirdParties?: string[]
  timestamp: Date
  metadata: Record<string, unknown>
}

export interface PrivacySettings {
  userId: string
  tenantId: string
  dataMinimization: boolean
  analyticsOptOut: boolean
  marketingOptOut: boolean
  thirdPartySharing: boolean
  dataExportFormat: 'json' | 'csv' | 'xml'
  communicationPreferences: {
    email: boolean
    sms: boolean
    push: boolean
    inApp: boolean
  }
  updatedAt: Date
}

export interface DataExportPackage {
  id: string
  userId: string
  tenantId: string
  requestId: string
  status: 'generating' | 'ready' | 'expired' | 'error'
  format: 'json' | 'csv' | 'xml' | 'pdf'
  fileUrl?: string
  fileSize?: number
  expiresAt: Date
  generatedAt: Date
  downloadedAt?: Date
  includes: {
    profile: boolean
    files: boolean
    projects: boolean
    messages: boolean
    auditLogs: boolean
    forms: boolean
    analytics: boolean
  }
  metadata: {
    totalRecords: number
    dataTypes: string[]
    timeRange: {
      from: Date
      to: Date
    }
  }
}

// GDPR Compliance Manager
export class GDPRComplianceManager {
  private sql: ReturnType<typeof neon>

  constructor() {
    this.sql = neon(process.env.DATABASE_URL!)
  }

  // Data Subject Rights - Right to Access
  async handleAccessRequest(userId: string, tenantId: string, requestId: string): Promise<DataExportPackage> {
    console.log(`Processing access request: ${requestId} for user: ${userId}`)

    const exportId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    try {
      // Create export package
      const exportPackage: DataExportPackage = {
        id: exportId,
        userId,
        tenantId,
        requestId,
        status: 'generating',
        format: 'json',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        generatedAt: new Date(),
        includes: {
          profile: true,
          files: true,
          projects: true,
          messages: true,
          auditLogs: true,
          forms: true,
          analytics: true
        },
        metadata: {
          totalRecords: 0,
          dataTypes: [],
          timeRange: {
            from: new Date(0), // Beginning of time
            to: new Date()
          }
        }
      }

      // Store export package
      await this.storeExportPackage(exportPackage)

      // Generate comprehensive data export
      const userData = await this.collectUserData(userId, tenantId)
      
      // Create export file
      const fileUrl = await this.generateExportFile(exportPackage, userData)
      
      // Update package
      exportPackage.status = 'ready'
      exportPackage.fileUrl = fileUrl
      exportPackage.fileSize = JSON.stringify(userData).length
      exportPackage.metadata.totalRecords = this.countRecords(userData)
      exportPackage.metadata.dataTypes = Object.keys(userData)

      await this.updateExportPackage(exportPackage)

      // Notify user
      await notificationManager.sendNotification({
        userId,
        tenantId,
        type: 'system_alert',
        title: 'Data Export Ready',
        message: 'Your personal data export is ready for download. It will be available for 30 days.',
        data: { exportId, fileUrl },
        channels: ['email', 'in_app'],
        priority: 'medium',
        metadata: {
          source: 'gdpr_system',
          entityType: 'data_export',
          entityId: exportId,
          actionUrl: `/privacy/exports/${exportId}`
        }
      })

      console.log(`Access request completed: ${requestId}`)
      return exportPackage

    } catch (error) {
      console.error(`Failed to process access request ${requestId}:`, error)
      throw error
    }
  }

  // Data Subject Rights - Right to Erasure (Right to be Forgotten)
  async handleErasureRequest(userId: string, tenantId: string, requestId: string, options: {
    preserveAuditTrail: boolean
    anonymizeInsteadOfDelete: boolean
    retainForLegalReasons: boolean
  }): Promise<void> {
    console.log(`Processing erasure request: ${requestId} for user: ${userId}`)

    try {
      // Record the erasure request
      await this.recordDataProcessing({
        id: `processing_${Date.now()}`,
        tenantId,
        userId,
        activityType: 'data_deletion',
        dataTypes: ['all_user_data'],
        purpose: 'Data subject erasure request',
        legalBasis: 'Data subject request under GDPR Article 17',
        processingLocation: 'EU',
        thirdPartySharing: false,
        timestamp: new Date(),
        metadata: { requestId, options }
      })

      if (options.anonymizeInsteadOfDelete) {
        await this.anonymizeUserData(userId, tenantId)
      } else {
        await this.deleteUserData(userId, tenantId, options.preserveAuditTrail)
      }

      // Update request status
      await this.updateDataSubjectRequest(requestId, 'completed')

      // Notify completion
      await notificationManager.sendNotification({
        userId,
        tenantId,
        type: 'system_alert',
        title: 'Data Erasure Completed',
        message: 'Your personal data has been deleted as requested.',
        data: { requestId },
        channels: ['email'],
        priority: 'high',
        metadata: {
          source: 'gdpr_system',
          entityType: 'erasure_request',
          entityId: requestId
        }
      })

      console.log(`Erasure request completed: ${requestId}`)

    } catch (error) {
      console.error(`Failed to process erasure request ${requestId}:`, error)
      await this.updateDataSubjectRequest(requestId, 'rejected')
      throw error
    }
  }

  // Data Portability
  async handlePortabilityRequest(userId: string, tenantId: string, requestId: string, format: 'json' | 'csv' | 'xml'): Promise<DataExportPackage> {
    console.log(`Processing portability request: ${requestId} for user: ${userId}`)

    // Similar to access request but with structured, machine-readable format
    return await this.handleAccessRequest(userId, tenantId, requestId)
  }

  // Consent Management
  async recordConsent(consent: Omit<ConsentRecord, 'id'>): Promise<string> {
    const consentId = `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const fullConsent: ConsentRecord = {
      ...consent,
      id: consentId
    }

    await this.storeConsentRecord(fullConsent)

    // Record processing activity
    await this.recordDataProcessing({
      id: `processing_${Date.now()}`,
      tenantId: consent.tenantId,
      userId: consent.userId,
      activityType: 'data_collection',
      dataTypes: ['consent_record'],
      purpose: `User consent for ${consent.consentType}`,
      legalBasis: 'consent',
      processingLocation: 'EU',
      thirdPartySharing: false,
      timestamp: new Date(),
      metadata: { consentId, consentType: consent.consentType }
    })

    return consentId
  }

  // Withdraw Consent
  async withdrawConsent(consentId: string, userId: string, withdrawalMethod: 'user_action' | 'automatic' | 'admin_action'): Promise<void> {
    const consent = await this.getConsentRecord(consentId)
    if (!consent || consent.userId !== userId) {
      throw new Error('Consent record not found or unauthorized')
    }

    // Update consent record
    consent.status = 'withdrawn'
    consent.withdrawnAt = new Date()
    consent.withdrawalMethod = withdrawalMethod

    await this.updateConsentRecord(consent)

    // Record processing activity
    await this.recordDataProcessing({
      id: `processing_${Date.now()}`,
      tenantId: consent.tenantId,
      userId,
      activityType: 'data_processing',
      dataTypes: ['consent_withdrawal'],
      purpose: 'User consent withdrawal',
      legalBasis: 'Data subject request',
      processingLocation: 'EU',
      thirdPartySharing: false,
      timestamp: new Date(),
      metadata: { consentId, withdrawalMethod }
    })

    console.log(`Consent withdrawn: ${consentId}`)
  }

  // Data Retention Policy Management
  async createRetentionPolicy(policy: Omit<DataRetentionPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const policyId = `policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const fullPolicy: DataRetentionPolicy = {
      ...policy,
      id: policyId,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await this.storeRetentionPolicy(fullPolicy)
    return policyId
  }

  // Execute Data Retention Policies
  async executeRetentionPolicies(tenantId: string): Promise<void> {
    console.log(`Executing retention policies for tenant: ${tenantId}`)

    const policies = await this.getActiveRetentionPolicies(tenantId)
    
    for (const policy of policies) {
      try {
        await this.executeRetentionPolicy(policy)
        
        // Update last executed
        policy.lastExecuted = new Date()
        await this.updateRetentionPolicy(policy)

      } catch (error) {
        console.error(`Failed to execute retention policy ${policy.id}:`, error)
      }
    }
  }

  // Privacy Settings Management
  async updatePrivacySettings(userId: string, tenantId: string, settings: Partial<PrivacySettings>): Promise<void> {
    const currentSettings = await this.getPrivacySettings(userId, tenantId)
    
    const updatedSettings: PrivacySettings = {
      ...currentSettings,
      ...settings,
      userId,
      tenantId,
      updatedAt: new Date()
    }

    await this.storePrivacySettings(updatedSettings)

    // Record processing activity
    await this.recordDataProcessing({
      id: `processing_${Date.now()}`,
      tenantId,
      userId,
      activityType: 'data_processing',
      dataTypes: ['privacy_settings'],
      purpose: 'User privacy settings update',
      legalBasis: 'consent',
      processingLocation: 'EU',
      thirdPartySharing: false,
      timestamp: new Date(),
      metadata: { updatedFields: Object.keys(settings) }
    })
  }

  // Compliance Reporting
  async generateComplianceReport(tenantId: string, period: { from: Date; to: Date }): Promise<{
    dataSubjectRequests: {
      total: number
      byType: Record<string, number>
      byStatus: Record<string, number>
      averageResponseTime: number
    }
    consentRecords: {
      total: number
      granted: number
      withdrawn: number
      expired: number
    }
    dataProcessing: {
      total: number
      byType: Record<string, number>
      byLegalBasis: Record<string, number>
    }
    retentionPolicies: {
      total: number
      executed: number
      dataDeleted: number
    }
  }> {
    console.log(`Generating compliance report for tenant: ${tenantId}`)

    // Get data subject requests
    const requests = await this.getDataSubjectRequests(tenantId, period)
    const requestsByType = this.groupBy(requests, 'requestType')
    const requestsByStatus = this.groupBy(requests, 'status')
    const avgResponseTime = this.calculateAverageResponseTime(requests)

    // Get consent records
    const consents = await this.getConsentRecords(tenantId, period)
    const consentsByStatus = this.groupBy(consents, 'status')

    // Get processing records
    const processing = await this.getProcessingRecords(tenantId, period)
    const processingByType = this.groupBy(processing, 'activityType')
    const processingByBasis = this.groupBy(processing, 'legalBasis')

    // Get retention policy execution
    const retentionStats = await this.getRetentionStats(tenantId, period)

    return {
      dataSubjectRequests: {
        total: requests.length,
        byType: requestsByType,
        byStatus: requestsByStatus,
        averageResponseTime: avgResponseTime
      },
      consentRecords: {
        total: consents.length,
        granted: consentsByStatus.granted || 0,
        withdrawn: consentsByStatus.withdrawn || 0,
        expired: consentsByStatus.expired || 0
      },
      dataProcessing: {
        total: processing.length,
        byType: processingByType,
        byLegalBasis: processingByBasis
      },
      retentionPolicies: retentionStats
    }
  }

  // Helper Methods
  private async collectUserData(userId: string, tenantId: string): Promise<Record<string, unknown>> {
    const userData: Record<string, unknown> = {}

    // Collect user profile
    userData.profile = await this.getUserProfile(userId, tenantId)
    
    // Collect files
    userData.files = await this.getUserFiles(userId, tenantId)
    
    // Collect projects
    userData.projects = await this.getUserProjects(userId, tenantId)
    
    // Collect messages
    userData.messages = await this.getUserMessages(userId, tenantId)
    
    // Collect audit logs
    userData.auditLogs = await this.getUserAuditLogs(userId, tenantId)
    
    // Collect form submissions
    userData.forms = await this.getUserForms(userId, tenantId)
    
    // Collect consent records
    userData.consents = await this.getUserConsents(userId, tenantId)

    return userData
  }

  private async anonymizeUserData(userId: string, tenantId: string): Promise<void> {
    console.log(`Anonymizing data for user: ${userId}`)

    // Anonymize user profile
    await this.sql`UPDATE users SET 
      email = 'anonymized_' || id || '@example.com',
      name = 'Anonymized User',
      phone = null,
      avatar = null
      WHERE id = ${userId} AND tenant_id = ${tenantId}`

    // Anonymize file metadata
    await this.sql`UPDATE files SET 
      uploaded_by = null,
      original_name = 'anonymized_file_' || id
      WHERE uploaded_by = ${userId} AND tenant_id = ${tenantId}`

    // Anonymize messages
    await this.sql`UPDATE messages SET 
      user_name = 'Anonymized User',
      message = '[Message content anonymized]'
      WHERE user_id = ${userId} AND tenant_id = ${tenantId}`
  }

  private async deleteUserData(userId: string, tenantId: string, preserveAuditTrail: boolean): Promise<void> {
    console.log(`Deleting data for user: ${userId}`)

    if (!preserveAuditTrail) {
      // Hard delete audit logs
      await this.sql`DELETE FROM audit_logs WHERE user_id = ${userId} AND tenant_id = ${tenantId}`
    }

    // Delete user files
    await this.sql`DELETE FROM files WHERE uploaded_by = ${userId} AND tenant_id = ${tenantId}`
    
    // Delete user messages
    await this.sql`DELETE FROM messages WHERE user_id = ${userId} AND tenant_id = ${tenantId}`
    
    // Delete user profile (last)
    await this.sql`DELETE FROM users WHERE id = ${userId} AND tenant_id = ${tenantId}`
  }

  private countRecords(data: Record<string, unknown>): number {
    return Object.values(data).reduce((count, value) => {
      if (Array.isArray(value)) {
        return count + value.length
      }
      return count + 1
    }, 0)
  }

  private groupBy<T extends Record<string, unknown>>(items: T[], key: keyof T): Record<string, number> {
    return items.reduce((groups, item) => {
      const value = String(item[key])
      groups[value] = (groups[value] || 0) + 1
      return groups
    }, {} as Record<string, number>)
  }

  private calculateAverageResponseTime(requests: DataSubjectRequest[]): number {
    const completed = requests.filter(r => r.completedAt && r.status === 'completed')
    if (completed.length === 0) return 0

    const totalTime = completed.reduce((sum, request) => {
      const responseTime = request.completedAt!.getTime() - request.submittedAt.getTime()
      return sum + responseTime
    }, 0)

    return Math.round(totalTime / completed.length / (1000 * 60 * 60)) // hours
  }

  // Database operations (placeholders)
  private async storeExportPackage(exportPackage: DataExportPackage): Promise<void> {
    console.log(`Storing export package: ${exportPackage.id}`)
  }

  private async updateExportPackage(exportPackage: DataExportPackage): Promise<void> {
    console.log(`Updating export package: ${exportPackage.id}`)
  }

  private async generateExportFile(exportPackage: DataExportPackage, userData: Record<string, unknown>): Promise<string> {
    // Generate export file and return URL
    const fileName = `data_export_${exportPackage.id}.json`
    const fileUrl = `/exports/${fileName}`
    
    console.log(`Generated export file: ${fileUrl}`)
    return fileUrl
  }

  private async getUserProfile(userId: string, tenantId: string): Promise<unknown> {
    const profiles = await this.sql`SELECT * FROM users WHERE id = ${userId} AND tenant_id = ${tenantId}`
    return profiles[0] || null
  }

  private async getUserFiles(userId: string, tenantId: string): Promise<unknown[]> {
    return await this.sql`SELECT * FROM files WHERE uploaded_by = ${userId} AND tenant_id = ${tenantId}` as unknown[]
  }

  private async getUserProjects(userId: string, tenantId: string): Promise<unknown[]> {
    return await this.sql`SELECT * FROM projects WHERE created_by = ${userId} AND tenant_id = ${tenantId}` as unknown[]
  }

  private async getUserMessages(userId: string, tenantId: string): Promise<unknown[]> {
    return await this.sql`SELECT * FROM messages WHERE user_id = ${userId} AND tenant_id = ${tenantId}` as unknown[]
  }

  private async getUserAuditLogs(userId: string, tenantId: string): Promise<unknown[]> {
    return await this.sql`SELECT * FROM audit_logs WHERE user_id = ${userId} AND tenant_id = ${tenantId}` as unknown[]
  }

  private async getUserForms(userId: string, tenantId: string): Promise<unknown[]> {
    // Mock form submissions
    return []
  }

  private async getUserConsents(userId: string, tenantId: string): Promise<unknown[]> {
    // Mock consent records
    return []
  }

  private async storeConsentRecord(consent: ConsentRecord): Promise<void> {
    console.log(`Storing consent record: ${consent.id}`)
  }

  private async getConsentRecord(consentId: string): Promise<ConsentRecord | null> {
    console.log(`Getting consent record: ${consentId}`)
    return null
  }

  private async updateConsentRecord(consent: ConsentRecord): Promise<void> {
    console.log(`Updating consent record: ${consent.id}`)
  }

  private async recordDataProcessing(record: DataProcessingRecord): Promise<void> {
    console.log(`Recording data processing: ${record.id}`)
  }

  private async storeRetentionPolicy(policy: DataRetentionPolicy): Promise<void> {
    console.log(`Storing retention policy: ${policy.id}`)
  }

  private async getActiveRetentionPolicies(tenantId: string): Promise<DataRetentionPolicy[]> {
    console.log(`Getting retention policies for tenant: ${tenantId}`)
    return []
  }

  private async executeRetentionPolicy(policy: DataRetentionPolicy): Promise<void> {
    console.log(`Executing retention policy: ${policy.id}`)
  }

  private async updateRetentionPolicy(policy: DataRetentionPolicy): Promise<void> {
    console.log(`Updating retention policy: ${policy.id}`)
  }

  private async getPrivacySettings(userId: string, tenantId: string): Promise<PrivacySettings> {
    return {
      userId,
      tenantId,
      dataMinimization: false,
      analyticsOptOut: false,
      marketingOptOut: false,
      thirdPartySharing: false,
      dataExportFormat: 'json',
      communicationPreferences: {
        email: true,
        sms: false,
        push: true,
        inApp: true
      },
      updatedAt: new Date()
    }
  }

  private async storePrivacySettings(settings: PrivacySettings): Promise<void> {
    console.log(`Storing privacy settings for user: ${settings.userId}`)
  }

  private async updateDataSubjectRequest(requestId: string, status: DataSubjectRequest['status']): Promise<void> {
    console.log(`Updating data subject request ${requestId} to status: ${status}`)
  }

  private async getDataSubjectRequests(tenantId: string, period: { from: Date; to: Date }): Promise<DataSubjectRequest[]> {
    console.log(`Getting data subject requests for tenant: ${tenantId}`)
    return []
  }

  private async getConsentRecords(tenantId: string, period: { from: Date; to: Date }): Promise<ConsentRecord[]> {
    console.log(`Getting consent records for tenant: ${tenantId}`)
    return []
  }

  private async getProcessingRecords(tenantId: string, period: { from: Date; to: Date }): Promise<DataProcessingRecord[]> {
    console.log(`Getting processing records for tenant: ${tenantId}`)
    return []
  }

  private async getRetentionStats(tenantId: string, period: { from: Date; to: Date }): Promise<{ total: number; executed: number; dataDeleted: number }> {
    console.log(`Getting retention stats for tenant: ${tenantId}`)
    return { total: 0, executed: 0, dataDeleted: 0 }
  }
}

// Default retention policies
export const DEFAULT_RETENTION_POLICIES = [
  {
    name: 'User Data Retention',
    description: 'Standard retention for user profile data',
    dataType: 'user_data' as const,
    retentionPeriod: 2555, // 7 years
    deletionMethod: 'anonymize' as const,
    legalBasis: 'legitimate_interests' as const
  },
  {
    name: 'File Data Retention',
    description: 'Retention for uploaded files and metadata',
    dataType: 'file_data' as const,
    retentionPeriod: 1825, // 5 years
    deletionMethod: 'hard_delete' as const,
    legalBasis: 'contract' as const
  },
  {
    name: 'Audit Log Retention',
    description: 'Security and compliance audit logs',
    dataType: 'audit_logs' as const,
    retentionPeriod: 2555, // 7 years (legal requirement)
    deletionMethod: 'soft_delete' as const,
    legalBasis: 'legal_obligation' as const
  },
  {
    name: 'Message Retention',
    description: 'Chat messages and communications',
    dataType: 'messages' as const,
    retentionPeriod: 365, // 1 year
    deletionMethod: 'hard_delete' as const,
    legalBasis: 'legitimate_interests' as const
  }
]

// Export GDPR manager instance
export const gdprManager = new GDPRComplianceManager()
