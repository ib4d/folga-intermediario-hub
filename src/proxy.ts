import { NextResponse, type NextRequest } from "next/server";
import { isPublicRoute } from "@/lib/public-routes";
import { LIMITS, checkRateLimit, type RateLimitConfig } from "@/lib/security/rate-limit";

type ProxyRateLimitRule = {
  pathPrefix: string;
  methods: string[];
  config: RateLimitConfig;
};

const PROXY_RATE_LIMIT_RULES: ProxyRateLimitRule[] = [
  {
    pathPrefix: "/api/auth",
    methods: ["POST"],
    config: LIMITS.AUTH_ATTEMPTS,
  },
  {
    pathPrefix: "/registro",
    methods: ["POST"],
    config: { windowMs: 15 * 60 * 1000, max: 10 },
  },
  {
    pathPrefix: "/api/health",
    methods: ["GET"],
    config: { windowMs: 60 * 1000, max: 60 },
  },
  {
    pathPrefix: "/api/providers/status",
    methods: ["GET"],
    config: { windowMs: 60 * 1000, max: 60 },
  },
  {
    pathPrefix: "/api/v2/events",
    methods: ["POST"],
    config: { windowMs: 60 * 1000, max: 30 },
  },
];

function hasAuthSessionCookie(request: NextRequest) {
  return request.cookies.get("authjs.session-token") ||
    request.cookies.get("__Secure-authjs.session-token") ||
    request.cookies.get("next-auth.session-token") ||
    request.cookies.get("__Secure-next-auth.session-token");
}

function getClientIdentifier(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function getMatchingRateLimitRule(request: NextRequest) {
  const method = request.method.toUpperCase();
  const pathname = request.nextUrl.pathname;

  return PROXY_RATE_LIMIT_RULES.find(
    (rule) => pathname.startsWith(rule.pathPrefix) && rule.methods.includes(method)
  );
}

function buildRateLimitResponse(request: NextRequest, config: RateLimitConfig, resetAt: number) {
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  const headers = {
    "Retry-After": String(retryAfterSeconds),
    "X-RateLimit-Limit": String(config.max),
    "X-RateLimit-Remaining": "0",
    "X-RateLimit-Reset": new Date(resetAt).toISOString(),
  };

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      {
        error: "Rate limit excedido",
        retryAfterSeconds,
      },
      {
        status: 429,
        headers,
      }
    );
  }

  return new NextResponse("Too Many Requests", {
    status: 429,
    headers,
  });
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const rateLimitRule = getMatchingRateLimitRule(request);

  if (rateLimitRule) {
    const identifier = `${getClientIdentifier(request)}:${pathname}:${request.method.toUpperCase()}`;
    const rateLimitResult = checkRateLimit(identifier, rateLimitRule.config);

    if (rateLimitResult.blocked) {
      return buildRateLimitResponse(request, rateLimitRule.config, rateLimitResult.resetAt);
    }
  }

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
