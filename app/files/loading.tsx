import { FilesTableSkeleton } from "../../components/ui/TableSkeleton"

export default function FilesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Files</h1>
          <p className="text-[var(--text-secondary)]">Manage and review your uploaded files</p>
        </div>
      </div>
      <FilesTableSkeleton />
    </div>
  )
}