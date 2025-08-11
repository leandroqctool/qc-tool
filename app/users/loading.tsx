import { TableSkeleton } from "../../components/ui/TableSkeleton"

export default function UsersLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Users</h1>
          <p className="text-[var(--text-secondary)]">Manage team members and permissions</p>
        </div>
      </div>
      <TableSkeleton rows={8} columns={4} />
    </div>
  )
}
