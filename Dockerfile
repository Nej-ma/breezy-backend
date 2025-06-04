# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory in container
WORKDIR /app

# Install nodemon globally for development
RUN npm install -g nodemon

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm install

# Create uploads directory for file storage
RUN mkdir -p uploads

# Expose port
EXPOSE 3001

# Start application with nodemon for hot reload
CMD ["npm", "run", "dev"]
