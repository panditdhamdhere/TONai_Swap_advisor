"use client";

import type { SwapEvent } from "@/lib/tonapi";

interface TransactionHistoryProps {
  swaps: SwapEvent[];
  loading: boolean;
  error: string | null;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TransactionHistory({
  swaps,
  loading,
  error,
}: TransactionHistoryProps) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          Recent Swaps
        </h3>
        <p className="text-xs text-muted">Last 5 swap events from TonAPI</p>
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="skeleton h-14 rounded-lg border border-border bg-card"
            />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted">
          {error}
        </div>
      )}

      {!loading && !error && swaps.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted">
          No swap history yet. Execute your first swap with the AI advisor.
        </div>
      )}

      {!loading && !error && swaps.length > 0 && (
        <div className="space-y-2">
          {swaps.map((swap) => (
            <div
              key={swap.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-accent/30"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {swap.description}
                </p>
                <p className="text-xs text-muted">
                  {formatDate(swap.timestamp)}
                  {swap.dex ? ` · ${swap.dex}` : ""}
                </p>
              </div>
              {swap.txHash ? (
                <a
                  href={`https://tonscan.org/tx/${swap.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs font-medium text-accent hover:underline"
                >
                  View
                </a>
              ) : (
                <span className="shrink-0 text-xs text-muted">
                  {swap.value}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
