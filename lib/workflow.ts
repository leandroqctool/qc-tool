// Stage-based QC workflow management
import { getDb } from './db'
import { createAudit } from './audit'

export type WorkflowStage = 'UPLOADED' | 'QC' | 'R1' | 'R2' | 'R3' | 'R4' | 'APPROVED' | 'FAILED'
export type WorkflowAction = 'APPROVE' | 'ADJUST' | 'FAIL' | 'ASSIGN'

export interface StageConfig {
  name: WorkflowStage
  displayName: string
  order: number
  isActive: boolean
}

export interface StageTransition {
  id: string
  fileId: string
  fromStage: WorkflowStage | null
  toStage: WorkflowStage
  action: WorkflowAction
  reviewerId?: string
  comments?: string
  createdAt: Date
}

export interface FileWorkflowStatus {
  fileId: string
  currentStage: WorkflowStage
  revisionCount: number
  assignedTo?: string
  history: StageTransition[]
}

// Default workflow configuration
export const DEFAULT_WORKFLOW_STAGES: Omit<StageConfig, 'isActive'>[] = [
  { name: 'UPLOADED', displayName: 'Uploaded', order: 0 },
  { name: 'QC', displayName: 'Quality Control', order: 1 },
  { name: 'R1', displayName: 'Revision 1', order: 2 },
  { name: 'R2', displayName: 'Revision 2', order: 3 },
  { name: 'R3', displayName: 'Revision 3', order: 4 },
  { name: 'R4', displayName: 'Revision 4', order: 5 },
  { name: 'APPROVED', displayName: 'Approved', order: 6 },
  { name: 'FAILED', displayName: 'Failed', order: 7 },
]

// Stage progression rules
export const STAGE_PROGRESSIONS: Record<WorkflowStage, { [key in WorkflowAction]?: WorkflowStage }> = {
  UPLOADED: {
    ASSIGN: 'QC', // Assign to QC reviewer
  },
  QC: {
    APPROVE: 'APPROVED', // QC approves - file is done
    ADJUST: 'R1', // QC requests adjustments - move to revision
    FAIL: 'FAILED', // QC fails the file
  },
  R1: {
    APPROVE: 'APPROVED', // R1 reviewer approves
    ADJUST: 'R2', // R1 requests more adjustments
    FAIL: 'FAILED', // R1 fails the file
  },
  R2: {
    APPROVE: 'APPROVED',
    ADJUST: 'R3',
    FAIL: 'FAILED',
  },
  R3: {
    APPROVE: 'APPROVED',
    ADJUST: 'R4',
    FAIL: 'FAILED',
  },
  R4: {
    APPROVE: 'APPROVED', // Final revision - must approve or fail
    FAIL: 'FAILED',
  },
  APPROVED: {}, // Terminal state
  FAILED: {}, // Terminal state
}

/**
 * Get workflow stages for a tenant
 */
export async function getWorkflowStages(tenantId: string): Promise<StageConfig[]> {
  const db = getDb()
  
  const stages = await db
    .select({
      name: db.schema.workflowStages.name,
      displayName: db.schema.workflowStages.displayName,
      order: db.schema.workflowStages.order,
      isActive: db.schema.workflowStages.isActive,
    })
    .from(db.schema.workflowStages)
    .where(db.operators.eq(db.schema.workflowStages.tenantId, tenantId))
    .orderBy(db.schema.workflowStages.order)

  return stages.map(stage => ({
    name: stage.name as WorkflowStage,
    displayName: stage.displayName,
    order: parseInt(stage.order),
    isActive: stage.isActive === 'true',
  }))
}

/**
 * Initialize default workflow stages for a tenant
 */
export async function initializeWorkflowStages(tenantId: string): Promise<void> {
  const db = getDb()
  
  const existingStages = await getWorkflowStages(tenantId)
  if (existingStages.length > 0) {
    return // Already initialized
  }

  const stageInserts = DEFAULT_WORKFLOW_STAGES.map(stage => ({
    name: stage.name,
    displayName: stage.displayName,
    order: stage.order.toString(),
    isActive: 'true',
    tenantId,
  }))

  await db.insert(db.schema.workflowStages).values(stageInserts)
}

/**
 * Get file workflow status with history
 */
export async function getFileWorkflowStatus(fileId: string, tenantId: string): Promise<FileWorkflowStatus | null> {
  const db = getDb()

  // Get current file status
  const [file] = await db
    .select({
      currentStage: db.schema.files.currentStage,
      revisionCount: db.schema.files.revisionCount,
      assignedTo: db.schema.files.assignedTo,
    })
    .from(db.schema.files)
    .where(db.operators.eq(db.schema.files.id, fileId))
    .limit(1)

  if (!file) return null

  // Get transition history
  const transitions = await db
    .select({
      id: db.schema.stageTransitions.id,
      fromStage: db.schema.stageTransitions.fromStage,
      toStage: db.schema.stageTransitions.toStage,
      action: db.schema.stageTransitions.action,
      reviewerId: db.schema.stageTransitions.reviewerId,
      comments: db.schema.stageTransitions.comments,
      createdAt: db.schema.stageTransitions.createdAt,
    })
    .from(db.schema.stageTransitions)
    .where(db.operators.eq(db.schema.stageTransitions.fileId, fileId))
    .orderBy(db.schema.stageTransitions.createdAt)

  return {
    fileId,
    currentStage: file.currentStage as WorkflowStage,
    revisionCount: parseInt(file.revisionCount),
    assignedTo: file.assignedTo || undefined,
    history: transitions.map(t => ({
      id: t.id,
      fileId,
      fromStage: t.fromStage as WorkflowStage | null,
      toStage: t.toStage as WorkflowStage,
      action: t.action as WorkflowAction,
      reviewerId: t.reviewerId || undefined,
      comments: t.comments || undefined,
      createdAt: t.createdAt!,
    })),
  }
}

/**
 * Execute a workflow action on a file
 */
export async function executeWorkflowAction(
  fileId: string,
  action: WorkflowAction,
  reviewerId: string,
  tenantId: string,
  comments?: string
): Promise<{ success: boolean; error?: string; newStage?: WorkflowStage }> {
  const db = getDb()

  try {
    // Get current file status
    const [file] = await db
      .select({
        currentStage: db.schema.files.currentStage,
        revisionCount: db.schema.files.revisionCount,
        originalName: db.schema.files.originalName,
      })
      .from(db.schema.files)
      .where(db.operators.eq(db.schema.files.id, fileId))
      .limit(1)

    if (!file) {
      return { success: false, error: 'File not found' }
    }

    const currentStage = file.currentStage as WorkflowStage
    const progressions = STAGE_PROGRESSIONS[currentStage]
    
    if (!progressions || !(action in progressions)) {
      return { 
        success: false, 
        error: `Action "${action}" is not valid for stage "${currentStage}"` 
      }
    }

    const newStage = progressions[action]!
    const newRevisionCount = action === 'ADJUST' 
      ? parseInt(file.revisionCount) + 1 
      : parseInt(file.revisionCount)

    // Update file status
    await db
      .update(db.schema.files)
      .set({
        currentStage: newStage,
        revisionCount: newRevisionCount.toString(),
        assignedTo: newStage === 'APPROVED' || newStage === 'FAILED' ? null : reviewerId,
        updatedAt: new Date(),
      })
      .where(db.operators.eq(db.schema.files.id, fileId))

    // Record stage transition
    await db.insert(db.schema.stageTransitions).values({
      fileId,
      fromStage: currentStage,
      toStage: newStage,
      action,
      reviewerId,
      comments,
      tenantId,
    })

    // Create QC review record
    await db.insert(db.schema.qcReviews).values({
      fileId,
      stage: currentStage,
      action,
      status: 'COMPLETED',
      comments,
      reviewerId,
      tenantId,
    })

    // Create audit log
    await createAudit(
      tenantId,
      reviewerId,
      'file',
      fileId,
      `${action.toLowerCase()}_${currentStage.toLowerCase()}`
    )

    return { success: true, newStage }
  } catch (error) {
    console.error('Workflow action failed:', error)
    return { 
      success: false, 
      error: 'Failed to execute workflow action' 
    }
  }
}

/**
 * Assign a file to a reviewer for a specific stage
 */
export async function assignFileToReviewer(
  fileId: string,
  reviewerId: string,
  tenantId: string,
  stage?: WorkflowStage
): Promise<{ success: boolean; error?: string }> {
  const db = getDb()

  try {
    const [file] = await db
      .select({
        currentStage: db.schema.files.currentStage,
      })
      .from(db.schema.files)
      .where(db.operators.eq(db.schema.files.id, fileId))
      .limit(1)

    if (!file) {
      return { success: false, error: 'File not found' }
    }

    const targetStage = stage || file.currentStage as WorkflowStage

    // Update assignment
    await db
      .update(db.schema.files)
      .set({
        assignedTo: reviewerId,
        updatedAt: new Date(),
      })
      .where(db.operators.eq(db.schema.files.id, fileId))

    // Record transition if moving to a new stage
    if (stage && stage !== file.currentStage) {
      await db.insert(db.schema.stageTransitions).values({
        fileId,
        fromStage: file.currentStage,
        toStage: stage,
        action: 'ASSIGN',
        reviewerId,
        tenantId,
      })

      await db
        .update(db.schema.files)
        .set({
          currentStage: stage,
          updatedAt: new Date(),
        })
        .where(db.operators.eq(db.schema.files.id, fileId))
    }

    // Create audit log
    await createAudit(
      tenantId,
      reviewerId,
      'file',
      fileId,
      `assign_${targetStage.toLowerCase()}`
    )

    return { success: true }
  } catch (error) {
    console.error('File assignment failed:', error)
    return { 
      success: false, 
      error: 'Failed to assign file' 
    }
  }
}

/**
 * Get files by workflow stage
 */
export async function getFilesByStage(
  tenantId: string,
  stage: WorkflowStage,
  assignedTo?: string
): Promise<Array<{
  id: string
  originalName: string
  currentStage: WorkflowStage
  revisionCount: number
  assignedTo?: string
  createdAt: Date
}>> {
  const db = getDb()

  // Use a direct query approach for now
  const files = await db
    .select({
      id: db.schema.files.id,
      originalName: db.schema.files.originalName,
      currentStage: db.schema.files.currentStage,
      revisionCount: db.schema.files.revisionCount,
      assignedTo: db.schema.files.assignedTo,
      createdAt: db.schema.files.createdAt,
    })
    .from(db.schema.files)
    .where(db.operators.eq(db.schema.files.tenantId, tenantId))
    .orderBy(db.operators.desc(db.schema.files.createdAt))
  
  // Filter in memory for now (can be optimized later)
  const filteredFiles = files.filter(file => {
    if (file.currentStage !== stage) return false
    if (assignedTo && file.assignedTo !== assignedTo) return false
    return true
  })

  return filteredFiles.map(file => ({
    id: file.id,
    originalName: file.originalName,
    currentStage: file.currentStage as WorkflowStage,
    revisionCount: parseInt(file.revisionCount),
    assignedTo: file.assignedTo || undefined,
    createdAt: file.createdAt!,
  }))
}

/**
 * Get workflow statistics for a tenant
 */
export async function getWorkflowStats(tenantId: string): Promise<{
  totalFiles: number
  byStage: Record<WorkflowStage, number>
  avgRevisions: number
  completionRate: number
}> {
  const db = getDb()

  const files = await db
    .select({
      currentStage: db.schema.files.currentStage,
      revisionCount: db.schema.files.revisionCount,
    })
    .from(db.schema.files)
    .where(db.operators.eq(db.schema.files.tenantId, tenantId))

  const totalFiles = files.length
  const byStage: Record<string, number> = {}
  let totalRevisions = 0
  let completedFiles = 0

  for (const file of files) {
    const stage = file.currentStage
    byStage[stage] = (byStage[stage] || 0) + 1
    totalRevisions += parseInt(file.revisionCount)
    
    if (stage === 'APPROVED' || stage === 'FAILED') {
      completedFiles++
    }
  }

  return {
    totalFiles,
    byStage: byStage as Record<WorkflowStage, number>,
    avgRevisions: totalFiles > 0 ? totalRevisions / totalFiles : 0,
    completionRate: totalFiles > 0 ? (completedFiles / totalFiles) * 100 : 0,
  }
}

// Get workflow history for a file
export async function getFileWorkflowHistory(
  fileId: string,
  tenantId: string
): Promise<Array<{
  id: string
  fromStage: string | null
  toStage: string
  action: string
  reviewerId: string | null
  comments: string | null
  createdAt: Date
}>> {
  const db = getDb()
  
  try {
    const transitions = await db
      .select({
        id: db.schema.stageTransitions.id,
        fromStage: db.schema.stageTransitions.fromStage,
        toStage: db.schema.stageTransitions.toStage,
        action: db.schema.stageTransitions.action,
        reviewerId: db.schema.stageTransitions.reviewerId,
        comments: db.schema.stageTransitions.comments,
        createdAt: db.schema.stageTransitions.createdAt,
      })
      .from(db.schema.stageTransitions)
      .where(db.operators.eq(db.schema.stageTransitions.fileId, fileId))
      .orderBy(db.operators.desc(db.schema.stageTransitions.createdAt))

    return transitions.map(t => ({
      id: t.id,
      fromStage: t.fromStage,
      toStage: t.toStage,
      action: t.action,
      reviewerId: t.reviewerId,
      comments: t.comments,
      createdAt: t.createdAt || new Date(),
    }))
  } catch (error) {
    console.error('Error fetching workflow history:', error)
    return []
  }
}

// Perform a workflow action on a file
export async function performWorkflowAction(
  fileId: string,
  action: WorkflowAction,
  reviewerId: string,
  tenantId: string,
  comments?: string
): Promise<{ success: boolean; error?: string; newStage?: WorkflowStage }> {
  const db = getDb()

  try {
    // Get current file status
    const files = await db
      .select({
        id: db.schema.files.id,
        currentStage: db.schema.files.currentStage,
        revisionCount: db.schema.files.revisionCount,
      })
      .from(db.schema.files)
      .where(db.operators.eq(db.schema.files.id, fileId))
      .limit(1)

    if (files.length === 0) {
      return { success: false, error: 'File not found' }
    }

    const file = files[0]
    const currentStage = file.currentStage as WorkflowStage
    const progressions = STAGE_PROGRESSIONS[currentStage]

    if (!progressions || !progressions[action]) {
      return { success: false, error: `Action ${action} not allowed from stage ${currentStage}` }
    }

    const newStage = progressions[action]!
    const newRevisionCount = action === 'ADJUST' 
      ? (parseInt(file.revisionCount) + 1).toString()
      : file.revisionCount

    // Update file status
    await db
      .update(db.schema.files)
      .set({
        currentStage: newStage,
        revisionCount: newRevisionCount,
        status: newStage === 'APPROVED' || newStage === 'FAILED' ? newStage : 'QC',
        updatedAt: new Date(),
      })
      .where(db.operators.eq(db.schema.files.id, fileId))

    // Create stage transition record
    await db.insert(db.schema.stageTransitions).values({
      fileId,
      fromStage: currentStage,
      toStage: newStage,
      action,
      reviewerId,
      comments,
      tenantId,
    })

    // Create audit log
    await createAudit(
      tenantId,
      reviewerId,
      'file',
      fileId,
      `${action.toLowerCase()}_${currentStage.toLowerCase()}`
    )

    return { success: true, newStage }
  } catch (error) {
    console.error('Workflow action failed:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}
