# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY apps/website/package.json apps/website/package-lock.json* ./website/
RUN cd website && npm install

# Accept NEXT_PUBLIC_SITE_URL at build time
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

# Copy source
COPY apps/website/next.config.mjs apps/website/tsconfig.json ./website/
COPY apps/website/src/ ./website/src/
COPY apps/website/public/ ./website/public/

# Build
RUN cd website && npm run build

# Stage 2: Production
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/website/.next/standalone ./
COPY --from=builder /app/website/.next/static ./.next/static
COPY --from=builder /app/website/public ./public
COPY --from=builder /app/website/node_modules ./node_modules

EXPOSE 3000
CMD ["node", "server.js"]
