/** Single rectangular skeleton block */
export function SkeletonBlock({ className = '' }) {
  return (
    <div className={`bg-stone-200 rounded-lg animate-pulse ${className}`} />
  )
}

/** Multi-line text skeleton. Last line is 75% width. */
export function SkeletonText({ lines = 1, className = '' }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={[
            'h-4 bg-stone-200 rounded animate-pulse',
            i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full',
          ].join(' ')}
        />
      ))}
    </div>
  )
}

/** Full result page skeleton — matches the result page layout exactly */
export function ResultSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-5 pt-6">
      <SkeletonBlock className="h-[52px] w-full rounded-xl" />
      <div className="flex flex-col gap-3">
        <SkeletonBlock className="h-16 w-20" />
        <SkeletonBlock className="h-2 w-full rounded-full" />
      </div>
      <SkeletonText lines={2} />
      <div className="flex flex-col gap-3">
        <SkeletonBlock className="h-3 w-32 rounded" />
        <SkeletonBlock className="h-14 rounded-xl" />
        <SkeletonBlock className="h-14 rounded-xl" />
      </div>
      <div className="flex flex-col gap-3">
        <SkeletonBlock className="h-3 w-28 rounded" />
        <SkeletonBlock className="h-20 rounded-2xl" />
        <SkeletonBlock className="h-20 rounded-2xl" />
        <SkeletonBlock className="h-20 rounded-2xl" />
      </div>
    </div>
  )
}
