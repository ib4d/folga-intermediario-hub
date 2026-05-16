const PUBLIC_ROUTE_PREFIXES = [
  "/login",
  "/registro",
  "/api/auth",
  "/api/health",
  "/api/v1",
  "/api/v2/events",
  "/api/cron",
] as const;

const PUBLIC_EXACT_ROUTES = new Set(["/", "/manifest.json", "/sw.js"]);

export function isPublicRoute(pathname: string) {
  if (PUBLIC_EXACT_ROUTES.has(pathname)) return true;
  if (PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  return /\.[^/]+$/.test(pathname);
}
