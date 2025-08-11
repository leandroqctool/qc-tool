"use client"
import { useState } from 'react'
import { useToast } from '../ui/ToastProvider'

type Props = {
  projectId: string
  status: string
}

export default function ProjectStatusMenu({ projectId, status }: Props) {
  const [value, setValue] = useState(status)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { show } = useToast()

  async function onChange(next: string) {
    setValue(next)
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      setSaving(false)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to update')
        show('Failed to update project', 'error')
      }
      if (res.ok) show('Project updated', 'success')
    } catch {
      setSaving(false)
      setError('Failed to update')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
      >
        <option value="CREATED">Created</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="IN_QC">In QC</option>
        <option value="COMPLETED">Completed</option>
        <option value="ARCHIVED">Archived</option>
      </select>
      {saving && <span className="text-xs text-gray-500">Saving…</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}


