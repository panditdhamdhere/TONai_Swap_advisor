import type { TokenBalance } from "./tonapi";

export function toBaseUnits(amount: string, decimals = 9): string {
  const value = parseFloat(amount);
  if (!Number.isFinite(value) || value <= 0) {
    return "0";
  }

  return Math.floor(value * 10 ** decimals).toString();
}

export function fromBaseUnits(baseUnits: string, decimals = 9): number {
  return Number(baseUnits) / 10 ** decimals;
}

export function resolveSwapAmount(
  amount: string,
  fromSymbol: string,
  tokens: TokenBalance[],
): string {
  const trimmed = amount.trim();

  if (trimmed.endsWith("%")) {
    const percentage = parseFloat(trimmed.replace("%", ""));
    const token = tokens.find(
      (item) => item.symbol.toUpperCase() === fromSymbol.toUpperCase(),
    );

    if (!token || !Number.isFinite(percentage)) {
      throw new Error(`Unable to resolve ${amount} of ${fromSymbol}.`);
    }

    return ((token.balance * percentage) / 100).toString();
  }

  return trimmed;
}

export function formatTokenAmount(value: number, maxDecimals = 4): string {
  if (value >= 1) {
    return value.toLocaleString(undefined, { maximumFractionDigits: maxDecimals });
  }

  return value.toLocaleString(undefined, {
    minimumSignificantDigits: 2,
    maximumSignificantDigits: maxDecimals,
  });
}
