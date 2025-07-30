export default function Loading() {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <div className="w-64 border-r border-gray-200 dark:border-gray-800 p-4">
        <div className="h-8 w-full bg-gray-200 dark:bg-gray-800 rounded mb-4 animate-pulse"></div>
        <div className="h-8 w-full bg-gray-200 dark:bg-gray-800 rounded mb-2 animate-pulse"></div>
        <div className="h-8 w-full bg-gray-200 dark:bg-gray-800 rounded mb-2 animate-pulse"></div>
        <div className="h-8 w-full bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
      </div>
      <div className="flex-1 flex flex-col p-8">
        <div className="h-10 w-1/2 bg-gray-200 dark:bg-gray-800 rounded mb-6 animate-pulse"></div>
        <div className="h-6 w-1/4 bg-gray-200 dark:bg-gray-800 rounded mb-8 animate-pulse"></div>
        <div className="flex-1 bg-gray-100 dark:bg-gray-900 rounded animate-pulse"></div>
      </div>
    </div>
  )
}
