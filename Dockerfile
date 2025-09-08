# Build stage
FROM node:20-slim AS builder

# Set working directory
WORKDIR /app

# Install OS deps for sharp/canvas (already included in node:20-slim base but ensure build tools)
RUN apt-get update && apt-get install -y \
  python3 \
  make \
  g++ \
  libc6-dev \
  libvips \
  && rm -rf /var/lib/apt/lists/*

# Enable corepack and use pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Copy only package manifest first for better caching
COPY package.json pnpm-lock.yaml* .npmrc* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the app
RUN pnpm run build

# Production image
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Enable corepack + pnpm for runtime scripts if needed
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Copy only necessary files from builder
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Next.js needs to run in standalone mode for minimal runtime deps
# If standalone build is configured, include the standalone server
# But we didn't set output=standalone; next start works with node_modules present

# Cloud Run listens on $PORT
ENV PORT=8080
EXPOSE 8080

# Start Next.js
CMD ["pnpm", "start", "-p", "8080"]
