import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '../../lib/auth'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Copy, 
  Trash2, 
  Eye, 
  Users, 
  Calendar,
  FileText,
  Layout,
  Zap,
  BarChart3
} from 'lucide-react'
import Link from 'next/link'

export default async function FormsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  // Mock forms data - would come from API
  const forms = [
    {
      id: 'form_1',
      name: 'Project Intake Form',
      description: 'Initial project requirements and specifications',
      category: 'Project Management',
      status: 'active',
      submissions: 47,
      lastSubmission: new Date('2024-01-10'),
      createdAt: new Date('2023-12-01'),
      fields: 12,
      version: 2
    },
    {
      id: 'form_2', 
      name: 'Quality Control Checklist',
      description: 'Comprehensive QC review checklist for creative assets',
      category: 'Quality Control',
      status: 'active',
      submissions: 128,
      lastSubmission: new Date('2024-01-11'),
      createdAt: new Date('2023-11-15'),
      fields: 24,
      version: 3
    },
    {
      id: 'form_3',
      name: 'Client Feedback Survey',
      description: 'Post-project client satisfaction and feedback collection',
      category: 'Client Relations',
      status: 'draft',
      submissions: 0,
      lastSubmission: null,
      createdAt: new Date('2024-01-08'),
      fields: 8,
      version: 1
    },
    {
      id: 'form_4',
      name: 'Asset Review Request',
      description: 'Request form for creative asset reviews and approvals',
      category: 'Review Process',
      status: 'active',
      submissions: 89,
      lastSubmission: new Date('2024-01-11'),
      createdAt: new Date('2023-10-20'),
      fields: 16,
      version: 4
    }
  ]

  const categories = ['All', 'Project Management', 'Quality Control', 'Client Relations', 'Review Process']
  const statusOptions = ['All', 'Active', 'Draft', 'Archived']

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--text-primary)]">Forms</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Create and manage dynamic forms for your workflows
            </p>
          </div>
          <Link href="/forms/builder">
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Form
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Total Forms</p>
                <p className="text-2xl font-semibold text-[var(--text-primary)]">
                  {forms.length}
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Active Forms</p>
                <p className="text-2xl font-semibold text-[var(--text-primary)]">
                  {forms.filter(f => f.status === 'active').length}
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <Zap className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Total Submissions</p>
                <p className="text-2xl font-semibold text-[var(--text-primary)]">
                  {forms.reduce((sum, form) => sum + form.submissions, 0)}
                </p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Avg. Response Rate</p>
                <p className="text-2xl font-semibold text-[var(--text-primary)]">87%</p>
              </div>
              <div className="p-2 bg-yellow-100 rounded-lg">
                <BarChart3 className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search forms..."
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <select className="px-3 py-2 border border-[var(--border-light)] rounded-lg text-sm bg-white">
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            
            <select className="px-3 py-2 border border-[var(--border-light)] rounded-lg text-sm bg-white">
              {statusOptions.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Forms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {forms.map((form) => (
            <Card key={form.id} className="p-6 hover:shadow-lg transition-shadow">
              {/* Form Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-[var(--text-primary)] line-clamp-1">
                      {form.name}
                    </h3>
                    <Badge 
                      variant={form.status === 'active' ? 'success' : form.status === 'draft' ? 'outline' : 'secondary'}
                      className="text-xs"
                    >
                      {form.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-3">
                    {form.description}
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {form.category}
                  </Badge>
                </div>
                
                <div className="relative">
                  <Button variant="ghost" size="sm" className="p-1">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Form Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">Submissions</p>
                  <p className="text-lg font-semibold text-[var(--text-primary)]">
                    {form.submissions}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">Fields</p>
                  <p className="text-lg font-semibold text-[var(--text-primary)]">
                    {form.fields}
                  </p>
                </div>
              </div>

              {/* Form Meta */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <Calendar className="w-3 h-3" />
                  <span>Created {form.createdAt.toLocaleDateString()}</span>
                </div>
                {form.lastSubmission && (
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <Users className="w-3 h-3" />
                    <span>Last submission {form.lastSubmission.toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <FileText className="w-3 h-3" />
                  <span>Version {form.version}</span>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-2">
                <Link href={`/forms/${form.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    <Eye className="w-3 h-3 mr-2" />
                    View
                  </Button>
                </Link>
                
                <Link href={`/forms/builder?edit=${form.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    <Edit className="w-3 h-3 mr-2" />
                    Edit
                  </Button>
                </Link>
                
                <Button variant="ghost" size="sm" className="px-2">
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {forms.length === 0 && (
          <div className="text-center py-12">
            <Layout className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
              No forms yet
            </h3>
            <p className="text-[var(--text-secondary)] mb-6 max-w-sm mx-auto">
              Create your first form to start collecting structured data from your team and clients.
            </p>
            <Link href="/forms/builder">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Form
              </Button>
            </Link>
          </div>
        )}

        {/* Quick Start Templates */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Quick Start Templates</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: 'Project Intake', description: 'Collect project requirements', icon: FileText },
              { name: 'QC Checklist', description: 'Quality control reviews', icon: Layout },
              { name: 'Client Feedback', description: 'Post-project surveys', icon: Users },
              { name: 'Asset Request', description: 'Creative asset requests', icon: Zap }
            ].map((template, index) => {
              const Icon = template.icon
              return (
                <div key={index} className="p-4 border border-[var(--border-light)] rounded-lg hover:border-[var(--primary)] transition-colors cursor-pointer">
                  <Icon className="w-6 h-6 text-[var(--primary)] mb-2" />
                  <h4 className="font-medium text-[var(--text-primary)] mb-1">{template.name}</h4>
                  <p className="text-xs text-[var(--text-secondary)]">{template.description}</p>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
