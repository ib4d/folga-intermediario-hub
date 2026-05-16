import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const distDir = process.env.NEXT_DIST_DIR || (isDev ? ".next-dev" : ".next-prod");

const nextConfig: NextConfig = {
  distDir,
  output: "standalone",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  turbopack: {},
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  serverExternalPackages: [
    "@azure/ai-form-recognizer",
    "canvas",
    "tesseract.js",
    "pdfjs-dist",
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        canvas: "commonjs canvas",
        "pdfjs-dist/legacy/build/pdf.js":
          "commonjs pdfjs-dist/legacy/build/pdf.js",
      });
    }
    return config;
  },
};

export default nextConfig;
