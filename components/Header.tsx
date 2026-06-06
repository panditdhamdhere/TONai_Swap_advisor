"use client";

import { TonConnectButton } from "@tonconnect/ui-react";

export function Header() {
  return (
    <header className="border-b border-white/10 bg-[#0F0F0F]">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-white">
            TON AI Swap Advisor
          </h1>
          <p className="text-sm text-zinc-400">
            Smart swap recommendations for your TON wallet
          </p>
        </div>
        <TonConnectButton />
      </div>
    </header>
  );
}
