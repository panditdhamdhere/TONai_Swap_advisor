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

const GEMINI_MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
] as const;

const OPENROUTER_FREE_MODELS = [
  "google/gemma-2-9b-it:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "qwen/qwen-2-7b-instruct:free",
] as const;

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

async function callOpenRouter(
  apiKey: string,
  systemPrompt: string,
  messages: ChatMessage[],
): Promise<string> {
  const configuredModel = process.env.OPENROUTER_MODEL?.trim();
  const models = configuredModel
    ? [configuredModel, ...OPENROUTER_FREE_MODELS.filter((m) => m !== configuredModel)]
    : [...OPENROUTER_FREE_MODELS];

  const siteUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://ton-ai-swap-advisor.vercel.app";

  for (const model of models) {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": siteUrl,
          "X-Title": "TON AI Swap Advisor",
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.map((message) => ({
              role: message.role,
              content: message.content,
            })),
          ],
        }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`OpenRouter API error (${model}):`, errorBody);
      continue;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const text = data.choices?.[0]?.message?.content?.trim();
    if (text) {
      return text;
    }
  }

  throw new Error(
    "OpenRouter API failed. Check OPENROUTER_API_KEY at openrouter.ai/keys and optionally set OPENROUTER_MODEL to a free model like google/gemma-2-9b-it:free",
  );
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

  for (const model of GEMINI_MODELS) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
      console.error(`Gemini API error (${model}):`, errorBody);
      continue;
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (text) {
      return text;
    }
  }

  throw new Error(
    "Gemini API failed. Check GEMINI_API_KEY at aistudio.google.com/apikey",
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
    throw new Error("Anthropic API failed (invalid key or no credits).");
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
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();

  if (!openRouterKey && !geminiKey && !anthropicKey) {
    return NextResponse.json(
      {
        error:
          "No AI API key configured. Add OPENROUTER_API_KEY (free) in Vercel → Settings → Environment Variables, then redeploy.",
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

  const providers: Array<{
    name: string;
    run: () => Promise<string>;
  }> = [];

  if (openRouterKey) {
    providers.push({
      name: "OpenRouter",
      run: () => callOpenRouter(openRouterKey, systemPrompt, promptMessages),
    });
  }

  if (geminiKey) {
    providers.push({
      name: "Gemini",
      run: () => callGemini(geminiKey, systemPrompt, promptMessages),
    });
  }

  if (anthropicKey) {
    providers.push({
      name: "Anthropic",
      run: () => callAnthropic(anthropicKey, systemPrompt, promptMessages),
    });
  }

  const errors: string[] = [];

  for (const provider of providers) {
    try {
      const text = await provider.run();
      return NextResponse.json({ message: text });
    } catch (error) {
      errors.push(
        error instanceof Error ? error.message : `${provider.name} failed`,
      );
    }
  }

  return NextResponse.json({ error: errors.join(" | ") }, { status: 500 });
}
