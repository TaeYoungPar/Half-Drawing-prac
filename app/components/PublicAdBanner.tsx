import { publicBannerConfig } from "../lib/ads";
import { PublicAdSlot } from "./PublicAdSlot";

export function PublicAdBanner() {
  const config = publicBannerConfig();
  return config ? <PublicAdSlot {...config} /> : null;
}
