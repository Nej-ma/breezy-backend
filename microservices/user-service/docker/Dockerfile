# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory in container
WORKDIR /app

# Install curl for health checks and nodemon globally for development
RUN apk add --no-cache curl && npm install -g nodemon

# Copy package.json and package-lock.json
COPY user-service/package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY user-service/src/ ./src/



# Create uploads directory for file storage
RUN mkdir -p uploads

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001

# Change ownership of the app directory
RUN chown -R nodeuser:nodejs /app
USER nodeuser

# Expose port
EXPOSE 3002

# Start application
CMD ["npm", "run", "dev"]