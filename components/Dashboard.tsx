"use client";

import {
  fetchRecentSwaps,
  fetchWalletTokens,
  type SwapEvent,
  type TokenBalance,
} from "@/lib/tonapi";
import { useTonWallet } from "@tonconnect/ui-react";
import { useEffect, useState } from "react";
import { ChatPanel } from "./ChatPanel";
import { LandingHero } from "./LandingHero";
import { TokenCard } from "./TokenCard";
import { TokenCardSkeleton } from "./TokenCardSkeleton";
import { TransactionHistory } from "./TransactionHistory";

export function Dashboard() {
  const wallet = useTonWallet();
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [swaps, setSwaps] = useState<SwapEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [swapsLoading, setSwapsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [swapsError, setSwapsError] = useState<string | null>(null);

  useEffect(() => {
    if (!wallet?.account.address) {
      setTokens([]);
      setSwaps([]);
      setError(null);
      setSwapsError(null);
      return;
    }

    let cancelled = false;

    async function loadBalances() {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchWalletTokens(wallet!.account.address);
        if (!cancelled) {
          setTokens(data);
        }
      } catch {
        if (!cancelled) {
          setError("Unable to load wallet balances. Please try again.");
          setTokens([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    async function loadSwaps() {
      setSwapsLoading(true);
      setSwapsError(null);

      try {
        const data = await fetchRecentSwaps(wallet!.account.address);
        if (!cancelled) {
          setSwaps(data);
        }
      } catch {
        if (!cancelled) {
          setSwapsError("Unable to load swap history.");
          setSwaps([]);
        }
      } finally {
        if (!cancelled) {
          setSwapsLoading(false);
        }
      }
    }

    void loadBalances();
    void loadSwaps();

    return () => {
      cancelled = true;
    };
  }, [wallet?.account.address]);

  if (!wallet) {
    return <LandingHero />;
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[2fr_3fr] lg:items-start lg:py-8">
      <section className="space-y-6 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto lg:pr-1">
        {loading ? (
          <div className="grid gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <TokenCardSkeleton key={index} />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
            <p className="text-red-300">{error}</p>
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Your Portfolio
                </h2>
                <p className="text-sm text-muted">
                  TON balance plus your top 5 jettons by USD value
                </p>
              </div>
              <p className="font-mono text-xs text-muted">
                {wallet.account.address.slice(0, 6)}…
                {wallet.account.address.slice(-4)}
              </p>
            </div>

            <div className="grid gap-3">
              {tokens.map((token) => (
                <TokenCard key={`${token.symbol}-${token.name}`} token={token} />
              ))}
            </div>
          </>
        )}

        <TransactionHistory
          swaps={swaps}
          loading={swapsLoading}
          error={swapsError}
        />
      </section>

      <section className="lg:sticky lg:top-[4.5rem] lg:max-h-[calc(100vh-5rem)]">
        <ChatPanel
          tokens={tokens}
          walletConnected
          balancesLoading={loading}
        />
      </section>
    </div>
  );
}
