"use client";

import { OmnistonConnectionGuard } from "@/components/OmnistonConnectionGuard";
import { OmnistonErrorBoundary } from "@/components/OmnistonErrorBoundary";
import { TonConnectProvider } from "@/components/TonConnectProvider";
import { OmnistonProvider } from "@ston-fi/omniston-sdk-react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <OmnistonErrorBoundary>
      <TonConnectProvider>
        <OmnistonProvider apiUrl="wss://omni-ws.ston.fi">
          <OmnistonConnectionGuard>{children}</OmnistonConnectionGuard>
        </OmnistonProvider>
      </TonConnectProvider>
    </OmnistonErrorBoundary>
  );
}
