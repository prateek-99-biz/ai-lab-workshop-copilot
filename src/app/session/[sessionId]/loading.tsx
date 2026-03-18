export default function PresenterLoading() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header skeleton */}
      <header className="bg-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-700 rounded animate-pulse" />
          <div>
            <div className="h-5 w-48 bg-gray-700 rounded animate-pulse" />
            <div className="h-3 w-32 bg-gray-700 rounded animate-pulse mt-2" />
          </div>
        </div>
        <div className="h-8 w-24 bg-gray-700 rounded-full animate-pulse" />
      </header>

      {/* Main skeleton */}
      <main className="flex-1 flex overflow-hidden">
        <div className="w-72 border-r border-gray-700 p-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-gray-800 rounded animate-pulse" />
          ))}
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="h-8 w-64 bg-gray-800 rounded animate-pulse mx-auto" />
            <div className="h-4 w-48 bg-gray-800 rounded animate-pulse mx-auto" />
            <div className="h-12 w-40 bg-gray-800 rounded animate-pulse mx-auto mt-6" />
          </div>
        </div>
      </main>
    </div>
  );
}
