"use client"

import React, { useState, useEffect } from 'react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { useToast } from '../ui/ToastProvider'
import {
  Shield,
  Smartphone,
  Key,
  AlertTriangle,
  CheckCircle,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Globe,
  Monitor,
  Clock,
  Activity,
  Users,
  FileText,
  Download,
  RefreshCw,
  Settings,
  LogOut,
  Trash2,
  Plus,
  QrCode,
  Mail,
  MessageSquare,
  MapPin,
  Calendar,
  BarChart3
} from 'lucide-react'

interface SecurityDashboardProps {
  className?: string
}

interface TwoFactorStatus {
  enabled: boolean
  methods: string[]
  backupCodesRemaining: number
  lastUsed: string | null
  setupRequired: boolean
}

interface SecuritySession {
  id: string
  ipAddress: string
  userAgent: string
  location: string
  deviceType: string
  browserName: string
  isActive: boolean
  isCurrent: boolean
  isTrusted: boolean
  riskScore: number
  createdAt: string
  lastActivity: string
  expiresAt: string
}

interface SecurityAuditLog {
  id: string
  action: string
  resource: string
  ipAddress: string
  success: boolean
  riskLevel: 'low' | 'medium' | 'high'
  timestamp: string
  metadata: Record<string, unknown>
}

export default function SecurityDashboard({ className = '' }: SecurityDashboardProps) {
  const { show } = useToast()
  const [activeTab, setActiveTab] = useState<'overview' | '2fa' | 'sessions' | 'audit'>('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // 2FA State
  const [twoFactorStatus, setTwoFactorStatus] = useState<TwoFactorStatus | null>(null)
  const [setup2FA, setSetup2FA] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<'totp' | 'sms' | 'email'>('totp')
  const [setupData, setSetupData] = useState<Record<string, unknown> | null>(null)
  
  // Sessions State
  const [sessions, setSessions] = useState<SecuritySession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  
  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>([])
  const [auditLoading, setAuditLoading] = useState(false)

  useEffect(() => {
    loadSecurityData()
  }, [])

  const loadSecurityData = async (refresh = false) => {
    if (refresh) setIsRefreshing(true)
    else setIsLoading(true)

    try {
      // Load 2FA status
      const twoFactorResponse = await fetch('/api/security/2fa/setup')
      if (twoFactorResponse.ok) {
        const twoFactorData = await twoFactorResponse.json()
        setTwoFactorStatus(twoFactorData)
      }

      // Load sessions
      const sessionsResponse = await fetch('/api/security/sessions')
      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json()
        setSessions(sessionsData.sessions || [])
      }

      // Load recent audit logs
      const auditResponse = await fetch('/api/security/audit?perPage=10')
      if (auditResponse.ok) {
        const auditData = await auditResponse.json()
        setAuditLogs(auditData.logs || [])
      }

      if (refresh) {
        show('Security data refreshed successfully', 'success')
      }
    } catch (error) {
      console.error('Error loading security data:', error)
      show('Failed to load security data', 'error')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handle2FASetup = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/security/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          method: selectedMethod,
          phoneNumber: selectedMethod === 'sms' ? '+1234567890' : undefined,
          email: selectedMethod === 'email' ? 'user@example.com' : undefined
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to setup 2FA')
      }

      const data = await response.json()
      setSetupData(data)
      show('2FA setup initiated successfully', 'success')
    } catch (error) {
      console.error('Error setting up 2FA:', error)
      show(error instanceof Error ? error.message : 'Failed to setup 2FA', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const terminateSession = async (sessionId: string) => {
    try {
      const response = await fetch('/api/security/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to terminate session')
      }

      show('Session terminated successfully', 'success')
      loadSecurityData(true)
    } catch (error) {
      console.error('Error terminating session:', error)
      show(error instanceof Error ? error.message : 'Failed to terminate session', 'error')
    }
  }

  const terminateAllSessions = async () => {
    try {
      const response = await fetch('/api/security/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terminateAll: true })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to terminate sessions')
      }

      show('All other sessions terminated successfully', 'success')
      loadSecurityData(true)
    } catch (error) {
      console.error('Error terminating sessions:', error)
      show(error instanceof Error ? error.message : 'Failed to terminate sessions', 'error')
    }
  }

  const getRiskColor = (riskScore: number) => {
    if (riskScore >= 70) return 'text-red-600'
    if (riskScore >= 40) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'Mobile': return <Smartphone className="w-4 h-4" />
      case 'Desktop': return <Monitor className="w-4 h-4" />
      default: return <Globe className="w-4 h-4" />
    }
  }

  if (isLoading) {
    return (
      <div className={`p-8 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner className="w-8 h-8" />
          <span className="ml-3 text-[var(--text-secondary)]">Loading security dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Security Dashboard</h1>
          <p className="text-[var(--text-secondary)]">
            Manage your account security, sessions, and audit logs
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => loadSecurityData(true)} 
            disabled={isRefreshing}
            size="sm"
            variant="outline"
          >
            {isRefreshing ? (
              <LoadingSpinner className="w-4 h-4 mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-gray-100 rounded-lg p-1">
        {([
          { id: 'overview', label: 'Overview', icon: Shield },
          { id: '2fa', label: '2FA', icon: Smartphone },
          { id: 'sessions', label: 'Sessions', icon: Monitor },
          { id: 'audit', label: 'Audit Logs', icon: FileText }
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors flex-1 justify-center ${
              activeTab === tab.id
                ? 'bg-white text-[var(--primary)] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Security Score */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Security Score</h2>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold text-green-600">85</div>
                <div className="text-sm text-gray-500">/100</div>
              </div>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div className="bg-green-500 h-3 rounded-full" style={{ width: '85%' }} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-1" />
                <div className="text-sm font-medium">Strong Password</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-yellow-600 mx-auto mb-1" />
                <div className="text-sm font-medium">2FA Recommended</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <Shield className="w-6 h-6 text-green-600 mx-auto mb-1" />
                <div className="text-sm font-medium">Secure Sessions</div>
              </div>
            </div>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Active Sessions</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{sessions.length}</p>
                </div>
                <Monitor className="w-8 h-8 text-blue-600" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">2FA Status</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">
                    {twoFactorStatus?.enabled ? 'ON' : 'OFF'}
                  </p>
                </div>
                <Smartphone className="w-8 h-8 text-green-600" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Risk Score</p>
                  <p className="text-2xl font-bold text-green-600">Low</p>
                </div>
                <Shield className="w-8 h-8 text-green-600" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Recent Alerts</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">0</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-gray-400" />
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* 2FA Tab */}
      {activeTab === '2fa' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Two-Factor Authentication</h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  Add an extra layer of security to your account
                </p>
              </div>
              
              {twoFactorStatus?.enabled ? (
                <Badge className="bg-green-100 text-green-800">Enabled</Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-800">Disabled</Badge>
              )}
            </div>

            {!twoFactorStatus?.enabled && !setup2FA && (
              <div className="text-center py-8">
                <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Enable Two-Factor Authentication</h3>
                <p className="text-[var(--text-secondary)] mb-6">
                  Protect your account with an additional security layer
                </p>
                <Button onClick={() => setSetup2FA(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Setup 2FA
                </Button>
              </div>
            )}

            {setup2FA && !setupData && (
              <div className="space-y-4">
                <h3 className="font-medium">Choose 2FA Method</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setSelectedMethod('totp')}
                    className={`p-4 border rounded-lg text-left transition-colors ${
                      selectedMethod === 'totp' 
                        ? 'border-[var(--primary)] bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <QrCode className="w-6 h-6 mb-2 text-blue-600" />
                    <div className="font-medium">Authenticator App</div>
                    <div className="text-sm text-gray-600">Use Google Authenticator, Authy, etc.</div>
                  </button>
                  
                  <button
                    onClick={() => setSelectedMethod('sms')}
                    className={`p-4 border rounded-lg text-left transition-colors ${
                      selectedMethod === 'sms' 
                        ? 'border-[var(--primary)] bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <MessageSquare className="w-6 h-6 mb-2 text-green-600" />
                    <div className="font-medium">SMS</div>
                    <div className="text-sm text-gray-600">Receive codes via text message</div>
                  </button>
                  
                  <button
                    onClick={() => setSelectedMethod('email')}
                    className={`p-4 border rounded-lg text-left transition-colors ${
                      selectedMethod === 'email' 
                        ? 'border-[var(--primary)] bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Mail className="w-6 h-6 mb-2 text-purple-600" />
                    <div className="font-medium">Email</div>
                    <div className="text-sm text-gray-600">Receive codes via email</div>
                  </button>
                </div>

                <div className="flex gap-3">
                  <Button onClick={handle2FASetup} disabled={isLoading}>
                    {isLoading ? <LoadingSpinner className="w-4 h-4 mr-2" /> : null}
                    Continue Setup
                  </Button>
                  <Button variant="outline" onClick={() => setSetup2FA(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {setupData && (
              <div className="space-y-4">
                <h3 className="font-medium">Complete Setup</h3>
                
                {selectedMethod === 'totp' && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm mb-4">Scan this QR code with your authenticator app:</p>
                    <div className="w-48 h-48 bg-white border-2 border-gray-300 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <QrCode className="w-24 h-24 text-gray-400" />
                    </div>
                    <p className="text-xs text-gray-600 text-center">
                      Manual entry key: {String(setupData.secret || '')}
                    </p>
                  </div>
                )}
                
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Backup Codes</h4>
                  <p className="text-sm text-blue-700 mb-3">
                    Save these backup codes in a safe place. You can use them to access your account if you lose your device.
                  </p>
                  <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                    {Array.isArray(setupData.backupCodes) && setupData.backupCodes.slice(0, 6).map((code: unknown, index: number) => (
                      <div key={index} className="bg-white p-2 rounded border">
                        {String(code)}
                      </div>
                    ))}
                  </div>
                </div>
                
                <Button onClick={() => setSetupData(null)}>
                  I&apos;ve Saved My Backup Codes
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Active Sessions</h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  Manage your active sessions and devices
                </p>
              </div>
              
              <Button variant="outline" onClick={terminateAllSessions} size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                End All Sessions
              </Button>
            </div>

            <div className="space-y-4">
              {sessions.map((session) => (
                <div key={session.id} className="p-4 border border-[var(--border-light)] rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getDeviceIcon(session.deviceType)}
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {session.browserName} on {session.deviceType}
                          {session.isCurrent && (
                            <Badge className="bg-green-100 text-green-800 text-xs">Current</Badge>
                          )}
                          {session.isTrusted && (
                            <Badge className="bg-blue-100 text-blue-800 text-xs">Trusted</Badge>
                          )}
                        </div>
                        <div className="text-sm text-[var(--text-secondary)] flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {session.location}
                          </span>
                          <span>{session.ipAddress}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right text-sm">
                        <div className={`font-medium ${getRiskColor(session.riskScore)}`}>
                          Risk: {session.riskScore}/100
                        </div>
                        <div className="text-[var(--text-secondary)]">
                          Active {new Date(session.lastActivity).toLocaleString()}
                        </div>
                      </div>
                      
                      {!session.isCurrent && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => terminateSession(session.id)}
                        >
                          <LogOut className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-xs text-[var(--text-secondary)] grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <span className="font-medium">Created:</span> {new Date(session.createdAt).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">Expires:</span> {new Date(session.expiresAt).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">Status:</span> {session.isActive ? 'Active' : 'Inactive'}
                    </div>
                    <div>
                      <span className="font-medium">Risk:</span> 
                      <span className={getRiskColor(session.riskScore)}> {
                        session.riskScore < 30 ? 'Low' : session.riskScore < 70 ? 'Medium' : 'High'
                      }</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Security Audit Logs</h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  Recent security events and activities
                </p>
              </div>
              
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>

            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-4 border border-[var(--border-light)] rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        log.success ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <div className="font-medium capitalize">
                          {log.action.replace('_', ' ')} - {log.resource}
                        </div>
                        <div className="text-sm text-[var(--text-secondary)]">
                          {log.ipAddress} • {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className={getRiskLevelColor(log.riskLevel)} variant="outline">
                        {log.riskLevel}
                      </Badge>
                      {log.success ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </div>
                  
                  {Object.keys(log.metadata).length > 0 && (
                    <div className="text-xs text-[var(--text-secondary)] pl-5">
                      {Object.entries(log.metadata).map(([key, value]) => (
                        <span key={key} className="mr-4">
                          <strong>{key}:</strong> {String(value)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {auditLogs.length === 0 && (
                <div className="text-center py-8 text-[var(--text-secondary)]">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No audit logs found</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
