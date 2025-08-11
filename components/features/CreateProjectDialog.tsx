"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { projectCreateSchema } from '../../lib/validation'
import { useToast } from '../ui/ToastProvider'
import { Button } from '../ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { LoadingSpinner } from '../ui/LoadingSpinner'

export default function CreateProjectDialog({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { show } = useToast()

  async function createProject() {
    setLoading(true)
    setError(null)
    // Client-side validation
    try {
      projectCreateSchema.parse({ name, description })
    } catch {
      setLoading(false)
      setError('Please check the form fields')
      return
    }
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Failed to create project')
      show('Failed to create project', 'error')
      return
    }
    setOpen(false)
    setName('')
    setDescription('')
    onCreated?.()
    show('Project created', 'success')
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New Project</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>
            Create a new project to organize your files and quality control workflow.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div className="text-sm text-[var(--status-error)] bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </div>
        )}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex min-h-[80px] w-full rounded-lg border border-[var(--border-medium)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] ring-offset-background placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Enter project description (optional)"
              disabled={loading}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={createProject} disabled={loading}>
            {loading && <LoadingSpinner size="sm" className="mr-2" />}
            {loading ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


