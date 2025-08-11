import { TableSkeleton } from "../../components/ui/TableSkeleton"

export default function AuditLogsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Audit Logs</h1>
          <p className="text-[var(--text-secondary)]">Track system activity and changes</p>
        </div>
      </div>
      <TableSkeleton rows={12} columns={6} />
    </div>
  )
}
