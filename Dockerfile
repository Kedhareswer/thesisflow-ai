# Build stage
FROM node:20-slim AS builder

# Set working directory
WORKDIR /app

# Install OS deps required at build time (e.g., sharp/canvas)
RUN apt-get update && apt-get install -y \
  python3 \
  make \
  g++ \
  libc6-dev \
  libvips \
  && rm -rf /var/lib/apt/lists/*

# Enable corepack and use pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Note: Avoid global installs of pm2/concurrently/patch-package to reduce image size and surface area.
# If patching is required during build, prefer adding patch-package to devDependencies or running via npx in scripts.

# Copy only package manifest first for better caching
COPY package.json pnpm-lock.yaml* .npmrc* ./

# Install dependencies (handle missing lockfile gracefully)
RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm install --frozen-lockfile || pnpm install; \
    else \
      pnpm install; \
    fi

# Copy the rest of the application code
COPY . .

# Build the app
RUN pnpm run build

# Production image
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user and group
RUN groupadd -g 1001 nodejs \
    && useradd -m -r -u 1001 -g nodejs nextjs

# No global pm2/concurrently/patch-package in runtime stage; start.sh manages processes with node/npm.

# Enable corepack + pnpm for runtime scripts
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Copy manifest and lockfile, then install production-only deps
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml* ./
RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm install --prod --frozen-lockfile || pnpm install --prod; \
    else \
      pnpm install --prod; \
    fi

# Copy built artifacts
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/server ./server

# Create optimized startup script with proper signal handling
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
# Function to handle signals and cleanup processes\n\
cleanup() {\n\
  echo "Received signal, shutting down..."\n\
  kill -TERM $NEXTJS_PID $WS_PID $PROXY_PID 2>/dev/null || true\n\
  wait $NEXTJS_PID $WS_PID $PROXY_PID 2>/dev/null || true\n\
  exit 0\n\
}\n\
\n\
# Set up signal handlers\n\
trap cleanup SIGTERM SIGINT\n\
\n\
# Start Next.js server\n\
echo "Starting Next.js server..."\n\
PORT=$NEXTJS_PORT npm start &\n\
NEXTJS_PID=$!\n\
\n\
# Start WebSocket server\n\
echo "Starting WebSocket server..."\n\
node server/websocket-server.js &\n\
WS_PID=$!\n\
\n\
# Wait for services to be ready\n\
echo "Waiting for services to initialize..."\n\
sleep 8\n\
\n\
# Start proxy server\n\
echo "Starting proxy server..."\n\
node server/proxy-server.js &\n\
PROXY_PID=$!\n\
\n\
# Wait for all processes\n\
wait $NEXTJS_PID $WS_PID $PROXY_PID\n\
' > start.sh && chmod +x start.sh

# Ensure application files are owned by the non-root user
RUN chown -R nextjs:nodejs /app

# Cloud Run listens on $PORT (proxy will handle routing)
ENV PORT=8080
ENV NEXTJS_PORT=3000
ENV WS_PORT=3001
EXPOSE 8080

# Start all services through the startup script
USER nextjs
CMD ["./start.sh"]
