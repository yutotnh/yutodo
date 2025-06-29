# ======================================
# Multi-stage Dockerfile for YuToDo Server
# Supports multi-platform builds: linux/amd64, linux/arm64, linux/arm/v7
# ======================================

# =====================================
# Build Stage
# =====================================
FROM node:20-alpine AS builder

# Build arguments for multi-platform support
ARG TARGETPLATFORM
ARG BUILDPLATFORM
ARG TARGETARCH
ARG TARGETVARIANT

# Display build information
RUN echo "Building on: $BUILDPLATFORM, targeting: $TARGETPLATFORM ($TARGETARCH$TARGETVARIANT)"

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package.json package-lock.json ./

# Install dependencies including devDependencies for building
# Use npm ci for faster, reliable, reproducible builds
RUN npm ci --prefer-offline --no-audit

# Copy source code
COPY . .

# Debug and build TypeScript
RUN echo "=== TypeScript Debug Info ===" && \
    pwd && \
    ls -la && \
    npm list typescript || true && \
    npx tsc --version && \
    cat tsconfig.json && \
    echo "=== TypeScript source files ===" && \
    find . -name "*.ts" -not -path "./node_modules/*" | head -10 && \
    echo "=== Building TypeScript with npm ===" && \
    npm run build

# Verify build output exists
RUN echo "=== Build Output ===" && \
    ls -la dist/ && \
    echo "Build completed successfully"

# Clean up unnecessary files for smaller image (keep src for runtime)
RUN rm -rf node_modules/

# =====================================
# Production Stage  
# =====================================
FROM node:20-alpine AS production

# Build arguments for CI/CD integration and multi-platform support
ARG BUILD_DATE
ARG VCS_REF  
ARG VERSION
ARG GITHUB_REPOSITORY
ARG TARGETPLATFORM
ARG BUILDPLATFORM
ARG TARGETARCH
ARG TARGETVARIANT

# Add comprehensive labels for better image management
LABEL maintainer="YuToDo"
LABEL description="YuToDo Server - Todo list management with real-time sync"
LABEL version=${VERSION:-"1.0.0"}

# OpenContainer Initiative (OCI) labels
LABEL org.opencontainers.image.title="YuToDo Server"
LABEL org.opencontainers.image.description="Todo list management server with real-time synchronization"
LABEL org.opencontainers.image.url="https://github.com/${GITHUB_REPOSITORY:-yutodo/yutodo}"
LABEL org.opencontainers.image.source="https://github.com/${GITHUB_REPOSITORY:-yutodo/yutodo}"
LABEL org.opencontainers.image.version=${VERSION:-"1.0.0"}
LABEL org.opencontainers.image.created=${BUILD_DATE}
LABEL org.opencontainers.image.revision=${VCS_REF}
LABEL org.opencontainers.image.vendor="YuToDo"
LABEL org.opencontainers.image.licenses="ISC"
LABEL org.opencontainers.image.authors="YuToDo Team"

# Multi-platform labels
LABEL org.opencontainers.image.platform=${TARGETPLATFORM}
LABEL yutodo.build.platform=${BUILDPLATFORM}
LABEL yutodo.target.arch=${TARGETARCH}
LABEL yutodo.target.variant=${TARGETVARIANT}

# Install dumb-init for proper signal handling and platform-specific optimizations
RUN apk add --no-cache dumb-init && \
    echo "Target platform: ${TARGETPLATFORM:-unknown}" && \
    echo "Target architecture: ${TARGETARCH:-unknown}"

# Create non-root user for security
RUN addgroup -g 1001 -S yutodo && \
    adduser -S yutodo -u 1001 -G yutodo

# Set working directory
WORKDIR /app

# Create necessary directories with proper permissions
RUN mkdir -p /data /config /logs && \
    chown -R yutodo:yutodo /app /data /config /logs

# Copy package files
COPY --from=builder --chown=yutodo:yutodo /app/package.json /app/package-lock.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=yutodo:yutodo /app/dist ./dist

# Switch to non-root user
USER yutodo

# Expose server port
EXPOSE 3001

# Environment variables with defaults
ENV NODE_ENV=production
ENV YUTODO_SERVER_HOST=0.0.0.0
ENV YUTODO_SERVER_PORT=3001
ENV YUTODO_DB_PATH=/data/todos.db
ENV YUTODO_CONFIG_DIR=/config
ENV YUTODO_LOG_LEVEL=info

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "const http = require('http'); \
                 const options = { \
                   host: process.env.YUTODO_SERVER_HOST || '0.0.0.0', \
                   port: process.env.YUTODO_SERVER_PORT || 3001, \
                   timeout: 2000 \
                 }; \
                 const request = http.request(options, (res) => { \
                   console.log('Health check status:', res.statusCode); \
                   process.exit(res.statusCode === 200 ? 0 : 1); \
                 }); \
                 request.on('error', () => process.exit(1)); \
                 request.end();"

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the server
CMD ["node", "dist/server.js"]