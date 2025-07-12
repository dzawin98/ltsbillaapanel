# Multi-stage build for RTRW Billing System

# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app

# Copy frontend package files
COPY package*.json ./
RUN npm ci --only=production

# Copy frontend source
COPY . .

# Build frontend
RUN npm run build

# Stage 2: Build backend
FROM node:18-alpine AS backend-builder
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy backend source
COPY backend/ .

# Build backend
RUN npm run build

# Stage 3: Production image
FROM node:18-alpine AS production

# Install PM2 globally
RUN npm install -g pm2

# Create app directory
WORKDIR /app

# Copy built frontend
COPY --from=frontend-builder /app/dist ./dist

# Copy built backend
COPY --from=backend-builder /app/dist ./backend/dist
COPY --from=backend-builder /app/node_modules ./backend/node_modules
COPY --from=backend-builder /app/package.json ./backend/package.json

# Copy backend config and migrations
COPY backend/config ./backend/config
COPY backend/migrations ./backend/migrations
COPY backend/models ./backend/models
COPY backend/utils ./backend/utils

# Copy PM2 ecosystem file
COPY ecosystem.config.js .

# Create logs directory
RUN mkdir -p logs

# Set timezone
ENV TZ=Asia/Jakarta

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Start application
CMD ["pm2-runtime", "start", "ecosystem.config.js", "--env", "production"]