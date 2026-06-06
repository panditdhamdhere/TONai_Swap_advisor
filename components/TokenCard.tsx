import Image from "next/image";
import type { TokenBalance } from "@/lib/tonapi";

interface TokenCardProps {
  token: TokenBalance;
}

function formatNumber(value: number, maxDecimals = 4): string {
  if (value >= 1_000_000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  if (value >= 1) {
    return value.toLocaleString(undefined, { maximumFractionDigits: maxDecimals });
  }

  return value.toLocaleString(undefined, {
    minimumSignificantDigits: 2,
    maximumSignificantDigits: maxDecimals,
  });
}

function formatUsd(value: number): string {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function TokenCard({ token }: TokenCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20 hover:bg-white/[0.05]">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white/5">
        <Image
          src={token.iconUrl}
          alt={token.symbol}
          fill
          className="object-cover"
          unoptimized
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-white">{token.symbol}</p>
          {token.isNative && (
            <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-xs text-blue-300">
              Native
            </span>
          )}
        </div>
        <p className="truncate text-sm text-zinc-400">{token.name}</p>
      </div>

      <div className="text-right">
        <p className="font-medium text-white">{formatNumber(token.balance)}</p>
        <p className="text-sm text-zinc-400">{formatUsd(token.usdValue)}</p>
      </div>
    </div>
  );
}
