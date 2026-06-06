"use client";

import type { SwapAction } from "@/lib/chat";
import {
  fetchStonFiAssets,
  findAssetBySymbol,
  type StonFiAsset,
} from "@/lib/stonfi-assets";
import {
  formatTokenAmount,
  fromBaseUnits,
  resolveSwapAmount,
  toBaseUnits,
} from "@/lib/swap-utils";
import { getTxHashFromBoc } from "@/lib/ton-tx";
import type { TokenBalance } from "@/lib/tonapi";
import {
  Blockchain,
  GaslessSettlement,
  SettlementMethod,
} from "@ston-fi/omniston-sdk";
import type { QuoteResponseEvent_QuoteUpdated } from "@ston-fi/omniston-sdk";
import { useOmniston, useRfq, useTrackTrade } from "@ston-fi/omniston-sdk-react";
import { useTonAddress, useTonConnectUI } from "@tonconnect/ui-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface SwapConfirmCardProps {
  action: SwapAction;
  tokens: TokenBalance[];
  onFailure: (message: string) => void;
}

type CardPhase =
  | "loading"
  | "quoting"
  | "ready"
  | "executing"
  | "tracking"
  | "success"
  | "error";

function getTradeResultLabel(result: string): string {
  switch (result) {
    case "TRADE_RESULT_FULLY_FILLED":
      return "Swap completed successfully.";
    case "TRADE_RESULT_PARTIALLY_FILLED":
      return "Swap partially filled.";
    case "TRADE_RESULT_ABORTED":
      return "Swap was aborted.";
    default:
      return "Swap finished with unknown status.";
  }
}

export function SwapConfirmCard({
  action,
  tokens,
  onFailure,
}: SwapConfirmCardProps) {
  const omniston = useOmniston();
  const [tonConnectUI] = useTonConnectUI();
  const walletAddress = useTonAddress();

  const [phase, setPhase] = useState<CardPhase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [fromAsset, setFromAsset] = useState<StonFiAsset | null>(null);
  const [toAsset, setToAsset] = useState<StonFiAsset | null>(null);
  const [resolvedAmount, setResolvedAmount] = useState<string>("0");
  const [bidUnits, setBidUnits] = useState<string>("0");
  const [tradedQuote, setTradedQuote] =
    useState<QuoteResponseEvent_QuoteUpdated | null>(null);
  const [outgoingTxHash, setOutgoingTxHash] = useState("");
  const [successHash, setSuccessHash] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const onFailureRef = useRef(onFailure);
  onFailureRef.current = onFailure;

  const reportFailure = useCallback((message: string) => {
    onFailureRef.current(message);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function resolveAssets() {
      setPhase("loading");
      setError(null);

      try {
        const assets = await fetchStonFiAssets();
        const from = findAssetBySymbol(assets, action.fromToken);
        const to = findAssetBySymbol(assets, action.toToken);

        if (!from || !to) {
          throw new Error(
            `Could not resolve ${action.fromToken} or ${action.toToken} on STON.fi.`,
          );
        }

        const amount = resolveSwapAmount(action.amount, action.fromToken, tokens);
        const units = toBaseUnits(amount, from.decimals);

        if (units === "0") {
          throw new Error("Swap amount must be greater than zero.");
        }

        if (!cancelled) {
          setFromAsset(from);
          setToAsset(to);
          setResolvedAmount(amount);
          setBidUnits(units);
          setPhase("quoting");
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Failed to prepare swap.";
          setError(message);
          setPhase("error");
          reportFailure(message);
        }
      }
    }

    void resolveAssets();

    return () => {
      cancelled = true;
    };
  }, [action, tokens, reportFailure]);

  const quoteRequest = useMemo(
    () => ({
      settlementMethods: [SettlementMethod.SETTLEMENT_METHOD_SWAP],
      bidAssetAddress: fromAsset
        ? { blockchain: Blockchain.TON, address: fromAsset.contract_address }
        : undefined,
      askAssetAddress: toAsset
        ? { blockchain: Blockchain.TON, address: toAsset.contract_address }
        : undefined,
      amount: { bidUnits },
      settlementParams: {
        gaslessSettlement: GaslessSettlement.GASLESS_SETTLEMENT_POSSIBLE,
        maxPriceSlippageBps: 500,
      },
    }),
    [fromAsset, toAsset, bidUnits],
  );

  const rfqEnabled =
    phase === "quoting" ||
    phase === "ready" ||
    (phase === "executing" && !outgoingTxHash);

  const {
    data: quoteEvent,
    isLoading: quoteLoading,
    error: quoteError,
  } = useRfq(quoteRequest, {
    enabled:
      rfqEnabled &&
      Boolean(fromAsset && toAsset && bidUnits !== "0" && !outgoingTxHash),
  });

  const activeQuote =
    quoteEvent?.type === "quoteUpdated" ? quoteEvent : null;

  useEffect(() => {
    if (phase !== "quoting") {
      return;
    }

    if (quoteError) {
      const message =
        quoteError instanceof Error
          ? quoteError.message
          : "Failed to fetch live quote.";
      setError(message);
      setPhase("error");
      reportFailure(message);
      return;
    }

    if (quoteEvent?.type === "noQuote") {
      const message = "No swap route available for this pair right now.";
      setError(message);
      setPhase("error");
      reportFailure(message);
      return;
    }

    if (activeQuote) {
      setPhase("ready");
    }
  }, [phase, quoteError, quoteEvent, activeQuote, reportFailure]);

  const {
    data: tradeStatus,
    error: trackingError,
    isLoading: trackingLoading,
  } = useTrackTrade(
    {
      quoteId: tradedQuote?.quote.quoteId ?? "",
      traderWalletAddress: {
        blockchain: Blockchain.TON,
        address: walletAddress ?? "",
      },
      outgoingTxHash,
    },
    {
      enabled: Boolean(
        phase === "tracking" &&
          tradedQuote?.quote.quoteId &&
          walletAddress &&
          outgoingTxHash,
      ),
    },
  );

  useEffect(() => {
    if (phase !== "tracking") {
      return;
    }

    if (trackingError) {
      const message =
        trackingError instanceof Error
          ? trackingError.message
          : "Failed to track swap status.";
      setError(message);
      setPhase("error");
      reportFailure(message);
      return;
    }

    const settled = tradeStatus?.status?.tradeSettled;
    if (!settled) {
      return;
    }

    const message = getTradeResultLabel(settled.result);

    if (settled.result === "TRADE_RESULT_FULLY_FILLED") {
      setSuccessHash(outgoingTxHash);
      setSuccessMessage(message);
      setPhase("success");
      return;
    }

    setError(message);
    setPhase("error");
    reportFailure(message);
  }, [phase, trackingError, tradeStatus, outgoingTxHash, reportFailure]);

  async function handleExecute() {
    if (!activeQuote || !walletAddress) {
      return;
    }

    setPhase("executing");
    setError(null);

    try {
      const tx = await omniston.buildTransfer({
        quote: activeQuote.quote,
        sourceAddress: {
          blockchain: Blockchain.TON,
          address: walletAddress,
        },
        destinationAddress: {
          blockchain: Blockchain.TON,
          address: walletAddress,
        },
        gasExcessAddress: {
          blockchain: Blockchain.TON,
          address: walletAddress,
        },
        useRecommendedSlippage: true,
      });

      const messages = tx.ton?.messages;
      if (!messages?.length) {
        throw new Error("Omniston returned an empty transaction.");
      }

      setTradedQuote(activeQuote);

      const result = await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: messages.map((message) => ({
          address: message.targetAddress,
          amount: message.sendAmount,
          payload: message.payload,
        })),
      });

      const txHash = await getTxHashFromBoc(result.boc, walletAddress);
      setOutgoingTxHash(txHash);
      setPhase("tracking");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to execute swap.";
      setTradedQuote(null);
      setOutgoingTxHash("");
      setError(message);
      setPhase("error");
      reportFailure(message);
    }
  }

  if (phase === "success") {
    return (
      <div className="rounded-xl border border-success/40 bg-success/10 p-4">
        <p className="text-sm font-semibold text-success">Swap confirmed</p>
        <p className="mt-2 text-sm text-foreground/90">{successMessage}</p>
        {successHash && (
          <a
            href={`https://tonscan.org/tx/${successHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm font-medium text-success underline underline-offset-2 hover:text-success/80"
          >
            View on Tonscan
          </a>
        )}
      </div>
    );
  }

  if (phase === "loading" || (phase === "quoting" && quoteLoading)) {
    return (
      <div className="rounded-xl border border-accent/30 bg-background p-4">
        <p className="text-sm text-muted">Fetching live Omniston quote…</p>
        <div className="skeleton mt-3 h-2 rounded" />
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
        <p className="text-sm font-medium text-red-300">Swap unavailable</p>
        <p className="mt-2 text-sm text-red-100/80">{error}</p>
      </div>
    );
  }

  const quote = activeQuote?.quote;
  const fromAmount = quote
    ? fromBaseUnits(quote.bidUnits, fromAsset?.decimals ?? 9)
    : parseFloat(resolvedAmount);
  const toAmount = quote
    ? fromBaseUnits(quote.askUnits, toAsset?.decimals ?? 6)
    : 0;
  const rate =
    fromAmount > 0 && quote ? toAmount / fromAmount : 0;
  const feeTon = quote
    ? fromBaseUnits(quote.gasBudget || quote.protocolFeeUnits || "0", 9)
    : 0;

  const isBusy = phase === "executing" || phase === "tracking";

  return (
    <div className="rounded-xl border-2 border-accent/50 bg-background p-4 shadow-[0_0_24px_rgba(0,152,234,0.08)]">
      <div className="flex items-center gap-2">
        <span className="flex h-2 w-2 animate-pulse rounded-full bg-accent" />
        <p className="text-sm font-semibold text-accent">Live swap quote</p>
      </div>

      <div className="mt-3 space-y-2.5 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted">From</span>
          <span className="font-medium text-foreground">
            {formatTokenAmount(fromAmount)} {fromAsset?.symbol ?? action.fromToken}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted">To</span>
          <span className="font-medium text-foreground">
            ~{formatTokenAmount(toAmount)} {toAsset?.symbol ?? action.toToken}
          </span>
        </div>
        {rate > 0 && (
          <div className="flex justify-between gap-4">
            <span className="text-muted">Rate</span>
            <span className="font-medium text-foreground">
              1 {fromAsset?.symbol ?? action.fromToken} ={" "}
              {formatTokenAmount(rate, 6)} {toAsset?.symbol ?? action.toToken}
            </span>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <span className="text-muted">Estimated fee</span>
          <span className="font-medium text-foreground">
            ~{formatTokenAmount(feeTon, 4)} TON
          </span>
        </div>
      </div>

      {(phase === "executing" || phase === "tracking") && (
        <p className="mt-3 text-xs text-muted">
          {phase === "executing"
            ? "Waiting for wallet approval…"
            : trackingLoading
              ? "Tracking swap on-chain…"
              : "Confirming settlement…"}
        </p>
      )}

      <button
        type="button"
        onClick={() => void handleExecute()}
        disabled={!activeQuote || !walletAddress || isBusy}
        className="mt-4 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isBusy ? "Processing…" : "Execute Swap"}
      </button>
    </div>
  );
}
