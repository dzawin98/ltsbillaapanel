const { RouterOSAPI } = require('node-routeros');
const { Router } = require('../models');

/**
 * Mikrotik API Utility untuk mengelola PPP Secrets
 */
class MikrotikAPI {
  /**
   * Membuat koneksi ke router Mikrotik
   * @param {string} routerName - Nama router
   * @returns {Promise<RouterOSAPI>} - Instance API connection
   */
  async connectToRouter(routerName) {
    try {
      // Ambil data router dari database
      const router = await Router.findOne({ where: { name: routerName } });
      if (!router) {
        throw new Error(`Router ${routerName} not found in database`);
      }

      // Buat koneksi ke Mikrotik dengan error handling yang lebih robust
      const conn = new RouterOSAPI({
        host: router.ipAddress,
        user: router.username,
        password: router.password,
        port: router.port || 8728,
        timeout: 5000, // Reduced timeout
        keepalive: false // Disable keepalive to prevent connection issues
      });

      // Add error handlers to prevent crashes
      conn.on('error', (error) => {
        console.error(`[MIKROTIK] Connection error for ${routerName}:`, error.message);
      });

      conn.on('close', () => {
        console.log(`[MIKROTIK] Connection closed for ${routerName}`);
      });

      await conn.connect();
      console.log(`[MIKROTIK] Connected to router ${routerName} at ${router.ipAddress}`);
      return conn;
    } catch (error) {
      console.error(`[MIKROTIK] Failed to connect to router ${routerName}:`, error.message);
      throw error;
    }
  }

  /**
   * Menghapus active connections berdasarkan username
   * @param {string} routerName - Nama router
   * @param {string} username - Username PPP
   * @returns {Promise<boolean>} - Status berhasil atau tidak
   */
  async removeActiveConnections(routerName, username) {
    let conn = null;
    try {
      console.log(`[DEBUG] removeActiveConnections called with routerName: ${routerName}, username: ${username}`);
      
      if (!username) {
        console.log(`No username provided to remove active connections for router ${routerName}`);
        return true;
      }

      console.log(`[DEBUG] Connecting to router ${routerName} for removing active connections`);
      conn = await this.connectToRouter(routerName);
      console.log(`[DEBUG] Successfully connected to router ${routerName}`);
      
      // Cari active connections berdasarkan username dengan optimasi .proplist
      console.log(`[DEBUG] Searching for active connections for username: ${username}`);
      const activeConnections = await conn.write('/ppp/active/print', [
        '?name=' + username,
        '.proplist=.id'
      ]);
      
      console.log(`[DEBUG] Found ${activeConnections.length} active connections for ${username}`);
      console.log(`[DEBUG] Active connections data:`, JSON.stringify(activeConnections, null, 2));

      if (activeConnections.length === 0) {
        console.log(`No active connections found for ${username} on router ${routerName}`);
        return true;
      }

      // Hapus semua active connections untuk username tersebut
      for (const connection of activeConnections) {
        const connectionId = connection['.id'];
        console.log(`[DEBUG] Removing connection ID: ${connectionId}`);
        await conn.write('/ppp/active/remove', [
          '=.id=' + connectionId
        ]);
        console.log(`Removed active connection ${connectionId} for ${username} on router ${routerName}`);
      }

      console.log(`All active connections for ${username} removed from router ${routerName}`);
      return true;
    } catch (error) {
      console.error(`[ERROR] Failed to remove active connections for ${username} on router ${routerName}:`, error.message);
      console.error(`[ERROR] Full error:`, error);
      return false;
    } finally {
      if (conn) {
        try {
          console.log(`[DEBUG] Closing connection to router ${routerName}`);
          await conn.close();
        } catch (closeError) {
          console.error('Error closing connection:', closeError.message);
        }
      }
    }
  }

  /**
   * Disable PPP Secret di Mikrotik dan hapus active connections
   * @param {string} routerName - Nama router
   * @param {string} username - Username PPP Secret
   * @returns {Promise<boolean>} - Status berhasil atau tidak
   */
  async disablePPPSecret(routerName, username) {
    let conn = null;
    try {
      console.log(`[MIKROTIK] disablePPPSecret called with routerName: ${routerName}, username: ${username}`);
      
      if (!username) {
        console.log(`[MIKROTIK] No PPP Secret to disable for router ${routerName}`);
        return { success: true, message: 'No username provided' };
      }

      // Add timeout wrapper for the entire operation
      const operationTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Operation timeout')), 15000);
      });

      const operation = async () => {
        conn = await this.connectToRouter(routerName);
        console.log(`[MIKROTIK] Connected to router ${routerName}`);
        
        // Cari PPP Secret berdasarkan username untuk mendapatkan ID
        console.log(`[MIKROTIK] Searching for PPP Secret: ${username}`);
        let secrets;
        try {
          secrets = await conn.write('/ppp/secret/print', [
            '?name=' + username,
            '.proplist=.id,name,disabled'
          ]);
          console.log(`[MIKROTIK] PPP Secret search result:`, secrets);
        } catch (searchError) {
          console.error(`[MIKROTIK] Failed to search PPP Secret:`, searchError.message);
          throw new Error(`Search failed: ${searchError.message}`);
        }
        
        if (secrets.length === 0) {
          console.log(`[MIKROTIK] PPP Secret ${username} not found on router ${routerName}`);
          return { success: false, message: 'PPP Secret not found' };
        }
        
        const secretId = secrets[0]['.id'];
        const isAlreadyDisabled = secrets[0].disabled === 'true';
        
        console.log(`[MIKROTIK] Found PPP Secret ID: ${secretId}, already disabled: ${isAlreadyDisabled}`);
        
        // Skip if already disabled
        if (isAlreadyDisabled) {
          console.log(`[MIKROTIK] PPP Secret ${username} is already disabled`);
          return { success: true, message: 'Already disabled' };
        }
        
        // Nonaktifkan PPP Secret menggunakan ID
        try {
          await conn.write('/ppp/secret/set', [
            '=.id=' + secretId,
            '=disabled=yes'
          ]);
          console.log(`[MIKROTIK] PPP Secret ${username} disabled on router ${routerName}`);
        } catch (disableError) {
          console.error(`[MIKROTIK] Failed to disable PPP Secret:`, disableError.message);
          throw new Error(`Disable failed: ${disableError.message}`);
        }
        
        // Hapus semua koneksi aktif untuk user ini (best effort)
        console.log(`[MIKROTIK] Starting active connection removal for ${username}`);
        try {
          const activeConnections = await conn.write('/ppp/active/print', [
            '?name=' + username,
            '.proplist=.id'
          ]);
          
          console.log(`[MIKROTIK] Found ${activeConnections.length} active connections for ${username}`);
          
          for (const connection of activeConnections) {
            const connectionId = connection['.id'];
            console.log(`[MIKROTIK] Removing active connection ID: ${connectionId}`);
            
            try {
              await conn.write('/ppp/active/remove', [
                '=.id=' + connectionId
              ]);
              console.log(`[MIKROTIK] Active connection ${connectionId} removed for user ${username}`);
            } catch (removeError) {
              console.error(`[MIKROTIK] Failed to remove connection ${connectionId}:`, removeError.message);
              // Continue with other connections
            }
          }
          
          console.log(`[MIKROTIK] Completed active connection removal for ${username}`);
        } catch (activeError) {
          console.error(`[MIKROTIK] Error during active connection removal for ${username}:`, activeError.message);
          // Don't fail the operation, PPP Secret is already disabled
        }
        
        return { success: true, message: 'PPP Secret disabled successfully' };
      };

      return await Promise.race([operation(), operationTimeout]);
      
    } catch (error) {
      console.error(`[MIKROTIK] Error disabling PPP Secret ${username} on router ${routerName}:`, error.message);
      return { success: false, message: error.message, error: error.name };
    } finally {
      if (conn) {
        try {
          await conn.close();
          console.log(`[MIKROTIK] Connection closed for router ${routerName}`);
        } catch (closeError) {
          console.error('[MIKROTIK] Error closing connection:', closeError.message);
        }
      }
    }
  }

  /**
   * Enable PPP Secret di Mikrotik
   * @param {string} routerName - Nama router
   * @param {string} username - Username PPP Secret
   * @returns {Promise<boolean>} - Status berhasil atau tidak
   */
  async enablePPPSecret(routerName, username) {
    let conn = null;
    try {
      if (!username) {
        console.log(`[MIKROTIK] No PPP Secret to enable for router ${routerName}`);
        return { success: true, message: 'No username provided' };
      }

      // Add timeout wrapper
      const operationTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Operation timeout')), 15000);
      });

      const operation = async () => {
        conn = await this.connectToRouter(routerName);
        
        // Cari PPP Secret berdasarkan username
        const secrets = await conn.write('/ppp/secret/print', [
          '?name=' + username,
          '.proplist=.id,name,disabled'
        ]);

        if (secrets.length === 0) {
          console.log(`[MIKROTIK] PPP Secret ${username} not found on router ${routerName}`);
          return { success: false, message: 'PPP Secret not found' };
        }

        const secretId = secrets[0]['.id'];
        const isAlreadyEnabled = secrets[0].disabled !== 'true';
        
        // Skip if already enabled
        if (isAlreadyEnabled) {
          console.log(`[MIKROTIK] PPP Secret ${username} is already enabled`);
          return { success: true, message: 'Already enabled' };
        }
        
        // Enable PPP Secret using set command (more reliable than enable)
        await conn.write('/ppp/secret/set', [
          '=.id=' + secretId,
          '=disabled=no'
        ]);

        console.log(`[MIKROTIK] PPP Secret ${username} enabled on router ${routerName}`);
        return { success: true, message: 'PPP Secret enabled successfully' };
      };

      return await Promise.race([operation(), operationTimeout]);
    } catch (error) {
      console.error(`[MIKROTIK] Failed to enable PPP Secret ${username} on router ${routerName}:`, error.message);
      return { success: false, message: error.message, error: error.name };
    } finally {
      if (conn) {
        try {
          await conn.close();
        } catch (closeError) {
          console.error('[MIKROTIK] Error closing connection:', closeError.message);
        }
      }
    }
  }

  /**
   * Cek status PPP Secret di Mikrotik
   * @param {string} routerName - Nama router
   * @param {string} username - Username PPP Secret
   * @returns {Promise<Object>} - Status dan info PPP Secret
   */
  async checkPPPSecretStatus(routerName, username) {
    let conn = null;
    try {
      if (!username) {
        return { success: false, found: false, disabled: null, message: 'No username provided' };
      }

      // Add timeout wrapper
      const operationTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Operation timeout')), 10000);
      });

      const operation = async () => {
        conn = await this.connectToRouter(routerName);
        
        // Cari PPP Secret berdasarkan username
        const secrets = await conn.write('/ppp/secret/print', [
          '?name=' + username,
          '.proplist=.id,name,disabled,profile,service'
        ]);

        if (secrets.length === 0) {
          return { success: true, found: false, disabled: null, message: 'PPP Secret not found' };
        }

        const secret = secrets[0];
        return {
          success: true,
          found: true,
          disabled: secret.disabled === 'true',
          profile: secret.profile,
          service: secret.service,
          message: 'Status retrieved successfully'
        };
      };

      return await Promise.race([operation(), operationTimeout]);
    } catch (error) {
      console.error(`[MIKROTIK] Failed to check PPP Secret ${username} on router ${routerName}:`, error.message);
      return { success: false, found: false, disabled: null, error: error.message, message: 'Check failed' };
    } finally {
      if (conn) {
        try {
          await conn.close();
        } catch (closeError) {
          console.error('[MIKROTIK] Error closing connection:', closeError.message);
        }
      }
    }
  }
}

// Export instance
module.exports = new MikrotikAPI();