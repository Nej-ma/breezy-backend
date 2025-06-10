# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files
COPY api-gateway/package*.json ./

# Install dependencies
RUN npm install --omit=dev && npm cache clean --force

# Copy source code
COPY api-gateway/src/ ./src/

# Copy the shared folder to match VSCode structure
COPY shared /app/microservices/shared

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S gateway -u 1001

# Change ownership of the app directory
RUN chown -R gateway:nodejs /app

# Switch to non-root user
USER gateway

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "src/app.js"]