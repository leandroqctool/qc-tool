"use client"
import { useState } from 'react'
import { useToast } from '../ui/ToastProvider'

type Props = {
  fileId: string
  status: string
}

export default function FileStatusMenu({ fileId, status }: Props) {
  const [value, setValue] = useState(status)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { show } = useToast()

  async function onChange(next: string) {
    setValue(next)
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      setSaving(false)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to update')
        show('Failed to update file', 'error')
      }
      show('File updated', 'success')
    } catch {
      setSaving(false)
      setError('Failed to update')
      show('Failed to update file', 'error')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
      >
        <option value="PENDING">Pending</option>
        <option value="COMPLETED">Completed</option>
        <option value="APPROVED">Approved</option>
        <option value="REJECTED">Rejected</option>
      </select>
      {saving && <span className="text-xs text-gray-500">Saving…</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}


