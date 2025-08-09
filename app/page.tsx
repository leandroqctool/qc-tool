export default function Home() {
  return (
    <main className="min-h-screen font-sans bg-[var(--background)] text-[var(--text-primary)]">
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-8">
        <h1 className="text-3xl font-semibold">QC Tool — Tailwind Verification</h1>
        <p className="text-[var(--text-secondary)]">If this page is styled, Tailwind v4 is working.</p>
        <div className="space-x-3">
          <button className="px-4 py-2 rounded-lg bg-[#0D99FF] text-white hover:bg-[#0B87E5]">Primary</button>
          <button className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50">Outline</button>
        </div>
        <div className="rounded-2xl bg-white shadow-sm p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-xl font-semibold text-gray-900">12</div>
              <div className="text-sm text-gray-500">Projects</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold text-gray-900">32</div>
              <div className="text-sm text-gray-500">Files</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold text-gray-900">4</div>
              <div className="text-sm text-gray-500">In QC</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
