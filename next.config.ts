import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: "/:path*",
      // Same-origin analytics requests should not carry invite URLs as Referer.
      headers: [{ key: "Referrer-Policy", value: "strict-origin" }],
    },
    {
      source: "/:path*",
      has: [{ type: "host", value: ".+\\.vercel\\.app" }],
      // Keep old anonymous sessions/drafts accessible without indexing aliases.
      // Crawling stays allowed in robots.txt so search engines can see noindex.
      headers: [{ key: "X-Robots-Tag", value: "noindex" }],
    },
  ],
  images: {
    // Match the home illustration at 1x/1.75x/2x without jumping to 640px.
    imageSizes: [32, 48, 64, 96, 128, 243, 256, 384, 450, 486],
  },
  experimental: {
    // Ship the small Tailwind stylesheet with HTML to avoid a blocking request.
    inlineCss: true,
  },
};

export default nextConfig;
