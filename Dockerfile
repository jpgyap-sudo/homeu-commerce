# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy all local packages and website source
COPY packages/ ./packages/
COPY apps/website/package.json apps/website/tsconfig.json apps/website/next.config.mjs ./website/
RUN cd website && npm install && \
    echo "Replacing broken npm symlinks with direct copies for file: dependencies..." && \
    rm -rf node_modules/@davincios && \
    mkdir -p node_modules/@davincios && \
    cp -r ../packages/davincios node_modules/@davincios/cms && \
    cp -r ../packages/next node_modules/@davincios/next && \
    cp -r ../packages/db-postgres node_modules/@davincios/db-postgres && \
    cp -r ../packages/richtext-lexical node_modules/@davincios/richtext-lexical && \
    echo "  Copied @davincios/cms" && \
    echo "  Copied @davincios/next" && \
    echo "  Copied @davincios/db-postgres" && \
    echo "  Copied @davincios/richtext-lexical"
COPY apps/website/src/ ./website/src/
COPY apps/website/public/ ./website/public/
RUN cd website && npm run build

# Stage 2: Production
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DAVINCIOS_CONFIG_PATH=./src/daVinciOS.config.ts

COPY --from=builder /app/website/.next/standalone ./
COPY --from=builder /app/website/.next/static ./.next/static
COPY --from=builder /app/website/public ./public

# Copy DaVinciOS config file and source so it's findable at runtime
COPY --from=builder /app/website/src ./src

# Copy ALL node_modules from builder — ensures all transitive dependencies
# (e.g. @next/env, drizzle-orm, pino, pg, etc.) are available at runtime.
# Selective copies caused ERR_MODULE_NOT_FOUND for packages like @next/env/dist/index.js
# which the DaVinciOS runtime loader requires.
COPY --from=builder /app/website/node_modules ./node_modules

EXPOSE 3000

CMD ["node", "server.js"]
