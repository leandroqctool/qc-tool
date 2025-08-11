"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { useToast } from '../ui/ToastProvider'

type ProjectRow = { id: string; name: string }

export default function NewReviewDialog({ defaultProjectId }: { defaultProjectId?: string }) {
  const [open, setOpen] = useState(false)
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [projectId, setProjectId] = useState(defaultProjectId || '')
  const [fileId, setFileId] = useState('')
  const [status, setStatus] = useState<'IN_QC' | 'APPROVED' | 'REJECTED'>('IN_QC')
  const [comments, setComments] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { show } = useToast()

  useEffect(() => {
    if (!open) return
    ;(async () => {
      try {
        const res = await fetch('/api/projects', { cache: 'no-store' })
        if (res.ok) {
          const data = (await res.json()) as { projects: Array<ProjectRow> }
          setProjects(data.projects ?? [])
        }
      } catch {
        setProjects([])
      }
    })()
  }, [open])

  async function createReview() {
    setLoading(true)
    setError(null)
    try {
      const body: { status: 'IN_QC' | 'APPROVED' | 'REJECTED'; comments?: string; projectId?: string; fileId?: string } = { status }
      if (comments) body.comments = comments
      if (projectId) body.projectId = projectId
      if (fileId) body.fileId = fileId
      const res = await fetch('/api/qc-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      setLoading(false)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to create review')
        show('Failed to create review', 'error')
        return
      }
      show('Review created', 'success')
      setOpen(false)
      setProjectId('')
      setFileId('')
      setComments('')
      setStatus('IN_QC')
      router.refresh()
    } catch {
      setLoading(false)
      setError('Failed to create review')
      show('Failed to create review', 'error')
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="px-4 py-2 rounded-lg bg-[#0D99FF] text-white hover:bg-[#0B87E5] text-sm">New Review</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/20" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-2xl bg-white shadow p-6 space-y-4">
          <Dialog.Title className="text-lg font-semibold text-gray-900">Create QC Review</Dialog.Title>
          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-2">{error}</div>}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Project</label>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0D99FF]">
                <option value="">— Select a project (optional) —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">File ID (optional)</label>
              <input value={fileId} onChange={(e) => setFileId(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0D99FF]" placeholder="files.id or leave blank" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as 'IN_QC' | 'APPROVED' | 'REJECTED')} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0D99FF]">
                <option value="IN_QC">In QC</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Comments</label>
              <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0D99FF]" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Dialog.Close asChild>
              <button className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm">Cancel</button>
            </Dialog.Close>
            <button onClick={createReview} disabled={loading} className="px-4 py-2 rounded-lg bg-[#0D99FF] text-white hover:bg-[#0B87E5] text-sm disabled:opacity-60">{loading ? 'Creating...' : 'Create'}</button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}


