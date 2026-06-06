import type { TokenBalance } from "./tonapi";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SwapAction {
  action: "swap";
  fromToken: string;
  toToken: string;
  amount: string;
}

export interface ParsedAssistantMessage {
  displayText: string;
  swapAction: SwapAction | null;
}

function tryParseSwapAction(raw: string): SwapAction | null {
  try {
    const normalized = raw
      .trim()
      .replace(/'/g, '"')
      .replace(/,\s*}/g, "}");

    const parsed = JSON.parse(normalized) as Partial<SwapAction>;

    if (
      parsed.action === "swap" &&
      typeof parsed.fromToken === "string" &&
      typeof parsed.toToken === "string" &&
      typeof parsed.amount === "string"
    ) {
      return {
        action: "swap",
        fromToken: parsed.fromToken,
        toToken: parsed.toToken,
        amount: parsed.amount,
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function parseAssistantMessage(content: string): ParsedAssistantMessage {
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch) {
    const swapAction = tryParseSwapAction(codeBlockMatch[1]);
    if (swapAction) {
      return {
        displayText: content.replace(codeBlockMatch[0], "").trim(),
        swapAction,
      };
    }
  }

  const jsonMatch = content.match(
    /\{[\s\S]*?["']action["']\s*:\s*["']swap["'][\s\S]*?\}/i,
  );
  if (jsonMatch) {
    const swapAction = tryParseSwapAction(jsonMatch[0]);
    if (swapAction) {
      return {
        displayText: content.replace(jsonMatch[0], "").trim(),
        swapAction,
      };
    }
  }

  return { displayText: content, swapAction: null };
}

export function formatWalletContext(tokens: TokenBalance[]): string {
  if (tokens.length === 0) {
    return "No token balances available.";
  }

  return tokens
    .map(
      (token) =>
        `- ${token.symbol}: ${token.balance.toFixed(4)} (~$${token.usdValue.toFixed(2)} USD)`,
    )
    .join("\n");
}

export const SYSTEM_PROMPT = `You are a DeFi advisor for the TON blockchain. You have access to the user's wallet balances. Give concise, actionable swap recommendations. When the user confirms a swap, respond with a JSON block like:
{ 'action': 'swap', 'fromToken': 'TON', 'toToken': 'USDT', 'amount': '10' }
so the app can parse and execute it.`;
