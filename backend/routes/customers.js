const express = require('express');
const router = express.Router();
const { Customer, ODP, Router, Area, Package } = require('../models');
const { sequelize } = require('../models');
const mikrotikAPI = require('../utils/mikrotik');

// GET all customers
router.get('/', async (req, res) => {
  try {
    const customers = await Customer.findAll({
      include: [
        {
          model: ODP,
          as: 'odpData',
          attributes: ['id', 'name', 'location', 'area', 'totalSlots', 'usedSlots', 'availableSlots']
        },
        {
          model: Router,
          as: 'routerData',
          attributes: ['id', 'name', 'ipAddress', 'area']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET single customer
router.get('/:id', async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id, {
      include: [
        {
          model: ODP,
          as: 'odpData',
          attributes: ['id', 'name', 'location', 'area', 'totalSlots', 'usedSlots', 'availableSlots']
        },
        {
          model: Router,
          as: 'routerData',
          attributes: ['id', 'name', 'ipAddress', 'area']
        }
      ]
    });
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer tidak ditemukan' });
    }
    
    res.json(customer);
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST create customer
router.post('/', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const customerData = req.body;
    
    // Jika ada odpId, cek dan update slot
    if (customerData.odpId) {
      const odp = await ODP.findByPk(customerData.odpId, { transaction });
      
      if (!odp) {
        await transaction.rollback();
        return res.status(400).json({ error: 'ODP tidak ditemukan' });
      }
      
      if (odp.availableSlots <= 0) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Slot ODP sudah penuh' });
      }
      
      // Update slot ODP
      await odp.update({
        usedSlots: odp.usedSlots + 1,
        availableSlots: odp.availableSlots - 1
      }, { transaction });
    }
    
    // Generate customer number
    const count = await Customer.count({ transaction });
    customerData.customerNumber = 'LTS' + (count + 1).toString().padStart(4, '0');
    
    const customer = await Customer.create(customerData, { transaction });
    
    // Fetch customer with relations
    const customerWithRelations = await Customer.findByPk(customer.id, {
      include: [
        {
          model: ODP,
          as: 'odpData',
          attributes: ['id', 'name', 'location', 'area', 'totalSlots', 'usedSlots', 'availableSlots']
        },
        {
          model: Router,
          as: 'routerData',
          attributes: ['id', 'name', 'ipAddress', 'area']
        }
      ],
      transaction
    });
    
    await transaction.commit();
    res.status(201).json(customerWithRelations);
    
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating customer:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT update customer
router.put('/:id', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const customer = await Customer.findByPk(req.params.id, { transaction });
    
    if (!customer) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Customer tidak ditemukan' });
    }
    
    const customerData = req.body;
    const oldOdpId = customer.odpId;
    const newOdpId = customerData.odpId;
    
    // Handle ODP slot changes
    if (oldOdpId !== newOdpId) {
      // Kembalikan slot ODP lama
      if (oldOdpId) {
        const oldOdp = await ODP.findByPk(oldOdpId, { transaction });
        if (oldOdp) {
          await oldOdp.update({
            usedSlots: Math.max(0, oldOdp.usedSlots - 1),
            availableSlots: Math.min(oldOdp.totalSlots, oldOdp.availableSlots + 1)
          }, { transaction });
        }
      }
      
      // Kurangi slot ODP baru
      if (newOdpId) {
        const newOdp = await ODP.findByPk(newOdpId, { transaction });
        
        if (!newOdp) {
          await transaction.rollback();
          return res.status(400).json({ error: 'ODP baru tidak ditemukan' });
        }
        
        if (newOdp.availableSlots <= 0) {
          await transaction.rollback();
          return res.status(400).json({ error: 'Slot ODP baru sudah penuh' });
        }
        
        await newOdp.update({
          usedSlots: newOdp.usedSlots + 1,
          availableSlots: newOdp.availableSlots - 1
        }, { transaction });
      }
    }
    
    await customer.update(customerData, { transaction });
    
    // Fetch updated customer with relations
    const updatedCustomer = await Customer.findByPk(customer.id, {
      include: [
        {
          model: ODP,
          as: 'odpData',
          attributes: ['id', 'name', 'location', 'area', 'totalSlots', 'usedSlots', 'availableSlots']
        },
        {
          model: Router,
          as: 'routerData',
          attributes: ['id', 'name', 'ipAddress', 'area']
        }
      ],
      transaction
    });
    
    await transaction.commit();
    res.json(updatedCustomer);
    
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating customer:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE customer
router.delete('/:id', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const customer = await Customer.findByPk(req.params.id, { transaction });
    
    if (!customer) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Customer tidak ditemukan' });
    }
    
    // Jika customer terhubung dengan ODP, kembalikan slot
    if (customer.odpId) {
      const odp = await ODP.findByPk(customer.odpId, { transaction });
      if (odp) {
        await odp.update({
          usedSlots: Math.max(0, odp.usedSlots - 1),
          availableSlots: Math.min(odp.totalSlots, odp.availableSlots + 1)
        }, { transaction });
      }
    }
    
    await customer.destroy({ transaction });
    await transaction.commit();
    
    res.json({ message: 'Customer berhasil dihapus' });
    
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST disable PPP user
router.post('/:id/disable-ppp', async (req, res) => {
  try {
    const customerId = req.params.id;
    
    // Ambil data customer dengan router info
    const customer = await Customer.findByPk(customerId, {
      include: [
        {
          model: Router,
          as: 'routerData',
          attributes: ['id', 'name', 'ipAddress', 'username', 'password', 'port']
        }
      ]
    });
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer tidak ditemukan'
      });
    }
    
    if (!customer.pppSecret) {
      return res.status(400).json({
        success: false,
        message: 'Customer tidak memiliki PPP Secret'
      });
    }
    
    if (!customer.routerData || !customer.routerData.name) {
      return res.status(400).json({
        success: false,
        message: 'Customer tidak memiliki router yang terkonfigurasi'
      });
    }

    // Disable PPP Secret di MikroTik
    const result = await mikrotikAPI.disablePPPSecret(customer.routerData.name, customer.pppSecret);
    
    if (result.success) {
      // Update status di database
      await customer.update({
        mikrotikStatus: 'disabled',
        lastSuspendDate: new Date()
      });
      
      res.json({
        success: true,
        message: `PPP Secret ${customer.pppSecret} berhasil dinonaktifkan`,
        data: {
          customerId: customer.id,
          customerName: customer.name,
          pppSecret: customer.pppSecret,
          routerName: customer.routerData.name,
          status: 'disabled',
          mikrotikMessage: result.message
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: `Gagal menonaktifkan PPP Secret ${customer.pppSecret}: ${result.message}`,
        error: result.error || 'MikroTik API error'
      });
    }
    
  } catch (error) {
    console.error('Error disabling PPP user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST enable PPP user
router.post('/:id/enable-ppp', async (req, res) => {
  try {
    const customerId = req.params.id;
    
    // Ambil data customer dengan router info
    const customer = await Customer.findByPk(customerId, {
      include: [
        {
          model: Router,
          as: 'routerData',
          attributes: ['id', 'name', 'ipAddress', 'username', 'password', 'port']
        }
      ]
    });
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer tidak ditemukan'
      });
    }
    
    if (!customer.pppSecret) {
      return res.status(400).json({
        success: false,
        message: 'Customer tidak memiliki PPP Secret'
      });
    }
    
    if (!customer.routerData || !customer.routerData.name) {
      return res.status(400).json({
        success: false,
        message: 'Customer tidak memiliki router yang terkonfigurasi'
      });
    }

    // Enable PPP Secret di MikroTik
    const result = await mikrotikAPI.enablePPPSecret(customer.routerData.name, customer.pppSecret);
    
    if (result.success) {
      // Update status di database
      await customer.update({
        mikrotikStatus: 'active'
      });
      
      res.json({
        success: true,
        message: `PPP Secret ${customer.pppSecret} berhasil diaktifkan`,
        data: {
          customerId: customer.id,
          customerName: customer.name,
          pppSecret: customer.pppSecret,
          routerName: customer.routerData.name,
          status: 'active',
          mikrotikMessage: result.message
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: `Gagal mengaktifkan PPP Secret ${customer.pppSecret}: ${result.message}`,
        error: result.error || 'MikroTik API error'
      });
    }
    
  } catch (error) {
    console.error('Error enabling PPP user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST check PPP status
router.post('/:id/check-ppp-status', async (req, res) => {
  try {
    const customerId = req.params.id;
    
    // Ambil data customer dengan router info
    const customer = await Customer.findByPk(customerId, {
      include: [
        {
          model: Router,
          as: 'routerData',
          attributes: ['id', 'name', 'ipAddress', 'username', 'password', 'port']
        }
      ]
    });
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer tidak ditemukan'
      });
    }
    
    if (!customer.pppSecret) {
      return res.status(400).json({
        success: false,
        message: 'Customer tidak memiliki PPP Secret'
      });
    }
    
    if (!customer.routerData || !customer.routerData.name) {
      return res.status(400).json({
        success: false,
        message: 'Customer tidak memiliki router yang terkonfigurasi'
      });
    }
    
    // Cek status PPP Secret di MikroTik
    const status = await mikrotikAPI.checkPPPSecretStatus(customer.routerData.name, customer.pppSecret);
    
    if (status.success) {
      res.json({
        success: true,
        message: 'Status PPP Secret berhasil diperiksa',
        data: {
          customerId: customer.id,
          customerName: customer.name,
          pppSecret: customer.pppSecret,
          routerName: customer.routerData.name,
          mikrotikStatus: {
            found: status.found,
            disabled: status.disabled,
            profile: status.profile,
            service: status.service
          },
          databaseStatus: customer.mikrotikStatus,
          mikrotikMessage: status.message
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: `Gagal memeriksa status PPP Secret: ${status.message}`,
        error: status.error || 'MikroTik API error'
      });
    }
    
  } catch (error) {
    console.error('Error checking PPP status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;