import { isIP } from "node:net";
import { NextResponse, type NextRequest } from "next/server";
import { isPublicRoute } from "@/lib/public-routes";
import { LIMITS, checkRateLimit, type RateLimitConfig } from "@/lib/security/rate-limit";
import { isSupportedLanguage, normalizeLanguage } from "@/lib/i18n";
import { logger } from "@/lib/logger";

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
    pathPrefix: "/onboarding",
    methods: ["POST"],
    config: { windowMs: 15 * 60 * 1000, max: 10 },
  },
  {
    pathPrefix: "/invitations/accept",
    methods: ["GET", "POST"],
    config: { windowMs: 15 * 60 * 1000, max: 30 },
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
    // The deployment proxy appends the peer address to X-Forwarded-For.
    // The first value can be supplied by the client and must not drive limits.
    const addresses = forwardedFor.split(",").map((address) => address.trim()).filter(Boolean);
    const trustedPeerAddress = addresses.at(-1);
    if (trustedPeerAddress && isIP(trustedPeerAddress)) return trustedPeerAddress;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  return realIp && isIP(realIp) ? realIp : null;
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

function buildRateLimitUnavailableResponse(request: NextRequest) {
  const headers = { "Cache-Control": "no-store", "Retry-After": "30" };
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503, headers });
  }

  return new NextResponse("Service temporarily unavailable", { status: 503, headers });
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const rateLimitRule = getMatchingRateLimitRule(request);

  if (pathname === "/uploads" || pathname.startsWith("/uploads/")) {
    return new NextResponse(null, {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  if (rateLimitRule) {
    const clientIdentifier = getClientIdentifier(request);
    if (!clientIdentifier) {
      logger.error("Shared rate limiter cannot identify the client", {
        reason: "CLIENT_IP_UNAVAILABLE",
      });
      return buildRateLimitUnavailableResponse(request);
    }

    const identifier = [
      clientIdentifier,
      rateLimitRule.pathPrefix,
      request.method.toUpperCase(),
    ].join("\0");
    let rateLimitResult: Awaited<ReturnType<typeof checkRateLimit>>;
    try {
      rateLimitResult = await checkRateLimit(identifier, rateLimitRule.config);
    } catch (error) {
      logger.error("Shared rate limiter unavailable", {
        reason: error instanceof Error && error.message === "RATE_LIMIT_HASH_SECRET_MISSING"
          ? "MISSING_HASH_SECRET"
          : "COUNTER_STORE_UNAVAILABLE",
      });
      return buildRateLimitUnavailableResponse(request);
    }

    if (rateLimitResult.blocked) {
      return buildRateLimitResponse(request, rateLimitRule.config, rateLimitResult.resetAt);
    }
  }

  if (
    (process.env.NODE_ENV === "development" && pathname === "/design-preview") ||
    isPublicRoute(pathname) ||
    hasAuthSessionCookie(request)
  ) {
    const requestedLanguage = request.nextUrl.searchParams.get("lang");
    const savedLanguage = request.cookies.get("ori-language")?.value;
    const language = isSupportedLanguage(requestedLanguage)
      ? requestedLanguage
      : normalizeLanguage(savedLanguage);
    const forwardedHeaders = new Headers(request.headers);
    forwardedHeaders.set("x-ori-language", language);
    return NextResponse.next({ request: { headers: forwardedHeaders } });
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { success: false, error: "Autenticacion requerida" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
