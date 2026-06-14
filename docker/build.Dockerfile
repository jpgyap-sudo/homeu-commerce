# HomeU Commerce — Separate Build Container
# 
# Purpose:
#   Isolates the build process from the running services.
#   Faster rebuilds because dependencies are pre-installed.
#   Does not slow down the production site during builds.
#
# Usage:
#   docker build -f docker/build.Dockerfile -t homeu-build .
#   docker run --rm -v .:/workspace homeu-build
#
# Or via docker compose:
#   docker compose --profile build up builder

FROM node:20-alpine AS base
WORKDIR /workspace
RUN npm install -g npm@latest

# Pre-install dependencies layer (cached unless package.json changes)
FROM base AS deps
COPY apps/website/package.json apps/website/tsconfig.json apps/website/next.config.mjs ./website/
RUN cd website && npm ci --only=production && npm ci --only=development

# Build layer
FROM deps AS builder
COPY apps/website/src/ ./website/src/
COPY apps/website/public/ ./website/public/
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN cd website && npm run build

# Export the .next and node_modules for the production image
FROM scratch AS export
COPY --from=builder /workspace/website/.next/standalone /
COPY --from=builder /workspace/website/.next/static /.next/static
COPY --from=builder /workspace/website/public /public
COPY --from=builder /workspace/website/node_modules/payload /node_modules/payload
COPY --from=builder /workspace/website/node_modules/@payloadcms /node_modules/@payloadcms
