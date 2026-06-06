const TON_MASTER_ADDRESS =
  "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c";

export function getTokenImageUrl(address: string): string {
  const normalized = address.trim();
  return `https://cache.tonapi.io/imgproxy/${encodeURIComponent(normalized)}/rs:fill:48:48:1/g:no/a.webp`;
}

export function getTonImageUrl(): string {
  return getTokenImageUrl(TON_MASTER_ADDRESS);
}

export { TON_MASTER_ADDRESS };
