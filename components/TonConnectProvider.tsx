"use client";

import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { useEffect, useState } from "react";

const FALLBACK_ORIGIN =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function resolveManifestUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/tonconnect-manifest.json`;
  }

  return `${FALLBACK_ORIGIN}/tonconnect-manifest.json`;
}

export function TonConnectProvider({ children }: { children: React.ReactNode }) {
  const [manifestUrl, setManifestUrl] = useState(resolveManifestUrl);

  useEffect(() => {
    setManifestUrl(resolveManifestUrl());
  }, []);

  return (
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      {children}
    </TonConnectUIProvider>
  );
}
