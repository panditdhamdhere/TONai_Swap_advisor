"use client";

import { OmnistonConnectionGuard } from "@/components/OmnistonConnectionGuard";
import { OmnistonErrorBoundary } from "@/components/OmnistonErrorBoundary";
import { OmnistonProvider } from "@ston-fi/omniston-sdk-react";
import { TonConnectUIProvider } from "@tonconnect/ui-react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <OmnistonErrorBoundary>
      <TonConnectUIProvider manifestUrl="/tonconnect-manifest.json">
        <OmnistonProvider apiUrl="wss://omni-ws.ston.fi">
          <OmnistonConnectionGuard>{children}</OmnistonConnectionGuard>
        </OmnistonProvider>
      </TonConnectUIProvider>
    </OmnistonErrorBoundary>
  );
}
