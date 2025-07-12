import express, { Express, Request, Response } from 'express';
import cors from 'cors';
const db = require('../models');

import { RouterOSAPI } from 'node-routeros';

// Import moment-timezone untuk konsistensi timezone
const moment = require('moment-timezone');
moment.tz.setDefault('Asia/Jakarta');

// Helper function untuk mendapatkan waktu Jakarta
function getJakartaTime() {
  return moment.tz('Asia/Jakarta');
}

const app: Express = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Test Database Connection
const testDbConnection = async () => {
  try {
    await db.sequelize.authenticate();
    console.log('Connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};
testDbConnection();

// Area CRUD Endpoints

// Get all areas
app.get('/api/areas', async (req: Request, res: Response) => {
  try {
    const areas = await db.Area.findAll({
      order: [['createdAt', 'DESC']]
    });

// Debug endpoint untuk memeriksa customer dengan PPP Secret
app.get('/api/debug/customers-with-ppp', async (req: Request, res: Response) => {
  try {
    const customers = await db.Customer.findAll({
      where: {
        pppSecret: {
          [db.Sequelize.Op.ne]: null
        },
        routerName: {
          [db.Sequelize.Op.ne]: null
        }
      },
      attributes: ['id', 'name', 'pppSecret', 'routerName', 'mikrotikStatus', 'billingStatus', 'serviceStatus']
    });
    
    res.json({
      success: true,
      data: customers,
      count: customers.length
    });
  } catch (error: any) {
    console.error('Error fetching customers with PPP:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch customers with PPP', 
      error: error.message 
    });
  }
});

// Debug endpoint untuk test auto-enable manual
app.post('/api/debug/test-auto-enable/:customerId', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    
    console.log(`🔧 Manual test auto-enable for customer ${customerId}`);
    
    // Ambil data customer dengan relasi router
    const customer = await db.Customer.findByPk(customerId, {
      include: [{
        model: db.Router,
        as: 'routerData'
      }]
    });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    console.log(`Customer data:`, {
      id: customer.id,
      name: customer.name,
      pppSecret: customer.pppSecret,
      routerId: customer.routerId,
      routerName: customer.routerData ? customer.routerData.name : null,
      mikrotikStatus: customer.mikrotikStatus
    });
    
    if (!customer.pppSecret) {
      return res.json({
        success: false,
        message: 'Customer does not have PPP Secret',
        customerData: {
          id: customer.id,
          name: customer.name,
          pppSecret: customer.pppSecret,
          routerId: customer.routerId,
          routerName: customer.routerData ? customer.routerData.name : null
        }
      });
    }
    
    if (!customer.routerData || !customer.routerData.name) {
      return res.json({
        success: false,
        message: 'Customer does not have valid router',
        customerData: {
          id: customer.id,
          name: customer.name,
          pppSecret: customer.pppSecret,
          routerId: customer.routerId,
          routerName: customer.routerData ? customer.routerData.name : null
        }
      });
    }
    
    // Import mikrotik utility
    const mikrotikAPI = require('../utils/mikrotik');
    
    // Enable PPP Secret di MikroTik
    console.log(`Calling enablePPPSecret with routerName: ${customer.routerData.name}, pppSecret: ${customer.pppSecret}`);
    const enableResult = await mikrotikAPI.enablePPPSecret(customer.routerData.name, customer.pppSecret);
    
    console.log('MikroTik enable result:', enableResult);
    
    if (enableResult.success) {
      // Update customer status
      await customer.update({
        billingStatus: 'lunas',
        mikrotikStatus: 'active',
        serviceStatus: 'active'
      });
      
      console.log(`✅ PPP Secret ${customer.pppSecret} manually enabled for customer ${customer.name}`);
      
      res.json({
        success: true,
        message: 'PPP Secret enabled successfully',
        customerData: {
          id: customer.id,
          name: customer.name,
          pppSecret: customer.pppSecret,
          routerId: customer.routerId,
          routerName: customer.routerData.name,
          mikrotikStatus: 'active'
        },
        mikrotikResult: enableResult
      });
    } else {
      console.error(`❌ Failed to enable PPP Secret ${customer.pppSecret} for customer ${customer.name}:`, enableResult.message);
      
      res.status(500).json({
        success: false,
        message: `Failed to enable PPP Secret: ${enableResult.message}`,
        customerData: {
          id: customer.id,
          name: customer.name,
          pppSecret: customer.pppSecret,
          routerId: customer.routerId,
          routerName: customer.routerData.name
        },
        mikrotikResult: enableResult
      });
    }
    
  } catch (error: any) {
    console.error('❌ Failed to test auto-enable:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test auto-enable',
      error: error.message
    });
  }
});
    res.json({
      success: true,
      data: areas,
      message: 'Areas retrieved successfully',
      timestamp: getJakartaTime().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch areas',
      error: error.message,
      timestamp: getJakartaTime().toISOString()
    });
  }
});

// Create a new area
app.post('/api/areas', async (req: Request, res: Response) => {
  try {
    const { name, description, status } = req.body;
    
    // Validasi input
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Area name is required'
      });
    }
    
    // Cek duplikasi nama area
    const existingArea = await db.Area.findOne({ where: { name } });
    if (existingArea) {
      return res.status(400).json({
        success: false,
        message: 'Area with this name already exists'
      });
    }
    
    const area = await db.Area.create({
      name,
      description: description || '',
      status: status || 'active',
      routerCount: 0,
      customerCount: 0,
      revenue: 0
    });
    
    res.status(201).json({
      success: true,
      data: area,
      message: 'Area created successfully'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: 'Failed to create area',
      error: error.message
    });
  }
});

// Get a single area by id
app.get('/api/areas/:id', async (req: Request, res: Response) => {
  try {
    const area = await db.Area.findByPk(req.params.id);
    if (area) {
      res.json({
        success: true,
        data: area,
        message: 'Area retrieved successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Area not found'
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch area',
      error: error.message
    });
  }
});

// Update an area
app.put('/api/areas/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;
    
    const area = await db.Area.findByPk(id);
    if (!area) {
      return res.status(404).json({
        success: false,
        message: 'Area not found'
      });
    }
    
    // Cek duplikasi nama area (kecuali area yang sedang diedit)
    if (name && name !== area.name) {
      const existingArea = await db.Area.findOne({ 
        where: { 
          name,
          id: { [require('sequelize').Op.ne]: id }
        } 
      });
      if (existingArea) {
        return res.status(400).json({
          success: false,
          message: 'Area with this name already exists'
        });
      }
    }
    
    await area.update({
      name: name || area.name,
      description: description !== undefined ? description : area.description,
      status: status || area.status
    });
    
    res.json({
      success: true,
      data: area,
      message: 'Area updated successfully'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: 'Failed to update area',
      error: error.message
    });
  }
});

// Delete an area
app.delete('/api/areas/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const area = await db.Area.findByPk(id);
    if (!area) {
      return res.status(404).json({
        success: false,
        message: 'Area not found'
      });
    }
    
    // Cek apakah area masih digunakan oleh router atau customer
    const routerCount = await db.Router.count({ where: { area: area.name } });
    const customerCount = await db.Customer.count({ where: { area: area.name } });
    
    if (routerCount > 0 || customerCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete area. It is still being used by ${routerCount} router(s) and ${customerCount} customer(s)`
      });
    }
    
    await area.destroy();
    
    res.json({
      success: true,
      message: 'Area deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete area',
      error: error.message
    });
  }
});

// Router CRUD Endpoints

// Get all routers
app.get('/api/routers', async (req: Request, res: Response) => {
  try {
    const routers = await db.Router.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json({
      success: true,
      data: routers,
      message: 'Routers retrieved successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch routers',
      error: error.message
    });
  }
});

// Create a new router
app.post('/api/routers', async (req: Request, res: Response) => {
  try {
    const router = await db.Router.create(req.body);
    res.status(201).json({
      success: true,
      data: router,
      message: 'Router created successfully'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: 'Failed to create router',
      error: error.message
    });
  }
});

// Get a single router by id
app.get('/api/routers/:id', async (req: Request, res: Response) => {
    try {
        const router = await db.Router.findByPk(req.params.id);
        if (router) {
            res.json(router);
        } else {
            res.status(404).json({ message: 'Router not found' });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// Update a router
app.put('/api/routers/:id', async (req: Request, res: Response) => {
    try {
        const [updated] = await db.Router.update(req.body, {
            where: { id: req.params.id }
        });
        if (updated) {
            const updatedRouter = await db.Router.findByPk(req.params.id);
            res.json({
              success: true,
              data: updatedRouter,
              message: 'Router updated successfully'
            });
        } else {
            res.status(404).json({
              success: false,
              message: 'Router not found'
            });
        }
    } catch (error: any) {
        res.status(400).json({
          success: false,
          message: 'Failed to update router',
          error: error.message
        });
    }
});

// Delete a router
app.delete('/api/routers/:id', async (req: Request, res: Response) => {
    try {
        const deleted = await db.Router.destroy({
            where: { id: req.params.id }
        });
        if (deleted) {
            res.json({
              success: true,
              message: 'Router deleted successfully'
            });
        } else {
            res.status(404).json({
              success: false,
              message: 'Router not found'
            });
        }
    } catch (error: any) {
        res.status(500).json({
          success: false,
          message: 'Failed to delete router',
          error: error.message
        });
    }
});

// Test router connection endpoint
app.post('/api/routers/:id/test-connection', async (req: Request, res: Response) => {
  try {
    const router = await db.Router.findByPk(req.params.id);
    if (!router) {
      return res.status(404).json({ 
        success: false,
        message: 'Router not found' 
      });
    }
    
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
      
      const identity = await conn.write('/system/identity/print');
      const resource = await conn.write('/system/resource/print');
      
      await conn.close();
      const latency = Date.now() - startTime;
      
      // Update router status
      await router.update({
        status: 'online',
        lastSeen: new Date()
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
    } catch (connectionError: any) {
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to test connection',
      error: error.message
    });
  }
});

// ODP CRUD Endpoints

// Get all ODPs
app.get('/api/odps', async (req: Request, res: Response) => {
  try {
    const odps = await db.ODP.findAll({
      order: [['createdAt', 'DESC']]
    });
    
    // Transform data untuk menambahkan availableSlots
    const transformedOdps = odps.map((odp: any) => ({
      ...odp.toJSON(),
      availableSlots: odp.totalSlots - odp.usedSlots,
      coordinates: odp.latitude && odp.longitude ? {
        latitude: parseFloat(odp.latitude),
        longitude: parseFloat(odp.longitude)
      } : null
    }));
    
    res.json({
      success: true,
      data: transformedOdps,
      message: 'ODPs retrieved successfully'
    });
  } catch (error: any) {
    console.error('Error fetching ODPs:', error);
    res.status(500).json({ 
      success: false, 
      data: null, 
      message: 'Failed to fetch ODPs', 
      error: error.message 
    });
  }
});

// Create a new ODP
app.post('/api/odps', async (req: Request, res: Response) => {
  try {
    const { name, location, area, totalSlots, usedSlots, latitude, longitude, status } = req.body;
    
    // Validasi input
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Nama ODP harus diisi'
      });
    }
    
    if (!location || !location.trim()) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Lokasi ODP harus diisi'
      });
    }
    
    // Cek duplikasi nama ODP
    const existingODP = await db.ODP.findOne({ where: { name: name.trim() } });
    if (existingODP) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Nama ODP sudah digunakan'
      });
    }
    
    const finalTotalSlots = totalSlots || 8;
    const finalUsedSlots = usedSlots || 0;
    
    if (finalUsedSlots > finalTotalSlots) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Slot terpakai tidak boleh lebih dari total slot'
      });
    }
    
    const odp = await db.ODP.create({
      name: name.trim(),
      location: location.trim(),
      area: area || '',
      totalSlots: finalTotalSlots,
      usedSlots: finalUsedSlots,
      latitude,
      longitude,
      status: status || 'active'
    });
    
    // Transform response
    const transformedOdp = {
      ...odp.toJSON(),
      availableSlots: odp.totalSlots - odp.usedSlots,
      coordinates: odp.latitude && odp.longitude ? {
        latitude: parseFloat(odp.latitude),
        longitude: parseFloat(odp.longitude)
      } : null
    };
    
    res.status(201).json({
      success: true,
      data: transformedOdp,
      message: 'ODP berhasil ditambahkan'
    });
  } catch (error: any) {
    console.error('Error creating ODP:', error);
    res.status(500).json({ 
      success: false, 
      data: null, 
      message: 'Failed to create ODP', 
      error: error.message 
    });
  }
});

// Get a single ODP by id
app.get('/api/odps/:id', async (req: Request, res: Response) => {
  try {
    const odp = await db.ODP.findByPk(req.params.id);
    if (!odp) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'ODP tidak ditemukan'
      });
    }
    
    const transformedOdp = {
      ...odp.toJSON(),
      availableSlots: odp.totalSlots - odp.usedSlots,
      coordinates: odp.latitude && odp.longitude ? {
        latitude: parseFloat(odp.latitude),
        longitude: parseFloat(odp.longitude)
      } : null
    };
    
    res.json({
      success: true,
      data: transformedOdp,
      message: 'ODP retrieved successfully'
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      data: null, 
      message: 'Failed to fetch ODP', 
      error: error.message 
    });
  }
});

// Update an ODP
app.put('/api/odps/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, location, area, totalSlots, usedSlots, latitude, longitude, status } = req.body;
    
    const odp = await db.ODP.findByPk(id);
    if (!odp) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'ODP tidak ditemukan'
      });
    }
    
    // Validasi input
    if (name && !name.trim()) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Nama ODP tidak boleh kosong'
      });
    }
    
    // Cek duplikasi nama ODP (kecuali untuk ODP yang sedang diedit)
    if (name && name.trim() !== odp.name) {
      const existingODP = await db.ODP.findOne({ 
        where: { 
          name: name.trim(),
          id: { [db.Sequelize.Op.ne]: id }
        } 
      });
      if (existingODP) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'Nama ODP sudah digunakan'
        });
      }
    }
    
    const finalTotalSlots = totalSlots !== undefined ? totalSlots : odp.totalSlots;
    const finalUsedSlots = usedSlots !== undefined ? usedSlots : odp.usedSlots;
    
    if (finalUsedSlots > finalTotalSlots) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Slot terpakai tidak boleh lebih dari total slot'
      });
    }
    
    await odp.update({
      name: name ? name.trim() : odp.name,
      location: location ? location.trim() : odp.location,
      area: area !== undefined ? area : odp.area,
      totalSlots: finalTotalSlots,
      usedSlots: finalUsedSlots,
      latitude: latitude !== undefined ? latitude : odp.latitude,
      longitude: longitude !== undefined ? longitude : odp.longitude,
      status: status !== undefined ? status : odp.status
    });
    
    // Transform response
    const transformedOdp = {
      ...odp.toJSON(),
      availableSlots: odp.totalSlots - odp.usedSlots,
      coordinates: odp.latitude && odp.longitude ? {
        latitude: parseFloat(odp.latitude),
        longitude: parseFloat(odp.longitude)
      } : null
    };
    
    res.json({
      success: true,
      data: transformedOdp,
      message: 'ODP berhasil diperbarui'
    });
  } catch (error: any) {
    console.error('Error updating ODP:', error);
    res.status(500).json({ 
      success: false, 
      data: null, 
      message: 'Failed to update ODP', 
      error: error.message 
    });
  }
});

// Delete an ODP
app.delete('/api/odps/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const odp = await db.ODP.findByPk(id);
    if (!odp) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'ODP tidak ditemukan'
      });
    }
    
    // Cek apakah ODP masih digunakan oleh customer
    const customerCount = await db.Customer.count({ where: { odpSlot: id } });
    if (customerCount > 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: `ODP tidak dapat dihapus karena masih digunakan oleh ${customerCount} pelanggan`
      });
    }
    
    await odp.destroy();
    
    res.json({
      success: true,
      data: null,
      message: 'ODP berhasil dihapus'
    });
  } catch (error: any) {
    console.error('Error deleting ODP:', error);
    res.status(500).json({ 
      success: false, 
      data: null, 
      message: 'Failed to delete ODP', 
      error: error.message 
    });
  }
});

// Package CRUD Endpoints

// Get all packages
app.get('/api/packages', async (req: Request, res: Response) => {
  try {
    const packages = await db.Package.findAll({
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      data: packages,
      message: 'Packages retrieved successfully'
    });
  } catch (error: any) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ 
      success: false, 
      data: null, 
      message: 'Failed to fetch packages', 
      error: error.message 
    });
  }
});

// Create a new package
app.post('/api/packages', async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      downloadSpeed,
      uploadSpeed,
      price,
      duration,
      mikrotikProfile,
      isActive,
      allowUpgradeDowngrade,
      onlineRegistration,
      taxPercentage,
      agentCommission,
      routerName
    } = req.body;
    
    // Validasi input
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Nama paket harus diisi'
      });
    }
    
    if (!downloadSpeed || downloadSpeed <= 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Kecepatan download harus lebih dari 0'
      });
    }
    
    if (!uploadSpeed || uploadSpeed <= 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Kecepatan upload harus lebih dari 0'
      });
    }
    
    if (!price || price <= 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Harga paket harus lebih dari 0'
      });
    }
    
    // Cek duplikasi nama paket
    const existingPackage = await db.Package.findOne({ where: { name: name.trim() } });
    if (existingPackage) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Nama paket sudah digunakan'
      });
    }
    
    const pkg = await db.Package.create({
      name: name.trim(),
      description: description || '',
      downloadSpeed,
      uploadSpeed,
      price,
      duration: duration || 30,
      mikrotikProfile: mikrotikProfile || '',
      isActive: isActive !== undefined ? isActive : true,
      allowUpgradeDowngrade: allowUpgradeDowngrade !== undefined ? allowUpgradeDowngrade : true,
      onlineRegistration: onlineRegistration !== undefined ? onlineRegistration : true,
      taxPercentage: taxPercentage || 0,
      agentCommission: agentCommission || 0,
      routerName: routerName || ''
    });
    
    res.status(201).json({
      success: true,
      data: pkg,
      message: 'Paket berhasil ditambahkan'
    });
  } catch (error: any) {
    console.error('Error creating package:', error);
    res.status(500).json({ 
      success: false, 
      data: null, 
      message: 'Failed to create package', 
      error: error.message 
    });
  }
});

// Get a single package by id
app.get('/api/packages/:id', async (req: Request, res: Response) => {
  try {
    const pkg = await db.Package.findByPk(req.params.id);
    if (!pkg) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Paket tidak ditemukan'
      });
    }
    
    res.json({
      success: true,
      data: pkg,
      message: 'Package retrieved successfully'
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      data: null, 
      message: 'Failed to fetch package', 
      error: error.message 
    });
  }
});

// Update a package
app.put('/api/packages/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      downloadSpeed,
      uploadSpeed,
      price,
      duration,
      mikrotikProfile,
      isActive,
      allowUpgradeDowngrade,
      onlineRegistration,
      taxPercentage,
      agentCommission,
      routerName
    } = req.body;
    
    const pkg = await db.Package.findByPk(id);
    if (!pkg) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Paket tidak ditemukan'
      });
    }
    
    // Validasi input
    if (name && !name.trim()) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Nama paket tidak boleh kosong'
      });
    }
    
    if (downloadSpeed !== undefined && downloadSpeed <= 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Kecepatan download harus lebih dari 0'
      });
    }
    
    if (uploadSpeed !== undefined && uploadSpeed <= 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Kecepatan upload harus lebih dari 0'
      });
    }
    
    if (price !== undefined && price <= 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Harga paket harus lebih dari 0'
      });
    }
    
    // Cek duplikasi nama paket (kecuali untuk paket yang sedang diedit)
    if (name && name.trim() !== pkg.name) {
      const existingPackage = await db.Package.findOne({ 
        where: { 
          name: name.trim(),
          id: { [db.Sequelize.Op.ne]: id }
        } 
      });
      if (existingPackage) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'Nama paket sudah digunakan'
        });
      }
    }
    
    await pkg.update({
      name: name ? name.trim() : pkg.name,
      description: description !== undefined ? description : pkg.description,
      downloadSpeed: downloadSpeed !== undefined ? downloadSpeed : pkg.downloadSpeed,
      uploadSpeed: uploadSpeed !== undefined ? uploadSpeed : pkg.uploadSpeed,
      price: price !== undefined ? price : pkg.price,
      duration: duration !== undefined ? duration : pkg.duration,
      mikrotikProfile: mikrotikProfile !== undefined ? mikrotikProfile : pkg.mikrotikProfile,
      isActive: isActive !== undefined ? isActive : pkg.isActive,
      allowUpgradeDowngrade: allowUpgradeDowngrade !== undefined ? allowUpgradeDowngrade : pkg.allowUpgradeDowngrade,
      onlineRegistration: onlineRegistration !== undefined ? onlineRegistration : pkg.onlineRegistration,
      taxPercentage: taxPercentage !== undefined ? taxPercentage : pkg.taxPercentage,
      agentCommission: agentCommission !== undefined ? agentCommission : pkg.agentCommission,
      routerName: routerName !== undefined ? routerName : pkg.routerName
    });
    
    res.json({
      success: true,
      data: pkg,
      message: 'Paket berhasil diperbarui'
    });
  } catch (error: any) {
    console.error('Error updating package:', error);
    res.status(500).json({ 
      success: false, 
      data: null, 
      message: 'Failed to update package', 
      error: error.message 
    });
  }
});

// Delete a package
app.delete('/api/packages/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const pkg = await db.Package.findByPk(id);
    if (!pkg) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Paket tidak ditemukan'
      });
    }
    
    // Cek apakah paket masih digunakan oleh customer
    const customerCount = await db.Customer.count({ where: { packageId: id } });
    if (customerCount > 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: `Paket tidak dapat dihapus karena masih digunakan oleh ${customerCount} pelanggan`
      });
    }
    
    await pkg.destroy();
    
    res.json({
      success: true,
      data: null,
      message: 'Paket berhasil dihapus'
    });
  } catch (error: any) {
    console.error('Error deleting package:', error);
    res.status(500).json({ 
      success: false, 
      data: null, 
      message: 'Failed to delete package', 
      error: error.message 
    });
  }
});

// Update endpoint ini:
app.get('/api/routers/:id/ppp-profiles', async (req: Request, res: Response) => {
  try {
    const router = await db.Router.findByPk(req.params.id);
    if (!router) {
      return res.status(404).json({ message: 'Router not found' });
    }
    
    try {
      // Koneksi ke Mikrotik
      const conn = new RouterOSAPI({
        host: router.ipAddress,
        user: router.username,
        password: router.password,
        port: router.port || 8728
      });
      
      await conn.connect();
      
      // Ambil PPP profiles
      const profiles = await conn.write('/ppp/profile/print');
      
      // Transform data
      const transformedProfiles = profiles.map((profile: any) => ({
        name: profile.name,
        rateLimit: profile['rate-limit'] || 'unlimited',
        remoteAddress: profile['remote-address'],
        localAddress: profile['local-address']
      }));
      
      await conn.close();
      res.json(transformedProfiles);
      
    } catch (mikrotikError) {
      console.error('Mikrotik connection error:', mikrotikError);
      // Fallback ke mock data jika koneksi gagal
      const mockProfiles = [
        { name: 'basic-10mbps', rateLimit: '10M/5M' },
        { name: 'standard-25mbps', rateLimit: '25M/10M' },
        { name: 'premium-50mbps', rateLimit: '50M/20M' },
        { name: 'ultimate-100mbps', rateLimit: '100M/50M' }
      ];
      res.json(mockProfiles);
    }
  } catch (error: any) {
    console.error('Error fetching PPP profiles:', error);
    res.status(500).json({ message: 'Failed to fetch PPP profiles', error: error.message });
  }
});

// Customer CRUD Endpoints

// Get all customers with router data and ODP data
app.get('/api/customers', async (req: Request, res: Response) => {
  try {
    const customers = await db.Customer.findAll({
      include: [
        {
          model: db.Router,
          as: 'routerData',
          attributes: ['id', 'name', 'ipAddress'],
          required: false // LEFT JOIN instead of INNER JOIN
        },
        {
          model: db.ODP,
          as: 'odpData',
          attributes: ['id', 'name', 'location', 'area', 'totalSlots', 'usedSlots', 'availableSlots'],
          required: false // LEFT JOIN instead of INNER JOIN
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      data: customers
    });
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    console.error('Error details:', {
      message: error.message,
      sql: error.sql,
      original: error.original
    });
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch customers', 
      error: error.message 
    });
  }
});

// Create customer - dengan dukungan ODP
app.post('/api/customers', async (req: Request, res: Response) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const customerData = req.body;
    
    // Validasi input yang lebih lengkap
    if (!customerData.name || !customerData.name.trim()) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Nama pelanggan harus diisi'
      });
    }
    
    if (!customerData.phone || !customerData.phone.trim()) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Nomor telepon harus diisi'
      });
    }
    
    // Handle ODP slot allocation
    if (customerData.odpId) {
      // Pastikan odpId dikonversi ke integer
      const odpIdInt = parseInt(customerData.odpId);
      if (isNaN(odpIdInt)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          data: null,
          message: 'ODP ID harus berupa angka'
        });
      }
      
      const odp = await db.ODP.findByPk(odpIdInt, { transaction });
      
      if (!odp) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          data: null,
          message: 'ODP tidak ditemukan'
        });
      }
      
      if (odp.availableSlots <= 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          data: null,
          message: 'Slot ODP sudah penuh'
        });
      }
      
      // Update ODP slots
      await odp.update({
        usedSlots: odp.usedSlots + 1,
        availableSlots: odp.availableSlots - 1
      }, { transaction });
    }
    
    // Set default values untuk field yang tidak wajib
    const processedData = {
      ...customerData,
      idNumber: customerData.idNumber || null,
      email: customerData.email || null,
      address: customerData.address || null,
      notes: customerData.notes || null
    };
    
    // Mapping field router dari frontend ke routerId
    if (processedData.router && !processedData.routerId) {
      processedData.routerId = processedData.router;
      delete processedData.router;
    }
    
    // Jika ada routerName, cari routerId
    if (processedData.routerName && !processedData.routerId) {
      const router = await db.Router.findOne({ 
        where: { name: processedData.routerName },
        transaction
      });
      if (router) {
        processedData.routerId = router.id;
      }
    }
    
    // Generate customer number
    const count = await db.Customer.count({ transaction });
    processedData.customerNumber = 'LTS' + (count + 1).toString().padStart(4, '0');
    
    const customer = await db.Customer.create(processedData, { transaction });
    
    // Return with router and ODP data
    const customerWithRelations = await db.Customer.findByPk(customer.id, {
      include: [
        {
          model: db.Router,
          as: 'routerData',
          attributes: ['id', 'name', 'ipAddress']
        },
        {
          model: db.ODP,
          as: 'odpData',
          attributes: ['id', 'name', 'location', 'area', 'totalSlots', 'usedSlots', 'availableSlots']
        }
      ],
      transaction
    });
    
    await transaction.commit();
    
    res.status(201).json({
      success: true,
      data: customerWithRelations,
      message: 'Pelanggan berhasil ditambahkan'
    });
  } catch (error: any) {
    await transaction.rollback();
    console.error('Error creating customer:', error);
    console.error('Request data:', req.body);
    res.status(500).json({ 
      success: false,
      data: null,
      message: 'Failed to create customer', 
      error: error.message 
    });
  }
});

// Update customer - dengan dukungan ODP
app.put('/api/customers/:id', async (req: Request, res: Response) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const customer = await db.Customer.findByPk(id, { transaction });
    if (!customer) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Pelanggan tidak ditemukan'
      });
    }
    
    // Handle ODP slot changes
    const oldOdpId = customer.odpId;
    const newOdpId = updateData.odpId;
    
    if (oldOdpId !== newOdpId) {
      // Return slot to old ODP
      if (oldOdpId) {
        const oldOdp = await db.ODP.findByPk(oldOdpId, { transaction });
        if (oldOdp) {
          await oldOdp.update({
            usedSlots: Math.max(0, oldOdp.usedSlots - 1),
            availableSlots: Math.min(oldOdp.totalSlots, oldOdp.availableSlots + 1)
          }, { transaction });
        }
      }
      
      // Allocate slot to new ODP
      if (newOdpId) {
        const newOdp = await db.ODP.findByPk(newOdpId, { transaction });
        
        if (!newOdp) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            data: null,
            message: 'ODP baru tidak ditemukan'
          });
        }
        
        if (newOdp.availableSlots <= 0) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            data: null,
            message: 'Slot ODP baru sudah penuh'
          });
        }
        
        await newOdp.update({
          usedSlots: newOdp.usedSlots + 1,
          availableSlots: newOdp.availableSlots - 1
        }, { transaction });
      }
    }
    
    await customer.update(updateData, { transaction });
    
    // Return updated customer with relations
    const updatedCustomer = await db.Customer.findByPk(customer.id, {
      include: [
        {
          model: db.Router,
          as: 'routerData',
          attributes: ['id', 'name', 'ipAddress']
        },
        {
          model: db.ODP,
          as: 'odpData',
          attributes: ['id', 'name', 'location', 'area', 'totalSlots', 'usedSlots', 'availableSlots']
        }
      ],
      transaction
    });
    
    await transaction.commit();
    
    res.json({
      success: true,
      data: updatedCustomer,
      message: 'Pelanggan berhasil diperbarui'
    });
  } catch (error: any) {
    await transaction.rollback();
    console.error('Error updating customer:', error);
    res.status(500).json({ 
      success: false,
      data: null,
      message: 'Failed to update customer', 
      error: error.message 
    });
  }
});

// Get a single customer by id - dengan ODP data
app.get('/api/customers/:id', async (req: Request, res: Response) => {
  try {
    const customer = await db.Customer.findByPk(req.params.id, {
      include: [
        {
          model: db.Router,
          as: 'routerData',
          attributes: ['id', 'name', 'ipAddress']
        },
        {
          model: db.ODP,
          as: 'odpData',
          attributes: ['id', 'name', 'location', 'area', 'totalSlots', 'usedSlots', 'availableSlots']
        }
      ]
    });
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Pelanggan tidak ditemukan'
      });
    }
    
    res.json({
      success: true,
      data: customer,
      message: 'Customer retrieved successfully'
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      data: null,
      message: 'Failed to fetch customer', 
      error: error.message 
    });
  }
});



// Delete customer - dengan pengembalian slot ODP
app.delete('/api/customers/:id', async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const { id } = req.params;
    
    // Find customer first to get ODP slot info
    const customer = await db.Customer.findByPk(id, { transaction });
    if (!customer) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    // If customer has ODP, return the slot
    if (customer.odpId) {
      const odp = await db.ODP.findByPk(customer.odpId, { transaction });
      if (odp) {
        await odp.update({
          usedSlots: Math.max(0, odp.usedSlots - 1),
          availableSlots: Math.min(odp.totalSlots, odp.availableSlots + 1)
        }, { transaction });
      }
    }
    
    // Delete customer
    await customer.destroy({ transaction });
    
    await transaction.commit();
    
    res.json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting customer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete customer'
    });
  }
});

// Get customer statistics
app.get('/api/customers/stats', async (req: Request, res: Response) => {
  try {
    const totalCustomers = await db.Customer.count();
    const activeCustomers = await db.Customer.count({ where: { status: 'active' } });
    const suspendedCustomers = await db.Customer.count({ where: { status: 'suspended' } });
    const pendingCustomers = await db.Customer.count({ where: { status: 'pending' } });
    
    const customers = await db.Customer.findAll();
    const grandTotalRevenue = customers.reduce((sum: number, customer: any) => {
      return sum + (customer.packagePrice + (customer.addonPrice || 0) - (customer.discount || 0));
    }, 0);
    
    const currentBills = customers
      .filter((customer: any) => customer.status === 'active' && new Date(customer.paymentDueDate) >= new Date())
      .reduce((sum: number, customer: any) => {
        return sum + (customer.packagePrice + (customer.addonPrice || 0) - (customer.discount || 0));
      }, 0);
    
    res.json({
      totalCustomers,
      activeCustomers,
      suspendedCustomers,
      pendingCustomers,
      grandTotalRevenue,
      currentBills
    });
  } catch (error: any) {
    console.error('Error fetching customer stats:', error);
    res.status(500).json({ message: 'Failed to fetch customer stats', error: error.message });
  }
});

app.get('/', (req: Request, res: Response) => {
  res.send('Hello from RTRW Backend!');
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});

// Tambahkan endpoint ini di bagian router endpoints

// Get PPP secrets from router
app.get('/api/routers/:id/ppp-secrets', async (req: Request, res: Response) => {
  try {
    const router = await db.Router.findByPk(req.params.id);
    if (!router) {
      return res.status(404).json({ message: 'Router not found' });
    }
    
    try {
      // Koneksi ke Mikrotik dengan timeout
      const conn = new RouterOSAPI({
        host: router.ipAddress,
        user: router.username,
        password: router.password,
        port: router.port || 8728,
        timeout: 10000 // 10 second timeout
      });
      
      console.log(`Connecting to MikroTik at ${router.ipAddress} to fetch PPP secrets...`);
      await conn.connect();
      
      // Ambil PPP secrets
      const secrets = await conn.write('/ppp/secret/print');
      
      await conn.close();
      console.log(`Retrieved ${secrets.length} PPP secrets from MikroTik`);
      
      // Format response untuk konsistensi
      const formattedSecrets = secrets.map((secret: any) => ({
        name: secret.name,
        profile: secret.profile,
        service: secret.service || 'pppoe',
        comment: secret.comment || '',
        disabled: secret.disabled === 'true'
      }));
      
      res.json(formattedSecrets);
      
    } catch (mikrotikError: any) {
      console.error('MikroTik connection error:', mikrotikError);
      
      // Provide more specific error messages and fallback to mock data
      let errorMessage = 'Failed to fetch PPP secrets from MikroTik';
      if (mikrotikError.message?.includes('timeout')) {
        errorMessage = 'Connection timeout - returning mock data';
      } else if (mikrotikError.message?.includes('login')) {
        errorMessage = 'Authentication failed - returning mock data';
      } else if (mikrotikError.message?.includes('UNKNOWNREPLY')) {
        errorMessage = 'MikroTik API communication error - returning mock data';
      }
      
      console.warn(errorMessage);
      
      // Fallback ke mock data jika koneksi gagal
      const mockSecrets = [
        { name: 'user1', profile: 'basic-10mbps', service: 'pppoe', comment: 'Mock data', disabled: false },
        { name: 'user2', profile: 'standard-25mbps', service: 'pppoe', comment: 'Mock data', disabled: false },
        { name: 'user3', profile: 'premium-50mbps', service: 'pppoe', comment: 'Mock data', disabled: false }
      ];
      res.json(mockSecrets);
    }
  } catch (error: any) {
    console.error('Error fetching PPP secrets:', error);
    res.status(500).json({ message: 'Failed to fetch PPP secrets', error: error.message });
  }
});

// PPP Secret creation endpoint has been removed due to persistent RouterOS API issues
// The functionality was causing server crashes and instability
// Consider implementing a more stable MikroTik integration solution in the future

// Transaction CRUD Endpoints

// Get all transactions
app.get('/api/transactions', async (req: Request, res: Response) => {
  try {
    const transactions = await db.Transaction.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json({
      success: true,
      data: transactions
    });
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch transactions', 
      error: error.message 
    });
  }
});

// Create a new transaction
app.post('/api/transactions', async (req: Request, res: Response) => {
  try {
    const transactionData = req.body;
    
    // Transform period object to separate fields for database
    if (transactionData.period) {
      transactionData.periodFrom = transactionData.period.from;
      transactionData.periodTo = transactionData.period.to;
      delete transactionData.period;
    }
    
    const transaction = await db.Transaction.create(transactionData);
    
    // Auto-enable PPP secret jika transaksi adalah pembayaran (status: 'paid')
    if (transaction.status === 'paid' && transaction.customerId) {
      try {
        console.log(`💰 Payment completed for customer ${transaction.customerId}, auto-enabling PPP secret...`);
        
        // Ambil data customer dengan relasi router
        const customer = await db.Customer.findByPk(transaction.customerId, {
          include: [{
            model: db.Router,
            as: 'routerData'
          }]
        });
        if (customer && customer.pppSecret && customer.routerData && customer.routerData.name) {
          // Import mikrotik utility
          const mikrotikAPI = require('../utils/mikrotik');
          
          // Enable PPP Secret di MikroTik
          const enableResult = await mikrotikAPI.enablePPPSecret(customer.routerData.name, customer.pppSecret);
          
          if (enableResult.success) {
            // Update customer status
            await customer.update({
              billingStatus: 'lunas',
              mikrotikStatus: 'active',
              serviceStatus: 'active'
            });
            
            console.log(`✅ PPP Secret ${customer.pppSecret} auto-enabled for customer ${customer.name}`);
            console.log('MikroTik result:', enableResult.message);
          } else {
            console.error(`❌ Failed to enable PPP Secret ${customer.pppSecret} for customer ${customer.name}:`, enableResult.message);
            // Update status sebagai partial success
            await customer.update({
              billingStatus: 'lunas',
              serviceStatus: 'active'
              // mikrotikStatus tetap seperti sebelumnya karena enable gagal
            });
          }
        }
      } catch (autoEnableError: any) {
        console.error('❌ Failed to auto-enable PPP secret:', autoEnableError);
        // Jangan gagalkan transaksi jika auto-enable gagal
      }
    }
    
    // Transform back to frontend format
    const responseTransaction = {
      ...transaction.toJSON(),
      period: {
        from: transaction.periodFrom,
        to: transaction.periodTo
      }
    };
    
    res.status(201).json({
      success: true,
      data: responseTransaction
    });
  } catch (error: any) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create transaction', 
      error: error.message 
    });
  }
});

// Get a single transaction by id
app.get('/api/transactions/:id', async (req: Request, res: Response) => {
  try {
    const transaction = await db.Transaction.findByPk(req.params.id);
    if (transaction) {
      const responseTransaction = {
        ...transaction.toJSON(),
        period: {
          from: transaction.periodFrom,
          to: transaction.periodTo
        }
      };
      res.json({
        success: true,
        data: responseTransaction
      });
    } else {
      res.status(404).json({ 
        success: false,
        message: 'Transaction not found' 
      });
    }
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Update a transaction
app.put('/api/transactions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Transform period object to separate fields for database
    if (updateData.period) {
      updateData.periodFrom = updateData.period.from;
      updateData.periodTo = updateData.period.to;
      delete updateData.period;
    }
    
    const transaction = await db.Transaction.findByPk(id);
    if (!transaction) {
      return res.status(404).json({ 
        success: false,
        message: 'Transaction not found' 
      });
    }
    
    // Simpan status lama untuk perbandingan
    const oldStatus = transaction.status;
    
    await transaction.update(updateData);
    
    // Auto-enable PPP secret jika status berubah menjadi 'paid'
    if (oldStatus !== 'paid' && transaction.status === 'paid' && transaction.customerId) {
      try {
        console.log(`💰 Payment status updated to 'paid' for customer ${transaction.customerId}, auto-enabling PPP secret...`);
        
        // Ambil data customer dengan relasi router
        const customer = await db.Customer.findByPk(transaction.customerId, {
          include: [{
            model: db.Router,
            as: 'routerData'
          }]
        });
        if (customer && customer.pppSecret && customer.routerData && customer.routerData.name) {
          // Import mikrotik utility
          const mikrotikAPI = require('../utils/mikrotik');
          
          // Enable PPP Secret di MikroTik
          const enableResult = await mikrotikAPI.enablePPPSecret(customer.routerData.name, customer.pppSecret);
          
          if (enableResult.success) {
            // Update customer status
            await customer.update({
              billingStatus: 'lunas',
              mikrotikStatus: 'active',
              serviceStatus: 'active'
            });
            
            console.log(`✅ PPP Secret ${customer.pppSecret} auto-enabled for customer ${customer.name} (transaction update)`);
            console.log('MikroTik result:', enableResult.message);
          } else {
            console.error(`❌ Failed to enable PPP Secret ${customer.pppSecret} for customer ${customer.name}:`, enableResult.message);
            // Update status sebagai partial success
            await customer.update({
              billingStatus: 'lunas',
              serviceStatus: 'active'
              // mikrotikStatus tetap seperti sebelumnya karena enable gagal
            });
          }
        }
      } catch (autoEnableError: any) {
        console.error('❌ Failed to auto-enable PPP secret on transaction update:', autoEnableError);
        // Jangan gagalkan update transaksi jika auto-enable gagal
      }
    }
    
    const responseTransaction = {
      ...transaction.toJSON(),
      period: {
        from: transaction.periodFrom,
        to: transaction.periodTo
      }
    };
    
    res.json({
      success: true,
      data: responseTransaction
    });
  } catch (error: any) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update transaction', 
      error: error.message 
    });
  }
});

// Delete a transaction
app.delete('/api/transactions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const transaction = await db.Transaction.findByPk(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    await transaction.destroy();
    
    res.json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete transaction'
    });
  }
});

// Get transaction statistics
app.get('/api/transactions/stats', async (req: Request, res: Response) => {
  try {
    const totalTransactions = await db.Transaction.count();
    const totalRevenue = await db.Transaction.sum('amount') || 0;
    
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const monthlyTransactions = await db.Transaction.findAll({
      where: {
        createdAt: {
          [db.Sequelize.Op.gte]: new Date(currentYear, currentMonth, 1),
          [db.Sequelize.Op.lt]: new Date(currentYear, currentMonth + 1, 1)
        }
      }
    });
    
    const monthlyRevenue = monthlyTransactions.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
    const overduePayments = await db.Transaction.count({ where: { status: 'overdue' } });
    
    res.json({
      success: true,
      data: {
        totalTransactions,
        totalRevenue,
        monthlyRevenue,
        overduePayments
      }
    });
  } catch (error: any) {
    console.error('Error fetching transaction stats:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch transaction stats', 
      error: error.message 
    });
  }
});

// Import billing routes (pastikan path benar)
const billingRoutes = require('../routes/billing');
const customersRoutes = require('../routes/customers');

// Add billing routes
app.use('/api/billing', billingRoutes);
app.use('/api/customers', customersRoutes);

// Import node-cron untuk auto scheduler
const cron = require('node-cron');
const axios = require('axios');

// Auto Suspend Scheduler - Jalankan setiap tanggal 6 setiap bulan jam 00:01
cron.schedule('1 0 6 * *', async () => {
  try {
    console.log('🕐 Running auto suspend check at:', getJakartaTime().format('YYYY-MM-DD HH:mm:ss'));
    
    // Panggil endpoint suspend-overdue
    const response = await axios.post('http://localhost:3001/api/billing/suspend-overdue');
    
    if (response.data.success) {
      console.log('✅ Auto suspend completed:', response.data.message);
    } else {
      console.log('⚠️ Auto suspend warning:', response.data.message);
    }
  } catch (error: any) {
    console.error('❌ Auto suspend failed:', error?.message || error);
  }
}, {
  timezone: 'Asia/Jakarta'
});

// Manual trigger untuk testing auto suspend
app.post('/api/trigger-auto-suspend', async (req: Request, res: Response) => {
  try {
    console.log('🔧 Manual auto suspend triggered at:', getJakartaTime().format('YYYY-MM-DD HH:mm:ss'));
    
    const response = await axios.post('http://localhost:3001/api/billing/suspend-overdue');
    
    res.json({
      success: true,
      message: 'Auto suspend triggered manually',
      result: response.data,
      timestamp: getJakartaTime().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Manual auto suspend failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger auto suspend',
      error: error.message,
      timestamp: getJakartaTime().toISOString()
    });
  }
});

console.log('🤖 Auto suspend scheduler initialized - will run monthly on 6th at 00:01 Jakarta time');

// Dashboard stats dengan filter bulanan
app.get('/api/dashboard/stats', async (req: Request, res: Response) => {
  try {
    const { month } = req.query;
    let dateFilter = {};
    
    if (month) {
      const startDate = new Date(month as string);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      
      dateFilter = {
        createdAt: {
          [db.Sequelize.Op.gte]: startDate,
          [db.Sequelize.Op.lt]: endDate
        }
      };
    }
    
    const totalCustomers = await db.Customer.count();
    const activeCustomers = await db.Customer.count({ 
      where: { serviceStatus: 'active' } 
    });
    const suspendedCustomers = await db.Customer.count({ 
      where: { billingStatus: 'suspend' } 
    });
    
    // Revenue dari transaksi yang sudah dibayar dalam periode tertentu
    const paidTransactions = await db.Transaction.findAll({
      where: {
        status: 'paid',
        ...dateFilter
      }
    });
    
    const totalRevenue = paidTransactions.reduce((sum: number, t: any) => 
      sum + parseFloat(t.amount || 0), 0
    );
    
    // Pending bills (tagihan belum lunas)
    const pendingBills = await db.Transaction.count({
      where: { status: 'pending' }
    });
    
    res.json({
      success: true,
      data: {
        totalCustomers,
        activeCustomers,
        suspendedCustomers,
        totalRevenue: Math.round(totalRevenue),
        pendingBills
      }
    });
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch dashboard stats', 
      error: error.message 
    });
  }
});

// Billing stats dengan filter tanggal
app.get('/api/billing/stats', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    let dateFilter = {};
    
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          [db.Sequelize.Op.gte]: new Date(startDate as string),
          [db.Sequelize.Op.lte]: new Date(endDate as string)
        }
      };
    }
    
    const transactions = await db.Transaction.findAll({
      where: dateFilter
    });
    
    const totalTransactions = transactions.length;
    const paidTransactions = transactions.filter((t: any) => t.status === 'paid');
    const totalPaidAmount = paidTransactions.reduce((sum: number, t: any) => 
      sum + parseFloat(t.amount || 0), 0
    );
    
    const cashPayments = paidTransactions.filter((t: any) => t.method === 'cash');
    const transferPayments = paidTransactions.filter((t: any) => t.method === 'transfer');
    
    const totalCash = cashPayments.reduce((sum: number, t: any) => 
      sum + parseFloat(t.amount || 0), 0
    );
    const totalTransfer = transferPayments.reduce((sum: number, t: any) => 
      sum + parseFloat(t.amount || 0), 0
    );
    
    res.json({
      success: true,
      data: {
        totalTransactions,
        totalPaidAmount: Math.round(totalPaidAmount),
        totalCash: Math.round(totalCash),
        totalTransfer: Math.round(totalTransfer),
        paidCount: paidTransactions.length,
        cashCount: cashPayments.length,
        transferCount: transferPayments.length
      }
    });
  } catch (error: any) {
    console.error('Error fetching billing stats:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch billing stats', 
      error: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    // Test database connection
    await db.sequelize.authenticate();
    
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    res.json({
      success: true,
      status: 'healthy',
      timestamp: getJakartaTime().toISOString(),
      uptime: Math.floor(uptime),
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024)
      },
      database: 'connected',
      version: '1.0.0'
    });
  } catch (error: any) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      timestamp: getJakartaTime().toISOString(),
      error: error.message,
      database: 'disconnected'
    });
  }
});

// API info endpoint
app.get('/api', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'RTRW Billing System API',
    version: '1.0.0',
    timestamp: getJakartaTime().toISOString(),
    endpoints: {
      health: '/api/health',
      areas: '/api/areas',
      customers: '/api/customers',
      packages: '/api/packages',
      routers: '/api/routers',
      odp: '/api/odp',
      transactions: '/api/transactions',
      billing: '/api/billing',
      dashboard: '/api/dashboard'
    }
  });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 RTRW Billing System Backend`);
  console.log(`📡 Server running on port ${port}`);
  console.log(`🌐 API available at: http://localhost:${port}/api`);
  console.log(`💚 Health check: http://localhost:${port}/api/health`);
  console.log(`🕐 Server time: ${getJakartaTime().format('YYYY-MM-DD HH:mm:ss')} (Asia/Jakarta)`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`=====================================`);
});