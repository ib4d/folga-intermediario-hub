# Use Node.js 22 because pdfjs-dist requires Node >=22.13.
FROM node:22-bookworm-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
  && rm -rf /var/lib/apt/lists/*

# Install dependencies only when needed
FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    pkg-config \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Environment variables must be provided at build time if needed by Next.js
# For standalone output, they are mostly needed at runtime.
ENV NEXT_TELEMETRY_DISABLED 1

RUN npx prisma generate
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV HOME /tmp
ENV NPM_CONFIG_CACHE /tmp/.npm

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.bin ./node_modules/.bin
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/scripts/check-production-env.mjs ./scripts/check-production-env.mjs
COPY --from=builder --chown=nextjs:nodejs /app/scripts/check-permissions.mjs ./scripts/check-permissions.mjs
COPY --from=builder --chown=nextjs:nodejs /app/scripts/check-production-smoke.mjs ./scripts/check-production-smoke.mjs
COPY --from=builder --chown=nextjs:nodejs /app/scripts/check-smtp.mjs ./scripts/check-smtp.mjs
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/permissions.ts ./src/lib/permissions.ts

# Set the correct permission for production prerender/cache output.
RUN mkdir .next-prod
RUN chown nextjs:nodejs .next-prod

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next-prod/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next-prod/static ./.next-prod/static

RUN mkdir -p public/uploads
RUN chown -R nextjs:nodejs public

USER nextjs

EXPOSE 3000

ENV PORT 3000
# set hostname to localhost
ENV HOSTNAME "0.0.0.0"

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "server.js"]
