#!/bin/bash

# RTRW Billing System - aaPanel Deployment Script
# Author: dzawin98@gmail.com
# Version: 1.0

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="ltsbillaapanel"
PROJECT_DIR="/www/wwwroot/$PROJECT_NAME"
GIT_REPO="https://github.com/dzawin98/ltsbillaapanel.git"
NODE_VERSION="18"
DB_NAME="rtrw_db_production"

# Functions
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_warning "Running as root. This is recommended for aaPanel deployment."
    else
        print_warning "Not running as root. Some operations might require sudo."
    fi
}

check_aapanel() {
    if [ ! -d "/www/server" ]; then
        print_error "aaPanel not detected. Please install aaPanel first."
        exit 1
    fi
    print_success "aaPanel detected"
}

check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js not found. Please install Node.js $NODE_VERSION+ through aaPanel App Store."
        exit 1
    fi
    
    NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VER" -lt "$NODE_VERSION" ]; then
        print_error "Node.js version $NODE_VER is too old. Please install Node.js $NODE_VERSION+"
        exit 1
    fi
    
    print_success "Node.js $(node -v) detected"
}

check_mysql() {
    if ! command -v mysql &> /dev/null; then
        print_error "MySQL not found. Please install MySQL through aaPanel."
        exit 1
    fi
    print_success "MySQL detected"
}

install_pm2() {
    if ! command -v pm2 &> /dev/null; then
        print_status "Installing PM2..."
        npm install -g pm2
        print_success "PM2 installed"
    else
        print_success "PM2 already installed"
    fi
}

clone_repository() {
    print_status "Cloning repository..."
    
    if [ -d "$PROJECT_DIR" ]; then
        print_warning "Project directory exists. Backing up..."
        mv "$PROJECT_DIR" "${PROJECT_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
    fi
    
    cd /www/wwwroot/
    git clone "$GIT_REPO" "$PROJECT_NAME"
    cd "$PROJECT_DIR"
    
    # Set proper permissions
    chown -R www:www "$PROJECT_DIR"
    chmod -R 755 "$PROJECT_DIR"
    
    print_success "Repository cloned successfully"
}

setup_environment() {
    print_status "Setting up environment..."
    
    # Create logs directory
    mkdir -p logs
    
    # Copy environment file if not exists
    if [ ! -f "backend/.env.production" ]; then
        cp "backend/.env.production" "backend/.env.production.example" 2>/dev/null || true
        
        # Create basic .env.production
        cat > "backend/.env.production" << EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=$DB_NAME
DB_USER=your_db_user
DB_PASS=your_db_password

# Application Configuration
NODE_ENV=production
PORT=3001
FRONTEND_URL=http://localhost

# MikroTik Configuration
MIKROTIK_HOST=192.168.1.1
MIKROTIK_USERNAME=admin
MIKROTIK_PASSWORD=your_password

# Timezone
TZ=Asia/Jakarta
EOF
        
        print_warning "Please edit backend/.env.production with your actual configuration"
    fi
    
    print_success "Environment setup completed"
}

install_dependencies() {
    print_status "Installing dependencies..."
    
    # Install frontend dependencies
    print_status "Installing frontend dependencies..."
    npm install
    
    # Install backend dependencies
    print_status "Installing backend dependencies..."
    cd backend
    npm install
    cd ..
    
    # Install global dependencies
    npm install -g sequelize-cli
    
    print_success "Dependencies installed successfully"
}

build_application() {
    print_status "Building application..."
    
    # Build frontend
    print_status "Building frontend..."
    npm run build
    
    # Build backend
    print_status "Building backend..."
    cd backend
    npm run build
    cd ..
    
    print_success "Application built successfully"
}

setup_database() {
    print_status "Setting up database..."
    
    # Check if database exists
    if mysql -e "USE $DB_NAME" 2>/dev/null; then
        print_warning "Database $DB_NAME already exists"
        read -p "Do you want to run migrations? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cd backend
            npx sequelize-cli db:migrate
            cd ..
            print_success "Database migrations completed"
        fi
    else
        print_error "Database $DB_NAME not found. Please create it manually in aaPanel."
        print_status "Steps to create database:"
        echo "1. Login to aaPanel"
        echo "2. Go to Database -> MySQL"
        echo "3. Create database: $DB_NAME"
        echo "4. Create user with full access to the database"
        echo "5. Update backend/.env.production with database credentials"
        echo "6. Run this script again"
        exit 1
    fi
}

setup_nginx() {
    print_status "Setting up Nginx configuration..."
    
    # Backup existing nginx config if exists
    NGINX_CONFIG="/www/server/panel/vhost/nginx/${PROJECT_NAME}.conf"
    
    if [ -f "$NGINX_CONFIG" ]; then
        cp "$NGINX_CONFIG" "${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    # Copy nginx configuration
    cp nginx.conf "$NGINX_CONFIG"
    
    # Update paths in nginx config
    sed -i "s|/www/wwwroot/ltsbillaapanel|$PROJECT_DIR|g" "$NGINX_CONFIG"
    
    # Test nginx configuration
    if nginx -t; then
        systemctl reload nginx
        print_success "Nginx configuration updated and reloaded"
    else
        print_error "Nginx configuration test failed"
        exit 1
    fi
}

start_application() {
    print_status "Starting application..."
    
    # Stop existing PM2 processes
    pm2 delete rtrw-backend 2>/dev/null || true
    
    # Start application with PM2
    pm2 start ecosystem.config.js
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 startup
    pm2 startup
    
    print_success "Application started successfully"
}

verify_deployment() {
    print_status "Verifying deployment..."
    
    sleep 5
    
    # Check PM2 status
    if pm2 list | grep -q "rtrw-backend.*online"; then
        print_success "Backend is running"
    else
        print_error "Backend is not running"
        pm2 logs rtrw-backend --lines 10
        exit 1
    fi
    
    # Check health endpoint
    if curl -f http://localhost:3001/api/health &>/dev/null; then
        print_success "Health endpoint is responding"
    else
        print_error "Health endpoint is not responding"
        exit 1
    fi
    
    # Check frontend
    if curl -f http://localhost &>/dev/null; then
        print_success "Frontend is accessible"
    else
        print_warning "Frontend might not be accessible. Check Nginx configuration."
    fi
    
    print_success "Deployment verification completed"
}

show_summary() {
    echo
    echo "======================================"
    echo "  DEPLOYMENT COMPLETED SUCCESSFULLY"
    echo "======================================"
    echo
    echo "Application Details:"
    echo "- Project Directory: $PROJECT_DIR"
    echo "- Frontend URL: http://$(hostname -I | awk '{print $1}')"
    echo "- Backend API: http://$(hostname -I | awk '{print $1}'):3001"
    echo "- Health Check: http://$(hostname -I | awk '{print $1}'):3001/api/health"
    echo
    echo "Useful Commands:"
    echo "- Check status: pm2 status"
    echo "- View logs: pm2 logs rtrw-backend"
    echo "- Restart app: pm2 restart rtrw-backend"
    echo "- Monitor: cd $PROJECT_DIR && bash monitor.sh"
    echo "- Backup: cd $PROJECT_DIR && bash backup.sh"
    echo
    echo "Next Steps:"
    echo "1. Update backend/.env.production with your actual configuration"
    echo "2. Setup port forwarding on your MikroTik router"
    echo "3. Configure firewall rules in aaPanel"
    echo "4. Setup SSL certificate if using domain"
    echo "5. Setup automated backups and monitoring"
    echo
    echo "For support: dzawin98@gmail.com"
    echo "Documentation: $PROJECT_DIR/TUTORIAL_AAPANEL.md"
    echo
}

# Main execution
main() {
    echo "======================================"
    echo "  RTRW Billing System - aaPanel Deploy"
    echo "======================================"
    echo
    
    check_root
    check_aapanel
    check_node
    check_mysql
    install_pm2
    clone_repository
    setup_environment
    install_dependencies
    build_application
    setup_database
    setup_nginx
    start_application
    verify_deployment
    show_summary
}

# Run main function
main "$@"