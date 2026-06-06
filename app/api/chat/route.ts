import {
  formatWalletContext,
  SYSTEM_PROMPT,
  type ChatMessage,
} from "@/lib/chat";
import type { TokenBalance } from "@/lib/tonapi";
import { NextResponse } from "next/server";

interface ChatRequestBody {
  messages: ChatMessage[];
  walletContext?: TokenBalance[];
  isOpeningMessage?: boolean;
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Anthropic API key is not configured." },
      { status: 500 },
    );
  }

  let body: ChatRequestBody;

  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { messages, walletContext = [], isOpeningMessage = false } = body;

  const anthropicMessages: Array<{ role: "user" | "assistant"; content: string }> =
    [];

  if (isOpeningMessage) {
    anthropicMessages.push({
      role: "user",
      content: `The user just connected their TON wallet. Here are their current balances:\n\n${formatWalletContext(walletContext)}\n\nGive a concise opening message that references their holdings (e.g. "I can see you hold X TON and Y USDT...") and one actionable recommendation. Do not include a swap JSON block yet unless you are very confident they should act immediately.`,
    });
  } else {
    for (const message of messages) {
      anthropicMessages.push({
        role: message.role,
        content: message.content,
      });
    }
  }

  const systemWithContext = walletContext.length
    ? `${SYSTEM_PROMPT}\n\nCurrent wallet balances:\n${formatWalletContext(walletContext)}`
    : SYSTEM_PROMPT;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemWithContext,
        messages: anthropicMessages,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Anthropic API error:", errorBody);
      return NextResponse.json(
        { error: "Failed to get AI response." },
        { status: response.status },
      );
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text?: string }>;
    };

    const text =
      data.content.find((block) => block.type === "text")?.text?.trim() ?? "";

    return NextResponse.json({ message: text });
  } catch (error) {
    console.error("Chat route error:", error);
    return NextResponse.json(
      { error: "Unexpected error while contacting AI." },
      { status: 500 },
    );
  }
}
