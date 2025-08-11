"use client"

import React, { useState, useEffect } from 'react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { useToast } from '../ui/ToastProvider'
import {
  Users,
  UserPlus,
  Settings,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Target,
  Calendar,
  BarChart3,
  Activity,
  Award,
  Zap,
  Brain,
  Filter,
  Download,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Mail,
  Phone,
  MapPin,
  Star,
  Briefcase
} from 'lucide-react'
import {
  type TeamMember,
  type TeamCapacityForecast,
  type AssignmentRecommendation
} from '../../lib/team-management'

interface TeamManagementDashboardProps {
  className?: string
}

export default function TeamManagementDashboard({ className = '' }: TeamManagementDashboardProps) {
  const { show } = useToast()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [capacityForecast, setCapacityForecast] = useState<TeamCapacityForecast | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedView, setSelectedView] = useState<'overview' | 'members' | 'capacity' | 'assignments'>('overview')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview', 'capacity']))
  const [filters, setFilters] = useState({
    role: '',
    status: '',
    department: ''
  })

  useEffect(() => {
    loadTeamData()
  }, [])

  const loadTeamData = async (refresh = false) => {
    if (refresh) setIsRefreshing(true)
    else setIsLoading(true)

    try {
      // Load team members
      const membersResponse = await fetch('/api/team/members')
      if (!membersResponse.ok) {
        throw new Error('Failed to load team members')
      }
      const membersData = await membersResponse.json()
      setTeamMembers(membersData.members || [])

      // Load capacity forecast
      const capacityResponse = await fetch('/api/team/capacity?days=7&includeSkillGaps=true')
      if (!capacityResponse.ok) {
        throw new Error('Failed to load capacity forecast')
      }
      const capacityData = await capacityResponse.json()
      setCapacityForecast(capacityData.forecast)
      
      if (refresh) {
        show('Team data refreshed successfully', 'success')
      }
    } catch (error) {
      console.error('Error loading team data:', error)
      show(error instanceof Error ? error.message : 'Failed to load team data', 'error')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'busy': return 'bg-yellow-100 text-yellow-800'
      case 'on_leave': return 'bg-gray-100 text-gray-800'
      case 'inactive': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800'
      case 'manager': return 'bg-blue-100 text-blue-800'
      case 'senior_qc': return 'bg-indigo-100 text-indigo-800'
      case 'qc_specialist': return 'bg-teal-100 text-teal-800'
      case 'junior_qc': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCapacityColor = (utilization: number) => {
    if (utilization > 90) return 'text-red-600'
    if (utilization > 80) return 'text-yellow-600'
    if (utilization > 60) return 'text-green-600'
    return 'text-blue-600'
  }

  const getPerformanceIcon = (rating: string) => {
    switch (rating) {
      case 'excellent': return <Star className="w-4 h-4 text-yellow-500" />
      case 'good': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'satisfactory': return <Activity className="w-4 h-4 text-blue-500" />
      case 'needs_improvement': return <AlertTriangle className="w-4 h-4 text-red-500" />
      default: return <Activity className="w-4 h-4 text-gray-500" />
    }
  }

  if (isLoading) {
    return (
      <div className={`p-8 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner className="w-8 h-8" />
          <span className="ml-3 text-[var(--text-secondary)]">Loading team management dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Team Management</h1>
          <p className="text-[var(--text-secondary)]">
            Manage team members, capacity, and smart assignments
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['overview', 'members', 'capacity', 'assignments'] as const).map((view) => (
              <button
                key={view}
                onClick={() => setSelectedView(view)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                  selectedView === view
                    ? 'bg-white text-[var(--primary)] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {view}
              </button>
            ))}
          </div>
          
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          
          <Button 
            onClick={() => loadTeamData(true)} 
            disabled={isRefreshing}
            size="sm"
          >
            {isRefreshing ? (
              <LoadingSpinner className="w-4 h-4 mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh
          </Button>
          
          <Button size="sm">
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Member
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      {selectedView === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Team Size</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{teamMembers.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600">+2 this month</span>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Avg Utilization</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {capacityForecast ? `${capacityForecast.utilizationPercentage.toFixed(0)}%` : 'N/A'}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600">Optimal range</span>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Active Members</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {teamMembers.filter(m => m.status === 'active').length}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-gray-600">
                {teamMembers.filter(m => m.status === 'busy').length} busy
              </span>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Avg Performance</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {teamMembers.length > 0 
                    ? (teamMembers.reduce((sum, m) => sum + m.performance.averageQualityScore, 0) / teamMembers.length).toFixed(1)
                    : 'N/A'
                  }
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Award className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-sm">
              <Star className="w-4 h-4 text-yellow-500 mr-1" />
              <span className="text-gray-600">Quality score</span>
            </div>
          </Card>
        </div>
      )}

      {/* Team Members View */}
      {selectedView === 'members' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Team Members</h2>
            <div className="flex items-center gap-3">
              <select 
                className="px-3 py-2 border border-[var(--border-light)] rounded-md text-sm"
                value={filters.role}
                onChange={(e) => setFilters({...filters, role: e.target.value})}
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="senior_qc">Senior QC</option>
                <option value="qc_specialist">QC Specialist</option>
                <option value="junior_qc">Junior QC</option>
              </select>
              
              <select 
                className="px-3 py-2 border border-[var(--border-light)] rounded-md text-sm"
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="busy">Busy</option>
                <option value="on_leave">On Leave</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamMembers.map((member) => (
              <div key={member.id} className="p-4 border border-[var(--border-light)] rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-[var(--text-primary)]">{member.name}</h4>
                      <p className="text-sm text-[var(--text-secondary)]">{member.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getPerformanceIcon(member.performance.overallRating)}
                    <Badge className={getStatusColor(member.status)} variant="outline">
                      {member.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">Role:</span>
                    <Badge className={getRoleColor(member.role)} variant="outline">
                      {member.role.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">Department:</span>
                    <span>{member.department}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">Utilization:</span>
                    <span className={getCapacityColor(member.capacity.utilizationPercentage)}>
                      {member.capacity.utilizationPercentage.toFixed(0)}%
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">Quality Score:</span>
                    <span className="font-medium">{member.performance.averageQualityScore.toFixed(1)}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs text-[var(--text-secondary)] mb-2">Specializations:</p>
                  <div className="flex flex-wrap gap-1">
                    {member.specializations.slice(0, 3).map((spec) => (
                      <Badge key={spec} variant="outline" className="text-xs">
                        {spec}
                      </Badge>
                    ))}
                    {member.specializations.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{member.specializations.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Settings className="w-3 h-3 mr-1" />
                    Manage
                  </Button>
                  <Button variant="outline" size="sm">
                    <Mail className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Capacity Planning View */}
      {selectedView === 'capacity' && capacityForecast && (
        <div className="space-y-6">
          {/* Capacity Overview */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Capacity Overview</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--text-primary)]">
                  {capacityForecast.totalCapacityHours.toFixed(0)}h
                </div>
                <div className="text-sm text-[var(--text-secondary)]">Total Capacity</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {capacityForecast.scheduledHours.toFixed(0)}h
                </div>
                <div className="text-sm text-[var(--text-secondary)]">Scheduled</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {capacityForecast.availableHours.toFixed(0)}h
                </div>
                <div className="text-sm text-[var(--text-secondary)]">Available</div>
              </div>
              
              <div className="text-center">
                <div className={`text-2xl font-bold ${getCapacityColor(capacityForecast.utilizationPercentage)}`}>
                  {capacityForecast.utilizationPercentage.toFixed(0)}%
                </div>
                <div className="text-sm text-[var(--text-secondary)]">Utilization</div>
              </div>
            </div>

            {/* Capacity by Member */}
            <div>
              <h3 className="font-medium text-[var(--text-primary)] mb-3">Team Member Capacity</h3>
              <div className="space-y-3">
                {capacityForecast.memberForecasts.map((member) => (
                  <div key={member.memberId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium">
                          {member.memberName.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{member.memberName}</div>
                        <div className="text-sm text-[var(--text-secondary)]">
                          {member.availableHours.toFixed(0)}h available, {member.scheduledHours.toFixed(0)}h scheduled
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className={`font-medium ${getCapacityColor(member.utilization)}`}>
                          {member.utilization.toFixed(0)}%
                        </div>
                        <Badge 
                          variant="outline" 
                          className={
                            member.capacity === 'critical' ? 'bg-red-100 text-red-800' :
                            member.capacity === 'over' ? 'bg-orange-100 text-orange-800' :
                            member.capacity === 'optimal' ? 'bg-green-100 text-green-800' :
                            'bg-blue-100 text-blue-800'
                          }
                        >
                          {member.capacity}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            {capacityForecast.recommendedActions.length > 0 && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Recommendations</h4>
                <ul className="space-y-1">
                  {capacityForecast.recommendedActions.map((action, index) => (
                    <li key={index} className="text-sm text-blue-800 flex items-center">
                      <Brain className="w-4 h-4 mr-2 text-blue-600" />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          {/* Skill Gaps */}
          {capacityForecast.skillGaps && capacityForecast.skillGaps.length > 0 && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Skill Gap Analysis</h2>
              
              <div className="space-y-4">
                {capacityForecast.skillGaps.map((gap) => (
                  <div key={gap.skill} className="p-4 border border-[var(--border-light)] rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{gap.skill}</h4>
                      {gap.criticalShortage && (
                        <Badge className="bg-red-100 text-red-800" variant="outline">
                          Critical
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-[var(--text-secondary)]">Demand:</span>
                        <span className="ml-1 font-medium">{gap.demandHours}h</span>
                      </div>
                      <div>
                        <span className="text-[var(--text-secondary)]">Available:</span>
                        <span className="ml-1 font-medium">{gap.availableHours}h</span>
                      </div>
                      <div>
                        <span className="text-[var(--text-secondary)]">Gap:</span>
                        <span className={`ml-1 font-medium ${gap.gap < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {gap.gap > 0 ? '+' : ''}{gap.gap}h
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Smart Assignments View */}
      {selectedView === 'assignments' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Smart Assignment Analytics</h2>
            <Button size="sm">
              <Brain className="w-4 h-4 mr-2" />
              New Assignment
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-900">87%</div>
                  <div className="text-sm text-blue-700">Avg Confidence</div>
                </div>
                <Brain className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-900">91%</div>
                  <div className="text-sm text-green-700">Success Rate</div>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-yellow-900">32m</div>
                  <div className="text-sm text-yellow-700">Avg Time</div>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="text-center py-8 text-[var(--text-secondary)]">
            <Brain className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">Smart Assignment System</h3>
            <p className="mb-4">AI-powered assignment recommendations based on skills, capacity, and performance</p>
            <Button>
              <Target className="w-4 h-4 mr-2" />
              View Assignment History
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
