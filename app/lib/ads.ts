// Public publisher ID supplied by the site owner for AdSense verification.
const SITE_ADSENSE_CLIENT = "ca-pub-6008052842325785";
const SITE_PUBLIC_BANNER_SLOT = "9331445471";

export function adsPublisherId(): string | null {
  const client = (process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? SITE_ADSENSE_CLIENT).trim();
  return client && /^ca-pub-\d{16}$/.test(client) ? client : null;
}

export function publicBannerConfig(): { client: string; slot: string } | null {
  if (process.env.VERCEL_ENV !== "production" || process.env.NEXT_PUBLIC_ADSENSE_PUBLIC_BANNER_ENABLED === "false") return null;
  const client = adsPublisherId();
  const slot = (process.env.NEXT_PUBLIC_ADSENSE_PUBLIC_BANNER_SLOT ?? SITE_PUBLIC_BANNER_SLOT).trim();
  return client && /^\d{10}$/.test(slot) ? { client, slot } : null;
}
