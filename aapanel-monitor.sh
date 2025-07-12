#!/bin/bash

# RTRW Billing System - aaPanel Monitoring Script
# Author: dzawin98@gmail.com
# Version: 1.0

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/www/wwwroot/ltsbillaapanel"
LOG_DIR="$PROJECT_DIR/logs"
APP_NAME="rtrw-backend"
WEB_PORT=80
API_PORT=3001
DB_NAME="rtrw_db_production"
MAX_LOG_SIZE=100 # MB
ALERT_EMAIL="dzawin98@gmail.com"
ALERT_THRESHOLD_CPU=80
ALERT_THRESHOLD_MEMORY=80
ALERT_THRESHOLD_DISK=90

# Create log directory if not exists
mkdir -p "$LOG_DIR"

# Functions
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  RTRW Billing System Monitor${NC}"
    echo -e "${BLUE}  $(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_section() {
    echo -e "\n${CYAN}[$1]${NC}"
    echo "----------------------------------------"
}

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[OK]${NC} $1"
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

# Check if running as root or with sudo
check_permissions() {
    if [[ $EUID -ne 0 ]] && ! sudo -n true 2>/dev/null; then
        print_warning "Some checks require root privileges. Run with sudo for complete monitoring."
    fi
}

# System Information
check_system_info() {
    print_section "SYSTEM INFORMATION"
    
    echo "Hostname: $(hostname)"
    echo "OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
    echo "Kernel: $(uname -r)"
    echo "Architecture: $(uname -m)"
    echo "Uptime: $(uptime -p)"
    echo "Load Average: $(uptime | awk -F'load average:' '{print $2}')"
    echo "Current Time: $(date)"
    echo "Timezone: $(timedatectl show --property=Timezone --value 2>/dev/null || echo 'Unknown')"
}

# aaPanel Status
check_aapanel_status() {
    print_section "AAPANEL STATUS"
    
    if [ -f "/www/server/panel/BT-Panel" ]; then
        print_success "aaPanel is installed"
        
        # Check aaPanel service
        if systemctl is-active --quiet bt; then
            print_success "aaPanel service is running"
        else
            print_error "aaPanel service is not running"
        fi
        
        # Check aaPanel version
        if [ -f "/www/server/panel/class/common.py" ]; then
            VERSION=$(grep -o "version = '[^']*'" /www/server/panel/class/common.py | cut -d"'" -f2 2>/dev/null || echo "Unknown")
            echo "aaPanel Version: $VERSION"
        fi
        
        # Check aaPanel port
        PANEL_PORT=$(cat /www/server/panel/data/port.pl 2>/dev/null || echo "8888")
        echo "aaPanel Port: $PANEL_PORT"
        
        if netstat -tulpn | grep -q ":$PANEL_PORT"; then
            print_success "aaPanel web interface is accessible on port $PANEL_PORT"
        else
            print_warning "aaPanel web interface may not be accessible"
        fi
    else
        print_error "aaPanel is not installed"
    fi
}

# PM2 Status
check_pm2_status() {
    print_section "PM2 APPLICATION STATUS"
    
    if command -v pm2 &> /dev/null; then
        print_success "PM2 is installed"
        
        # Check PM2 processes
        echo "PM2 Processes:"
        pm2 list
        
        # Check specific app
        if pm2 list | grep -q "$APP_NAME.*online"; then
            print_success "$APP_NAME is running"
            
            # Get app details
            echo "\nApplication Details:"
            pm2 show "$APP_NAME" | grep -E "(status|uptime|restarts|memory|cpu)"
        else
            print_error "$APP_NAME is not running or not found"
            
            # Try to get error info
            echo "\nRecent PM2 logs:"
            pm2 logs "$APP_NAME" --lines 5 --nostream 2>/dev/null || echo "No logs available"
        fi
        
        # Check PM2 startup
        if pm2 startup | grep -q "already"; then
            print_success "PM2 startup is configured"
        else
            print_warning "PM2 startup may not be configured"
        fi
    else
        print_error "PM2 is not installed"
    fi
}

# Application Health
check_application_health() {
    print_section "APPLICATION HEALTH"
    
    # Check backend API
    echo "Testing Backend API..."
    if curl -f -s "http://localhost:$API_PORT/api/health" > /dev/null; then
        print_success "Backend API is responding"
        
        # Get health details
        HEALTH_DATA=$(curl -s "http://localhost:$API_PORT/api/health" 2>/dev/null)
        if [ ! -z "$HEALTH_DATA" ]; then
            echo "Health Details:"
            echo "$HEALTH_DATA" | python3 -m json.tool 2>/dev/null || echo "$HEALTH_DATA"
        fi
    else
        print_error "Backend API is not responding"
    fi
    
    # Check frontend
    echo "\nTesting Frontend..."
    if curl -f -s "http://localhost:$WEB_PORT" > /dev/null; then
        print_success "Frontend is accessible"
    else
        print_error "Frontend is not accessible"
    fi
    
    # Check API endpoints
    echo "\nTesting API Endpoints..."
    ENDPOINTS=("/api" "/api/areas" "/api/customers" "/api/packages")
    
    for endpoint in "${ENDPOINTS[@]}"; do
        if curl -f -s "http://localhost:$API_PORT$endpoint" > /dev/null; then
            print_success "$endpoint - OK"
        else
            print_warning "$endpoint - Not responding"
        fi
    done
}

# Database Status
check_database_status() {
    print_section "DATABASE STATUS"
    
    # Check MySQL service
    if systemctl is-active --quiet mysql || systemctl is-active --quiet mariadb; then
        print_success "MySQL/MariaDB service is running"
        
        # Check database connection
        if mysql -e "USE $DB_NAME; SELECT 1;" &>/dev/null; then
            print_success "Database connection successful"
            
            # Get database info
            echo "\nDatabase Information:"
            mysql -e "SELECT 
                COUNT(*) as 'Total Tables',
                ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as 'Size (MB)'
                FROM information_schema.tables 
                WHERE table_schema = '$DB_NAME';"
            
            # Check important tables
            echo "\nTable Status:"
            TABLES=("customers" "areas" "packages" "transactions" "routers" "odps")
            for table in "${TABLES[@]}"; do
                COUNT=$(mysql -se "SELECT COUNT(*) FROM $DB_NAME.$table" 2>/dev/null || echo "0")
                if [ "$COUNT" != "0" ] || mysql -e "DESCRIBE $DB_NAME.$table" &>/dev/null; then
                    print_success "$table: $COUNT records"
                else
                    print_warning "$table: Table not found or empty"
                fi
            done
            
            # Check recent activity
            echo "\nRecent Database Activity:"
            mysql -e "SELECT 
                table_name,
                update_time
                FROM information_schema.tables 
                WHERE table_schema = '$DB_NAME' 
                AND update_time IS NOT NULL 
                ORDER BY update_time DESC 
                LIMIT 5;"
        else
            print_error "Cannot connect to database $DB_NAME"
        fi
    else
        print_error "MySQL/MariaDB service is not running"
    fi
}

# Nginx Status
check_nginx_status() {
    print_section "NGINX STATUS"
    
    if systemctl is-active --quiet nginx; then
        print_success "Nginx service is running"
        
        # Check nginx configuration
        if nginx -t &>/dev/null; then
            print_success "Nginx configuration is valid"
        else
            print_error "Nginx configuration has errors"
            nginx -t
        fi
        
        # Check listening ports
        echo "\nNginx Listening Ports:"
        netstat -tulpn | grep nginx | awk '{print $4}' | sort -u
        
        # Check site configuration
        SITE_CONFIG="/www/server/panel/vhost/nginx/ltsbillaapanel.conf"
        if [ -f "$SITE_CONFIG" ]; then
            print_success "Site configuration found"
        else
            print_warning "Site configuration not found at $SITE_CONFIG"
        fi
        
        # Check access logs
        echo "\nRecent Access (last 5 entries):"
        tail -5 /www/wwwlogs/*.log 2>/dev/null | grep -v "^$" | tail -5 || echo "No access logs found"
    else
        print_error "Nginx service is not running"
    fi
}

# System Resources
check_system_resources() {
    print_section "SYSTEM RESOURCES"
    
    # CPU Usage
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    echo "CPU Usage: ${CPU_USAGE}%"
    if (( $(echo "$CPU_USAGE > $ALERT_THRESHOLD_CPU" | bc -l) )); then
        print_warning "High CPU usage detected!"
    else
        print_success "CPU usage is normal"
    fi
    
    # Memory Usage
    MEMORY_INFO=$(free -m | awk 'NR==2{printf "%.1f", $3*100/$2 }')
    echo "Memory Usage: ${MEMORY_INFO}%"
    if (( $(echo "$MEMORY_INFO > $ALERT_THRESHOLD_MEMORY" | bc -l) )); then
        print_warning "High memory usage detected!"
    else
        print_success "Memory usage is normal"
    fi
    
    # Disk Usage
    echo "\nDisk Usage:"
    df -h | grep -E "(Filesystem|/dev/|/www)"
    
    DISK_USAGE=$(df /www | awk 'NR==2 {print $5}' | cut -d'%' -f1)
    if [ "$DISK_USAGE" -gt "$ALERT_THRESHOLD_DISK" ]; then
        print_warning "High disk usage detected: ${DISK_USAGE}%"
    else
        print_success "Disk usage is normal: ${DISK_USAGE}%"
    fi
    
    # Network Connections
    echo "\nNetwork Connections:"
    echo "Active connections: $(netstat -an | grep ESTABLISHED | wc -l)"
    echo "Listening ports: $(netstat -tulpn | grep LISTEN | wc -l)"
    
    # Process Count
    echo "\nProcess Information:"
    echo "Total processes: $(ps aux | wc -l)"
    echo "Running processes: $(ps aux | awk '$8 ~ /R/ {count++} END {print count+0}')"
}

# Log Analysis
check_logs() {
    print_section "LOG ANALYSIS"
    
    # Application logs
    if [ -d "$LOG_DIR" ]; then
        echo "Application Log Directory: $LOG_DIR"
        ls -la "$LOG_DIR"
        
        # Check log sizes
        echo "\nLog File Sizes:"
        find "$LOG_DIR" -name "*.log" -exec ls -lh {} \; | awk '{print $9 ": " $5}'
        
        # Check for large log files
        find "$LOG_DIR" -name "*.log" -size +${MAX_LOG_SIZE}M -exec echo "WARNING: Large log file: {} (>$MAX_LOG_SIZE MB)" \;
        
        # Recent errors
        echo "\nRecent Errors (last 10):"
        find "$LOG_DIR" -name "*.log" -exec grep -i "error\|exception\|failed" {} \; | tail -10 || echo "No recent errors found"
        
        # Recent warnings
        echo "\nRecent Warnings (last 5):"
        find "$LOG_DIR" -name "*.log" -exec grep -i "warning\|warn" {} \; | tail -5 || echo "No recent warnings found"
    else
        print_warning "Application log directory not found: $LOG_DIR"
    fi
    
    # System logs
    echo "\nSystem Log Analysis:"
    echo "Recent system errors:"
    journalctl --since "1 hour ago" --priority=err --no-pager | tail -5 || echo "No recent system errors"
}

# Security Check
check_security() {
    print_section "SECURITY STATUS"
    
    # Check firewall
    if command -v ufw &> /dev/null; then
        UFW_STATUS=$(ufw status | head -1)
        echo "UFW Firewall: $UFW_STATUS"
    elif command -v firewall-cmd &> /dev/null; then
        FIREWALL_STATUS=$(firewall-cmd --state 2>/dev/null || echo "inactive")
        echo "Firewalld: $FIREWALL_STATUS"
    else
        print_warning "No firewall management tool detected"
    fi
    
    # Check for failed login attempts
    echo "\nRecent Failed Login Attempts:"
    journalctl --since "24 hours ago" | grep -i "failed\|failure" | grep -i "login\|ssh" | tail -5 || echo "No failed login attempts found"
    
    # Check listening services
    echo "\nListening Services:"
    netstat -tulpn | grep LISTEN | awk '{print $4 " - " $7}' | sort
    
    # Check file permissions
    echo "\nCritical File Permissions:"
    ls -la "$PROJECT_DIR/.env*" 2>/dev/null || echo "No .env files found"
    ls -la "$PROJECT_DIR/backend/.env*" 2>/dev/null || echo "No backend .env files found"
}

# Performance Metrics
check_performance() {
    print_section "PERFORMANCE METRICS"
    
    # Response time test
    echo "Response Time Tests:"
    
    # Backend API
    API_TIME=$(curl -o /dev/null -s -w "%{time_total}" "http://localhost:$API_PORT/api/health" 2>/dev/null || echo "N/A")
    echo "Backend API: ${API_TIME}s"
    
    # Frontend
    WEB_TIME=$(curl -o /dev/null -s -w "%{time_total}" "http://localhost:$WEB_PORT" 2>/dev/null || echo "N/A")
    echo "Frontend: ${WEB_TIME}s"
    
    # Database query time
    DB_TIME=$(time mysql -e "SELECT COUNT(*) FROM $DB_NAME.customers" 2>&1 | grep real | awk '{print $2}' || echo "N/A")
    echo "Database Query: $DB_TIME"
    
    # Load average
    echo "\nLoad Average:"
    uptime | awk -F'load average:' '{print $2}'
    
    # Top processes by CPU
    echo "\nTop 5 Processes by CPU:"
    ps aux --sort=-%cpu | head -6
    
    # Top processes by Memory
    echo "\nTop 5 Processes by Memory:"
    ps aux --sort=-%mem | head -6
}

# Generate Report
generate_report() {
    REPORT_FILE="$LOG_DIR/monitor-report-$(date +%Y%m%d-%H%M%S).txt"
    
    {
        print_header
        check_system_info
        check_aapanel_status
        check_pm2_status
        check_application_health
        check_database_status
        check_nginx_status
        check_system_resources
        check_logs
        check_security
        check_performance
    } | tee "$REPORT_FILE"
    
    echo
    print_success "Report saved to: $REPORT_FILE"
}

# Send Alert (if configured)
send_alert() {
    local message="$1"
    local subject="RTRW Billing System Alert - $(hostname)"
    
    if command -v mail &> /dev/null && [ ! -z "$ALERT_EMAIL" ]; then
        echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
        print_status "Alert sent to $ALERT_EMAIL"
    fi
}

# Main execution
main() {
    # Check if report mode
    if [ "$1" = "--report" ]; then
        generate_report
        return
    fi
    
    # Check if quiet mode
    if [ "$1" = "--quiet" ]; then
        exec > /dev/null 2>&1
    fi
    
    check_permissions
    
    print_header
    check_system_info
    check_aapanel_status
    check_pm2_status
    check_application_health
    check_database_status
    check_nginx_status
    check_system_resources
    check_logs
    check_security
    check_performance
    
    echo
    print_success "Monitoring completed at $(date)"
    echo
    echo "Usage:"
    echo "  $0                 # Run interactive monitoring"
    echo "  $0 --report        # Generate detailed report"
    echo "  $0 --quiet         # Run silently (for cron)"
    echo
    echo "For automated monitoring, add to crontab:"
    echo "  */5 * * * * $0 --quiet"
    echo "  0 2 * * * $0 --report"
}

# Run main function
main "$@"