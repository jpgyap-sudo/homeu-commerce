# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy only the website package.json (no monorepo deps needed)
COPY apps/website/package.json ./website/

# Force Linux platform to avoid Windows SWC package resolution
RUN cd website && \
    npm config set platform linux && \
    npm config set arch x64 && \
    npm install --no-audit --no-fund

# Accept NEXT_PUBLIC_SITE_URL at build time
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

# Copy source
COPY apps/website/next.config.mjs apps/website/tsconfig.json ./website/
COPY apps/website/src/ ./website/src/
COPY apps/website/public/ ./website/public/

# Build
RUN cd website && npx next build

# Stage 2: Production
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/website/.next/standalone ./
COPY --from=builder /app/website/.next/static ./.next/static
COPY --from=builder /app/website/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
