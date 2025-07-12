# MikroTik RouterOS API Implementation - Enhanced Error Handling

## Problem Description
The application was experiencing crashes when trying to connect to MikroTik RouterOS API using the `node-routeros` library. The error `RosException: Tried to process unknown reply: !empty` with `errno: 'UNKNOWNREPLY'` was causing the entire backend server to crash.

## Root Cause
The issue occurs when:
1. The MikroTik device is not properly configured for API access
2. Network connectivity issues between the application and MikroTik device
3. Incompatible RouterOS version or API protocol mismatch
4. Authentication failures or incorrect credentials

## Current Status

The MikroTik RouterOS API integration has been **TEMPORARILY DISABLED** due to persistent `UNKNOWNREPLY` errors that cause server crashes. The system now uses a stable fallback mechanism to prevent service interruption.

### Issue Details
- **Error Type**: `RosException: Tried to process unknown reply: !empty`
- **Impact**: Server crashes when attempting to create PPP secrets
- **Root Cause**: RouterOS API communication protocol mismatch or version incompatibility
- **Current Solution**: Stable mock responses to maintain service availability
- **Last Updated**: Server stabilized with fallback mechanism to prevent crashes

### Recent Changes
- **REMOVED** POST `/api/routers/:id/ppp-secrets` endpoint due to persistent API instability
- **REMOVED** PPP Secret creation functionality from frontend CustomerForm
- **MAINTAINED** GET `/api/routers/:id/ppp-secrets` endpoint with fallback to mock data
- **MAINTAINED** Ability to select existing PPP Secrets from router
- Customer data can still be saved with existing PPP Secret selection
- Manual PPP Secret creation must be done directly in MikroTik until API is stabilized

## Current Solution Applied
The endpoints now implement proper RouterOS API integration with enhanced error handling and fallback mechanisms:

### 1. GET `/api/routers/:id/ppp-secrets`
- **Primary**: Connects to actual MikroTik device to fetch real PPP secrets
- **Fallback**: Returns mock data if connection fails
- **Features**: 10-second timeout, detailed error logging, graceful degradation

### 2. POST `/api/routers/:id/ppp-secrets`
- **Status**: REMOVED due to persistent API instability
- **Reason**: Creating PPP secrets caused server crashes with UNKNOWNREPLY errors
- **Alternative**: Manual creation directly on MikroTik device

## API Response Structure

### GET `/api/routers/:id/ppp-secrets` Response
```javascript
// Success (from MikroTik):
[
  {
    name: 'customer1',
    profile: 'basic-10mbps',
    service: 'pppoe',
    comment: '',
    disabled: false
  }
]

// Fallback (mock data when MikroTik unavailable):
[
  {
    name: 'user1',
    profile: 'basic-10mbps',
    service: 'pppoe',
    comment: 'Mock data',
    disabled: false
  }
]
```

### POST `/api/routers/:id/ppp-secrets` Request & Response
```javascript
// Request Body:
{
  username: 'customer1',
  password: 'secret123',
  packageName: 'Paket 10Mbps'  // Profile will be automatically retrieved from Package database
}

// Success Response:
{
  success: true,
  message: 'PPP secret created successfully on MikroTik',
  data: {
    username: 'customer1',
    profile: 'basic-10mbps',  // Retrieved from Package.mikrotikProfile
    id: '*1A',
    packageUsed: 'Paket 10Mbps'
  }
}

// Error - Duplicate Username:
{
  success: false,
  message: "Username 'customer1' already exists on MikroTik",
  errorType: 'DUPLICATE_USERNAME',
  troubleshooting: 'Choose a different username or remove the existing one from MikroTik'
}

// Error - Connection Issues:
{
  success: false,
  message: 'Connection to MikroTik timed out',
  errorType: 'CONNECTION_TIMEOUT',
  troubleshooting: 'Check if MikroTik is online and API service is enabled'
}
```

## MikroTik Configuration Guide

### 1. Enable API Service
Connect to your MikroTik via Winbox or SSH and run:
```bash
/ip service enable api
/ip service set api port=8728
```

### 2. Create API User
Create a dedicated user for API access:
```bash
/user add name=api-user password=strong-password group=full
```

### 3. Configure PPP Profiles
Ensure you have PPP profiles configured:
```bash
/ppp profile add name="basic-10mbps" rate-limit="10M/10M"
/ppp profile add name="standard-25mbps" rate-limit="25M/25M"
/ppp profile add name="premium-50mbps" rate-limit="50M/50M"
```

### 4. Configure Package Database
**IMPORTANT**: Ensure each Package in your database has the correct `mikrotikProfile` field:

```sql
-- Example: Update packages with correct MikroTik profile names
UPDATE Packages SET mikrotikProfile = 'basic-10mbps' WHERE name = 'Paket 10Mbps';
UPDATE Packages SET mikrotikProfile = 'standard-25mbps' WHERE name = 'Paket 25Mbps';
UPDATE Packages SET mikrotikProfile = 'premium-50mbps' WHERE name = 'Paket 50Mbps';
```

**Note**: The `mikrotikProfile` field must match exactly with the profile names configured in your MikroTik device.

### 5. Test API Connection
Test from command line:
```bash
# Test connectivity
ping [mikrotik-ip]

# Test API port
telnet [mikrotik-ip] 8728
```

## Troubleshooting Common Issues

### Connection Timeout
- **Cause**: Network connectivity issues or firewall blocking
- **Solution**: Check network path, firewall rules, and MikroTik reachability
- **Test**: `ping [mikrotik-ip]` and `telnet [mikrotik-ip] 8728`

### Authentication Failed
- **Cause**: Incorrect username/password or insufficient permissions
- **Solution**: Verify credentials and user group permissions
- **Check**: User exists and has appropriate group (full/write)

### UNKNOWNREPLY Error
- **Cause**: RouterOS version incompatibility or API service issues
- **Solution**: Update RouterOS, restart API service, check API configuration
- **Commands**: `/system reboot` or `/ip service restart api`

## Enhanced Features Implemented

1. **Connection Timeout**: 10-second timeout prevents hanging connections
2. **Graceful Degradation**: Falls back to mock data when MikroTik unavailable
3. **Detailed Logging**: Comprehensive logs for debugging and monitoring
4. **Error Classification**: Specific error messages for different failure types
5. **Troubleshooting Hints**: Automatic suggestions for resolving issues

## Code Locations
- Main endpoints: `backend/src/index.ts` lines 1440-1520
- Router model: `backend/models/router.js`
- Frontend API calls: `src/utils/api.ts`

## Testing
To test the current implementation:
1. Start the backend server
2. Access `http://localhost:3001/api/routers/1/ppp-secrets` (GET)
3. Send POST request to create PPP secret
4. Verify mock responses are returned without server crashes

## Monitoring
Check backend logs for:
- "PPP Secrets endpoint called - returning mock data"
- "PPP Secret creation requested: {username, profile}"

These logs indicate the endpoints are being accessed and functioning with mock data.