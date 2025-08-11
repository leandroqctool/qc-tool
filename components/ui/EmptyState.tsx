export default function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white shadow-sm p-8 text-center border border-dashed border-gray-200">
      <div className="text-lg font-semibold text-gray-900 mb-1">{title}</div>
      {description && <div className="text-sm text-gray-600 mb-3">{description}</div>}
      {action}
    </div>
  )
}


