"use client"
import { useState } from 'react'
import { useToast } from '../ui/ToastProvider'

type Props = {
  reviewId: string
  currentStatus: 'IN_QC' | 'APPROVED' | 'REJECTED' | string
}

export default function ReviewActions({ reviewId, currentStatus }: Props) {
  const [status, setStatus] = useState(currentStatus)
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { show } = useToast()

  async function update(next: 'APPROVED' | 'REJECTED') {
    setLoading(next === 'APPROVED' ? 'approve' : 'reject')
    setError(null)
    try {
      const res = await fetch(`/api/qc-reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      setLoading(null)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to update review')
        return
      }
      setStatus(next)
      show(next === 'APPROVED' ? 'Review approved' : 'Review rejected', 'success')
    } catch {
      setLoading(null)
      setError('Failed to update review')
      show('Failed to update review', 'error')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => update('APPROVED')}
        disabled={loading !== null}
        className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-sm disabled:opacity-60"
      >
        {loading === 'approve' ? 'Approving…' : 'Approve'}
      </button>
      <button
        onClick={() => update('REJECTED')}
        disabled={loading !== null}
        className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm disabled:opacity-60"
      >
        {loading === 'reject' ? 'Rejecting…' : 'Reject'}
      </button>
      <span className="ml-3 text-xs text-gray-600">Current: {status.replace('_',' ')}</span>
      {error && <span className="ml-2 text-xs text-red-600">{error}</span>}
    </div>
  )
}


