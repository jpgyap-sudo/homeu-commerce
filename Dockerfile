# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY apps/website/package.json apps/website/tsconfig.json apps/website/next.config.mjs ./website/

# Install dependencies
RUN cd website && npm install

# Copy source code
COPY apps/website/src/ ./website/src/
COPY apps/website/public/ ./website/public/

# Build the Next.js app
RUN cd website && npm run build

# Stage 2: Production runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PAYLOAD_CONFIG_PATH=./src/payload.config.ts

# Copy standalone output from build
COPY --from=builder /app/website/.next/standalone ./
COPY --from=builder /app/website/.next/static ./.next/static
COPY --from=builder /app/website/public ./public

# Copy Payload CMS packages that Next.js standalone mode excludes
# These are required at runtime for admin panel and API routes
COPY --from=builder /app/website/node_modules/payload ./node_modules/payload
COPY --from=builder /app/website/node_modules/@payloadcms ./node_modules/@payloadcms
COPY --from=builder /app/website/node_modules/postgres ./node_modules/postgres 2>/dev/null || true
COPY --from=builder /app/website/node_modules/pg ./node_modules/pg 2>/dev/null || true
COPY --from=builder /app/website/node_modules/pg-cloudflare ./node_modules/pg-cloudflare 2>/dev/null || true
COPY --from=builder /app/website/node_modules/pg-connection-string ./node_modules/pg-connection-string 2>/dev/null || true
COPY --from=builder /app/website/node_modules/pg-pool ./node_modules/pg-pool 2>/dev/null || true
COPY --from=builder /app/website/node_modules/pg-protocol ./node_modules/pg-protocol 2>/dev/null || true
COPY --from=builder /app/website/node_modules/pg-types ./node_modules/pg-types 2>/dev/null || true
COPY --from=builder /app/website/node_modules/pgpass ./node_modules/pgpass 2>/dev/null || true
COPY --from=builder /app/website/node_modules/packet-reader ./node_modules/packet-reader 2>/dev/null || true
COPY --from=builder /app/website/node_modules/drizzle-orm ./node_modules/drizzle-orm 2>/dev/null || true
COPY --from=builder /app/website/node_modules/pino ./node_modules/pino 2>/dev/null || true
COPY --from=builder /app/website/node_modules/pino-std-serializers ./node_modules/pino-std-serializers 2>/dev/null || true
COPY --from=builder /app/website/node_modules/pino-pretty ./node_modules/pino-pretty 2>/dev/null || true
COPY --from=builder /app/website/node_modules/thread-stream ./node_modules/thread-stream 2>/dev/null || true
COPY --from=builder /app/website/node_modules/sonic-boom ./node_modules/sonic-boom 2>/dev/null || true
COPY --from=builder /app/website/node_modules/atomic-sleep ./node_modules/atomic-sleep 2>/dev/null || true

EXPOSE 3000

CMD ["node", "server.js"]
