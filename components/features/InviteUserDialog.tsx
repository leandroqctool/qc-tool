"use client"
import * as Dialog from '@radix-ui/react-dialog'
import { useToast } from '../ui/ToastProvider'
import { useState } from 'react'

export default function InviteUserDialog() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('TENANT_ADMIN')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const { show } = useToast()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLoading(false)
      setError('Enter a valid email')
      return
    }
    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      })
      setLoading(false)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to invite user')
        show('Failed to invite user', 'error')
        return
      }
      setSuccess('Invitation created')
      setEmail('')
      show('Invitation created', 'success')
    } catch {
      setLoading(false)
      setError('Failed to invite user')
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="px-3 py-1.5 rounded-lg bg-[#0D99FF] text-white text-sm">Invite</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/20" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-2xl bg-white shadow p-6">
          <Dialog.Title className="text-lg font-semibold text-gray-900">Invite User</Dialog.Title>
          <Dialog.Description className="text-sm text-gray-600 mb-4">Create an invitation for a new user.</Dialog.Description>
          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-2 mb-2">{error}</div>}
          {success && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-2 mb-2">{success}</div>}
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0D99FF]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0D99FF]">
                <option value="TENANT_ADMIN">Tenant Admin</option>
                <option value="QC_MANAGER">QC Manager</option>
                <option value="QC_OPERATOR">QC Operator</option>
                <option value="CLIENT_MANAGER">Client Manager</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close asChild>
                <button type="button" className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm">Close</button>
              </Dialog.Close>
              <button disabled={loading} className="px-3 py-1.5 rounded-lg bg-[#0D99FF] text-white text-sm disabled:opacity-60">{loading ? 'Sending…' : 'Send invite'}</button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}


