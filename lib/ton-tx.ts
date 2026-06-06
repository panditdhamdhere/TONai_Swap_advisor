import { Address, Cell, TonClient, beginCell, storeMessage } from "@ton/ton";

async function retry<T>(
  fn: () => Promise<T>,
  { retries = 5, delay = 1000 }: { retries?: number; delay?: number } = {},
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) {
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, delay));
    return retry(fn, { retries: retries - 1, delay });
  }
}

export async function getTxHashFromBoc(
  exBoc: string,
  walletAddress: string,
): Promise<string> {
  const client = new TonClient({
    endpoint: "https://toncenter.com/api/v2/jsonRPC",
  });

  const myAddress = Address.parse(walletAddress);

  return retry(
    async () => {
      const transactions = await client.getTransactions(myAddress, {
        limit: 5,
      });

      for (const tx of transactions) {
        const inMsg = tx.inMessage;
        if (inMsg?.info.type !== "external-in") {
          continue;
        }

        const inBody = inMsg.body;
        if (typeof inBody === "undefined") {
          continue;
        }

        const extHash = Cell.fromBase64(exBoc).hash().toString("hex");
        const inHash = beginCell()
          .store(storeMessage(inMsg))
          .endCell()
          .hash()
          .toString("hex");

        if (extHash === inHash) {
          return tx.hash().toString("hex");
        }
      }

      throw new Error("Transaction not found");
    },
    { retries: 30, delay: 1000 },
  );
}
