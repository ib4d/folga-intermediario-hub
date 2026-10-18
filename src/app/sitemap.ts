import type { MetadataRoute } from "next";
import { PUBLIC_SITE_URL } from "@/lib/public-seo";

const publicPages = [
  { path: "/", priority: 1, changeFrequency: "weekly" as const },
  { path: "/demo", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/pricing", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/security", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/resources", priority: 0.7, changeFrequency: "monthly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const languages = ["es", "en", "pl"] as const;
  return publicPages.flatMap((page) => languages.map((language) => ({
    url: new URL(`${page.path}?lang=${language}`, PUBLIC_SITE_URL).toString(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
    alternates: {
      languages: Object.fromEntries(languages.map((alternate) => [alternate, new URL(`${page.path}?lang=${alternate}`, PUBLIC_SITE_URL).toString()])),
    },
  })));
}
