"use client";

import { TonConnectButton } from "@tonconnect/ui-react";

const FEATURES = [
  "AI Recommendations",
  "Best Swap Rates",
  "One-Click Execute",
] as const;

export function LandingHero() {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-4.5rem)] max-w-4xl flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        Powered by STON.fi Omniston
      </div>

      <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl sm:leading-tight">
        Your AI Co-Pilot for{" "}
        <span className="text-accent">TON Swaps</span>
      </h1>

      <p className="mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
        Connect your wallet to get personalized swap advice, live Omniston quotes,
        and one-click execution — all in plain English.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {FEATURES.map((feature) => (
          <span
            key={feature}
            className="rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground"
          >
            {feature}
          </span>
        ))}
      </div>

      <div className="mt-10 scale-110">
        <TonConnectButton />
      </div>

      <p className="mt-6 text-xs text-muted">
        Non-custodial · TonConnect · No signup required
      </p>
    </section>
  );
}
