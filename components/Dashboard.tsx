"use client";

import { fetchWalletTokens, type TokenBalance } from "@/lib/tonapi";
import { useTonWallet } from "@tonconnect/ui-react";
import { useEffect, useState } from "react";
import { ChatPanel } from "./ChatPanel";
import { TokenCard } from "./TokenCard";

export function Dashboard() {
  const wallet = useTonWallet();
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!wallet?.account.address) {
      setTokens([]);
      setError(null);
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

    void loadBalances();

    return () => {
      cancelled = true;
    };
  }, [wallet?.account.address]);

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-8 lg:grid-cols-2 lg:items-start">
      <section className="space-y-4">
        {!wallet ? (
          <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center">
            <p className="text-lg font-medium text-white">Connect your wallet</p>
            <p className="mt-2 text-sm text-zinc-400">
              Connect a TON wallet to view balances and get AI swap advice.
            </p>
          </div>
        ) : loading ? (
          <div className="grid gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-20 animate-pulse rounded-xl border border-white/10 bg-white/[0.03]"
              />
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
                <h2 className="text-xl font-semibold text-white">Your Portfolio</h2>
                <p className="text-sm text-zinc-400">
                  TON balance plus your top 5 jettons by USD value
                </p>
              </div>
              <p className="text-sm text-zinc-500">
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
      </section>

      <section className="lg:sticky lg:top-6">
        <ChatPanel
          tokens={tokens}
          walletConnected={Boolean(wallet)}
          balancesLoading={loading}
        />
      </section>
    </div>
  );
}
