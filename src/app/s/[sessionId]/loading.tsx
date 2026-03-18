export default function SessionLoading() {
  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar skeleton */}
      <aside className="hidden lg:flex w-80 border-r border-gray-200 p-5 flex-col bg-white">
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-36 bg-gray-200 rounded animate-pulse" />
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-3 flex-1 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </aside>

      {/* Main content skeleton */}
      <main className="flex-1 flex flex-col">
        <header className="border-b border-gray-200 px-6 py-4 bg-white">
          <div className="h-6 w-64 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-40 bg-gray-100 rounded animate-pulse mt-2" />
        </header>
        <div className="flex-1 p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
                <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-5/6 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
