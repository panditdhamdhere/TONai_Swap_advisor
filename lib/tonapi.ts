const TONAPI_BASE = "https://tonapi.io/v2";

export interface TokenBalance {
  symbol: string;
  name: string;
  balance: number;
  usdValue: number;
  iconUrl: string;
  isNative?: boolean;
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

function formatBalance(raw: string | number, decimals: number): number {
  const value = typeof raw === "string" ? BigInt(raw) : BigInt(raw);
  const divisor = 10 ** decimals;
  return Number(value) / divisor;
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
      iconUrl: "https://ton.org/download/ton_symbol.png",
      isNative: true,
    },
  ];

  const jettonTokens: TokenBalance[] = jettons.balances
    .map((item) => {
      const balance = formatBalance(item.balance, item.jetton.decimals);
      const usdPrice = item.price?.prices?.USD ?? 0;

      return {
        symbol: item.jetton.symbol,
        name: item.jetton.name,
        balance,
        usdValue: balance * usdPrice,
        iconUrl: item.jetton.image,
      };
    })
    .filter((token) => token.balance > 0)
    .sort((a, b) => b.usdValue - a.usdValue)
    .slice(0, 5);

  return [...tokens, ...jettonTokens];
}
