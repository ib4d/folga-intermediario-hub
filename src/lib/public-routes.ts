const PUBLIC_ROUTE_PREFIXES = [
  "/login",
  "/onboarding",
  "/invitations/accept",
  "/demo",
  "/security",
  "/pricing",
  "/resources",
  "/marketing",
  "/registro",
  "/api/auth",
  "/api/health",
  "/api/providers",
  "/api/billing/stripe",
  "/api/v1",
  "/api/v2/events",
  "/api/cron",
] as const;

const PUBLIC_EXACT_ROUTES = new Set([
  "/",
  "/oauth/google-drive-backups",
  "/privacy/google-drive-backups",
  "/terms/google-drive-backups",
  "/manifest.json",
  "/sw.js",
  "/offline.html",
  "/icon-192.png",
  "/icon-512.png",
  "/ori-cruit-hub-logo.png",
  "/ori-cruit-hub-mark.png",
  "/ori-cruit-hub-logo-black.png",
  "/ori-cruit-hub-mark-black.png",
  "/ori-cruit-hub-logo-green.png",
  "/ori-cruit-hub-mark-green.png",
  "/ori-cruit-hub-logo-green-dark.png",
  "/ori-cruit-hub-mark-green-dark.png",
  "/file.svg",
  "/globe.svg",
  "/next.svg",
  "/vercel.svg",
  "/window.svg",
  "/robots.txt",
  "/sitemap.xml",
]);

export function isPublicRoute(pathname: string) {
  if (pathname === "/uploads" || pathname.startsWith("/uploads/")) return false;
  if (PUBLIC_EXACT_ROUTES.has(pathname)) return true;
  if (PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  return false;
}
