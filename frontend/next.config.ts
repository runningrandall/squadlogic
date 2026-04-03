import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/**": [
      "./node_modules/styled-jsx/**",
      "./node_modules/@swc/helpers/**",
    ],
  },
};

export default nextConfig;
