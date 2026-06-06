"use client";

import { TonConnectButton } from "@tonconnect/ui-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5 text-accent"
              aria-hidden
            >
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
              TON AI Swap Advisor
            </h1>
            <p className="hidden text-xs text-muted sm:block">
              Smart swap recommendations for your TON wallet
            </p>
          </div>
        </div>
        <TonConnectButton />
      </div>
    </header>
  );
}
