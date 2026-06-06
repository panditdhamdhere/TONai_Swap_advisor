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

function buildPromptMessages(
  messages: ChatMessage[],
  walletContext: TokenBalance[],
  isOpeningMessage: boolean,
): ChatMessage[] {
  if (isOpeningMessage) {
    return [
      {
        role: "user",
        content: `The user just connected their TON wallet. Here are their current balances:\n\n${formatWalletContext(walletContext)}\n\nGive a concise opening message that references their holdings (e.g. "I can see you hold X TON and Y USDT...") and one actionable recommendation. Do not include a swap JSON block yet unless you are very confident they should act immediately.`,
      },
    ];
  }

  return messages;
}

function buildSystemPrompt(walletContext: TokenBalance[]): string {
  return walletContext.length
    ? `${SYSTEM_PROMPT}\n\nCurrent wallet balances:\n${formatWalletContext(walletContext)}`
    : SYSTEM_PROMPT;
}

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  messages: ChatMessage[],
): Promise<string> {
  const contents = messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: 1024 },
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Gemini API error:", errorBody);
    throw new Error("Failed to get AI response from Gemini.");
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ??
    "Sorry, I could not generate a response."
  );
}

async function callAnthropic(
  apiKey: string,
  systemPrompt: string,
  messages: ChatMessage[],
): Promise<string> {
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
      system: systemPrompt,
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Anthropic API error:", errorBody);
    throw new Error("Failed to get AI response from Anthropic.");
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text?: string }>;
  };

  return (
    data.content.find((block) => block.type === "text")?.text?.trim() ??
    "Sorry, I could not generate a response."
  );
}

export async function POST(request: Request) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!geminiKey && !anthropicKey) {
    return NextResponse.json(
      {
        error:
          "No AI API key configured. Add GEMINI_API_KEY (free) or ANTHROPIC_API_KEY in Vercel → Settings → Environment Variables, then redeploy.",
      },
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
  const promptMessages = buildPromptMessages(
    messages,
    walletContext,
    isOpeningMessage,
  );
  const systemPrompt = buildSystemPrompt(walletContext);

  try {
    const text = geminiKey
      ? await callGemini(geminiKey, systemPrompt, promptMessages)
      : await callAnthropic(anthropicKey!, systemPrompt, promptMessages);

    return NextResponse.json({ message: text });
  } catch (error) {
    console.error("Chat route error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unexpected error while contacting AI.",
      },
      { status: 500 },
    );
  }
}
