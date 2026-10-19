import type { MetadataRoute } from "next";
import { examples, siteUrl } from "./lib/public-content";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/guide", "/examples", ...examples.map(example => `/examples/${example.slug}`), "/about", "/privacy"].map(path => ({ url: new URL(path, siteUrl).href }));
}
