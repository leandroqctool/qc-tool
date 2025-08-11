'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useToast } from '../ui/ToastProvider'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { Select } from '../ui/Select'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import {
  Upload,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  Settings,
  Play,
  Pause,
  RotateCcw,
  Download,
  Eye,
  Trash2,
  Plus,
  Filter,
  Search,
  Calendar,
  BarChart3
} from 'lucide-react'

interface BatchUpload {
  id: string
  name: string
  description?: string
  status: 'preparing' | 'uploading' | 'processing' | 'completed' | 'failed' | 'cancelled'
  totalFiles: number
  uploadedFiles: number
  processedFiles: number
  failedFiles: number
  createdAt: Date
  completedAt?: Date
  createdBy: string
  projectId: string
  settings: {
    autoAssign: boolean
    assignToUser?: string
    priority: 'low' | 'medium' | 'high' | 'urgent'
    tags: string[]
    category: string
  }
}

interface BatchProgress {
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
  estimatedTimeRemaining: number
  throughput: {
    filesPerMinute: number
    mbPerSecond: number
  }
  errors: {
    count: number
    recentErrors: string[]
  }
}

const BatchUploadManager: React.FC = () => {
  const { show: toast } = useToast()
  const [batches, setBatches] = useState<BatchUpload[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBatch, setSelectedBatch] = useState<BatchUpload | null>(null)
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showProgressDialog, setShowProgressDialog] = useState(false)
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    dateRange: 'all'
  })

  // Form state for creating new batch
  const [newBatch, setNewBatch] = useState({
    name: '',
    description: '',
    projectId: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    autoAssign: false,
    assignToUser: '',
    category: 'general',
    tags: [] as string[]
  })

  const [dragOver, setDragOver] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  // Load batches
  const loadBatches = useCallback(async () => {
    try {
      setLoading(true)
      // Mock data - would fetch from API
      const mockBatches: BatchUpload[] = [
        {
          id: 'batch_1',
          name: 'Agency Files - Week 1',
          description: 'Weekly batch upload from Agency XYZ',
          status: 'completed',
          totalFiles: 45,
          uploadedFiles: 45,
          processedFiles: 43,
          failedFiles: 2,
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
          createdBy: 'user_1',
          projectId: 'project_1',
          settings: {
            autoAssign: true,
            assignToUser: 'reviewer_1',
            priority: 'high',
            tags: ['agency', 'weekly'],
            category: 'marketing'
          }
        },
        {
          id: 'batch_2',
          name: 'Product Photos Q1',
          description: 'Product photography batch for Q1 campaign',
          status: 'processing',
          totalFiles: 120,
          uploadedFiles: 120,
          processedFiles: 87,
          failedFiles: 3,
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
          createdBy: 'user_2',
          projectId: 'project_2',
          settings: {
            autoAssign: false,
            priority: 'medium',
            tags: ['product', 'photography'],
            category: 'ecommerce'
          }
        },
        {
          id: 'batch_3',
          name: 'Video Assets Batch',
          status: 'uploading',
          totalFiles: 25,
          uploadedFiles: 12,
          processedFiles: 8,
          failedFiles: 0,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          createdBy: 'user_1',
          projectId: 'project_3',
          settings: {
            autoAssign: true,
            assignToUser: 'reviewer_2',
            priority: 'urgent',
            tags: ['video', 'social'],
            category: 'content'
          }
        }
      ]

      setBatches(mockBatches)
    } catch (error) {
      toast('Failed to load batches', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Load batch progress
  const loadBatchProgress = useCallback(async (batchId: string) => {
    try {
      // Mock progress data
      const mockProgress: BatchProgress = {
        batchId,
        overall: {
          totalFiles: 120,
          uploadedFiles: 120,
          processedFiles: 87,
          failedFiles: 3,
          percentComplete: 75
        },
        currentFile: {
          fileName: 'product_image_045.jpg',
          uploadProgress: 100,
          processingProgress: 65,
          status: 'processing'
        },
        estimatedTimeRemaining: 1800, // 30 minutes
        throughput: {
          filesPerMinute: 2.5,
          mbPerSecond: 1.2
        },
        errors: {
          count: 3,
          recentErrors: [
            'product_image_012.jpg: Invalid file format',
            'banner_ad_03.png: File size too large',
            'logo_variant.svg: Virus scan failed'
          ]
        }
      }

      setBatchProgress(mockProgress)
    } catch (error) {
      toast('Failed to load batch progress', 'error')
    }
  }, [toast])

  useEffect(() => {
    loadBatches()
  }, [loadBatches])

  // File drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    setSelectedFiles(files)
    setShowCreateDialog(true)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      setSelectedFiles(files)
      setShowCreateDialog(true)
    }
  }

  // Create batch
  const handleCreateBatch = async () => {
    try {
      if (!newBatch.name.trim()) {
        toast('Batch name is required', 'error')
        return
      }

      if (selectedFiles.length === 0) {
        toast('Please select files to upload', 'error')
        return
      }

      // Mock batch creation
      console.log('Creating batch:', newBatch, selectedFiles)
      
      toast(`Batch "${newBatch.name}" created with ${selectedFiles.length} files`, 'success')
      
      // Reset form
      setNewBatch({
        name: '',
        description: '',
        projectId: '',
        priority: 'medium',
        autoAssign: false,
        assignToUser: '',
        category: 'general',
        tags: []
      })
      setSelectedFiles([])
      setShowCreateDialog(false)
      
      // Reload batches
      await loadBatches()
      
    } catch (error) {
      toast('Failed to create batch', 'error')
    }
  }

  // Batch actions
  const handleStartBatch = async (batchId: string) => {
    try {
      console.log('Starting batch:', batchId)
      toast('Batch processing started', 'success')
      await loadBatches()
    } catch (error) {
      toast('Failed to start batch', 'error')
    }
  }

  const handlePauseBatch = async (batchId: string) => {
    try {
      console.log('Pausing batch:', batchId)
      toast('Batch paused', 'info')
      await loadBatches()
    } catch (error) {
      toast('Failed to pause batch', 'error')
    }
  }

  const handleCancelBatch = async (batchId: string) => {
    try {
      console.log('Cancelling batch:', batchId)
      toast('Batch cancelled', 'info')
      await loadBatches()
    } catch (error) {
      toast('Failed to cancel batch', 'error')
    }
  }

  const handleViewProgress = (batch: BatchUpload) => {
    setSelectedBatch(batch)
    loadBatchProgress(batch.id)
    setShowProgressDialog(true)
  }

  // Filter batches
  const filteredBatches = batches.filter(batch => {
    if (filters.status !== 'all' && batch.status !== filters.status) return false
    if (filters.search && !batch.name.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'processing': 
      case 'uploading': return <Clock className="w-4 h-4 text-blue-500" />
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />
      case 'cancelled': return <XCircle className="w-4 h-4 text-gray-500" />
      default: return <AlertCircle className="w-4 h-4 text-yellow-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'processing': 
      case 'uploading': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'failed': return 'bg-red-100 text-red-800 border-red-200'
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Batch Uploads</h1>
          <p className="text-sm text-gray-600">Manage large file uploads with automated workflows</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Batch
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search batches..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
          </div>
          <Select
            value={filters.status}
            onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
          >
            <option value="all">All Status</option>
            <option value="preparing">Preparing</option>
            <option value="uploading">Uploading</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            More Filters
          </Button>
        </div>
      </Card>

      {/* Drop Zone */}
      <Card 
        className={`p-8 border-2 border-dashed transition-colors ${
          dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <div className="mt-4">
            <label htmlFor="file-upload" className="cursor-pointer">
              <span className="mt-2 block text-sm font-medium text-gray-900">
                Drop files here or click to select
              </span>
              <span className="mt-1 block text-sm text-gray-600">
                Support for multiple files up to 100MB each
              </span>
              <input
                id="file-upload"
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>
          </div>
        </div>
      </Card>

      {/* Batches List */}
      <div className="space-y-4">
        {filteredBatches.map((batch) => (
          <Card key={batch.id} className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {getStatusIcon(batch.status)}
                  <h3 className="text-lg font-medium text-gray-900">{batch.name}</h3>
                  <Badge className={getStatusColor(batch.status)}>
                    {batch.status}
                  </Badge>
                  <Badge className={getPriorityColor(batch.settings.priority)}>
                    {batch.settings.priority}
                  </Badge>
                </div>
                
                {batch.description && (
                  <p className="text-sm text-gray-600 mb-3">{batch.description}</p>
                )}

                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    {batch.totalFiles} files
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    {batch.processedFiles} processed
                  </div>
                  {batch.failedFiles > 0 && (
                    <div className="flex items-center gap-1 text-red-600">
                      <XCircle className="w-4 h-4" />
                      {batch.failedFiles} failed
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {new Date(batch.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Progress Bar */}
                {(batch.status === 'uploading' || batch.status === 'processing') && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{Math.round(((batch.processedFiles + batch.failedFiles) / batch.totalFiles) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((batch.processedFiles + batch.failedFiles) / batch.totalFiles) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Tags */}
                {batch.settings.tags.length > 0 && (
                  <div className="flex items-center gap-2 mt-3">
                    {batch.settings.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 ml-4">
                {batch.status === 'preparing' && (
                  <Button size="sm" onClick={() => handleStartBatch(batch.id)}>
                    <Play className="w-4 h-4 mr-1" />
                    Start
                  </Button>
                )}
                
                {(batch.status === 'uploading' || batch.status === 'processing') && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => handleViewProgress(batch)}>
                      <Eye className="w-4 h-4 mr-1" />
                      Progress
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handlePauseBatch(batch.id)}>
                      <Pause className="w-4 h-4 mr-1" />
                      Pause
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleCancelBatch(batch.id)}>
                      <XCircle className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </>
                )}

                {batch.status === 'completed' && (
                  <Button size="sm" variant="outline">
                    <Download className="w-4 h-4 mr-1" />
                    Report
                  </Button>
                )}

                <Button size="sm" variant="outline">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {filteredBatches.length === 0 && (
          <Card className="p-12 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No batches found</h3>
            <p className="text-gray-600 mb-4">
              {filters.search || filters.status !== 'all' 
                ? 'No batches match your current filters'
                : 'Create your first batch upload to get started'
              }
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              Create New Batch
            </Button>
          </Card>
        )}
      </div>

      {/* Create Batch Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <div className="max-w-2xl">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Create New Batch</h2>
            <p className="text-sm text-gray-600">
              Configure your batch upload settings and workflow
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="batch-name">Batch Name *</Label>
              <Input
                id="batch-name"
                placeholder="Enter batch name"
                value={newBatch.name}
                onChange={(e) => setNewBatch(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="batch-description">Description</Label>
              <textarea
                id="batch-description"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Optional description"
                value={newBatch.description}
                onChange={(e) => setNewBatch(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="batch-project">Project</Label>
                <Select
                  value={newBatch.projectId}
                  onValueChange={(value) => setNewBatch(prev => ({ ...prev, projectId: value }))}
                >
                  <option value="">Select project</option>
                  <option value="project_1">Marketing Campaign</option>
                  <option value="project_2">Product Photos</option>
                  <option value="project_3">Social Media</option>
                </Select>
              </div>

              <div>
                <Label htmlFor="batch-priority">Priority</Label>
                <Select
                  value={newBatch.priority}
                  onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => 
                    setNewBatch(prev => ({ ...prev, priority: value }))}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="batch-category">Category</Label>
                <Select
                  value={newBatch.category}
                  onValueChange={(value) => setNewBatch(prev => ({ ...prev, category: value }))}
                >
                  <option value="general">General</option>
                  <option value="marketing">Marketing</option>
                  <option value="ecommerce">E-commerce</option>
                  <option value="content">Content</option>
                  <option value="photography">Photography</option>
                </Select>
              </div>

              <div>
                <Label>Auto-assign</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="auto-assign"
                    checked={newBatch.autoAssign}
                    onChange={(e) => setNewBatch(prev => ({ ...prev, autoAssign: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Label htmlFor="auto-assign" className="text-sm">
                    Automatically assign files to reviewer
                  </Label>
                </div>
              </div>
            </div>

            {newBatch.autoAssign && (
              <div>
                <Label htmlFor="assign-to">Assign To</Label>
                <Select
                  value={newBatch.assignToUser}
                  onValueChange={(value) => setNewBatch(prev => ({ ...prev, assignToUser: value }))}
                >
                  <option value="">Select reviewer</option>
                  <option value="reviewer_1">John Smith</option>
                  <option value="reviewer_2">Sarah Johnson</option>
                  <option value="reviewer_3">Mike Wilson</option>
                </Select>
              </div>
            )}

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div>
                <Label>Selected Files ({selectedFiles.length})</Label>
                <div className="mt-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
                  {selectedFiles.slice(0, 5).map((file, index) => (
                    <div key={index} className="flex items-center justify-between py-1 text-sm">
                      <span className="truncate">{file.name}</span>
                      <span className="text-gray-500">{formatFileSize(file.size)}</span>
                    </div>
                  ))}
                  {selectedFiles.length > 5 && (
                    <div className="text-sm text-gray-500 pt-1">
                      ... and {selectedFiles.length - 5} more files
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBatch}>
              Create Batch
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Progress Dialog */}
      <Dialog open={showProgressDialog} onOpenChange={setShowProgressDialog}>
        <div className="max-w-4xl">
          {selectedBatch && batchProgress && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {selectedBatch.name} - Progress
                </h2>
                <div className="flex items-center gap-2">
                  {getStatusIcon(selectedBatch.status)}
                  <Badge className={getStatusColor(selectedBatch.status)}>
                    {selectedBatch.status}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Overall Progress */}
                <Card className="p-4">
                  <h3 className="font-medium text-gray-900 mb-4">Overall Progress</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                        <span>Files Processed</span>
                        <span>{batchProgress.overall.percentComplete}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${batchProgress.overall.percentComplete}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Total Files</div>
                        <div className="text-lg font-semibold">{batchProgress.overall.totalFiles}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Processed</div>
                        <div className="text-lg font-semibold text-green-600">{batchProgress.overall.processedFiles}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Uploading</div>
                        <div className="text-lg font-semibold text-blue-600">{batchProgress.overall.uploadedFiles}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Failed</div>
                        <div className="text-lg font-semibold text-red-600">{batchProgress.overall.failedFiles}</div>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Current File */}
                {batchProgress.currentFile && (
                  <Card className="p-4">
                    <h3 className="font-medium text-gray-900 mb-4">Current File</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm text-gray-600 mb-1">File Name</div>
                        <div className="font-medium truncate">{batchProgress.currentFile.fileName}</div>
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                          <span>Upload Progress</span>
                          <span>{batchProgress.currentFile.uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${batchProgress.currentFile.uploadProgress}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                          <span>Processing Progress</span>
                          <span>{batchProgress.currentFile.processingProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${batchProgress.currentFile.processingProgress}%` }}
                          />
                        </div>
                      </div>

                      <Badge className={getStatusColor(batchProgress.currentFile.status)}>
                        {batchProgress.currentFile.status}
                      </Badge>
                    </div>
                  </Card>
                )}

                {/* Performance Stats */}
                <Card className="p-4">
                  <h3 className="font-medium text-gray-900 mb-4">Performance</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Est. Time Remaining</span>
                      <span className="font-medium">{formatDuration(batchProgress.estimatedTimeRemaining)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Files/minute</span>
                      <span className="font-medium">{batchProgress.throughput.filesPerMinute.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">MB/second</span>
                      <span className="font-medium">{batchProgress.throughput.mbPerSecond.toFixed(1)}</span>
                    </div>
                  </div>
                </Card>

                {/* Errors */}
                {batchProgress.errors.count > 0 && (
                  <Card className="p-4">
                    <h3 className="font-medium text-gray-900 mb-4">
                      Recent Errors ({batchProgress.errors.count})
                    </h3>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {batchProgress.errors.recentErrors.map((error, index) => (
                        <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                          {error}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                <Button variant="outline" onClick={() => setShowProgressDialog(false)}>
                  Close
                </Button>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download Report
                </Button>
              </div>
            </>
          )}
        </div>
      </Dialog>
    </div>
  )
}

export default BatchUploadManager
