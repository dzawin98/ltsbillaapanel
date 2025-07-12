#!/bin/bash

# RTRW Billing System - Backup Script
# Author: Assistant
# Description: Script untuk backup database dan aplikasi

# Configuration
APP_DIR="/www/wwwroot/ltsbillaapanel"
BACKUP_DIR="/www/backup/rtrw"
DATE=$(date +"%Y%m%d_%H%M%S")
DB_NAME="rtrw_db_production"
DB_USER="root"
DB_PASS="your_mysql_password"

# Create backup directory
mkdir -p $BACKUP_DIR

echo "🔄 Starting RTRW Backup Process..."
echo "📅 Date: $(date)"
echo "📁 Backup Directory: $BACKUP_DIR"

# Database Backup
echo "🗄️ Backing up database..."
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_DIR/database_$DATE.sql

if [ $? -eq 0 ]; then
    echo "✅ Database backup completed: database_$DATE.sql"
else
    echo "❌ Database backup failed!"
    exit 1
fi

# Application Files Backup
echo "📦 Backing up application files..."
tar -czf $BACKUP_DIR/app_files_$DATE.tar.gz -C /www/wwwroot ltsbillaapanel \
    --exclude='ltsbillaapanel/node_modules' \
    --exclude='ltsbillaapanel/backend/node_modules' \
    --exclude='ltsbillaapanel/dist' \
    --exclude='ltsbillaapanel/backend/dist' \
    --exclude='ltsbillaapanel/logs' \
    --exclude='ltsbillaapanel/.git'

if [ $? -eq 0 ]; then
    echo "✅ Application files backup completed: app_files_$DATE.tar.gz"
else
    echo "❌ Application files backup failed!"
    exit 1
fi

# Configuration Backup
echo "⚙️ Backing up configuration files..."
tar -czf $BACKUP_DIR/config_$DATE.tar.gz -C $APP_DIR \
    backend/.env.production \
    backend/config/config.json \
    ecosystem.config.js \
    nginx.conf

if [ $? -eq 0 ]; then
    echo "✅ Configuration backup completed: config_$DATE.tar.gz"
else
    echo "❌ Configuration backup failed!"
fi

# Cleanup old backups (keep last 7 days)
echo "🧹 Cleaning up old backups..."
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

# Show backup summary
echo ""
echo "📊 Backup Summary:"
echo "=================="
ls -lh $BACKUP_DIR/*$DATE*

echo ""
echo "💾 Total backup size:"
du -sh $BACKUP_DIR

echo ""
echo "✅ Backup process completed successfully!"
echo "📁 Backup location: $BACKUP_DIR"
echo "📅 Backup date: $DATE"

# Optional: Upload to remote storage
# Uncomment and configure if you want to upload to cloud storage
# echo "☁️ Uploading to remote storage..."
# rsync -avz $BACKUP_DIR/ user@remote-server:/backup/rtrw/
# echo "✅ Remote upload completed!"

echo "🎉 All backup operations completed!"