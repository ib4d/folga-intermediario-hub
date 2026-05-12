import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTE_PREFIXES = [
  "/login",
  "/registro",
  "/api/auth",
  "/api/health",
  "/api/v1",
  "/api/v2/events",
  "/api/cron",
];

const PUBLIC_EXACT_ROUTES = new Set(["/", "/manifest.json", "/sw.js"]);

function isPublicRoute(pathname: string) {
  if (PUBLIC_EXACT_ROUTES.has(pathname)) return true;
  if (PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  return /\.[^/]+$/.test(pathname);
}

function hasAuthSessionCookie(request: NextRequest) {
  return request.cookies.get("authjs.session-token") ||
    request.cookies.get("__Secure-authjs.session-token") ||
    request.cookies.get("next-auth.session-token") ||
    request.cookies.get("__Secure-next-auth.session-token");
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPublicRoute(pathname) || hasAuthSessionCookie(request)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
