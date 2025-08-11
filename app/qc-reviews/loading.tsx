import { TableSkeleton } from "../../components/ui/TableSkeleton"

export default function QCReviewsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">QC Reviews</h1>
          <p className="text-[var(--text-secondary)]">Track quality control progress and feedback</p>
        </div>
      </div>
      <TableSkeleton rows={10} columns={5} />
    </div>
  )
}