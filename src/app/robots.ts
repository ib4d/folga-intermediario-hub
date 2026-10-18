import type { MetadataRoute } from "next";
import { PUBLIC_SITE_URL } from "@/lib/public-seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/demo", "/pricing", "/security", "/resources"],
      disallow: ["/api/", "/login", "/onboarding", "/invitations/", "/design-preview", "/legal-preview", "/oauth/", "/privacy/", "/terms/", "/registro/"],
    },
    sitemap: new URL("/sitemap.xml", PUBLIC_SITE_URL).toString(),
  };
}
