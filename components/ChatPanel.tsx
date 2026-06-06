"use client";

import {
  parseAssistantMessage,
  type ChatMessage,
  type SwapAction,
} from "@/lib/chat";
import type { TokenBalance } from "@/lib/tonapi";
import { FormEvent, useEffect, useRef, useState } from "react";
import { SwapConfirmCard } from "./SwapConfirmCard";

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  swapAction?: SwapAction | null;
}

interface ChatPanelProps {
  tokens: TokenBalance[];
  walletConnected: boolean;
  balancesLoading: boolean;
}

const SUGGESTIONS = [
  "Should I swap my TON to USDT?",
  "Swap 50% of my TON to USDC",
  "What's the best move right now?",
];

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function ChatPanel({
  tokens,
  walletConnected,
  balancesLoading,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const openingSentRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  useEffect(() => {
    if (!walletConnected) {
      setMessages([]);
      setError(null);
      openingSentRef.current = false;
      return;
    }

    if (balancesLoading || tokens.length === 0 || openingSentRef.current) {
      return;
    }

    openingSentRef.current = true;

    async function sendOpeningMessage() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [],
            walletContext: tokens,
            isOpeningMessage: true,
          }),
        });

        const data = (await response.json()) as {
          message?: string;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load advisor message.");
        }

        const parsed = parseAssistantMessage(data.message ?? "");

        setMessages([
          {
            id: createId(),
            role: "assistant",
            content: parsed.displayText || (data.message ?? ""),
            swapAction: parsed.swapAction,
          },
        ]);
      } catch (err) {
        openingSentRef.current = false;
        setError(
          err instanceof Error ? err.message : "Failed to load advisor message.",
        );
      } finally {
        setLoading(false);
      }
    }

    void sendOpeningMessage();
  }, [walletConnected, balancesLoading, tokens]);

  async function sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed || loading || !walletConnected) {
      return;
    }

    const userMessage: DisplayMessage = {
      id: createId(),
      role: "user",
      content: trimmed,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    const history: ChatMessage[] = nextMessages.map(({ role, content }) => ({
      role,
      content,
    }));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          walletContext: tokens,
        }),
      });

      const data = (await response.json()) as {
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to send message.");
      }

      const parsed = parseAssistantMessage(data.message ?? "");

      setMessages([
        ...nextMessages,
        {
          id: createId(),
          role: "assistant",
          content: parsed.displayText || (data.message ?? ""),
          swapAction: parsed.swapAction,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  function handleExecuteSwap(action: SwapAction) {
    // Omniston execution wired in the next step.
    console.log("Execute swap:", action);
  }

  return (
    <div className="flex h-full min-h-[560px] flex-col rounded-xl border border-white/10 bg-white/[0.02]">
      <div className="border-b border-white/10 px-5 py-4">
        <h2 className="text-xl font-semibold text-white">AI Swap Advisor</h2>
        <p className="text-sm text-zinc-400">
          Ask for recommendations or confirm a swap in plain English.
        </p>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {!walletConnected && (
          <div className="rounded-lg border border-dashed border-white/15 p-6 text-center text-sm text-zinc-400">
            Connect your wallet to start chatting with the advisor.
          </div>
        )}

        {walletConnected && balancesLoading && messages.length === 0 && (
          <div className="space-y-3">
            <div className="h-16 animate-pulse rounded-lg bg-white/[0.04]" />
            <div className="h-10 w-2/3 animate-pulse rounded-lg bg-white/[0.04]" />
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[90%] space-y-3 ${
                message.role === "user"
                  ? "rounded-2xl rounded-br-md bg-blue-600/90 px-4 py-3 text-sm text-white"
                  : "w-full"
              }`}
            >
              {message.role === "assistant" && message.swapAction ? (
                <div className="space-y-3">
                  {message.content && (
                    <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-100">
                      {message.content}
                    </p>
                  )}
                  <SwapConfirmCard
                    action={message.swapAction}
                    onExecute={handleExecuteSwap}
                  />
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-100">
                  {message.content}
                </p>
              )}
            </div>
          </div>
        ))}

        {loading && messages.length > 0 && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-zinc-400">
              Thinking…
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}
      </div>

      <div className="border-t border-white/10 px-5 py-4">
        {walletConnected && !loading && messages.length === 0 && !balancesLoading && (
          <div className="mb-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => void sendMessage(suggestion)}
                className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={
              walletConnected
                ? "Ask about swaps, rebalancing, or market moves…"
                : "Connect wallet to chat"
            }
            disabled={!walletConnected || loading}
            className="flex-1 rounded-lg border border-white/10 bg-[#0F0F0F] px-4 py-2.5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!walletConnected || loading || !input.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
