#!/bin/bash

# RTRW Billing System - aaPanel Backup Script
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
BACKUP_DIR="/www/backup/rtrw-billing"
DB_NAME="rtrw_db_production"
DB_USER="root"
DB_PASS=""
RETENTION_DAYS=30
COMPRESSION_LEVEL=6
ENCRYPTION_KEY=""
REMOTE_BACKUP=false
REMOTE_HOST=""
REMOTE_USER=""
REMOTE_PATH=""
ALERT_EMAIL="dzawin98@gmail.com"

# Load configuration from file if exists
CONFIG_FILE="$PROJECT_DIR/backup.conf"
if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
fi

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

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$BACKUP_DIR/backup.log"
}

check_dependencies() {
    print_status "Checking dependencies..."
    
    # Check required commands
    local deps=("mysqldump" "tar" "gzip")
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            print_error "Required dependency not found: $dep"
            exit 1
        fi
    done
    
    # Check optional dependencies
    if [ "$ENCRYPTION_KEY" != "" ] && ! command -v "openssl" &> /dev/null; then
        print_warning "OpenSSL not found. Encryption will be disabled."
        ENCRYPTION_KEY=""
    fi
    
    if [ "$REMOTE_BACKUP" = true ] && ! command -v "rsync" &> /dev/null; then
        print_warning "Rsync not found. Remote backup will be disabled."
        REMOTE_BACKUP=false
    fi
    
    print_success "Dependencies check completed"
}

setup_backup_directory() {
    print_status "Setting up backup directory..."
    
    # Create backup directory structure
    mkdir -p "$BACKUP_DIR"/{database,application,config,logs}
    
    # Set proper permissions
    chmod 750 "$BACKUP_DIR"
    
    # Create backup log if not exists
    touch "$BACKUP_DIR/backup.log"
    
    print_success "Backup directory ready: $BACKUP_DIR"
}

backup_database() {
    print_status "Backing up database..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/database/db_${DB_NAME}_${timestamp}.sql"
    
    # Create database backup
    if [ "$DB_PASS" != "" ]; then
        mysqldump -u"$DB_USER" -p"$DB_PASS" \
            --single-transaction \
            --routines \
            --triggers \
            --events \
            --add-drop-database \
            --databases "$DB_NAME" > "$backup_file"
    else
        mysqldump -u"$DB_USER" \
            --single-transaction \
            --routines \
            --triggers \
            --events \
            --add-drop-database \
            --databases "$DB_NAME" > "$backup_file"
    fi
    
    if [ $? -eq 0 ]; then
        # Compress backup
        gzip -"$COMPRESSION_LEVEL" "$backup_file"
        backup_file="${backup_file}.gz"
        
        # Encrypt if key provided
        if [ "$ENCRYPTION_KEY" != "" ]; then
            openssl enc -aes-256-cbc -salt -in "$backup_file" -out "${backup_file}.enc" -k "$ENCRYPTION_KEY"
            rm "$backup_file"
            backup_file="${backup_file}.enc"
        fi
        
        local size=$(du -h "$backup_file" | cut -f1)
        print_success "Database backup completed: $backup_file ($size)"
        log_message "Database backup completed: $backup_file ($size)"
        
        # Verify backup
        if [ "$ENCRYPTION_KEY" != "" ]; then
            # Test decryption
            openssl enc -aes-256-cbc -d -in "$backup_file" -k "$ENCRYPTION_KEY" | gunzip | head -10 > /dev/null
        else
            # Test decompression
            gunzip -t "$backup_file"
        fi
        
        if [ $? -eq 0 ]; then
            print_success "Database backup verification passed"
        else
            print_error "Database backup verification failed"
            return 1
        fi
    else
        print_error "Database backup failed"
        log_message "Database backup failed"
        return 1
    fi
}

backup_application() {
    print_status "Backing up application files..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/application/app_${PROJECT_NAME}_${timestamp}.tar.gz"
    
    # Create application backup excluding unnecessary files
    tar -czf "$backup_file" \
        -C "$(dirname $PROJECT_DIR)" \
        --exclude="$PROJECT_NAME/node_modules" \
        --exclude="$PROJECT_NAME/backend/node_modules" \
        --exclude="$PROJECT_NAME/dist" \
        --exclude="$PROJECT_NAME/backend/dist" \
        --exclude="$PROJECT_NAME/logs" \
        --exclude="$PROJECT_NAME/.git" \
        --exclude="$PROJECT_NAME/backup" \
        --exclude="$PROJECT_NAME/*.log" \
        --exclude="$PROJECT_NAME/backend/*.log" \
        "$PROJECT_NAME"
    
    if [ $? -eq 0 ]; then
        # Encrypt if key provided
        if [ "$ENCRYPTION_KEY" != "" ]; then
            openssl enc -aes-256-cbc -salt -in "$backup_file" -out "${backup_file}.enc" -k "$ENCRYPTION_KEY"
            rm "$backup_file"
            backup_file="${backup_file}.enc"
        fi
        
        local size=$(du -h "$backup_file" | cut -f1)
        print_success "Application backup completed: $backup_file ($size)"
        log_message "Application backup completed: $backup_file ($size)"
    else
        print_error "Application backup failed"
        log_message "Application backup failed"
        return 1
    fi
}

backup_config() {
    print_status "Backing up configuration files..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/config/config_${timestamp}.tar.gz"
    
    # Create temporary directory for config files
    local temp_dir="/tmp/rtrw_config_backup_$$"
    mkdir -p "$temp_dir"
    
    # Copy important configuration files
    cp -r "$PROJECT_DIR/backend/.env*" "$temp_dir/" 2>/dev/null || true
    cp "$PROJECT_DIR/ecosystem.config.js" "$temp_dir/" 2>/dev/null || true
    cp "$PROJECT_DIR/nginx.conf" "$temp_dir/" 2>/dev/null || true
    cp "$PROJECT_DIR/backup.conf" "$temp_dir/" 2>/dev/null || true
    
    # Copy aaPanel configurations
    mkdir -p "$temp_dir/aapanel"
    cp "/www/server/panel/vhost/nginx/${PROJECT_NAME}.conf" "$temp_dir/aapanel/" 2>/dev/null || true
    cp -r "/www/server/panel/data" "$temp_dir/aapanel/" 2>/dev/null || true
    
    # Copy PM2 configuration
    if [ -d "$HOME/.pm2" ]; then
        mkdir -p "$temp_dir/pm2"
        cp "$HOME/.pm2/dump.pm2" "$temp_dir/pm2/" 2>/dev/null || true
        cp "$HOME/.pm2/ecosystem.config.js" "$temp_dir/pm2/" 2>/dev/null || true
    fi
    
    # Create backup archive
    tar -czf "$backup_file" -C "$temp_dir" .
    
    # Clean up
    rm -rf "$temp_dir"
    
    if [ $? -eq 0 ]; then
        # Encrypt if key provided
        if [ "$ENCRYPTION_KEY" != "" ]; then
            openssl enc -aes-256-cbc -salt -in "$backup_file" -out "${backup_file}.enc" -k "$ENCRYPTION_KEY"
            rm "$backup_file"
            backup_file="${backup_file}.enc"
        fi
        
        local size=$(du -h "$backup_file" | cut -f1)
        print_success "Configuration backup completed: $backup_file ($size)"
        log_message "Configuration backup completed: $backup_file ($size)"
    else
        print_error "Configuration backup failed"
        log_message "Configuration backup failed"
        return 1
    fi
}

backup_logs() {
    print_status "Backing up log files..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/logs/logs_${timestamp}.tar.gz"
    
    # Create logs backup
    tar -czf "$backup_file" \
        -C "$PROJECT_DIR" \
        logs/ 2>/dev/null || true
    
    # Include system logs if accessible
    if [ -r "/www/wwwlogs" ]; then
        tar -czf "${backup_file%.tar.gz}_system.tar.gz" \
            -C "/www" \
            wwwlogs/ 2>/dev/null || true
    fi
    
    if [ -f "$backup_file" ]; then
        local size=$(du -h "$backup_file" | cut -f1)
        print_success "Logs backup completed: $backup_file ($size)"
        log_message "Logs backup completed: $backup_file ($size)"
    else
        print_warning "No logs found to backup"
    fi
}

cleanup_old_backups() {
    print_status "Cleaning up old backups..."
    
    local deleted_count=0
    
    # Clean up old backups
    for backup_type in database application config logs; do
        if [ -d "$BACKUP_DIR/$backup_type" ]; then
            local old_files=$(find "$BACKUP_DIR/$backup_type" -type f -mtime +$RETENTION_DAYS)
            if [ ! -z "$old_files" ]; then
                echo "$old_files" | while read file; do
                    rm "$file"
                    deleted_count=$((deleted_count + 1))
                    log_message "Deleted old backup: $file"
                done
            fi
        fi
    done
    
    if [ $deleted_count -gt 0 ]; then
        print_success "Cleaned up $deleted_count old backup files"
    else
        print_status "No old backups to clean up"
    fi
}

sync_remote_backup() {
    if [ "$REMOTE_BACKUP" != true ]; then
        return 0
    fi
    
    print_status "Syncing to remote backup location..."
    
    if [ -z "$REMOTE_HOST" ] || [ -z "$REMOTE_USER" ] || [ -z "$REMOTE_PATH" ]; then
        print_warning "Remote backup configuration incomplete. Skipping."
        return 0
    fi
    
    # Sync backup directory to remote location
    rsync -avz --delete \
        "$BACKUP_DIR/" \
        "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/" \
        --exclude="*.log"
    
    if [ $? -eq 0 ]; then
        print_success "Remote backup sync completed"
        log_message "Remote backup sync completed to $REMOTE_HOST:$REMOTE_PATH"
    else
        print_error "Remote backup sync failed"
        log_message "Remote backup sync failed"
        return 1
    fi
}

generate_backup_report() {
    local report_file="$BACKUP_DIR/backup_report_$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "======================================"
        echo "  RTRW Billing System Backup Report"
        echo "  $(date '+%Y-%m-%d %H:%M:%S')"
        echo "======================================"
        echo
        
        echo "Backup Configuration:"
        echo "- Project: $PROJECT_NAME"
        echo "- Database: $DB_NAME"
        echo "- Backup Directory: $BACKUP_DIR"
        echo "- Retention Days: $RETENTION_DAYS"
        echo "- Compression Level: $COMPRESSION_LEVEL"
        echo "- Encryption: $([ "$ENCRYPTION_KEY" != "" ] && echo "Enabled" || echo "Disabled")"
        echo "- Remote Backup: $REMOTE_BACKUP"
        echo
        
        echo "Backup Summary:"
        for backup_type in database application config logs; do
            if [ -d "$BACKUP_DIR/$backup_type" ]; then
                local count=$(find "$BACKUP_DIR/$backup_type" -type f | wc -l)
                local size=$(du -sh "$BACKUP_DIR/$backup_type" 2>/dev/null | cut -f1 || echo "0")
                echo "- $backup_type: $count files, $size"
            fi
        done
        echo
        
        echo "Recent Backup Files:"
        find "$BACKUP_DIR" -type f -mtime -1 -exec ls -lh {} \; | awk '{print $9 ": " $5 " (" $6 " " $7 " " $8 ")"}'
        echo
        
        echo "Disk Usage:"
        df -h "$BACKUP_DIR"
        echo
        
        echo "System Information:"
        echo "- Hostname: $(hostname)"
        echo "- Uptime: $(uptime -p)"
        echo "- Load: $(uptime | awk -F'load average:' '{print $2}')"
        echo
        
    } > "$report_file"
    
    print_success "Backup report generated: $report_file"
}

send_notification() {
    local status="$1"
    local message="$2"
    
    if [ ! -z "$ALERT_EMAIL" ] && command -v mail &> /dev/null; then
        local subject="RTRW Billing Backup $status - $(hostname)"
        echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
        print_status "Notification sent to $ALERT_EMAIL"
    fi
}

create_backup_config() {
    if [ ! -f "$CONFIG_FILE" ]; then
        cat > "$CONFIG_FILE" << EOF
# RTRW Billing System Backup Configuration
# Edit this file to customize backup settings

# Database Configuration
DB_NAME="rtrw_db_production"
DB_USER="root"
DB_PASS=""

# Backup Settings
BACKUP_DIR="/www/backup/rtrw-billing"
RETENTION_DAYS=30
COMPRESSION_LEVEL=6

# Encryption (leave empty to disable)
ENCRYPTION_KEY=""

# Remote Backup Settings
REMOTE_BACKUP=false
REMOTE_HOST=""
REMOTE_USER=""
REMOTE_PATH=""

# Notification
ALERT_EMAIL="dzawin98@gmail.com"
EOF
        
        chmod 600 "$CONFIG_FILE"
        print_success "Backup configuration created: $CONFIG_FILE"
        print_warning "Please edit $CONFIG_FILE with your settings"
    fi
}

# Main backup function
run_backup() {
    local start_time=$(date +%s)
    local success=true
    local error_message=""
    
    print_status "Starting backup process..."
    log_message "Backup process started"
    
    # Run backup steps
    if ! backup_database; then
        success=false
        error_message="Database backup failed"
    fi
    
    if ! backup_application; then
        success=false
        error_message="${error_message}${error_message:+; }Application backup failed"
    fi
    
    if ! backup_config; then
        success=false
        error_message="${error_message}${error_message:+; }Configuration backup failed"
    fi
    
    backup_logs  # Non-critical
    
    cleanup_old_backups
    
    if ! sync_remote_backup; then
        print_warning "Remote backup sync failed, but continuing..."
    fi
    
    generate_backup_report
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [ "$success" = true ]; then
        print_success "Backup completed successfully in ${duration}s"
        log_message "Backup completed successfully in ${duration}s"
        send_notification "SUCCESS" "Backup completed successfully in ${duration}s"
    else
        print_error "Backup completed with errors: $error_message"
        log_message "Backup completed with errors: $error_message"
        send_notification "ERROR" "Backup failed: $error_message"
        exit 1
    fi
}

# Show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Options:"
    echo "  --full          Run full backup (default)"
    echo "  --database      Backup database only"
    echo "  --application   Backup application files only"
    echo "  --config        Backup configuration files only"
    echo "  --logs          Backup log files only"
    echo "  --cleanup       Clean up old backups only"
    echo "  --report        Generate backup report only"
    echo "  --setup         Create backup configuration file"
    echo "  --help          Show this help message"
    echo
    echo "Examples:"
    echo "  $0                    # Full backup"
    echo "  $0 --database         # Database backup only"
    echo "  $0 --cleanup          # Clean old backups"
    echo
    echo "Configuration file: $CONFIG_FILE"
    echo "Backup directory: $BACKUP_DIR"
}

# Main execution
main() {
    case "$1" in
        --database)
            check_dependencies
            setup_backup_directory
            backup_database
            ;;
        --application)
            check_dependencies
            setup_backup_directory
            backup_application
            ;;
        --config)
            check_dependencies
            setup_backup_directory
            backup_config
            ;;
        --logs)
            setup_backup_directory
            backup_logs
            ;;
        --cleanup)
            cleanup_old_backups
            ;;
        --report)
            generate_backup_report
            ;;
        --setup)
            create_backup_config
            ;;
        --help)
            show_usage
            ;;
        --full|"")
            check_dependencies
            setup_backup_directory
            run_backup
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"