# RTRW Billing System - MikroTik Configuration Script
# Author: dzawin98@gmail.com
# Version: 1.0
# 
# This script configures MikroTik router for RTRW Billing System
# Replace IP addresses with your actual configuration

# Configuration Variables
:local localServerIP "192.168.1.100"
:local publicInterface "ether1"
:local lanInterface "bridge"
:local webPort 80
:local apiPort 3001

# Print configuration info
:put "=== RTRW Billing System - MikroTik Setup ==="
:put ("Local Server IP: " . $localServerIP)
:put ("Public Interface: " . $publicInterface)
:put ("LAN Interface: " . $lanInterface)
:put ("Web Port: " . $webPort)
:put ("API Port: " . $apiPort)
:put ""

# 1. NAT Rules for Port Forwarding
:put "Setting up NAT rules..."

# Forward HTTP traffic to local server
/ip firewall nat add \
    chain=dstnat \
    action=dst-nat \
    protocol=tcp \
    dst-port=$webPort \
    in-interface=$publicInterface \
    to-addresses=$localServerIP \
    to-ports=$webPort \
    comment="RTRW Billing - Web Frontend"

# Forward API traffic to local server
/ip firewall nat add \
    chain=dstnat \
    action=dst-nat \
    protocol=tcp \
    dst-port=$apiPort \
    in-interface=$publicInterface \
    to-addresses=$localServerIP \
    to-ports=$apiPort \
    comment="RTRW Billing - API Backend"

# Masquerade for outgoing traffic
/ip firewall nat add \
    chain=srcnat \
    action=masquerade \
    out-interface=$publicInterface \
    comment="RTRW Billing - Masquerade"

:put "NAT rules configured successfully"

# 2. Firewall Filter Rules
:put "Setting up firewall filter rules..."

# Allow established and related connections
/ip firewall filter add \
    chain=forward \
    connection-state=established,related \
    action=accept \
    comment="RTRW Billing - Allow established"

# Allow HTTP traffic to local server
/ip firewall filter add \
    chain=forward \
    action=accept \
    protocol=tcp \
    dst-port=$webPort \
    dst-address=$localServerIP \
    in-interface=$publicInterface \
    comment="RTRW Billing - Allow Web Access"

# Allow API traffic to local server
/ip firewall filter add \
    chain=forward \
    action=accept \
    protocol=tcp \
    dst-port=$apiPort \
    dst-address=$localServerIP \
    in-interface=$publicInterface \
    comment="RTRW Billing - Allow API Access"

# Allow local network access to server
/ip firewall filter add \
    chain=forward \
    action=accept \
    src-address=192.168.0.0/16 \
    dst-address=$localServerIP \
    comment="RTRW Billing - Allow LAN Access"

:put "Firewall filter rules configured successfully"

# 3. DHCP Server Configuration (if needed)
:put "Checking DHCP server configuration..."

# Reserve IP for the server
/ip dhcp-server lease add \
    address=$localServerIP \
    mac-address=[/interface ethernet get [find name=$lanInterface] mac-address] \
    comment="RTRW Billing Server" \
    server=dhcp1

:put "DHCP reservation configured"

# 4. DNS Configuration
:put "Setting up DNS..."

# Add local DNS entry for the billing system
/ip dns static add \
    name="billing.local" \
    address=$localServerIP \
    comment="RTRW Billing System"

/ip dns static add \
    name="api.billing.local" \
    address=$localServerIP \
    comment="RTRW Billing API"

:put "DNS entries configured"

# 5. Quality of Service (QoS) - Optional
:put "Setting up QoS for billing system..."

# Create queue for billing system traffic
/queue simple add \
    name="RTRW-Billing-Queue" \
    target=$localServerIP \
    max-limit=10M/10M \
    priority=1 \
    comment="RTRW Billing System Priority"

:put "QoS configured"

# 6. Security Rules
:put "Setting up security rules..."

# Block access to sensitive ports from WAN
/ip firewall filter add \
    chain=input \
    action=drop \
    protocol=tcp \
    dst-port=22,23,21,3389 \
    in-interface=$publicInterface \
    comment="RTRW Billing - Block sensitive ports"

# Allow only necessary services from WAN
/ip firewall filter add \
    chain=input \
    action=accept \
    protocol=tcp \
    dst-port=$webPort,$apiPort \
    in-interface=$publicInterface \
    comment="RTRW Billing - Allow web services"

# Rate limiting for web access
/ip firewall filter add \
    chain=forward \
    action=add-src-to-address-list \
    address-list=web-users \
    address-list-timeout=1h \
    protocol=tcp \
    dst-port=$webPort \
    dst-address=$localServerIP \
    comment="RTRW Billing - Track web users"

:put "Security rules configured"

# 7. Monitoring and Logging
:put "Setting up monitoring..."

# Enable logging for billing system traffic
/system logging add \
    topics=firewall \
    prefix="RTRW-Billing" \
    action=memory

# Create SNMP community for monitoring (optional)
/snmp community add \
    name="rtrw-monitor" \
    addresses=192.168.0.0/16 \
    read-access=yes \
    write-access=no

:put "Monitoring configured"

# 8. Backup Current Configuration
:put "Creating configuration backup..."

:local backupName ("rtrw-billing-backup-" . [/system clock get date] . "-" . [/system clock get time])
/system backup save name=$backupName
/export file=($backupName . ".rsc")

:put ("Backup saved as: " . $backupName)

# 9. Display Summary
:put ""
:put "=== Configuration Summary ==="
:put ("Server IP: " . $localServerIP)
:put ("Web Access: http://[your-public-ip]:" . $webPort)
:put ("API Access: http://[your-public-ip]:" . $apiPort)
:put ("Local Web: http://" . $localServerIP . ":" . $webPort)
:put ("Local API: http://" . $localServerIP . ":" . $apiPort)
:put ""
:put "=== Next Steps ==="
:put "1. Update your public IP in the billing system configuration"
:put "2. Test access from outside your network"
:put "3. Configure SSL certificate if needed"
:put "4. Setup monitoring alerts"
:put "5. Test all billing system features"
:put ""
:put "=== Useful Commands ==="
:put "Check NAT rules: /ip firewall nat print"
:put "Check filter rules: /ip firewall filter print"
:put "Check connections: /ip firewall connection print"
:put "Monitor traffic: /tool torch interface=" . $publicInterface
:put "View logs: /log print where topics~\"firewall\""
:put ""
:put "Configuration completed successfully!"
:put "For support: dzawin98@gmail.com"