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

# Copy standalone output from build
COPY --from=builder /app/website/.next/standalone ./
COPY --from=builder /app/website/.next/static ./.next/static
COPY --from=builder /app/website/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
