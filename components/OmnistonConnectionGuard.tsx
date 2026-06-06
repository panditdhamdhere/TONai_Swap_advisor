"use client";

import { useOmniston } from "@ston-fi/omniston-sdk-react";
import { useEffect, useState } from "react";

type ConnectionState = "connecting" | "connected" | "error";

export function OmnistonConnectionGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const omniston = useOmniston();
  const [status, setStatus] = useState<ConnectionState>("connecting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const events = (
      omniston as {
        connectionStatusEvents?: {
          subscribe: (
            cb: (event: {
              status: string;
              errorMessage?: string;
            }) => void,
          ) => { unsubscribe: () => void };
        };
      }
    ).connectionStatusEvents;

    if (!events?.subscribe) {
      setStatus("connected");
      return;
    }

    const subscription = events.subscribe((event) => {
      if (event.status === "connected") {
        setStatus("connected");
        setErrorMessage(null);
      } else if (event.status === "connecting") {
        setStatus("connecting");
      } else if (event.status === "error") {
        setStatus("error");
        setErrorMessage(event.errorMessage ?? "Connection failed");
      }
    });

    return () => subscription.unsubscribe();
  }, [omniston]);

  return (
    <>
      {status === "error" && (
        <div className="border-b border-amber-500/20 bg-amber-500/10 px-6 py-2 text-center text-sm text-amber-200">
          Omniston connection issue: {errorMessage ?? "Reconnecting…"}
        </div>
      )}
      {status === "connecting" && (
        <div className="border-b border-border bg-card px-6 py-2 text-center text-xs text-muted">
          Connecting to Omniston…
        </div>
      )}
      {children}
    </>
  );
}
