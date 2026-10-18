export type AdPlacement = "completed" | "library";

export function adsPublisherId(): string | null {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim();
  return client && /^ca-pub-\d{16}$/.test(client) ? client : null;
}

export function adSettings(placement: AdPlacement) {
  const client = adsPublisherId();
  const slot = (placement === "completed"
    ? process.env.NEXT_PUBLIC_ADSENSE_COMPLETED_SLOT
    : process.env.NEXT_PUBLIC_ADSENSE_LIBRARY_SLOT)?.trim();
  if (process.env.NEXT_PUBLIC_ADSENSE_ENABLED !== "true" || !client || !slot || !/^\d{10}$/.test(slot)) return null;
  return { client, slot, testMode: process.env.NEXT_PUBLIC_ADSENSE_TEST_MODE !== "false" };
}
