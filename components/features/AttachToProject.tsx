"use client"
import { useEffect, useState } from 'react'
import { useToast } from '../ui/ToastProvider'

type ProjectRow = { id: string; name: string }

export default function AttachToProject({ fileId, initialProjectId }: { fileId: string; initialProjectId?: string | null }) {
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [projectId, setProjectId] = useState<string>(initialProjectId || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { show } = useToast()

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/projects?perPage=100&page=1', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setProjects(data.projects || [])
        }
      } catch {}
    })()
  }, [])

  async function onAttach() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: projectId || null }),
      })
      setLoading(false)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to update file')
        show('Failed to update file', 'error')
        return
      }
      show('File updated', 'success')
    } catch {
      setLoading(false)
      setError('Failed to update file')
      show('Failed to update file', 'error')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
        <option value="">— No project —</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <button onClick={onAttach} disabled={loading} className="px-3 py-1.5 rounded-lg bg-[#0D99FF] text-white text-sm disabled:opacity-60">{loading ? 'Saving…' : 'Save'}</button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}


