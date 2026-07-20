import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/**": [
      "./node_modules/styled-jsx/**",
      "./node_modules/@swc/helpers/**",
      "./node_modules/@next/**",
      "./node_modules/caniuse-lite/**",
      "./node_modules/postcss/**",
    ],
  },
};

export default nextConfig;
