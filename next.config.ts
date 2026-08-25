import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // GitHub Pages serves directory routes with a trailing slash. Keep every
  // generated link aligned with the public URL, canonical tags and sitemap.
  trailingSlash: true,
};

export default nextConfig;
