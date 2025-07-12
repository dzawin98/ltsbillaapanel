#!/bin/bash

# RTRW Billing System - aaPanel Deployment Script
# Author: Assistant
# Description: Script untuk deploy aplikasi RTRW di aaPanel

echo "🚀 Starting RTRW Billing System Deployment..."

# Set variables
APP_DIR="/www/wwwroot/ltsbillaapanel"
LOG_DIR="$APP_DIR/logs"
BACKEND_DIR="$APP_DIR/backend"

# Create logs directory
echo "📁 Creating logs directory..."
mkdir -p $LOG_DIR

# Install frontend dependencies and build
echo "📦 Installing frontend dependencies..."
npm install

echo "🔨 Building frontend..."
npm run build

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd $BACKEND_DIR
npm install

# Build backend TypeScript
echo "🔨 Building backend..."
npm run build

# Copy environment files
echo "📋 Setting up environment files..."
cp ../.env.production .env

# Run database migrations
echo "🗄️ Running database migrations..."
npx sequelize-cli db:migrate --env production

# Go back to root directory
cd $APP_DIR

# Start application with PM2
echo "🚀 Starting application with PM2..."
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save
pm2 startup

echo "✅ Deployment completed successfully!"
echo "📊 Application Status:"
pm2 status

echo ""
echo "🌐 Access your application at: http://your-server-ip"
echo "🔧 Backend API available at: http://your-server-ip/api"
echo ""
echo "📝 Next steps:"
echo "1. Configure your database credentials in backend/.env"
echo "2. Update MikroTik settings in backend/.env"
echo "3. Configure Nginx with the provided nginx.conf"
echo "4. Set up SSL certificate if needed"
echo ""
echo "📋 Useful commands:"
echo "- Check application status: pm2 status"
echo "- View logs: pm2 logs rtrw-backend"
echo "- Restart application: pm2 restart rtrw-backend"
echo "- Stop application: pm2 stop rtrw-backend"