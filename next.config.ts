import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
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