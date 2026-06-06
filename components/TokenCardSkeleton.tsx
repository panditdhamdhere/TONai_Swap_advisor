export function TokenCardSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
      <div className="skeleton h-12 w-12 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="skeleton h-4 w-24 rounded" />
        <div className="skeleton h-3 w-32 rounded" />
      </div>
      <div className="space-y-2 text-right">
        <div className="skeleton ml-auto h-4 w-20 rounded" />
        <div className="skeleton ml-auto h-3 w-16 rounded" />
      </div>
    </div>
  );
}
