import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Default bottom-left position overlaps the sidebar's footer (nome/papel
  // + sign-out button) — see components/app-sidebar.tsx.
  devIndicators: {
    position: "bottom-right",
  },
};

export default nextConfig;
