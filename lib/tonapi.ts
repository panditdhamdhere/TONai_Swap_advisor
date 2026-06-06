import { getTokenImageUrl, getTonImageUrl, TON_MASTER_ADDRESS } from "./token-image";

const TONAPI_BASE = "https://tonapi.io/v2";

export interface TokenBalance {
  symbol: string;
  name: string;
  balance: number;
  usdValue: number;
  iconUrl: string;
  address: string;
  isNative?: boolean;
}

export interface SwapEvent {
  id: string;
  timestamp: number;
  description: string;
  value: string;
  dex?: string;
  txHash?: string;
}

interface TonAccountResponse {
  balance: number;
}

interface JettonPrice {
  prices?: {
    USD?: number;
  };
}

interface JettonBalanceItem {
  balance: string;
  jetton: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    image: string;
  };
  price?: JettonPrice;
}

interface JettonsResponse {
  balances: JettonBalanceItem[];
}

interface RatesResponse {
  rates: Record<
    string,
    {
      prices: {
        USD: number;
      };
    }
  >;
}

interface AccountEventAction {
  type: string;
  simple_preview?: {
    name?: string;
    description?: string;
    value?: string;
  };
  JettonSwap?: {
    dex?: string;
    amount_in?: string;
    amount_out?: string;
    jetton_master_in?: { symbol?: string; decimals?: number };
    jetton_master_out?: { symbol?: string; decimals?: number };
    ton_in?: number;
    ton_out?: number;
  };
  base_transactions?: string[];
}

interface AccountEvent {
  event_id: string;
  timestamp: number;
  actions: AccountEventAction[];
}

interface AccountEventsResponse {
  events: AccountEvent[];
}

function formatBalance(raw: string | number, decimals: number): number {
  const value = typeof raw === "string" ? BigInt(raw) : BigInt(raw);
  const divisor = 10 ** decimals;
  return Number(value) / divisor;
}

function formatUnits(raw: string | number | undefined, decimals: number): string {
  if (raw === undefined || raw === null) {
    return "0";
  }

  const amount = formatBalance(String(raw), decimals);
  return amount.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function parseSwapFromAction(
  action: AccountEventAction,
  event: AccountEvent,
): SwapEvent | null {
  if (action.type === "JettonSwap" && action.JettonSwap) {
    const swap = action.JettonSwap;
    const inSymbol = swap.jetton_master_in?.symbol ?? "TON";
    const outSymbol = swap.jetton_master_out?.symbol ?? "Token";
    const inDecimals = swap.jetton_master_in?.decimals ?? 9;
    const outDecimals = swap.jetton_master_out?.decimals ?? 9;

    const amountIn = swap.ton_in
      ? formatUnits(swap.ton_in, 9)
      : formatUnits(swap.amount_in, inDecimals);
    const amountOut = swap.ton_out
      ? formatUnits(swap.ton_out, 9)
      : formatUnits(swap.amount_out, outDecimals);

    return {
      id: event.event_id,
      timestamp: event.timestamp,
      description: `${amountIn} ${inSymbol} → ${amountOut} ${outSymbol}`,
      value: action.simple_preview?.value ?? `${amountIn} → ${amountOut}`,
      dex: swap.dex,
      txHash: action.base_transactions?.[0],
    };
  }

  const preview = action.simple_preview;
  if (
    preview &&
    (preview.name?.toLowerCase().includes("swap") ||
      preview.description?.toLowerCase().includes("swap"))
  ) {
    return {
      id: event.event_id,
      timestamp: event.timestamp,
      description: preview.description ?? preview.name ?? "Swap",
      value: preview.value ?? "",
      txHash: action.base_transactions?.[0],
    };
  }

  return null;
}

export async function fetchWalletTokens(
  address: string,
): Promise<TokenBalance[]> {
  const [accountRes, jettonsRes, ratesRes] = await Promise.all([
    fetch(`${TONAPI_BASE}/accounts/${address}`, { cache: "no-store" }),
    fetch(`${TONAPI_BASE}/accounts/${address}/jettons?currencies=usd`, {
      cache: "no-store",
    }),
    fetch(`${TONAPI_BASE}/rates?tokens=ton&currencies=usd`, {
      cache: "no-store",
    }),
  ]);

  if (!accountRes.ok) {
    throw new Error("Failed to fetch TON balance");
  }

  if (!jettonsRes.ok) {
    throw new Error("Failed to fetch jetton balances");
  }

  const account = (await accountRes.json()) as TonAccountResponse;
  const jettons = (await jettonsRes.json()) as JettonsResponse;

  let tonUsdPrice = 0;
  if (ratesRes.ok) {
    const rates = (await ratesRes.json()) as RatesResponse;
    tonUsdPrice = rates.rates?.TON?.prices?.USD ?? 0;
  }

  const tonBalance = formatBalance(account.balance, 9);
  const tokens: TokenBalance[] = [
    {
      symbol: "TON",
      name: "Toncoin",
      balance: tonBalance,
      usdValue: tonBalance * tonUsdPrice,
      iconUrl: getTonImageUrl(),
      address: TON_MASTER_ADDRESS,
      isNative: true,
    },
  ];

  const jettonTokens: TokenBalance[] = jettons.balances
    .map((item) => {
      const balance = formatBalance(item.balance, item.jetton.decimals);
      const usdPrice = item.price?.prices?.USD ?? 0;
      const jettonAddress = item.jetton.address;

      return {
        symbol: item.jetton.symbol,
        name: item.jetton.name,
        balance,
        usdValue: balance * usdPrice,
        iconUrl: item.jetton.image || getTokenImageUrl(jettonAddress),
        address: jettonAddress,
      };
    })
    .filter((token) => token.balance > 0)
    .sort((a, b) => b.usdValue - a.usdValue)
    .slice(0, 5);

  return [...tokens, ...jettonTokens];
}

export async function fetchRecentSwaps(address: string): Promise<SwapEvent[]> {
  const response = await fetch(
    `${TONAPI_BASE}/accounts/${address}/events?limit=50`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch transaction history");
  }

  const data = (await response.json()) as AccountEventsResponse;
  const swaps: SwapEvent[] = [];

  for (const event of data.events) {
    for (const action of event.actions) {
      const swap = parseSwapFromAction(action, event);
      if (swap) {
        swaps.push(swap);
        break;
      }
    }

    if (swaps.length >= 5) {
      break;
    }
  }

  return swaps.slice(0, 5);
}
