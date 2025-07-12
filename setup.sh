#!/bin/bash

# RTRW Billing System - Initial Setup Script
# Author: Assistant
# Description: Script untuk setup awal aplikasi

echo "🚀 RTRW Billing System - Initial Setup"
echo "====================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "⚠️  Please don't run this script as root"
    exit 1
fi

# Check Node.js version
echo "🔍 Checking Node.js version..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
        echo "✅ Node.js version: $(node --version)"
    else
        echo "❌ Node.js version 18+ required. Current: $(node --version)"
        echo "Please install Node.js 18+ and try again."
        exit 1
    fi
else
    echo "❌ Node.js not found. Please install Node.js 18+ first."
    exit 1
fi

# Check npm
echo "🔍 Checking npm..."
if command -v npm &> /dev/null; then
    echo "✅ npm version: $(npm --version)"
else
    echo "❌ npm not found. Please install npm first."
    exit 1
fi

# Check MySQL
echo "🔍 Checking MySQL..."
if command -v mysql &> /dev/null; then
    echo "✅ MySQL found: $(mysql --version)"
else
    echo "❌ MySQL not found. Please install MySQL/MariaDB first."
    exit 1
fi

# Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
npm install
if [ $? -eq 0 ]; then
    echo "✅ Frontend dependencies installed successfully"
else
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi

# Install backend dependencies
echo ""
echo "📦 Installing backend dependencies..."
cd backend
npm install
if [ $? -eq 0 ]; then
    echo "✅ Backend dependencies installed successfully"
else
    echo "❌ Failed to install backend dependencies"
    exit 1
fi

# Install global dependencies
echo ""
echo "📦 Installing global dependencies..."
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

if ! command -v sequelize-cli &> /dev/null; then
    echo "Installing Sequelize CLI..."
    npm install -g sequelize-cli
fi

# Create logs directory
echo ""
echo "📁 Creating directories..."
mkdir -p ../logs
echo "✅ Logs directory created"

# Setup environment files
echo ""
echo "⚙️ Setting up environment files..."
cd ..

if [ ! -f ".env.production" ]; then
    echo "Creating .env.production..."
    cp .env.production.example .env.production 2>/dev/null || echo "Please create .env.production manually"
fi

if [ ! -f "backend/.env.production" ]; then
    echo "Creating backend/.env.production..."
    cp backend/.env.production.example backend/.env.production 2>/dev/null || echo "Please create backend/.env.production manually"
fi

# Database setup prompt
echo ""
echo "🗄️ Database Setup"
echo "================="
read -p "Do you want to create the database now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Creating database..."
    read -p "Enter MySQL root password: " -s MYSQL_PASSWORD
    echo
    
    mysql -u root -p$MYSQL_PASSWORD < database-setup.sql
    if [ $? -eq 0 ]; then
        echo "✅ Database created successfully"
        
        # Run migrations
        echo "Running database migrations..."
        cd backend
        npx sequelize-cli db:migrate --env production
        if [ $? -eq 0 ]; then
            echo "✅ Database migrations completed"
        else
            echo "❌ Database migrations failed"
        fi
        cd ..
    else
        echo "❌ Database creation failed"
    fi
else
    echo "⏭️ Skipping database setup"
fi

# Build applications
echo ""
echo "🔨 Building applications..."
echo "Building frontend..."
npm run build
if [ $? -eq 0 ]; then
    echo "✅ Frontend build completed"
else
    echo "❌ Frontend build failed"
fi

echo "Building backend..."
cd backend
npm run build
if [ $? -eq 0 ]; then
    echo "✅ Backend build completed"
else
    echo "❌ Backend build failed"
fi
cd ..

# Make scripts executable
echo ""
echo "🔧 Setting up scripts..."
chmod +x deploy.sh
chmod +x backup.sh
chmod +x monitor.sh
echo "✅ Scripts are now executable"

# Final instructions
echo ""
echo "🎉 Setup completed successfully!"
echo "=============================="
echo ""
echo "📝 Next steps:"
echo "1. Configure your environment files:"
echo "   - Edit .env.production"
echo "   - Edit backend/.env.production"
echo "   - Edit backend/config/config.json"
echo ""
echo "2. Configure your MikroTik settings in backend/.env.production"
echo ""
echo "3. For development:"
echo "   npm run dev (frontend)"
echo "   cd backend && npm run dev (backend)"
echo ""
echo "4. For production deployment:"
echo "   ./deploy.sh"
echo ""
echo "5. Monitor your application:"
echo "   ./monitor.sh"
echo ""
echo "6. Backup your data:"
echo "   ./backup.sh"
echo ""
echo "📚 Read DEPLOYMENT_GUIDE.md for detailed deployment instructions"
echo ""
echo "🌐 Default URLs:"
echo "   Frontend: http://localhost:8080"
echo "   Backend API: http://localhost:3001/api"
echo ""
echo "Happy coding! 🚀"