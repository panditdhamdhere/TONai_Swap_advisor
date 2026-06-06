"use client";

import Image from "next/image";
import { useState } from "react";
import { getTonImageUrl } from "@/lib/token-image";
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
  const [imgSrc, setImgSrc] = useState(token.iconUrl);

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-accent/30">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-background">
        <Image
          src={imgSrc}
          alt={token.symbol}
          fill
          className="object-cover"
          unoptimized
          onError={() => setImgSrc(getTonImageUrl())}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-foreground">{token.symbol}</p>
          {token.isNative && (
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
              Native
            </span>
          )}
        </div>
        <p className="truncate text-sm text-muted">{token.name}</p>
      </div>

      <div className="text-right">
        <p className="font-medium text-foreground">
          {formatNumber(token.balance)}
        </p>
        <p className="text-sm text-muted">{formatUsd(token.usdValue)}</p>
      </div>
    </div>
  );
}
