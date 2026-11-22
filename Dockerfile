# syntax=docker/dockerfile:1
# TalentAI Enterprise Production Multi-Stage Dockerfile
# Base Image: Debian Bookworm Slim with Node.js 24 LTS
FROM node:24-bookworm-slim AS base
WORKDIR /app

# Step 1: Install production dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=optional

# Step 2: Build Next.js 15 Standalone application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# Step 3: Production Runner Minimal Container
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root dedicated application group & user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 nextjs

# Create public assets directory if not present
RUN mkdir -p public

# Copy standalone build output & static assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Set ownership and drop root privileges
USER nextjs

EXPOSE 3000

# Health check probe against internal liveness endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health/live', (res) => { if (res.statusCode !== 200) process.exit(1); })"

CMD ["node", "server.js"]
