"use client";

import {
  parseAssistantMessage,
  type ChatMessage,
  type SwapAction,
} from "@/lib/chat";
import type { TokenBalance } from "@/lib/tonapi";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { SwapConfirmCard } from "./SwapConfirmCard";
import { TypingIndicator } from "./TypingIndicator";

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

  const reportSwapFailure = useCallback((message: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: createId(),
        role: "assistant",
        content: `Swap failed: ${message}`,
      },
    ]);
  }, []);

  return (
    <div className="flex h-full min-h-[480px] flex-col rounded-xl border border-border bg-card lg:min-h-[calc(100vh-5rem)]">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-success" />
          <h2 className="text-lg font-semibold text-foreground">AI Swap Advisor</h2>
        </div>
        <p className="mt-1 text-sm text-muted">
          Ask for recommendations or confirm a swap in plain English.
        </p>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5"
      >
        {walletConnected && balancesLoading && messages.length === 0 && (
          <div className="space-y-3">
            <div className="skeleton h-16 rounded-xl border border-border bg-background" />
            <div className="skeleton h-10 w-2/3 rounded-xl border border-border bg-background" />
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.role === "user" ? (
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-4 py-3 text-sm leading-6 text-white">
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            ) : (
              <div className="w-full max-w-[95%] space-y-3">
                {message.content && (
                  <div className="rounded-2xl rounded-bl-sm border border-border bg-background px-4 py-3">
                    <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                      {message.content}
                    </p>
                  </div>
                )}
                {message.swapAction && (
                  <SwapConfirmCard
                    action={message.swapAction}
                    tokens={tokens}
                    onFailure={reportSwapFailure}
                  />
                )}
              </div>
            )}
          </div>
        ))}

        {loading && messages.length > 0 && <TypingIndicator />}

        {loading && messages.length === 0 && walletConnected && !balancesLoading && (
          <TypingIndicator />
        )}

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}
      </div>

      <div className="border-t border-border px-4 py-4 sm:px-5">
        {walletConnected && !loading && messages.length === 0 && !balancesLoading && (
          <div className="mb-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => void sendMessage(suggestion)}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground transition-colors hover:border-accent/40 hover:text-accent"
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
            placeholder="Ask about swaps, rebalancing, or market moves…"
            disabled={!walletConnected || loading}
            className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!walletConnected || loading || !input.trim()}
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
