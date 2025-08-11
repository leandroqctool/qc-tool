import { headers } from 'next/headers'

type ReviewRow = {
  id: string
  status: string
  comments: string | null
  fileId: string | null
  projectId: string | null
}

export default async function QCReviews() {
  const hdrs = await headers()
  const host = hdrs.get('host') || 'localhost:3000'
  const cookie = hdrs.get('cookie') || ''
  const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const url = `${proto}://${host}/api/qc-reviews`
  let rows: Array<ReviewRow> = []
  try {
    const res = await fetch(url, { cache: 'no-store', headers: { cookie } })
    if (res.ok) {
      const data = (await res.json()) as { reviews: Array<ReviewRow> }
      rows = data.reviews ?? []
    }
  } catch {
    rows = []
  }

  return (
    <div className="rounded-2xl bg-white shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">QC Reviews</h3>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Comments</th>
              <th className="py-2 pr-4">File</th>
              <th className="py-2 pr-4">Project</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="py-2 pr-4">{r.status}</td>
                <td className="py-2 pr-4 truncate max-w-[360px]">{r.comments ?? '—'}</td>
                <td className="py-2 pr-4">{r.fileId ?? '—'}</td>
                <td className="py-2 pr-4">{r.projectId ?? '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-gray-500">No reviews yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}


