import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
