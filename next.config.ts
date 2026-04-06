import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    qualities: [75],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "gvjwxccwuyuhgexypgbn.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/slides/**",
        search: "",
      },
    ],
  },
};

export default nextConfig;
