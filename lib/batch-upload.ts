// Enterprise Batch Upload System
import { neon } from '@neondatabase/serverless'
import { notificationManager } from './notifications'
import { automationEngine } from './automation-engine'

export interface BatchUpload {
  id: string
  name: string
  description?: string
  tenantId: string
  projectId: string
  createdBy: string
  createdAt: Date
  status: 'preparing' | 'uploading' | 'processing' | 'completed' | 'failed' | 'cancelled'
  totalFiles: number
  uploadedFiles: number
  processedFiles: number
  failedFiles: number
  settings: {
    autoAssign: boolean
    assignToUser?: string
    priority: 'low' | 'medium' | 'high' | 'urgent'
    dueDate?: Date
    tags: string[]
    category: string
    workflow: {
      skipStages?: string[]
      autoApprove?: boolean
      requiresReview: boolean
    }
    notifications: {
      onComplete: boolean
      onError: boolean
      recipients: string[]
    }
  }
  metadata: {
    source: 'manual' | 'api' | 'ftp' | 'email' | 'integration'
    clientInfo?: {
      name: string
      email: string
      company: string
    }
    estimatedDuration?: number
    actualDuration?: number
    errorSummary?: string[]
  }
  files: BatchFile[]
  completedAt?: Date
  cancelledAt?: Date
  cancelledBy?: string
}

export interface BatchFile {
  id: string
  batchId: string
  originalName: string
  fileName: string
  fileSize: number
  fileType: string
  status: 'pending' | 'uploading' | 'uploaded' | 'processing' | 'completed' | 'failed' | 'skipped'
  uploadProgress: number
  processingProgress: number
  uploadedAt?: Date
  processedAt?: Date
  fileId?: string // Reference to main files table
  error?: string
  metadata: {
    checksum: string
    dimensions?: {
      width: number
      height: number
    }
    duration?: number // for videos
    pageCount?: number // for PDFs
    validationResults: {
      mimeTypeValid: boolean
      sizeValid: boolean
      magicNumberValid: boolean
      virusScanClean: boolean
    }
  }
  assignedTo?: string
  qcStage?: string
}

export interface BatchTemplate {
  id: string
  name: string
  description: string
  tenantId: string
  isDefault: boolean
  settings: BatchUpload['settings']
  rules: BatchRule[]
  createdAt: Date
  updatedAt: Date
}

export interface BatchRule {
  id: string
  name: string
  condition: {
    field: 'fileName' | 'fileSize' | 'fileType' | 'metadata'
    operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'matches_regex'
    value: string | number
  }
  action: {
    type: 'assign' | 'set_priority' | 'add_tag' | 'set_category' | 'skip_stage' | 'set_due_date'
    value: string | number | Date
  }
  enabled: boolean
}

export interface BatchProgress {
  batchId: string
  overall: {
    totalFiles: number
    uploadedFiles: number
    processedFiles: number
    failedFiles: number
    percentComplete: number
  }
  currentFile?: {
    fileName: string
    uploadProgress: number
    processingProgress: number
    status: string
  }
  estimatedTimeRemaining: number // seconds
  throughput: {
    filesPerMinute: number
    mbPerSecond: number
  }
  errors: {
    count: number
    recentErrors: string[]
  }
}

export interface BatchStatistics {
  totalBatches: number
  completedBatches: number
  failedBatches: number
  totalFilesProcessed: number
  averageBatchSize: number
  averageProcessingTime: number
  successRate: number
  topFailureReasons: {
    reason: string
    count: number
    percentage: number
  }[]
  throughputTrends: {
    date: Date
    filesProcessed: number
    averageTime: number
  }[]
  userActivity: {
    userId: string
    userName: string
    batchesCreated: number
    filesUploaded: number
  }[]
}

// Batch Upload Manager
export class BatchUploadManager {
  private sql: ReturnType<typeof neon>
  private activeUploads: Map<string, NodeJS.Timeout> = new Map()

  constructor() {
    this.sql = neon(process.env.DATABASE_URL!)
  }

  // Create Batch Upload
  async createBatch(batch: Omit<BatchUpload, 'id' | 'createdAt' | 'status' | 'totalFiles' | 'uploadedFiles' | 'processedFiles' | 'failedFiles' | 'files'>): Promise<string> {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const fullBatch: BatchUpload = {
      ...batch,
      id: batchId,
      createdAt: new Date(),
      status: 'preparing',
      totalFiles: 0,
      uploadedFiles: 0,
      processedFiles: 0,
      failedFiles: 0,
      files: []
    }

    await this.storeBatch(fullBatch)
    
    console.log(`Batch upload created: ${batchId}`)
    return batchId
  }

  // Add Files to Batch
  async addFilesToBatch(batchId: string, files: Array<{
    originalName: string
    fileName: string
    fileSize: number
    fileType: string
    checksum: string
    metadata?: Record<string, unknown>
  }>): Promise<void> {
    const batch = await this.getBatch(batchId)
    if (!batch) {
      throw new Error('Batch not found')
    }

    const batchFiles: BatchFile[] = files.map(file => ({
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      batchId,
      originalName: file.originalName,
      fileName: file.fileName,
      fileSize: file.fileSize,
      fileType: file.fileType,
      status: 'pending',
      uploadProgress: 0,
      processingProgress: 0,
      metadata: {
        checksum: file.checksum,
        validationResults: {
          mimeTypeValid: false,
          sizeValid: false,
          magicNumberValid: false,
          virusScanClean: false
        },
        ...file.metadata
      }
    }))

    // Apply batch rules
    for (const batchFile of batchFiles) {
      await this.applyBatchRules(batchFile, batch)
    }

    batch.files = [...batch.files, ...batchFiles]
    batch.totalFiles = batch.files.length
    
    await this.updateBatch(batch)
    console.log(`Added ${files.length} files to batch: ${batchId}`)
  }

  // Start Batch Processing
  async startBatchProcessing(batchId: string): Promise<void> {
    const batch = await this.getBatch(batchId)
    if (!batch) {
      throw new Error('Batch not found')
    }

    if (batch.status !== 'preparing') {
      throw new Error(`Batch is not in preparing state: ${batch.status}`)
    }

    batch.status = 'uploading'
    await this.updateBatch(batch)

    // Start processing files in parallel (with concurrency limit)
    const concurrency = 3 // Process 3 files at once
    const chunks = this.chunkArray(batch.files, concurrency)

    console.log(`Starting batch processing: ${batchId} (${batch.totalFiles} files)`)

    for (const chunk of chunks) {
      const promises = chunk.map(file => this.processFile(file, batch))
      await Promise.allSettled(promises)
    }

    // Update final batch status
    await this.completeBatchProcessing(batchId)
  }

  // Process Individual File
  private async processFile(file: BatchFile, batch: BatchUpload): Promise<void> {
    try {
      console.log(`Processing file: ${file.originalName}`)

      // Update file status
      file.status = 'uploading'
      await this.updateBatchFile(file)

      // Simulate file upload progress
      for (let progress = 0; progress <= 100; progress += 25) {
        file.uploadProgress = progress
        await this.updateBatchFile(file)
        await this.sleep(200) // Simulate upload time
      }

      file.status = 'uploaded'
      file.uploadedAt = new Date()
      await this.updateBatchFile(file)

      // Update batch counters
      batch.uploadedFiles++
      await this.updateBatch(batch)

      // Start processing
      file.status = 'processing'
      await this.updateBatchFile(file)

      // Validate file
      const validationResults = await this.validateFile(file)
      file.metadata.validationResults = validationResults

      if (!this.isFileValid(validationResults)) {
        file.status = 'failed'
        file.error = 'File validation failed'
        batch.failedFiles++
        await this.updateBatchFile(file)
        await this.updateBatch(batch)
        return
      }

      // Create file record in main files table
      const fileId = await this.createFileRecord(file, batch)
      file.fileId = fileId

      // Apply workflow settings
      if (batch.settings.autoAssign && batch.settings.assignToUser) {
        file.assignedTo = batch.settings.assignToUser
        // Trigger assignment automation
        await automationEngine.triggerEvent('file.auto_assigned', {
          fileId,
          batchId: batch.id,
          assignedTo: file.assignedTo
        }, {
          entityType: 'file',
          entityId: fileId,
          userId: batch.createdBy
        })
      }

      // Set QC stage
      file.qcStage = batch.settings.workflow.skipStages?.includes('QC') ? 'R1' : 'QC'

      // Processing complete
      file.status = 'completed'
      file.processedAt = new Date()
      file.processingProgress = 100
      batch.processedFiles++

      await this.updateBatchFile(file)
      await this.updateBatch(batch)

      console.log(`File processed successfully: ${file.originalName}`)

    } catch (error) {
      console.error(`Failed to process file ${file.originalName}:`, error)
      
      file.status = 'failed'
      file.error = error instanceof Error ? error.message : 'Unknown error'
      batch.failedFiles++
      
      await this.updateBatchFile(file)
      await this.updateBatch(batch)
    }
  }

  // Complete Batch Processing
  private async completeBatchProcessing(batchId: string): Promise<void> {
    const batch = await this.getBatch(batchId)
    if (!batch) return

    const completedFiles = batch.files.filter(f => f.status === 'completed').length
    const failedFiles = batch.files.filter(f => f.status === 'failed').length

    if (completedFiles + failedFiles === batch.totalFiles) {
      batch.status = failedFiles === 0 ? 'completed' : 'failed'
      batch.completedAt = new Date()
      batch.metadata.actualDuration = batch.completedAt.getTime() - batch.createdAt.getTime()

      // Generate error summary
      if (failedFiles > 0) {
        batch.metadata.errorSummary = batch.files
          .filter(f => f.error)
          .map(f => `${f.originalName}: ${f.error}`)
      }

      await this.updateBatch(batch)

      // Send notifications
      if (batch.settings.notifications.onComplete || (failedFiles > 0 && batch.settings.notifications.onError)) {
        await this.sendBatchNotifications(batch)
      }

      // Trigger automation
      await automationEngine.triggerEvent('batch.completed', {
        batchId,
        totalFiles: batch.totalFiles,
        completedFiles,
        failedFiles,
        successRate: completedFiles / batch.totalFiles
      }, {
        entityType: 'batch',
        entityId: batchId,
        userId: batch.createdBy
      })

      console.log(`Batch processing completed: ${batchId} (${completedFiles}/${batch.totalFiles} successful)`)
    }
  }

  // Get Batch Progress
  async getBatchProgress(batchId: string): Promise<BatchProgress> {
    const batch = await this.getBatch(batchId)
    if (!batch) {
      throw new Error('Batch not found')
    }

    const currentFile = batch.files.find(f => f.status === 'uploading' || f.status === 'processing')
    const startTime = batch.createdAt.getTime()
    const elapsed = Date.now() - startTime
    const processedCount = batch.uploadedFiles + batch.processedFiles
    const avgTimePerFile = processedCount > 0 ? elapsed / processedCount : 0
    const remaining = batch.totalFiles - processedCount
    const estimatedTimeRemaining = remaining * avgTimePerFile / 1000

    const errors = batch.files.filter(f => f.error)
    const recentErrors = errors.slice(-5).map(f => `${f.originalName}: ${f.error}`)

    return {
      batchId,
      overall: {
        totalFiles: batch.totalFiles,
        uploadedFiles: batch.uploadedFiles,
        processedFiles: batch.processedFiles,
        failedFiles: batch.failedFiles,
        percentComplete: batch.totalFiles > 0 ? Math.round(((batch.processedFiles + batch.failedFiles) / batch.totalFiles) * 100) : 0
      },
      currentFile: currentFile ? {
        fileName: currentFile.originalName,
        uploadProgress: currentFile.uploadProgress,
        processingProgress: currentFile.processingProgress,
        status: currentFile.status
      } : undefined,
      estimatedTimeRemaining: Math.max(0, estimatedTimeRemaining),
      throughput: {
        filesPerMinute: elapsed > 0 ? (processedCount / (elapsed / 1000 / 60)) : 0,
        mbPerSecond: this.calculateThroughput(batch.files, elapsed)
      },
      errors: {
        count: errors.length,
        recentErrors
      }
    }
  }

  // Batch Templates
  async createBatchTemplate(template: Omit<BatchTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const fullTemplate: BatchTemplate = {
      ...template,
      id: templateId,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await this.storeBatchTemplate(fullTemplate)
    console.log(`Batch template created: ${templateId}`)
    return templateId
  }

  // Create Batch from Template
  async createBatchFromTemplate(templateId: string, overrides: Partial<BatchUpload>): Promise<string> {
    const template = await this.getBatchTemplate(templateId)
    if (!template) {
      throw new Error('Template not found')
    }

    const batch = {
      name: overrides.name || `Batch from ${template.name}`,
      description: overrides.description || template.description,
      tenantId: overrides.tenantId || template.tenantId,
      projectId: overrides.projectId || '',
      createdBy: overrides.createdBy || '',
      settings: { ...template.settings, ...overrides.settings },
      metadata: {
        source: 'template' as const,
        ...overrides.metadata
      }
    }

    return await this.createBatch(batch)
  }

  // Statistics
  async getBatchStatistics(tenantId: string, period: { from: Date; to: Date }): Promise<BatchStatistics> {
    console.log(`Getting batch statistics for tenant: ${tenantId}`)

    const batches = await this.getBatches(tenantId, period)
    const totalBatches = batches.length
    const completedBatches = batches.filter(b => b.status === 'completed').length
    const failedBatches = batches.filter(b => b.status === 'failed').length
    
    const totalFilesProcessed = batches.reduce((sum, b) => sum + b.processedFiles, 0)
    const averageBatchSize = totalBatches > 0 ? Math.round(totalFilesProcessed / totalBatches) : 0
    
    const completedBatchesWithDuration = batches.filter(b => b.metadata.actualDuration)
    const averageProcessingTime = completedBatchesWithDuration.length > 0
      ? completedBatchesWithDuration.reduce((sum, b) => sum + (b.metadata.actualDuration || 0), 0) / completedBatchesWithDuration.length / 1000 / 60 // minutes
      : 0

    const successRate = totalBatches > 0 ? completedBatches / totalBatches : 0

    // Analyze failure reasons
    const allFailedFiles = batches.flatMap(b => b.files.filter(f => f.error))
    const failureReasons = this.groupBy(allFailedFiles, 'error')
    const topFailureReasons = Object.entries(failureReasons)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([reason, count]) => ({
        reason: reason || 'Unknown',
        count,
        percentage: Math.round((count / allFailedFiles.length) * 100)
      }))

    return {
      totalBatches,
      completedBatches,
      failedBatches,
      totalFilesProcessed,
      averageBatchSize,
      averageProcessingTime,
      successRate,
      topFailureReasons,
      throughputTrends: this.calculateThroughputTrends(batches),
      userActivity: this.calculateUserActivity(batches)
    }
  }

  // Helper Methods
  private async applyBatchRules(file: BatchFile, batch: BatchUpload): Promise<void> {
    // Would apply batch rules from template
    console.log(`Applying batch rules to file: ${file.originalName}`)
  }

  private async validateFile(file: BatchFile): Promise<BatchFile['metadata']['validationResults']> {
    // Simulate file validation
    await this.sleep(100)
    
    return {
      mimeTypeValid: true,
      sizeValid: file.fileSize < 100 * 1024 * 1024, // 100MB limit
      magicNumberValid: true,
      virusScanClean: true
    }
  }

  private isFileValid(results: BatchFile['metadata']['validationResults']): boolean {
    return results.mimeTypeValid && results.sizeValid && results.magicNumberValid && results.virusScanClean
  }

  private async createFileRecord(file: BatchFile, batch: BatchUpload): Promise<string> {
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Would create record in main files table
    console.log(`Creating file record: ${fileId} for ${file.originalName}`)
    
    return fileId
  }

  private async sendBatchNotifications(batch: BatchUpload): Promise<void> {
    const recipients = batch.settings.notifications.recipients
    const isSuccess = batch.status === 'completed'
    
    for (const recipient of recipients) {
      await notificationManager.sendNotification({
        userId: recipient,
        tenantId: batch.tenantId,
        type: 'system_alert',
        title: `Batch Upload ${isSuccess ? 'Completed' : 'Failed'}`,
        message: `Batch "${batch.name}" has ${isSuccess ? 'completed successfully' : 'failed'}. ${batch.processedFiles}/${batch.totalFiles} files processed.`,
        data: {
          batchId: batch.id,
          totalFiles: batch.totalFiles,
          processedFiles: batch.processedFiles,
          failedFiles: batch.failedFiles
        },
        channels: ['email', 'in_app'],
        priority: isSuccess ? 'medium' : 'high',
        metadata: {
          source: 'batch_upload',
          entityType: 'batch',
          entityId: batch.id,
          actionUrl: `/batches/${batch.id}`
        }
      })
    }
  }

  private calculateThroughput(files: BatchFile[], elapsedMs: number): number {
    const completedFiles = files.filter(f => f.status === 'completed' || f.status === 'failed')
    const totalBytes = completedFiles.reduce((sum, f) => sum + f.fileSize, 0)
    return elapsedMs > 0 ? (totalBytes / (elapsedMs / 1000)) / (1024 * 1024) : 0 // MB/s
  }

  private calculateThroughputTrends(batches: BatchUpload[]): BatchStatistics['throughputTrends'] {
    // Group by day and calculate trends
    const dailyStats = batches.reduce((stats, batch) => {
      const day = batch.createdAt.toDateString()
      if (!stats[day]) {
        stats[day] = { filesProcessed: 0, totalTime: 0, count: 0 }
      }
      stats[day].filesProcessed += batch.processedFiles
      stats[day].totalTime += batch.metadata.actualDuration || 0
      stats[day].count++
      return stats
    }, {} as Record<string, { filesProcessed: number; totalTime: number; count: number }>)

    return Object.entries(dailyStats).map(([day, stats]) => ({
      date: new Date(day),
      filesProcessed: stats.filesProcessed,
      averageTime: stats.count > 0 ? stats.totalTime / stats.count / 1000 / 60 : 0 // minutes
    }))
  }

  private calculateUserActivity(batches: BatchUpload[]): BatchStatistics['userActivity'] {
    const userStats = batches.reduce((stats, batch) => {
      if (!stats[batch.createdBy]) {
        stats[batch.createdBy] = {
          userId: batch.createdBy,
          userName: 'User Name', // Would fetch from user table
          batchesCreated: 0,
          filesUploaded: 0
        }
      }
      stats[batch.createdBy].batchesCreated++
      stats[batch.createdBy].filesUploaded += batch.processedFiles
      return stats
    }, {} as Record<string, BatchStatistics['userActivity'][0]>)

    return Object.values(userStats).sort((a, b) => b.filesUploaded - a.filesUploaded)
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }

  private groupBy<T extends Record<string, unknown>>(items: T[], key: keyof T): Record<string, number> {
    return items.reduce((groups, item) => {
      const value = String(item[key] || 'unknown')
      groups[value] = (groups[value] || 0) + 1
      return groups
    }, {} as Record<string, number>)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Database operations (placeholders)
  private async storeBatch(batch: BatchUpload): Promise<void> {
    console.log(`Storing batch: ${batch.id}`)
  }

  private async getBatch(batchId: string): Promise<BatchUpload | null> {
    console.log(`Getting batch: ${batchId}`)
    return null
  }

  private async updateBatch(batch: BatchUpload): Promise<void> {
    console.log(`Updating batch: ${batch.id}`)
  }

  private async updateBatchFile(file: BatchFile): Promise<void> {
    console.log(`Updating batch file: ${file.id}`)
  }

  private async getBatches(tenantId: string, period: { from: Date; to: Date }): Promise<BatchUpload[]> {
    console.log(`Getting batches for tenant: ${tenantId}`)
    return []
  }

  private async storeBatchTemplate(template: BatchTemplate): Promise<void> {
    console.log(`Storing batch template: ${template.id}`)
  }

  private async getBatchTemplate(templateId: string): Promise<BatchTemplate | null> {
    console.log(`Getting batch template: ${templateId}`)
    return null
  }
}

// Export batch upload manager instance
export const batchUploadManager = new BatchUploadManager()
