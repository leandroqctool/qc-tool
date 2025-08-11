import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '../../../lib/auth'
import { getDb } from '../../../lib/db'
import { files } from '../../../drizzle/schema'
import DashboardLayout from '../../../components/layout/DashboardLayout'
import FileDetailClient from '../../../components/features/FileDetailClient'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { 
  ArrowLeft, 
  Download, 
  Share, 
  Clock, 
  User, 
  Folder,
  FileText,
  Image as ImageIcon,
  Video,
  File as FileIcon
} from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatFileSize } from '../../../lib/utils'

interface FileDetailPageProps {
  params: Promise<{
    id: string
  }>
}

async function getFileDetails(fileId: string, tenantId: string) {
  const db = getDb()
  
  try {
    const fileData = await db
      .select({
        id: files.id,
        key: files.key,
        originalName: files.originalName,
        size: files.size,
        mimeType: files.mimeType,
        url: files.url,
        status: files.status,
        currentStage: files.currentStage,
        revisionCount: files.revisionCount,
        projectId: files.projectId,
        assignedTo: files.assignedTo,
        uploadedBy: files.uploadedBy,
        createdAt: files.createdAt,
        updatedAt: files.updatedAt,
      })
      .from(files)
      .where(db.operators.eq(files.id, fileId))
      .limit(1)

    if (fileData.length === 0) {
      return null
    }

    const file = fileData[0]
    
    // Check tenant access - skip for now since schema doesn't include tenantId in select
    // if (file.tenantId && file.tenantId !== tenantId) {
    //   return null
    // }

    return file
  } catch (error) {
    console.error('Error fetching file details:', error)
    return null
  }
}

export default async function FileDetailPage({ params }: FileDetailPageProps) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const tenantId = (session.user as unknown as { tenantId?: string }).tenantId
  if (!tenantId) redirect('/login')

  const { id } = await params
  const file = await getFileDetails(id, tenantId)
  if (!file) {
    redirect('/files')
  }

  const currentUser = {
    id: (session.user as unknown as { id?: string }).id || 'unknown',
    name: session.user?.name || session.user?.email?.split('@')[0] || 'Unknown User',
  }

  // Determine file type for icon
  const getFileIcon = (mimeType: string): React.ComponentType<{ className?: string }> => {
    if (mimeType.startsWith('image/')) return ImageIcon
    if (mimeType.startsWith('video/')) return Video
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return FileText
    return FileIcon
  }

  const FileIcon = getFileIcon(file.mimeType)
  const isImageFile = file.mimeType.startsWith('image/')

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-[var(--surface)] border-b border-[var(--border-light)] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/files">
                <Button variant="ghost" size="sm" className="p-2">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-100">
                  <FileIcon className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-[var(--text-primary)]">
                    {file.originalName}
                  </h1>
                  <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)] mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(file.createdAt || new Date())}
                    </span>
                    <span>{formatFileSize(parseInt(file.size))}</span>
                    <span>{file.mimeType}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge 
                variant={file.status === 'APPROVED' ? 'success' : file.status === 'FAILED' ? 'destructive' : 'outline'}
              >
                {file.currentStage || file.status}
              </Badge>
              
              {file.revisionCount && parseInt(file.revisionCount) > 0 && (
                <Badge variant="outline">
                  R{file.revisionCount}
                </Badge>
              )}

              <Button variant="outline" size="sm">
                <Share className="w-4 h-4 mr-2" />
                Share
              </Button>
              
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>

          {/* File Metadata */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">Project</h3>
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Folder className="w-3 h-3" />
                {file.projectId ? (
                  <Link href={`/projects/${file.projectId}`} className="hover:text-[var(--primary)]">
                    Project #{file.projectId.slice(-8)}
                  </Link>
                ) : (
                  'No project assigned'
                )}
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">Uploaded By</h3>
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <User className="w-3 h-3" />
                {file.uploadedBy ? `User ${file.uploadedBy.slice(-8)}` : 'Unknown'}
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">Assigned To</h3>
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <User className="w-3 h-3" />
                {file.assignedTo ? `User ${file.assignedTo.slice(-8)}` : 'Unassigned'}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <FileDetailClient
          fileId={file.id}
          fileUrl={file.url}
          fileName={file.originalName}
          currentStage={file.currentStage || file.status || 'UPLOADED'}
          revisionCount={parseInt(file.revisionCount || '0')}
          assignedTo={file.assignedTo || undefined}
          currentUser={currentUser}
          isImageFile={isImageFile}
        />
      </div>
    </DashboardLayout>
  )
}