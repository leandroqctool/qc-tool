// Advanced Team Management System
export interface TeamMember {
  id: string
  name: string
  email: string
  role: 'admin' | 'manager' | 'senior_qc' | 'qc_specialist' | 'junior_qc' | 'client' | 'agency'
  department: string
  status: 'active' | 'inactive' | 'on_leave' | 'busy' | 'available'
  avatar?: string
  joinedAt: Date
  lastActive: Date
  
  // Skills and Expertise
  skills: Skill[]
  certifications: Certification[]
  specializations: string[]
  experienceLevel: 'junior' | 'mid' | 'senior' | 'expert'
  
  // Performance Metrics
  performance: TeamMemberPerformance
  
  // Capacity & Availability
  capacity: TeamMemberCapacity
  
  // Preferences
  preferences: TeamMemberPreferences
}

export interface Skill {
  id: string
  name: string
  category: 'technical' | 'creative' | 'content' | 'process' | 'industry'
  level: 1 | 2 | 3 | 4 | 5 // 1=Beginner, 5=Expert
  verified: boolean
  verifiedBy?: string
  verifiedAt?: Date
}

export interface Certification {
  id: string
  name: string
  issuer: string
  issuedAt: Date
  expiresAt?: Date
  credentialId?: string
  verified: boolean
}

export interface TeamMemberPerformance {
  // Quality Metrics
  averageQualityScore: number
  qualityTrend: 'improving' | 'declining' | 'stable'
  
  // Productivity Metrics
  averageReviewTime: number // minutes
  filesCompletedLast30Days: number
  approvalRate: number // percentage
  revisionRate: number // average revisions per file
  
  // Client Feedback
  clientSatisfactionScore: number // 1-5
  escalationRate: number // percentage
  
  // Collaboration
  mentorshipScore?: number // for senior members
  teamworkScore: number
  communicationScore: number
  
  // Overall Rating
  overallRating: 'excellent' | 'good' | 'satisfactory' | 'needs_improvement'
  lastReviewDate: Date
  nextReviewDate: Date
}

export interface TeamMemberCapacity {
  // Current Workload
  currentAssignments: number
  maxConcurrentAssignments: number
  utilizationPercentage: number
  
  // Time Allocation
  hoursPerWeek: number
  availableHoursThisWeek: number
  scheduledHoursThisWeek: number
  
  // Availability Schedule
  workingHours: {
    [day: string]: { start: string; end: string; available: boolean }
  }
  timeZone: string
  
  // Capacity Forecasting
  projectedCapacityNext7Days: number
  projectedCapacityNext30Days: number
  
  // Leave and Time Off
  upcomingTimeOff: Array<{
    startDate: Date
    endDate: Date
    type: 'vacation' | 'sick' | 'personal' | 'training'
    approved: boolean
  }>
}

export interface TeamMemberPreferences {
  // Work Preferences
  preferredFileTypes: string[]
  preferredProjectTypes: string[]
  preferredClients: string[]
  avoidedClients: string[]
  
  // Notification Preferences
  emailNotifications: boolean
  slackNotifications: boolean
  urgentOnlyMode: boolean
  
  // Assignment Preferences
  preferComplexFiles: boolean
  preferHighVolumeWork: boolean
  mentorshipAvailable: boolean
  trainingMode: boolean
}

export interface AssignmentRule {
  id: string
  name: string
  description: string
  priority: number // 1-10, higher = more important
  active: boolean
  
  // Conditions
  conditions: {
    fileType?: string[]
    projectType?: string[]
    clientId?: string[]
    urgency?: 'low' | 'medium' | 'high' | 'critical'
    complexity?: 'simple' | 'moderate' | 'complex' | 'expert'
    estimatedTime?: { min: number; max: number }
  }
  
  // Assignment Logic
  assignmentLogic: {
    requiredSkills: string[]
    preferredSkills: string[]
    minimumExperienceLevel: 'junior' | 'mid' | 'senior' | 'expert'
    maxWorkloadPercentage: number
    balanceWorkload: boolean
    considerTimeZone: boolean
    considerPastPerformance: boolean
    avoidRecentAssignments: boolean
  }
  
  // Fallback Rules
  fallbackRules: {
    escalateAfterMinutes: number
    fallbackToManager: boolean
    allowOverCapacity: boolean
    notifyOnFallback: boolean
  }
  
  createdBy: string
  createdAt: Date
  lastModified: Date
}

export interface SmartAssignmentRequest {
  fileId: string
  projectId: string
  clientId: string
  fileType: string
  estimatedComplexity: 'simple' | 'moderate' | 'complex' | 'expert'
  estimatedTimeMinutes: number
  urgency: 'low' | 'medium' | 'high' | 'critical'
  requiredSkills: string[]
  preferredAssignee?: string
  deadline?: Date
  specialInstructions?: string
}

export interface AssignmentRecommendation {
  memberId: string
  memberName: string
  confidence: number // 0-1
  reasoning: string[]
  warnings: string[]
  
  // Scoring Breakdown
  scores: {
    skillMatch: number // 0-100
    availability: number // 0-100
    performance: number // 0-100
    workloadBalance: number // 0-100
    pastExperience: number // 0-100
    clientFit: number // 0-100
    overall: number // 0-100
  }
  
  // Capacity Impact
  capacityImpact: {
    currentUtilization: number
    projectedUtilization: number
    estimatedCompletionTime: Date
    conflictsWithSchedule: boolean
  }
  
  // Alternative Options
  alternatives?: AssignmentRecommendation[]
}

export interface TeamCapacityForecast {
  period: { start: Date; end: Date }
  teamSize: number
  totalCapacityHours: number
  scheduledHours: number
  availableHours: number
  utilizationPercentage: number
  
  // Forecasting
  projectedDemand: number
  capacityGap: number // negative = over capacity, positive = under capacity
  recommendedActions: string[]
  
  // By Member
  memberForecasts: Array<{
    memberId: string
    memberName: string
    availableHours: number
    scheduledHours: number
    utilization: number
    capacity: 'under' | 'optimal' | 'over' | 'critical'
  }>
  
  // By Skill
  skillGaps?: Array<{
    skill: string
    demandHours: number
    availableHours: number
    gap: number
    criticalShortage: boolean
  }>
}

export interface InviteRequest {
  email: string
  role: TeamMember['role']
  department: string
  permissions: string[]
  invitedBy: string
  expiresAt: Date
  personalMessage?: string
  
  // Onboarding
  onboardingTasks: string[]
  mentorId?: string
  trainingPlan?: string[]
}

export interface RolePermissions {
  role: TeamMember['role']
  permissions: {
    // File Management
    canViewFiles: boolean
    canEditFiles: boolean
    canDeleteFiles: boolean
    canAssignFiles: boolean
    
    // Project Management
    canViewProjects: boolean
    canEditProjects: boolean
    canCreateProjects: boolean
    canDeleteProjects: boolean
    
    // Team Management
    canViewTeam: boolean
    canInviteUsers: boolean
    canManageUsers: boolean
    canViewAnalytics: boolean
    
    // System Administration
    canManageSettings: boolean
    canViewAuditLogs: boolean
    canExportData: boolean
    canManageBilling: boolean
  }
}

// Mock data and functions for demonstration
export async function getTeamMembers(tenantId: string): Promise<TeamMember[]> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 800))
  
  const mockMembers: TeamMember[] = [
    {
      id: 'user_1',
      name: 'Sarah Chen',
      email: 'sarah.chen@company.com',
      role: 'senior_qc',
      department: 'Quality Control',
      status: 'active',
      joinedAt: new Date('2023-01-15'),
      lastActive: new Date(),
      
      skills: [
        { id: 'skill_1', name: 'Brand Compliance', category: 'creative', level: 5, verified: true },
        { id: 'skill_2', name: 'Adobe Creative Suite', category: 'technical', level: 4, verified: true },
        { id: 'skill_3', name: 'Typography', category: 'creative', level: 5, verified: true }
      ],
      
      certifications: [
        {
          id: 'cert_1',
          name: 'Adobe Certified Expert',
          issuer: 'Adobe',
          issuedAt: new Date('2023-06-01'),
          verified: true
        }
      ],
      
      specializations: ['Brand Compliance', 'Creative Design', 'Print Media'],
      experienceLevel: 'senior',
      
      performance: {
        averageQualityScore: 92.1,
        qualityTrend: 'improving',
        averageReviewTime: 28,
        filesCompletedLast30Days: 89,
        approvalRate: 81.2,
        revisionRate: 1.2,
        clientSatisfactionScore: 4.8,
        escalationRate: 1.1,
        mentorshipScore: 4.6,
        teamworkScore: 4.7,
        communicationScore: 4.8,
        overallRating: 'excellent',
        lastReviewDate: new Date('2024-10-01'),
        nextReviewDate: new Date('2025-01-01')
      },
      
      capacity: {
        currentAssignments: 8,
        maxConcurrentAssignments: 12,
        utilizationPercentage: 85,
        hoursPerWeek: 40,
        availableHoursThisWeek: 32,
        scheduledHoursThisWeek: 34,
        workingHours: {
          monday: { start: '09:00', end: '17:00', available: true },
          tuesday: { start: '09:00', end: '17:00', available: true },
          wednesday: { start: '09:00', end: '17:00', available: true },
          thursday: { start: '09:00', end: '17:00', available: true },
          friday: { start: '09:00', end: '15:00', available: true },
          saturday: { start: '00:00', end: '00:00', available: false },
          sunday: { start: '00:00', end: '00:00', available: false }
        },
        timeZone: 'America/New_York',
        projectedCapacityNext7Days: 78,
        projectedCapacityNext30Days: 82,
        upcomingTimeOff: []
      },
      
      preferences: {
        preferredFileTypes: ['image', 'design', 'brand'],
        preferredProjectTypes: ['branding', 'marketing'],
        preferredClients: [],
        avoidedClients: [],
        emailNotifications: true,
        slackNotifications: true,
        urgentOnlyMode: false,
        preferComplexFiles: true,
        preferHighVolumeWork: false,
        mentorshipAvailable: true,
        trainingMode: false
      }
    },
    
    {
      id: 'user_2',
      name: 'Mike Rodriguez',
      email: 'mike.rodriguez@company.com',
      role: 'qc_specialist',
      department: 'Quality Control',
      status: 'active',
      joinedAt: new Date('2023-08-01'),
      lastActive: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      
      skills: [
        { id: 'skill_4', name: 'Technical Review', category: 'technical', level: 4, verified: true },
        { id: 'skill_5', name: 'Content Analysis', category: 'content', level: 3, verified: true },
        { id: 'skill_6', name: 'Web Development', category: 'technical', level: 3, verified: false }
      ],
      
      certifications: [],
      specializations: ['Technical Review', 'Content Analysis', 'Web QC'],
      experienceLevel: 'mid',
      
      performance: {
        averageQualityScore: 86.7,
        qualityTrend: 'stable',
        averageReviewTime: 35,
        filesCompletedLast30Days: 76,
        approvalRate: 68.4,
        revisionRate: 1.8,
        clientSatisfactionScore: 4.5,
        escalationRate: 2.3,
        teamworkScore: 4.2,
        communicationScore: 4.1,
        overallRating: 'good',
        lastReviewDate: new Date('2024-09-15'),
        nextReviewDate: new Date('2024-12-15')
      },
      
      capacity: {
        currentAssignments: 6,
        maxConcurrentAssignments: 10,
        utilizationPercentage: 72,
        hoursPerWeek: 40,
        availableHoursThisWeek: 28,
        scheduledHoursThisWeek: 29,
        workingHours: {
          monday: { start: '08:00', end: '16:00', available: true },
          tuesday: { start: '08:00', end: '16:00', available: true },
          wednesday: { start: '08:00', end: '16:00', available: true },
          thursday: { start: '08:00', end: '16:00', available: true },
          friday: { start: '08:00', end: '16:00', available: true },
          saturday: { start: '00:00', end: '00:00', available: false },
          sunday: { start: '00:00', end: '00:00', available: false }
        },
        timeZone: 'America/Los_Angeles',
        projectedCapacityNext7Days: 68,
        projectedCapacityNext30Days: 75,
        upcomingTimeOff: [
          {
            startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000),
            type: 'personal',
            approved: true
          }
        ]
      },
      
      preferences: {
        preferredFileTypes: ['document', 'web', 'technical'],
        preferredProjectTypes: ['web', 'technical'],
        preferredClients: [],
        avoidedClients: [],
        emailNotifications: true,
        slackNotifications: false,
        urgentOnlyMode: false,
        preferComplexFiles: false,
        preferHighVolumeWork: true,
        mentorshipAvailable: false,
        trainingMode: true
      }
    }
  ]
  
  return mockMembers
}

export async function generateSmartAssignment(
  request: SmartAssignmentRequest,
  tenantId: string
): Promise<AssignmentRecommendation[]> {
  // Simulate AI processing
  await new Promise(resolve => setTimeout(resolve, 1200))
  
  const teamMembers = await getTeamMembers(tenantId)
  
  // Calculate recommendations for each team member
  const recommendations: AssignmentRecommendation[] = teamMembers.map(member => {
    // Skill matching
    const skillMatch = calculateSkillMatch(member.skills, request.requiredSkills)
    
    // Availability scoring
    const availability = 100 - member.capacity.utilizationPercentage
    
    // Performance scoring
    const performance = member.performance.averageQualityScore
    
    // Workload balance
    const workloadBalance = member.capacity.utilizationPercentage < 80 ? 100 : 
      member.capacity.utilizationPercentage < 90 ? 70 : 30
    
    // Past experience (mock)
    const pastExperience = Math.random() * 40 + 60 // 60-100
    
    // Client fit (mock)
    const clientFit = Math.random() * 30 + 70 // 70-100
    
    // Overall score
    const overall = (skillMatch * 0.3 + availability * 0.2 + performance * 0.2 + 
                    workloadBalance * 0.15 + pastExperience * 0.1 + clientFit * 0.05)
    
    const confidence = overall / 100
    
    // Generate reasoning
    const reasoning: string[] = []
    if (skillMatch > 80) reasoning.push(`Excellent skill match (${skillMatch.toFixed(0)}%)`)
    if (availability > 50) reasoning.push(`Good availability (${availability.toFixed(0)}% free capacity)`)
    if (performance > 85) reasoning.push(`High quality performance (${performance.toFixed(1)} avg score)`)
    if (member.experienceLevel === 'senior' || member.experienceLevel === 'expert') {
      reasoning.push('Senior experience level')
    }
    
    // Generate warnings
    const warnings: string[] = []
    if (member.capacity.utilizationPercentage > 85) {
      warnings.push('High current workload - may impact delivery time')
    }
    if (member.capacity.upcomingTimeOff.length > 0) {
      warnings.push('Has upcoming time off scheduled')
    }
    if (skillMatch < 60) {
      warnings.push('Limited skill match for this file type')
    }
    
    return {
      memberId: member.id,
      memberName: member.name,
      confidence,
      reasoning,
      warnings,
      scores: {
        skillMatch,
        availability,
        performance,
        workloadBalance,
        pastExperience,
        clientFit,
        overall
      },
      capacityImpact: {
        currentUtilization: member.capacity.utilizationPercentage,
        projectedUtilization: member.capacity.utilizationPercentage + 
          (request.estimatedTimeMinutes / (member.capacity.hoursPerWeek * 60) * 100),
        estimatedCompletionTime: new Date(Date.now() + request.estimatedTimeMinutes * 60 * 1000),
        conflictsWithSchedule: false
      }
    }
  })
  
  // Sort by overall score
  return recommendations.sort((a, b) => b.scores.overall - a.scores.overall)
}

export async function getTeamCapacityForecast(
  tenantId: string,
  days: number = 7
): Promise<TeamCapacityForecast> {
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  const teamMembers = await getTeamMembers(tenantId)
  const startDate = new Date()
  const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  
  const totalCapacityHours = teamMembers.reduce((sum, member) => 
    sum + (member.capacity.hoursPerWeek / 7 * days), 0)
  
  const scheduledHours = teamMembers.reduce((sum, member) => 
    sum + (member.capacity.scheduledHoursThisWeek / 7 * days), 0)
  
  const availableHours = totalCapacityHours - scheduledHours
  const utilizationPercentage = (scheduledHours / totalCapacityHours) * 100
  
  // Mock projected demand
  const projectedDemand = totalCapacityHours * 0.85 // Assume 85% demand
  const capacityGap = availableHours - projectedDemand
  
  const memberForecasts = teamMembers.map(member => ({
    memberId: member.id,
    memberName: member.name,
    availableHours: member.capacity.availableHoursThisWeek / 7 * days,
    scheduledHours: member.capacity.scheduledHoursThisWeek / 7 * days,
    utilization: member.capacity.utilizationPercentage,
    capacity: member.capacity.utilizationPercentage > 90 ? 'critical' as const :
              member.capacity.utilizationPercentage > 80 ? 'over' as const :
              member.capacity.utilizationPercentage > 60 ? 'optimal' as const : 'under' as const
  }))
  
  const recommendedActions: string[] = []
  if (capacityGap < 0) {
    recommendedActions.push('Consider hiring additional team members')
    recommendedActions.push('Prioritize high-impact projects')
    recommendedActions.push('Implement overtime policies')
  } else if (capacityGap > totalCapacityHours * 0.3) {
    recommendedActions.push('Look for additional project opportunities')
    recommendedActions.push('Invest in team training and development')
    recommendedActions.push('Consider cross-training initiatives')
  }
  
  return {
    period: { start: startDate, end: endDate },
    teamSize: teamMembers.length,
    totalCapacityHours,
    scheduledHours,
    availableHours,
    utilizationPercentage,
    projectedDemand,
    capacityGap,
    recommendedActions,
    memberForecasts,
    skillGaps: [
      {
        skill: 'Brand Compliance',
        demandHours: 40,
        availableHours: 35,
        gap: -5,
        criticalShortage: true
      },
      {
        skill: 'Technical Review',
        demandHours: 25,
        availableHours: 30,
        gap: 5,
        criticalShortage: false
      }
    ]
  }
}

// Helper functions
function calculateSkillMatch(memberSkills: Skill[], requiredSkills: string[]): number {
  if (requiredSkills.length === 0) return 100
  
  let totalMatch = 0
  for (const requiredSkill of requiredSkills) {
    const memberSkill = memberSkills.find(skill => 
      skill.name.toLowerCase().includes(requiredSkill.toLowerCase()) ||
      requiredSkill.toLowerCase().includes(skill.name.toLowerCase())
    )
    
    if (memberSkill) {
      totalMatch += memberSkill.level * 20 // Convert 1-5 scale to 20-100
    }
  }
  
  return Math.min(100, totalMatch / requiredSkills.length)
}

export function getRolePermissions(role: TeamMember['role']): RolePermissions {
  const basePermissions = {
    canViewFiles: false,
    canEditFiles: false,
    canDeleteFiles: false,
    canAssignFiles: false,
    canViewProjects: false,
    canEditProjects: false,
    canCreateProjects: false,
    canDeleteProjects: false,
    canViewTeam: false,
    canInviteUsers: false,
    canManageUsers: false,
    canViewAnalytics: false,
    canManageSettings: false,
    canViewAuditLogs: false,
    canExportData: false,
    canManageBilling: false
  }
  
  switch (role) {
    case 'admin':
      return {
        role,
        permissions: {
          ...basePermissions,
          canViewFiles: true,
          canEditFiles: true,
          canDeleteFiles: true,
          canAssignFiles: true,
          canViewProjects: true,
          canEditProjects: true,
          canCreateProjects: true,
          canDeleteProjects: true,
          canViewTeam: true,
          canInviteUsers: true,
          canManageUsers: true,
          canViewAnalytics: true,
          canManageSettings: true,
          canViewAuditLogs: true,
          canExportData: true,
          canManageBilling: true
        }
      }
    
    case 'manager':
      return {
        role,
        permissions: {
          ...basePermissions,
          canViewFiles: true,
          canEditFiles: true,
          canAssignFiles: true,
          canViewProjects: true,
          canEditProjects: true,
          canCreateProjects: true,
          canViewTeam: true,
          canInviteUsers: true,
          canViewAnalytics: true,
          canExportData: true
        }
      }
    
    case 'senior_qc':
      return {
        role,
        permissions: {
          ...basePermissions,
          canViewFiles: true,
          canEditFiles: true,
          canViewProjects: true,
          canEditProjects: true,
          canViewTeam: true
        }
      }
    
    case 'qc_specialist':
      return {
        role,
        permissions: {
          ...basePermissions,
          canViewFiles: true,
          canEditFiles: true,
          canViewProjects: true
        }
      }
    
    case 'junior_qc':
      return {
        role,
        permissions: {
          ...basePermissions,
          canViewFiles: true,
          canViewProjects: true
        }
      }
    
    case 'client':
      return {
        role,
        permissions: {
          ...basePermissions,
          canViewFiles: true,
          canViewProjects: true
        }
      }
    
    case 'agency':
      return {
        role,
        permissions: {
          ...basePermissions,
          canViewFiles: true,
          canViewProjects: true
        }
      }
    
    default:
      return { role, permissions: basePermissions }
  }
}
