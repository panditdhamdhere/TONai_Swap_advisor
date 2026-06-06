"use client";

import { OmnistonProvider } from "@ston-fi/omniston-sdk-react";
import { TonConnectUIProvider } from "@tonconnect/ui-react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TonConnectUIProvider manifestUrl="/tonconnect-manifest.json">
      <OmnistonProvider apiUrl="wss://omni-ws.ston.fi">
        {children}
      </OmnistonProvider>
    </TonConnectUIProvider>
  );
}
