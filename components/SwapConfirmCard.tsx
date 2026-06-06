"use client";

import type { SwapAction } from "@/lib/chat";

interface SwapConfirmCardProps {
  action: SwapAction;
  onExecute: (action: SwapAction) => void;
}

export function SwapConfirmCard({ action, onExecute }: SwapConfirmCardProps) {
  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
      <p className="text-sm font-medium text-emerald-300">Swap ready to execute</p>
      <div className="mt-3 space-y-2 text-sm text-zinc-200">
        <div className="flex justify-between gap-4">
          <span className="text-zinc-400">From</span>
          <span className="font-medium">{action.fromToken}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-zinc-400">To</span>
          <span className="font-medium">{action.toToken}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-zinc-400">Amount</span>
          <span className="font-medium">{action.amount}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onExecute(action)}
        className="mt-4 w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-emerald-400"
      >
        Execute Swap
      </button>
    </div>
  );
}
