import { headers } from 'next/headers'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '../../../lib/auth'
import ReviewActions from '../../../components/features/ReviewActions'

type Review = {
  id: string
  status: string
  comments: string | null
  fileId: string | null
  projectId: string | null
}

export default async function ReviewDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const hdrs = await headers()
  const host = hdrs.get('host') || 'localhost:3000'
  const cookie = hdrs.get('cookie') || ''
  const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const base = `${proto}://${host}`

  let review: Review | null = null
  try {
    const res = await fetch(`${base}/api/qc-reviews/${id}`, { cache: 'no-store', headers: { cookie } })
    if (res.ok) {
      const data = (await res.json()) as { review: Review }
      review = data.review
    }
  } catch {}

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        {review ? (
          <div className="rounded-2xl bg-white shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold">Review {review.id.slice(0,8)}</h1>
              <ReviewActions reviewId={id} currentStatus={review.status} />
            </div>
            {review.comments && (
              <div>
                <h3 className="text-sm font-medium text-gray-700">Comments</h3>
                <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{review.comments}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Project:</span> {review.projectId ?? '—'}</div>
              <div><span className="text-gray-500">File:</span> {review.fileId ?? '—'}</div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">Review not found</div>
        )}
      </div>
    </main>
  )
}


