// Advanced Form Workflow System - Workfront-style Approvals
import { FormSubmission, FormTemplate } from './forms'
import { notificationManager } from './notifications'

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  formId: string
  tenantId: string
  active: boolean
  steps: WorkflowStep[]
  settings: WorkflowSettings
  createdAt: Date
  updatedAt: Date
}

export interface WorkflowStep {
  id: string
  name: string
  type: 'approval' | 'review' | 'notification' | 'condition' | 'action'
  order: number
  required: boolean
  assignees: WorkflowAssignee[]
  conditions: WorkflowCondition[]
  actions: WorkflowAction[]
  timeouts: {
    duration: number // hours
    action: 'escalate' | 'auto_approve' | 'auto_reject' | 'notify'
    escalateTo?: string[]
  }
  settings: {
    allowParallel: boolean
    requireAll: boolean // for multiple assignees
    allowReassign: boolean
    allowComments: boolean
    allowAttachments: boolean
  }
}

export interface WorkflowAssignee {
  type: 'user' | 'role' | 'group' | 'conditional'
  id: string
  name: string
  conditions?: WorkflowCondition[]
}

export interface WorkflowCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in'
  value: unknown
  logicalOperator?: 'and' | 'or'
}

export interface WorkflowAction {
  type: 'email' | 'webhook' | 'update_field' | 'create_task' | 'assign_user'
  config: Record<string, unknown>
}

export interface WorkflowSettings {
  allowResubmission: boolean
  requireComments: boolean
  notifySubmitter: boolean
  escalationEnabled: boolean
  autoArchive: {
    enabled: boolean
    afterDays: number
  }
  permissions: {
    viewSubmissions: string[] // user IDs or roles
    editWorkflow: string[]
    deleteSubmissions: string[]
  }
}

export interface WorkflowExecution {
  id: string
  workflowId: string
  submissionId: string
  tenantId: string
  status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'cancelled' | 'expired'
  currentStep: number
  steps: WorkflowStepExecution[]
  submittedBy: string
  submittedAt: Date
  completedAt?: Date
  metadata: {
    priority: 'low' | 'medium' | 'high' | 'urgent'
    tags: string[]
    estimatedDuration: number // hours
    actualDuration?: number // hours
  }
}

export interface WorkflowStepExecution {
  stepId: string
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'skipped' | 'expired'
  assignedTo: string[]
  startedAt?: Date
  completedAt?: Date
  completedBy?: string
  decision?: 'approve' | 'reject' | 'request_changes'
  comments?: string
  attachments?: string[]
  timeoutAt?: Date
  escalatedTo?: string[]
  escalatedAt?: Date
}

export interface WorkflowComment {
  id: string
  executionId: string
  stepId: string
  userId: string
  userName: string
  comment: string
  attachments: string[]
  createdAt: Date
  isInternal: boolean
}

export interface WorkflowMetrics {
  totalSubmissions: number
  completedSubmissions: number
  rejectedSubmissions: number
  averageCompletionTime: number // hours
  averageStepTime: Record<string, number> // step ID -> hours
  bottleneckSteps: string[]
  escalationRate: number
  resubmissionRate: number
  userPerformance: Record<string, {
    totalAssigned: number
    completed: number
    averageTime: number
    escalations: number
  }>
}

// Workflow Engine Class
export class WorkflowEngine {
  // Start workflow execution
  async startWorkflow(workflowId: string, submissionId: string, submittedBy: string, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'): Promise<string> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    try {
      // Get workflow template
      const workflow = await this.getWorkflowTemplate(workflowId)
      if (!workflow || !workflow.active) {
        throw new Error('Workflow not found or inactive')
      }

      // Get submission data
      const submission = await this.getSubmission(submissionId)
      if (!submission) {
        throw new Error('Submission not found')
      }

      // Create execution
      const execution: WorkflowExecution = {
        id: executionId,
        workflowId,
        submissionId,
        tenantId: workflow.tenantId,
        status: 'pending',
        currentStep: 0,
        steps: workflow.steps.map(step => ({
          stepId: step.id,
          status: 'pending',
          assignedTo: []
        })),
        submittedBy,
        submittedAt: new Date(),
        metadata: {
          priority,
          tags: [],
          estimatedDuration: this.calculateEstimatedDuration(workflow)
        }
      }

      // Store execution
      await this.storeExecution(execution)

      // Start first step
      await this.processNextStep(executionId)

      console.log(`Workflow started: ${executionId} for submission: ${submissionId}`)
      return executionId

    } catch (error) {
      console.error(`Failed to start workflow ${workflowId}:`, error)
      throw error
    }
  }

  // Process workflow step
  async processStep(executionId: string, stepId: string, decision: 'approve' | 'reject' | 'request_changes', userId: string, comments?: string, attachments?: string[]): Promise<void> {
    try {
      const execution = await this.getExecution(executionId)
      if (!execution) {
        throw new Error('Execution not found')
      }

      const stepExecution = execution.steps.find(s => s.stepId === stepId)
      if (!stepExecution) {
        throw new Error('Step not found')
      }

      if (stepExecution.status !== 'in_progress') {
        throw new Error('Step is not in progress')
      }

      // Check if user is assigned to this step
      if (!stepExecution.assignedTo.includes(userId)) {
        throw new Error('User not assigned to this step')
      }

      // Update step execution
      stepExecution.status = decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'pending'
      stepExecution.completedAt = new Date()
      stepExecution.completedBy = userId
      stepExecution.decision = decision
      stepExecution.comments = comments

      // Store comment if provided
      if (comments) {
        await this.addComment(executionId, stepId, userId, comments, attachments || [])
      }

      // Update execution
      await this.updateExecution(execution)

      // Handle decision
      if (decision === 'approve') {
        await this.processNextStep(executionId)
      } else if (decision === 'reject') {
        await this.rejectWorkflow(executionId, `Rejected at step: ${stepId}`)
      } else if (decision === 'request_changes') {
        await this.requestChanges(executionId, stepId, comments || 'Changes requested')
      }

      // Send notifications
      await this.notifyStepCompletion(execution, stepExecution, decision, userId)

      console.log(`Step processed: ${stepId} in execution: ${executionId} - Decision: ${decision}`)

    } catch (error) {
      console.error(`Failed to process step ${stepId} in execution ${executionId}:`, error)
      throw error
    }
  }

  // Process next step in workflow
  private async processNextStep(executionId: string): Promise<void> {
    const execution = await this.getExecution(executionId)
    if (!execution) return

    const workflow = await this.getWorkflowTemplate(execution.workflowId)
    if (!workflow) return

    // Find next pending step
    const nextStep = execution.steps.find(s => s.status === 'pending')
    if (!nextStep) {
      // All steps completed
      await this.completeWorkflow(executionId)
      return
    }

    const stepTemplate = workflow.steps.find(s => s.id === nextStep.stepId)
    if (!stepTemplate) return

    // Check conditions
    const submission = await this.getSubmission(execution.submissionId)
    if (submission && !this.evaluateConditions(stepTemplate.conditions, submission.data)) {
      // Skip this step
      nextStep.status = 'skipped'
      await this.updateExecution(execution)
      await this.processNextStep(executionId)
      return
    }

    // Assign step
    const assignees = await this.resolveAssignees(stepTemplate.assignees, execution.tenantId, submission?.data)
    nextStep.assignedTo = assignees
    nextStep.status = 'in_progress'
    nextStep.startedAt = new Date()

    // Set timeout
    if (stepTemplate.timeouts.duration > 0) {
      nextStep.timeoutAt = new Date(Date.now() + stepTemplate.timeouts.duration * 60 * 60 * 1000)
    }

    // Update execution
    execution.currentStep = workflow.steps.findIndex(s => s.id === nextStep.stepId)
    execution.status = 'in_progress'
    await this.updateExecution(execution)

    // Notify assignees
    await this.notifyStepAssignment(execution, nextStep, stepTemplate)

    console.log(`Next step started: ${nextStep.stepId} in execution: ${executionId}`)
  }

  // Complete workflow
  private async completeWorkflow(executionId: string): Promise<void> {
    const execution = await this.getExecution(executionId)
    if (!execution) return

    execution.status = 'completed'
    execution.completedAt = new Date()
    execution.metadata.actualDuration = (execution.completedAt.getTime() - execution.submittedAt.getTime()) / (1000 * 60 * 60)

    await this.updateExecution(execution)

    // Execute completion actions
    const workflow = await this.getWorkflowTemplate(execution.workflowId)
    if (workflow) {
      await this.executeCompletionActions(execution, workflow)
    }

    // Notify completion
    await this.notifyWorkflowCompletion(execution, 'completed')

    console.log(`Workflow completed: ${executionId}`)
  }

  // Reject workflow
  private async rejectWorkflow(executionId: string, reason: string): Promise<void> {
    const execution = await this.getExecution(executionId)
    if (!execution) return

    execution.status = 'rejected'
    execution.completedAt = new Date()

    await this.updateExecution(execution)
    await this.notifyWorkflowCompletion(execution, 'rejected', reason)

    console.log(`Workflow rejected: ${executionId} - Reason: ${reason}`)
  }

  // Request changes
  private async requestChanges(executionId: string, stepId: string, comments: string): Promise<void> {
    const execution = await this.getExecution(executionId)
    if (!execution) return

    // Reset workflow to beginning or specific step
    execution.status = 'pending'
    execution.currentStep = 0
    execution.steps.forEach(step => {
      if (step.status === 'in_progress' || step.status === 'approved') {
        step.status = 'pending'
        step.completedAt = undefined
        step.completedBy = undefined
      }
    })

    await this.updateExecution(execution)
    await this.notifyChangesRequested(execution, stepId, comments)

    console.log(`Changes requested for execution: ${executionId}`)
  }

  // Evaluate conditions
  private evaluateConditions(conditions: WorkflowCondition[], data: Record<string, unknown>): boolean {
    if (!conditions || conditions.length === 0) return true

    let result = true
    let currentLogic: 'and' | 'or' = 'and'

    for (const condition of conditions) {
      const fieldValue = data[condition.field]
      let conditionResult = false

      switch (condition.operator) {
        case 'equals':
          conditionResult = fieldValue === condition.value
          break
        case 'not_equals':
          conditionResult = fieldValue !== condition.value
          break
        case 'contains':
          conditionResult = String(fieldValue).includes(String(condition.value))
          break
        case 'greater_than':
          conditionResult = Number(fieldValue) > Number(condition.value)
          break
        case 'less_than':
          conditionResult = Number(fieldValue) < Number(condition.value)
          break
        case 'in':
          conditionResult = Array.isArray(condition.value) && condition.value.includes(fieldValue)
          break
        case 'not_in':
          conditionResult = Array.isArray(condition.value) && !condition.value.includes(fieldValue)
          break
      }

      if (currentLogic === 'and') {
        result = result && conditionResult
      } else {
        result = result || conditionResult
      }

      currentLogic = condition.logicalOperator || 'and'
    }

    return result
  }

  // Resolve assignees
  private async resolveAssignees(assignees: WorkflowAssignee[], tenantId: string, data?: Record<string, unknown>): Promise<string[]> {
    const resolvedAssignees: string[] = []

    for (const assignee of assignees) {
      switch (assignee.type) {
        case 'user':
          resolvedAssignees.push(assignee.id)
          break
        case 'role':
          const usersWithRole = await this.getUsersByRole(assignee.id, tenantId)
          resolvedAssignees.push(...usersWithRole)
          break
        case 'group':
          const groupUsers = await this.getUsersByGroup(assignee.id, tenantId)
          resolvedAssignees.push(...groupUsers)
          break
        case 'conditional':
          if (data && assignee.conditions && this.evaluateConditions(assignee.conditions, data)) {
            resolvedAssignees.push(assignee.id)
          }
          break
      }
    }

    return [...new Set(resolvedAssignees)] // Remove duplicates
  }

  // Calculate estimated duration
  private calculateEstimatedDuration(workflow: WorkflowTemplate): number {
    return workflow.steps.reduce((total, step) => {
      // Base time per step type
      const baseTime = {
        approval: 4,    // hours
        review: 2,
        notification: 0.1,
        condition: 0.1,
        action: 0.5
      }
      return total + (baseTime[step.type] || 1)
    }, 0)
  }

  // Notification methods
  private async notifyStepAssignment(execution: WorkflowExecution, step: WorkflowStepExecution, stepTemplate: WorkflowStep): Promise<void> {
    for (const assigneeId of step.assignedTo) {
      await notificationManager.sendNotification({
        userId: assigneeId,
        tenantId: execution.tenantId,
        type: 'qc_review_assigned',
        title: `New ${stepTemplate.type} required: ${stepTemplate.name}`,
        message: `You have been assigned a ${stepTemplate.type} task in workflow execution ${execution.id}`,
        data: {
          executionId: execution.id,
          stepId: step.stepId,
          stepName: stepTemplate.name,
          priority: execution.metadata.priority
        },
        channels: ['email', 'in_app'],
        priority: execution.metadata.priority === 'urgent' ? 'urgent' : 'medium',
        metadata: {
          source: 'workflow_engine',
          entityType: 'workflow_step',
          entityId: step.stepId,
          actionUrl: `/workflows/${execution.id}`
        }
      })
    }
  }

  private async notifyStepCompletion(execution: WorkflowExecution, step: WorkflowStepExecution, decision: string, userId: string): Promise<void> {
    // Notify submitter
    await notificationManager.sendNotification({
      userId: execution.submittedBy,
      tenantId: execution.tenantId,
      type: 'qc_review_completed',
      title: `Workflow step ${decision}d`,
      message: `Your workflow submission has been ${decision}d at step ${step.stepId}`,
      data: {
        executionId: execution.id,
        stepId: step.stepId,
        decision,
        completedBy: userId
      },
      channels: ['in_app'],
      priority: 'low',
      metadata: {
        source: 'workflow_engine',
        entityType: 'workflow_execution',
        entityId: execution.id,
        actionUrl: `/workflows/${execution.id}`
      }
    })
  }

  private async notifyWorkflowCompletion(execution: WorkflowExecution, status: 'completed' | 'rejected', reason?: string): Promise<void> {
    const title = status === 'completed' ? 'Workflow Completed' : 'Workflow Rejected'
    const message = status === 'completed' 
      ? `Your workflow submission ${execution.id} has been completed successfully`
      : `Your workflow submission ${execution.id} has been rejected. Reason: ${reason}`

    await notificationManager.sendNotification({
      userId: execution.submittedBy,
      tenantId: execution.tenantId,
      type: status === 'completed' ? 'qc_review_completed' : 'qc_review_rejected',
      title,
      message,
      data: {
        executionId: execution.id,
        status,
        reason,
        duration: execution.metadata.actualDuration
      },
      channels: ['email', 'in_app'],
      priority: status === 'rejected' ? 'high' : 'medium',
      metadata: {
        source: 'workflow_engine',
        entityType: 'workflow_execution',
        entityId: execution.id,
        actionUrl: `/workflows/${execution.id}`
      }
    })
  }

  private async notifyChangesRequested(execution: WorkflowExecution, stepId: string, comments: string): Promise<void> {
    await notificationManager.sendNotification({
      userId: execution.submittedBy,
      tenantId: execution.tenantId,
      type: 'qc_review_rejected',
      title: 'Changes Requested',
      message: `Changes have been requested for your workflow submission: ${comments}`,
      data: {
        executionId: execution.id,
        stepId,
        comments
      },
      channels: ['email', 'in_app'],
      priority: 'medium',
      metadata: {
        source: 'workflow_engine',
        entityType: 'workflow_execution',
        entityId: execution.id,
        actionUrl: `/workflows/${execution.id}`
      }
    })
  }

  // Execute completion actions
  private async executeCompletionActions(execution: WorkflowExecution, workflow: WorkflowTemplate): Promise<void> {
    for (const step of workflow.steps) {
      for (const action of step.actions) {
        try {
          await this.executeAction(action, execution)
        } catch (error) {
          console.error(`Failed to execute action ${action.type}:`, error)
        }
      }
    }
  }

  private async executeAction(action: WorkflowAction, execution: WorkflowExecution): Promise<void> {
    switch (action.type) {
      case 'email':
        // Send email
        console.log(`Executing email action for execution: ${execution.id}`)
        break
      case 'webhook':
        // Call webhook
        const webhookUrl = action.config.url as string
        if (webhookUrl) {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ execution, action: 'completed' })
          })
        }
        break
      case 'update_field':
        // Update submission field
        console.log(`Executing update_field action for execution: ${execution.id}`)
        break
      case 'create_task':
        // Create follow-up task
        console.log(`Executing create_task action for execution: ${execution.id}`)
        break
      case 'assign_user':
        // Assign to user
        console.log(`Executing assign_user action for execution: ${execution.id}`)
        break
    }
  }

  // Database operations (placeholders)
  private async getWorkflowTemplate(workflowId: string): Promise<WorkflowTemplate | null> {
    // Mock workflow template
    return {
      id: workflowId,
      name: 'Sample Approval Workflow',
      description: 'A sample workflow for approvals',
      formId: 'form_123',
      tenantId: 'tenant_123',
      active: true,
      steps: [
        {
          id: 'step_1',
          name: 'Manager Approval',
          type: 'approval',
          order: 1,
          required: true,
          assignees: [{ type: 'role', id: 'manager', name: 'Manager' }],
          conditions: [],
          actions: [],
          timeouts: { duration: 24, action: 'escalate' },
          settings: {
            allowParallel: false,
            requireAll: false,
            allowReassign: true,
            allowComments: true,
            allowAttachments: true
          }
        }
      ],
      settings: {
        allowResubmission: true,
        requireComments: false,
        notifySubmitter: true,
        escalationEnabled: true,
        autoArchive: { enabled: true, afterDays: 30 },
        permissions: {
          viewSubmissions: ['admin', 'manager'],
          editWorkflow: ['admin'],
          deleteSubmissions: ['admin']
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  private async getSubmission(submissionId: string): Promise<FormSubmission | null> {
    // Mock submission
    return {
      id: submissionId,
      formId: 'form_123',
      formVersion: 1,
      submittedBy: 'user_123',
      data: { title: 'Test Submission', priority: 'high' },
      status: 'submitted',
      submittedAt: new Date(),
      metadata: {}
    }
  }

  private async storeExecution(execution: WorkflowExecution): Promise<void> {
    console.log(`Storing execution: ${execution.id}`)
  }

  private async getExecution(executionId: string): Promise<WorkflowExecution | null> {
    console.log(`Getting execution: ${executionId}`)
    return null
  }

  private async updateExecution(execution: WorkflowExecution): Promise<void> {
    console.log(`Updating execution: ${execution.id}`)
  }

  private async addComment(executionId: string, stepId: string, userId: string, comment: string, attachments: string[]): Promise<void> {
    console.log(`Adding comment to execution ${executionId}, step ${stepId}`)
  }

  private async getUsersByRole(roleId: string, tenantId: string): Promise<string[]> {
    console.log(`Getting users by role: ${roleId} in tenant: ${tenantId}`)
    return []
  }

  private async getUsersByGroup(groupId: string, tenantId: string): Promise<string[]> {
    console.log(`Getting users by group: ${groupId} in tenant: ${tenantId}`)
    return []
  }
}

// Export workflow engine instance
export const workflowEngine = new WorkflowEngine()
