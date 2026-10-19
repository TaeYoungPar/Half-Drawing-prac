// Public publisher ID supplied by the site owner for AdSense verification.
const SITE_ADSENSE_CLIENT = "ca-pub-6008052842325785";

export function adsPublisherId(): string | null {
  const client = (process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? SITE_ADSENSE_CLIENT).trim();
  return client && /^ca-pub-\d{16}$/.test(client) ? client : null;
}
