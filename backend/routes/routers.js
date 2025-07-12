const express = require('express');
const router = express.Router();
const { Router } = require('../models');
const { RouterOSAPI } = require('node-routeros');

// GET /api/routers - Get all routers
router.get('/', async (req, res) => {
  try {
    const routers = await Router.findAll({
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      data: routers,
      message: 'Routers retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching routers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch routers',
      error: error.message
    });
  }
});

// GET /api/routers/:id - Get single router
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const router = await Router.findByPk(id);
    
    if (!router) {
      return res.status(404).json({
        success: false,
        message: 'Router not found'
      });
    }
    
    res.json({
      success: true,
      data: router,
      message: 'Router retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching router:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch router',
      error: error.message
    });
  }
});

// POST /api/routers - Create new router
router.post('/', async (req, res) => {
  try {
    const { name, ipAddress, port, username, password, area } = req.body;
    
    // Validation
    if (!name || !ipAddress || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, IP Address, Username, and Password are required'
      });
    }
    
    // Check if router with same IP already exists
    const existingRouter = await Router.findOne({ where: { ipAddress } });
    if (existingRouter) {
      return res.status(400).json({
        success: false,
        message: 'Router with this IP address already exists'
      });
    }
    
    const router = await Router.create({
      name,
      ipAddress,
      port: port || 8728,
      username,
      password,
      area: area || 'Default',
      status: 'offline',
      lastSeen: new Date()
    });
    
    res.status(201).json({
      success: true,
      data: router,
      message: 'Router created successfully'
    });
  } catch (error) {
    console.error('Error creating router:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create router',
      error: error.message
    });
  }
});

// PUT /api/routers/:id - Update router
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, ipAddress, port, username, password, area } = req.body;
    
    const router = await Router.findByPk(id);
    if (!router) {
      return res.status(404).json({
        success: false,
        message: 'Router not found'
      });
    }
    
    // Check if another router with same IP exists (excluding current router)
    if (ipAddress && ipAddress !== router.ipAddress) {
      const existingRouter = await Router.findOne({ 
        where: { 
          ipAddress,
          id: { [require('sequelize').Op.ne]: id }
        } 
      });
      if (existingRouter) {
        return res.status(400).json({
          success: false,
          message: 'Router with this IP address already exists'
        });
      }
    }
    
    await router.update({
      name: name || router.name,
      ipAddress: ipAddress || router.ipAddress,
      port: port || router.port,
      username: username || router.username,
      password: password || router.password,
      area: area || router.area
    });
    
    res.json({
      success: true,
      data: router,
      message: 'Router updated successfully'
    });
  } catch (error) {
    console.error('Error updating router:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update router',
      error: error.message
    });
  }
});

// DELETE /api/routers/:id - Delete router
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const router = await Router.findByPk(id);
    if (!router) {
      return res.status(404).json({
        success: false,
        message: 'Router not found'
      });
    }
    
    await router.destroy();
    
    res.json({
      success: true,
      message: 'Router deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting router:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete router',
      error: error.message
    });
  }
});

// POST /api/routers/:id/test-connection - Test router connection
router.post('/:id/test-connection', async (req, res) => {
  try {
    const { id } = req.params;
    const router = await Router.findByPk(id);
    
    if (!router) {
      return res.status(404).json({
        success: false,
        message: 'Router not found'
      });
    }

    // Test connection to MikroTik
    try {
      const conn = new RouterOSAPI({
        host: router.ipAddress,
        user: router.username,
        password: router.password,
        port: router.port || 8728,
        timeout: 5000
      });

      const startTime = Date.now();
      await conn.connect();
      
      // Get router info
      const identity = await conn.write('/system/identity/print');
      const resource = await conn.write('/system/resource/print');
      
      await conn.close();
      
      const latency = Date.now() - startTime;
      
      // Update router status
      await router.update({
        status: 'online',
        lastSeen: new Date(),
        model: resource[0]?.['board-name'] || 'Unknown',
        firmware: resource[0]?.version || 'Unknown',
        uptime: resource[0]?.uptime || 'Unknown'
      });
      
      res.json({
        success: true,
        data: {
          success: true,
          message: 'Connection successful',
          latency: latency,
          routerInfo: {
            identity: identity[0]?.name || 'Unknown',
            model: resource[0]?.['board-name'] || 'Unknown',
            version: resource[0]?.version || 'Unknown',
            uptime: resource[0]?.uptime || 'Unknown'
          }
        }
      });
    } catch (connectionError) {
      // Update router status to offline
      await router.update({
        status: 'offline',
        lastSeen: new Date()
      });
      
      res.json({
        success: true,
        data: {
          success: false,
          message: 'Connection failed: ' + connectionError.message
        }
      });
    }
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test connection',
      error: error.message
    });
  }
});

module.exports = router;