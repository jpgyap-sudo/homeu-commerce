FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm ci --only=production

# Copy app source
COPY src/ ./src/
COPY database/ ./database/

# Non-root user
RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 4010

CMD ["node", "src/server.js"]
