# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY apps/website/package.json apps/website/tsconfig.json apps/website/next.config.mjs ./website/
RUN cd website && npm install
COPY apps/website/src/ ./website/src/
COPY apps/website/public/ ./website/public/
RUN cd website && npm run build

# Stage 2: Production
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PAYLOAD_CONFIG_PATH=./src/payload.config.ts

COPY --from=builder /app/website/.next/standalone ./
COPY --from=builder /app/website/.next/static ./.next/static
COPY --from=builder /app/website/public ./public

# Copy Payload config file and source so it's findable at runtime
COPY --from=builder /app/website/src ./src

# Copy Payload dependencies
COPY --from=builder /app/website/node_modules/payload ./node_modules/payload
COPY --from=builder /app/website/node_modules/@payloadcms ./node_modules/@payloadcms
COPY --from=builder /app/website/node_modules/pg ./node_modules/pg
COPY --from=builder /app/website/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=builder /app/website/node_modules/pino ./node_modules/pino

EXPOSE 3000

CMD ["node", "server.js"]
