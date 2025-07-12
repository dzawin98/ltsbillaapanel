#!/bin/bash

# RTRW Billing System - Monitoring Script
# Author: Assistant
# Description: Script untuk monitoring status aplikasi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="rtrw-backend"
API_URL="http://localhost:3001/api"
FRONTEND_URL="http://localhost"
DB_NAME="rtrw_db_production"
DB_USER="root"

echo -e "${BLUE}🔍 RTRW Billing System - Health Check${NC}"
echo -e "${BLUE}======================================${NC}"
echo "📅 $(date)"
echo ""

# Check PM2 Status
echo -e "${YELLOW}📊 PM2 Application Status:${NC}"
if command -v pm2 &> /dev/null; then
    pm2 jlist | jq -r '.[] | select(.name=="'$APP_NAME'") | "Name: \(.name) | Status: \(.pm2_env.status) | CPU: \(.monit.cpu)% | Memory: \(.monit.memory/1024/1024 | floor)MB"'
    
    # Check if app is running
    APP_STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="'$APP_NAME'") | .pm2_env.status')
    if [ "$APP_STATUS" = "online" ]; then
        echo -e "${GREEN}✅ Application is running${NC}"
    else
        echo -e "${RED}❌ Application is not running (Status: $APP_STATUS)${NC}"
    fi
else
    echo -e "${RED}❌ PM2 not found${NC}"
fi

echo ""

# Check Backend API
echo -e "${YELLOW}🔗 Backend API Health:${NC}"
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/areas 2>/dev/null)
if [ "$API_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ Backend API is responding (HTTP $API_RESPONSE)${NC}"
else
    echo -e "${RED}❌ Backend API is not responding (HTTP $API_RESPONSE)${NC}"
fi

# Check Frontend
echo -e "${YELLOW}🌐 Frontend Status:${NC}"
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $FRONTEND_URL 2>/dev/null)
if [ "$FRONTEND_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ Frontend is accessible (HTTP $FRONTEND_RESPONSE)${NC}"
else
    echo -e "${RED}❌ Frontend is not accessible (HTTP $FRONTEND_RESPONSE)${NC}"
fi

echo ""

# Check Database Connection
echo -e "${YELLOW}🗄️ Database Status:${NC}"
DB_CHECK=$(mysql -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; SELECT 1;" 2>/dev/null)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
    
    # Get database size
    DB_SIZE=$(mysql -u $DB_USER -p$DB_PASS -e "SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 1) AS 'DB Size in MB' FROM information_schema.tables WHERE table_schema='$DB_NAME';" 2>/dev/null | tail -n 1)
    echo "📊 Database size: ${DB_SIZE} MB"
else
    echo -e "${RED}❌ Database connection failed${NC}"
fi

echo ""

# Check System Resources
echo -e "${YELLOW}💻 System Resources:${NC}"
echo "🖥️  CPU Usage: $(top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1)%"
echo "💾 Memory Usage: $(free | grep Mem | awk '{printf "%.1f%%", $3/$2 * 100.0}')"
echo "💿 Disk Usage: $(df -h / | awk 'NR==2{printf "%s", $5}')"
echo "🌡️  Load Average: $(uptime | awk -F'load average:' '{print $2}')"

echo ""

# Check Network Ports
echo -e "${YELLOW}🔌 Network Ports:${NC}"
if netstat -tulpn | grep -q ":3001"; then
    echo -e "${GREEN}✅ Backend port 3001 is listening${NC}"
else
    echo -e "${RED}❌ Backend port 3001 is not listening${NC}"
fi

if netstat -tulpn | grep -q ":80"; then
    echo -e "${GREEN}✅ HTTP port 80 is listening${NC}"
else
    echo -e "${RED}❌ HTTP port 80 is not listening${NC}"
fi

echo ""

# Check Log Files
echo -e "${YELLOW}📋 Recent Log Activity:${NC}"
LOG_DIR="/www/wwwroot/ltsbillaapanel/logs"
if [ -d "$LOG_DIR" ]; then
    echo "📄 Backend logs (last 5 lines):"
    tail -n 5 $LOG_DIR/backend-combined.log 2>/dev/null || echo "No backend logs found"
    
    echo ""
    echo "❌ Recent errors (last 3):"
    tail -n 10 $LOG_DIR/backend-error.log 2>/dev/null | tail -n 3 || echo "No recent errors"
else
    echo "📁 Log directory not found: $LOG_DIR"
fi

echo ""

# Check SSL Certificate (if applicable)
echo -e "${YELLOW}🔒 SSL Certificate:${NC}"
if command -v openssl &> /dev/null; then
    SSL_CHECK=$(echo | timeout 3 openssl s_client -connect localhost:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ SSL certificate is valid${NC}"
        echo "$SSL_CHECK"
    else
        echo -e "${YELLOW}⚠️  No SSL certificate or HTTPS not configured${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  OpenSSL not available for SSL check${NC}"
fi

echo ""
echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}🏁 Health check completed!${NC}"
echo "📅 $(date)"

# Optional: Send notification if critical issues found
# Uncomment to enable notifications
# if [ "$APP_STATUS" != "online" ] || [ "$API_RESPONSE" != "200" ]; then
#     echo "🚨 Critical issues detected! Sending notification..."
#     # Add your notification logic here (email, Slack, etc.)
# fi