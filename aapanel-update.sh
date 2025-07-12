#!/bin/bash

# RTRW Billing System - aaPanel Update Script
# Author: dzawin98@gmail.com
# Version: 1.0

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="ltsbillaapanel"
PROJECT_DIR="/www/wwwroot/$PROJECT_NAME"
GIT_REPO="https://github.com/dzawin98/ltsbillaapanel.git"
BRANCH="master"
APP_NAME="rtrw-backend"
BACKUP_DIR="/www/backup/rtrw-billing/updates"
MAINTENANCE_FILE="$PROJECT_DIR/maintenance.html"
ALERT_EMAIL="dzawin98@gmail.com"
AUTO_BACKUP=true
AUTO_MIGRATE=true
AUTO_RESTART=true
FORCE_UPDATE=false

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

print_critical() {
    echo -e "${RED}[CRITICAL]${NC} $1"
}

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$PROJECT_DIR/logs/update.log"
}

check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if running as root or with proper permissions
    if [[ $EUID -ne 0 ]] && ! sudo -n true 2>/dev/null; then
        print_error "This script requires root privileges or sudo access"
        exit 1
    fi
    
    # Check if project directory exists
    if [ ! -d "$PROJECT_DIR" ]; then
        print_error "Project directory not found: $PROJECT_DIR"
        exit 1
    fi
    
    # Check if git is available
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed"
        exit 1
    fi
    
    # Check if PM2 is available
    if ! command -v pm2 &> /dev/null; then
        print_error "PM2 is not installed"
        exit 1
    fi
    
    # Check if Node.js is available
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    # Check if npm is available
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

check_git_status() {
    print_status "Checking git repository status..."
    
    cd "$PROJECT_DIR"
    
    # Check if directory is a git repository
    if [ ! -d ".git" ]; then
        print_error "Project directory is not a git repository"
        exit 1
    fi
    
    # Check current branch
    CURRENT_BRANCH=$(git branch --show-current)
    print_status "Current branch: $CURRENT_BRANCH"
    
    # Check for uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        print_warning "Uncommitted changes detected:"
        git status --short
        
        if [ "$FORCE_UPDATE" != true ]; then
            print_error "Please commit or stash changes before updating"
            print_status "Use --force to override this check"
            exit 1
        else
            print_warning "Force update enabled, stashing changes..."
            git stash push -m "Auto-stash before update $(date)"
        fi
    fi
    
    # Fetch latest changes
    print_status "Fetching latest changes..."
    git fetch origin
    
    # Check if updates are available
    LOCAL_COMMIT=$(git rev-parse HEAD)
    REMOTE_COMMIT=$(git rev-parse "origin/$BRANCH")
    
    if [ "$LOCAL_COMMIT" = "$REMOTE_COMMIT" ]; then
        print_success "Application is already up to date"
        if [ "$FORCE_UPDATE" != true ]; then
            exit 0
        else
            print_warning "Force update enabled, continuing anyway..."
        fi
    else
        print_status "Updates available"
        print_status "Local commit: $LOCAL_COMMIT"
        print_status "Remote commit: $REMOTE_COMMIT"
        
        # Show what will be updated
        echo "\nChanges to be applied:"
        git log --oneline "$LOCAL_COMMIT..$REMOTE_COMMIT"
    fi
}

create_maintenance_page() {
    print_status "Creating maintenance page..."
    
    cat > "$MAINTENANCE_FILE" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Maintenance - RTRW Billing System</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            color: white;
        }
        .container {
            text-align: center;
            background: rgba(255, 255, 255, 0.1);
            padding: 3rem;
            border-radius: 20px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
            border: 1px solid rgba(255, 255, 255, 0.18);
            max-width: 500px;
        }
        .icon {
            font-size: 4rem;
            margin-bottom: 1rem;
        }
        h1 {
            margin: 0 0 1rem 0;
            font-size: 2.5rem;
            font-weight: 300;
        }
        p {
            font-size: 1.2rem;
            margin-bottom: 2rem;
            opacity: 0.9;
        }
        .spinner {
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top: 3px solid white;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .time {
            margin-top: 1rem;
            font-size: 0.9rem;
            opacity: 0.7;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">🔧</div>
        <h1>System Maintenance</h1>
        <p>RTRW Billing System is currently being updated.<br>We'll be back shortly!</p>
        <div class="spinner"></div>
        <div class="time">Started: <span id="startTime"></span></div>
    </div>
    
    <script>
        document.getElementById('startTime').textContent = new Date().toLocaleString();
        
        // Auto refresh every 30 seconds
        setTimeout(function() {
            window.location.reload();
        }, 30000);
    </script>
</body>
</html>
EOF
    
    print_success "Maintenance page created"
}

enable_maintenance_mode() {
    print_status "Enabling maintenance mode..."
    
    # Create maintenance page
    create_maintenance_page
    
    # Update Nginx configuration to show maintenance page
    local nginx_config="/www/server/panel/vhost/nginx/${PROJECT_NAME}.conf"
    
    if [ -f "$nginx_config" ]; then
        # Backup current config
        cp "$nginx_config" "${nginx_config}.backup.$(date +%Y%m%d_%H%M%S)"
        
        # Add maintenance mode to config
        sed -i '/location \/ {/i\    # Maintenance mode\n    if (-f $document_root/maintenance.html) {\n        return 503;\n    }\n' "$nginx_config"
        sed -i '/error_page   500 502 503 504/a\    error_page 503 /maintenance.html;' "$nginx_config"
        
        # Reload Nginx
        nginx -t && systemctl reload nginx
        
        print_success "Maintenance mode enabled"
    else
        print_warning "Nginx configuration not found, skipping maintenance mode"
    fi
}

disable_maintenance_mode() {
    print_status "Disabling maintenance mode..."
    
    # Remove maintenance page
    rm -f "$MAINTENANCE_FILE"
    
    # Restore Nginx configuration
    local nginx_config="/www/server/panel/vhost/nginx/${PROJECT_NAME}.conf"
    local backup_config=$(ls "${nginx_config}.backup."* 2>/dev/null | tail -1)
    
    if [ -f "$backup_config" ]; then
        cp "$backup_config" "$nginx_config"
        nginx -t && systemctl reload nginx
        print_success "Maintenance mode disabled"
    else
        print_warning "Nginx backup not found, manually remove maintenance configuration"
    fi
}

create_backup() {
    if [ "$AUTO_BACKUP" != true ]; then
        return 0
    fi
    
    print_status "Creating backup before update..."
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/pre_update_${timestamp}.tar.gz"
    
    # Create backup excluding unnecessary files
    tar -czf "$backup_file" \
        -C "$(dirname $PROJECT_DIR)" \
        --exclude="$PROJECT_NAME/node_modules" \
        --exclude="$PROJECT_NAME/backend/node_modules" \
        --exclude="$PROJECT_NAME/logs" \
        --exclude="$PROJECT_NAME/.git" \
        "$PROJECT_NAME"
    
    if [ $? -eq 0 ]; then
        local size=$(du -h "$backup_file" | cut -f1)
        print_success "Backup created: $backup_file ($size)"
        log_message "Pre-update backup created: $backup_file ($size)"
        
        # Store backup path for potential rollback
        echo "$backup_file" > "$PROJECT_DIR/.last_backup"
    else
        print_error "Backup creation failed"
        exit 1
    fi
}

stop_application() {
    print_status "Stopping application..."
    
    # Stop PM2 process
    if pm2 list | grep -q "$APP_NAME"; then
        pm2 stop "$APP_NAME"
        print_success "Application stopped"
    else
        print_warning "Application not running in PM2"
    fi
}

update_code() {
    print_status "Updating application code..."
    
    cd "$PROJECT_DIR"
    
    # Pull latest changes
    git pull origin "$BRANCH"
    
    if [ $? -eq 0 ]; then
        print_success "Code updated successfully"
        log_message "Code updated from $LOCAL_COMMIT to $(git rev-parse HEAD)"
    else
        print_error "Code update failed"
        exit 1
    fi
}

update_dependencies() {
    print_status "Updating dependencies..."
    
    cd "$PROJECT_DIR"
    
    # Check if package.json changed
    if git diff --name-only HEAD~1 HEAD | grep -q "package.json\|package-lock.json"; then
        print_status "Package files changed, updating dependencies..."
        
        # Update frontend dependencies
        print_status "Updating frontend dependencies..."
        npm ci
        
        # Update backend dependencies
        print_status "Updating backend dependencies..."
        cd backend
        npm ci
        cd ..
        
        print_success "Dependencies updated"
    else
        print_status "No dependency changes detected"
    fi
}

run_migrations() {
    if [ "$AUTO_MIGRATE" != true ]; then
        return 0
    fi
    
    print_status "Running database migrations..."
    
    cd "$PROJECT_DIR/backend"
    
    # Check if there are new migrations
    if git diff --name-only HEAD~1 HEAD | grep -q "migrations/"; then
        print_status "New migrations detected, running..."
        
        npx sequelize-cli db:migrate
        
        if [ $? -eq 0 ]; then
            print_success "Database migrations completed"
            log_message "Database migrations completed"
        else
            print_error "Database migrations failed"
            exit 1
        fi
    else
        print_status "No new migrations found"
    fi
    
    cd "$PROJECT_DIR"
}

build_application() {
    print_status "Building application..."
    
    cd "$PROJECT_DIR"
    
    # Build frontend
    print_status "Building frontend..."
    npm run build
    
    if [ $? -ne 0 ]; then
        print_error "Frontend build failed"
        exit 1
    fi
    
    # Build backend
    print_status "Building backend..."
    cd backend
    npm run build
    
    if [ $? -ne 0 ]; then
        print_error "Backend build failed"
        exit 1
    fi
    
    cd ..
    print_success "Application built successfully"
}

start_application() {
    if [ "$AUTO_RESTART" != true ]; then
        return 0
    fi
    
    print_status "Starting application..."
    
    # Start with PM2
    pm2 start ecosystem.config.js
    
    if [ $? -eq 0 ]; then
        print_success "Application started"
        
        # Wait a moment for startup
        sleep 5
        
        # Verify application is running
        if pm2 list | grep -q "$APP_NAME.*online"; then
            print_success "Application is running successfully"
        else
            print_error "Application failed to start properly"
            pm2 logs "$APP_NAME" --lines 10
            exit 1
        fi
    else
        print_error "Failed to start application"
        exit 1
    fi
}

verify_update() {
    print_status "Verifying update..."
    
    # Wait for application to fully start
    sleep 10
    
    # Check health endpoint
    local max_attempts=5
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "http://localhost:3001/api/health" > /dev/null; then
            print_success "Health check passed"
            break
        else
            print_warning "Health check failed (attempt $attempt/$max_attempts)"
            if [ $attempt -eq $max_attempts ]; then
                print_error "Health check failed after $max_attempts attempts"
                return 1
            fi
            sleep 5
            attempt=$((attempt + 1))
        fi
    done
    
    # Check frontend
    if curl -f -s "http://localhost" > /dev/null; then
        print_success "Frontend verification passed"
    else
        print_warning "Frontend verification failed"
        return 1
    fi
    
    # Check PM2 status
    if pm2 list | grep -q "$APP_NAME.*online"; then
        print_success "PM2 status verification passed"
    else
        print_error "PM2 status verification failed"
        return 1
    fi
    
    print_success "Update verification completed successfully"
    return 0
}

rollback() {
    print_error "Rolling back to previous version..."
    
    # Stop current application
    pm2 stop "$APP_NAME" 2>/dev/null || true
    
    # Check if backup exists
    if [ -f "$PROJECT_DIR/.last_backup" ]; then
        local backup_file=$(cat "$PROJECT_DIR/.last_backup")
        
        if [ -f "$backup_file" ]; then
            print_status "Restoring from backup: $backup_file"
            
            # Remove current directory
            rm -rf "${PROJECT_DIR}_rollback_temp"
            mv "$PROJECT_DIR" "${PROJECT_DIR}_rollback_temp"
            
            # Extract backup
            mkdir -p "$PROJECT_DIR"
            tar -xzf "$backup_file" -C "$(dirname $PROJECT_DIR)"
            
            # Start application
            cd "$PROJECT_DIR"
            pm2 start ecosystem.config.js
            
            print_success "Rollback completed"
            log_message "Rollback completed from backup: $backup_file"
        else
            print_error "Backup file not found: $backup_file"
        fi
    else
        print_error "No backup information found"
    fi
}

send_notification() {
    local status="$1"
    local message="$2"
    
    if [ ! -z "$ALERT_EMAIL" ] && command -v mail &> /dev/null; then
        local subject="RTRW Billing Update $status - $(hostname)"
        echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
        print_status "Notification sent to $ALERT_EMAIL"
    fi
}

show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Options:"
    echo "  --check         Check for updates without applying"
    echo "  --force         Force update even if no changes detected"
    echo "  --no-backup     Skip backup creation"
    echo "  --no-migrate    Skip database migrations"
    echo "  --no-restart    Skip application restart"
    echo "  --maintenance   Enable maintenance mode during update"
    echo "  --rollback      Rollback to previous version"
    echo "  --help          Show this help message"
    echo
    echo "Examples:"
    echo "  $0                    # Standard update"
    echo "  $0 --check           # Check for updates only"
    echo "  $0 --force           # Force update"
    echo "  $0 --maintenance     # Update with maintenance mode"
    echo "  $0 --rollback        # Rollback to previous version"
}

# Main update function
run_update() {
    local start_time=$(date +%s)
    local success=true
    local error_message=""
    
    print_status "Starting update process..."
    log_message "Update process started"
    
    # Create log directory if not exists
    mkdir -p "$PROJECT_DIR/logs"
    
    # Enable maintenance mode if requested
    if [ "$MAINTENANCE_MODE" = true ]; then
        enable_maintenance_mode
    fi
    
    # Run update steps
    if ! create_backup; then
        success=false
        error_message="Backup creation failed"
    elif ! stop_application; then
        success=false
        error_message="Failed to stop application"
    elif ! update_code; then
        success=false
        error_message="Code update failed"
    elif ! update_dependencies; then
        success=false
        error_message="Dependency update failed"
    elif ! run_migrations; then
        success=false
        error_message="Database migration failed"
    elif ! build_application; then
        success=false
        error_message="Application build failed"
    elif ! start_application; then
        success=false
        error_message="Failed to start application"
    elif ! verify_update; then
        success=false
        error_message="Update verification failed"
    fi
    
    # Disable maintenance mode
    if [ "$MAINTENANCE_MODE" = true ]; then
        disable_maintenance_mode
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [ "$success" = true ]; then
        print_success "Update completed successfully in ${duration}s"
        log_message "Update completed successfully in ${duration}s"
        send_notification "SUCCESS" "Update completed successfully in ${duration}s"
    else
        print_error "Update failed: $error_message"
        log_message "Update failed: $error_message"
        
        # Attempt rollback
        rollback
        
        send_notification "FAILED" "Update failed: $error_message. Rollback attempted."
        exit 1
    fi
}

# Main execution
main() {
    # Parse command line arguments
    MAINTENANCE_MODE=false
    CHECK_ONLY=false
    ROLLBACK_ONLY=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --check)
                CHECK_ONLY=true
                shift
                ;;
            --force)
                FORCE_UPDATE=true
                shift
                ;;
            --no-backup)
                AUTO_BACKUP=false
                shift
                ;;
            --no-migrate)
                AUTO_MIGRATE=false
                shift
                ;;
            --no-restart)
                AUTO_RESTART=false
                shift
                ;;
            --maintenance)
                MAINTENANCE_MODE=true
                shift
                ;;
            --rollback)
                ROLLBACK_ONLY=true
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Execute based on options
    if [ "$ROLLBACK_ONLY" = true ]; then
        rollback
    elif [ "$CHECK_ONLY" = true ]; then
        check_prerequisites
        check_git_status
    else
        check_prerequisites
        check_git_status
        run_update
    fi
}

# Run main function
main "$@"