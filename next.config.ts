import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  devIndicators: false,
  async redirects() {
    return [
      // Old name of the Model Generator tool (it was SQL-only)
      { source: "/sql-to-model", destination: "/model-generator", permanent: true },
    ];
  },
};

export default nextConfig;
