export interface StonFiAsset {
  contract_address: string;
  symbol: string;
  display_name: string;
  decimals: number;
  kind: string;
  default_symbol: boolean;
  blacklisted: boolean;
  popularity_index: number;
}

let assetsCache: StonFiAsset[] | null = null;

export async function fetchStonFiAssets(): Promise<StonFiAsset[]> {
  if (assetsCache) {
    return assetsCache;
  }

  const response = await fetch("https://api.ston.fi/v1/assets", {
    cache: "force-cache",
  });

  if (!response.ok) {
    throw new Error("Failed to load STON.fi token list.");
  }

  const data = (await response.json()) as StonFiAsset[];
  assetsCache = data;
  return data;
}

const SYMBOL_ALIASES: Record<string, string[]> = {
  TON: ["TON"],
  USDT: ["USD₮", "USDT", "JUSDT"],
  USDC: ["USDC", "JUSDC"],
};

function normalizeSymbol(symbol: string): string {
  return symbol.toUpperCase().replace("USD₮", "USDT");
}

export function findAssetBySymbol(
  assets: StonFiAsset[],
  symbol: string,
): StonFiAsset | undefined {
  const normalized = normalizeSymbol(symbol);
  const aliases = SYMBOL_ALIASES[normalized] ?? [symbol, normalized];

  const matches = assets.filter((asset) => {
    if (asset.blacklisted) {
      return false;
    }

    return aliases.some(
      (alias) =>
        asset.symbol.toUpperCase() === alias.toUpperCase() ||
        asset.symbol === alias,
    );
  });

  if (matches.length === 0) {
    return undefined;
  }

  return matches.sort((a, b) => {
    if (a.default_symbol !== b.default_symbol) {
      return a.default_symbol ? -1 : 1;
    }

    return (b.popularity_index ?? 0) - (a.popularity_index ?? 0);
  })[0];
}
