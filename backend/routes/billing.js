const express = require('express');
const router = express.Router();
const { Customer, Transaction, AddonItem } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment-timezone');

// Set default timezone ke Asia/Jakarta
moment.tz.setDefault('Asia/Jakarta');

// Helper function untuk mendapatkan waktu Jakarta
function getJakartaTime() {
  return moment.tz('Asia/Jakarta');
}

// Fungsi untuk menghitung prorata
function calculateProRata(activeDate, packagePrice, activePeriod, activePeriodUnit) {
  const now = getJakartaTime().toDate();
  const startDate = moment.tz(activeDate, 'Asia/Jakarta').toDate();
  
  if (activePeriodUnit === 'months') {
    // Hitung hari dalam bulan aktif
    const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
    const remainingDays = daysInMonth - startDate.getDate() + 1;
    
    // Hitung prorata
    const dailyRate = packagePrice / daysInMonth;
    const proRataAmount = dailyRate * remainingDays;
    
    return {
      isProRataApplied: remainingDays < daysInMonth,
      proRataAmount: Math.round(proRataAmount),
      remainingDays,
      daysInMonth
    };
  }
  
  return {
    isProRataApplied: false,
    proRataAmount: packagePrice,
    remainingDays: activePeriod,
    daysInMonth: activePeriod
  };
}

// Endpoint untuk preview prorata
router.post('/calculate-prorata', async (req, res) => {
  try {
    const { activeDate, packagePrice, activePeriod, activePeriodUnit } = req.body;
    
    const proRataData = calculateProRata(activeDate, packagePrice, activePeriod, activePeriodUnit);
    
    res.json({
      success: true,
      data: proRataData
    });
  } catch (error) {
    console.error('Error calculating prorata:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update generate-monthly-bills untuk handle prorata
router.post('/generate-monthly-bills', async (req, res) => {
  try {
    const { Customer, Transaction, AddonItem } = require('../models');
    const { Op } = require('sequelize');
    
    // Ambil semua pelanggan aktif
    const activeCustomers = await Customer.findAll({
      where: {
        status: 'active',
        serviceStatus: 'active'
      },
      include: [{
        model: AddonItem,
        as: 'addonItems',
        where: {
          isActive: true,
          [Op.or]: [
            { itemType: 'monthly' },
            { itemType: 'one_time', isPaid: false }
          ]
        },
        required: false
      }]
    });
    
    const bills = [];
    
    for (const customer of activeCustomers) {
      // Cek apakah sudah ada tagihan bulan ini
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      
      const existingBill = await Transaction.findOne({
        where: {
          customerId: customer.id,
          type: 'bill',
          createdAt: {
            [Op.gte]: thisMonth
          }
        }
      });
      
      if (existingBill) continue;
      
      // Hitung total tagihan
      let totalAmount = parseFloat(customer.packagePrice);
      let breakdown = {
        package: {
          name: customer.package,
          price: parseFloat(customer.packagePrice)
        },
        addons: [],
        oneTimeItems: [],
        discount: parseFloat(customer.discount) || 0
      };
      
      // Handle prorata untuk bulan pertama
      if (!customer.isProRataApplied && customer.activeDate) {
        const proRataData = calculateProRata(
          customer.activeDate,
          customer.packagePrice,
          customer.activePeriod,
          customer.activePeriodUnit
        );
        
        if (proRataData.isProRataApplied) {
          totalAmount = proRataData.proRataAmount;
          breakdown.package.price = proRataData.proRataAmount;
          breakdown.package.note = `Prorata ${proRataData.remainingDays}/${proRataData.daysInMonth} hari`;
          
          // Update customer prorata status
          await customer.update({
            isProRataApplied: true,
            proRataAmount: proRataData.proRataAmount
          });
        }
      }
      
      // Tambahkan addon items
      if (customer.addonItems) {
        for (const addon of customer.addonItems) {
          const addonTotal = parseFloat(addon.price) * addon.quantity;
          
          if (addon.itemType === 'monthly') {
            totalAmount += addonTotal;
            breakdown.addons.push({
              name: addon.itemName,
              price: parseFloat(addon.price),
              quantity: addon.quantity,
              total: addonTotal
            });
          } else if (addon.itemType === 'one_time' && !addon.isPaid) {
            totalAmount += addonTotal;
            breakdown.oneTimeItems.push({
              name: addon.itemName,
              price: parseFloat(addon.price),
              quantity: addon.quantity,
              total: addonTotal
            });
            
            // Mark one-time item as billed
            await addon.update({ isPaid: true });
          }
        }
      }
      
      // Kurangi diskon
      totalAmount -= parseFloat(customer.discount) || 0;
      
      // Buat transaksi tagihan
      const bill = await Transaction.create({
        customerId: customer.id,
        type: 'bill',
        amount: Math.max(0, totalAmount),
        description: `Tagihan bulanan ${getJakartaTime().format('MMMM YYYY')}`,
        status: 'pending',
        dueDate: getJakartaTime().date(5).toDate(),
        breakdown: breakdown
      });
      
      // Update customer billing info
      await customer.update({
        lastBillingDate: getJakartaTime().toDate(),
        nextBillingDate: getJakartaTime().add(1, 'month').date(1).toDate(),
        billingStatus: 'belum_lunas'
      });
      
      bills.push(bill);
    }
    
    res.json({
      success: true,
      message: `${bills.length} tagihan berhasil dibuat`,
      data: bills
    });
  } catch (error) {
    console.error('Error generating monthly bills:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API untuk mengelola add-on items
router.get('/customers/:customerId/addons', async (req, res) => {
  try {
    const addons = await AddonItem.findAll({
      where: { 
        customerId: req.params.customerId,
        isActive: true
      }
    });
    res.json({ success: true, data: addons });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/customers/:customerId/addons', async (req, res) => {
  try {
    const { itemName, itemType, price, quantity, description } = req.body;
    
    const addon = await AddonItem.create({
      customerId: req.params.customerId,
      itemName,
      itemType,
      price,
      quantity: quantity || 1,
      description
    });
    
    res.json({ success: true, data: addon });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/addons/:id', async (req, res) => {
  try {
    const addon = await AddonItem.findByPk(req.params.id);
    if (!addon) {
      return res.status(404).json({ error: 'Add-on item not found' });
    }
    
    await addon.update(req.body);
    res.json({ success: true, data: addon });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/addons/:id', async (req, res) => {
  try {
    const addon = await AddonItem.findByPk(req.params.id);
    if (!addon) {
      return res.status(404).json({ error: 'Add-on item not found' });
    }
    
    await addon.update({ isActive: false });
    res.json({ success: true, message: 'Add-on item deactivated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Suspend overdue customers - Auto-disable PPP secret pada tanggal 6 untuk pelanggan yang belum bayar dari tanggal 1-5
router.post('/suspend-overdue', async (req, res) => {
  try {
    const currentDate = getJakartaTime();
    const suspendDate = currentDate.clone().date(6).startOf('day');
    
    console.log(`🕐 Auto suspend check - Current: ${currentDate.format('YYYY-MM-DD HH:mm:ss')}, Suspend date: ${suspendDate.format('YYYY-MM-DD HH:mm:ss')}`);
    
    if (currentDate.isSame(suspendDate, 'day')) {
      // Cari pelanggan yang belum bayar dari tanggal 1-5 bulan ini
      const startOfMonth = currentDate.clone().startOf('month'); // Tanggal 1
      const endOfGracePeriod = currentDate.clone().date(5).endOf('day'); // Tanggal 5 akhir hari
      
      console.log(`📅 Checking unpaid customers from ${startOfMonth.format('YYYY-MM-DD')} to ${endOfGracePeriod.format('YYYY-MM-DD')}`);
      
      // Get customers yang belum lunas dan masih aktif
      const overdueCustomers = await Customer.findAll({
        where: {
          billingStatus: 'belum_lunas',
          serviceStatus: 'active',
          mikrotikStatus: {
            [Op.ne]: 'disabled' // Belum di-disable
          }
        }
      });
      
      console.log(`🔍 Found ${overdueCustomers.length} customers with 'belum_lunas' status`);
      
      const suspended = [];
      const skipped = [];
      
      for (const customer of overdueCustomers) {
        try {
          // Cek apakah customer punya tagihan pending dalam periode 1-5
          const unpaidBills = await Transaction.findAll({
            where: {
              customerId: customer.id,
              status: 'pending',
              createdAt: {
                [Op.gte]: startOfMonth.toDate(),
                [Op.lte]: endOfGracePeriod.toDate()
              }
            }
          });
          
          if (unpaidBills.length > 0) {
            console.log(`⚠️ Suspending customer: ${customer.name} (${customer.pppSecret}) - ${unpaidBills.length} unpaid bills`);
            
            // Disable PPP Secret di Mikrotik
            const mikrotikAPI = require('../utils/mikrotik');
            const disableResult = await mikrotikAPI.disablePPPSecret(customer.router, customer.pppSecret);
            
            if (disableResult.success) {
              await customer.update({
                billingStatus: 'suspend',
                mikrotikStatus: 'disabled',
                lastSuspendDate: currentDate.toDate()
              });
              
              suspended.push({
                ...customer.toJSON(),
                unpaidBillsCount: unpaidBills.length,
                mikrotikResult: disableResult
              });
            } else {
              console.error(`❌ Failed to disable PPP Secret for ${customer.name}:`, disableResult.message);
              suspended.push({
                ...customer.toJSON(),
                unpaidBillsCount: unpaidBills.length,
                mikrotikResult: disableResult,
                error: 'MikroTik disable failed'
              });
            }
          } else {
            console.log(`✅ Skipping customer: ${customer.name} - No unpaid bills in grace period`);
            skipped.push({
              id: customer.id,
              name: customer.name,
              reason: 'No unpaid bills in grace period (1-5)'
            });
          }
        } catch (mikrotikError) {
          console.error(`❌ Failed to disable PPP Secret for customer ${customer.id}:`, mikrotikError);
          suspended.push({
            ...customer.toJSON(),
            mikrotikResult: { success: false, error: mikrotikError.message }
          });
        }
      }
      
      console.log(`📊 Suspension summary: ${suspended.length} suspended, ${skipped.length} skipped`);
      
      res.json({ 
        success: true, 
        message: `Auto-suspend completed: ${suspended.length} customers suspended, ${skipped.length} skipped`,
        data: {
          suspended,
          skipped,
          suspendDate: suspendDate.format('YYYY-MM-DD HH:mm:ss'),
          gracePeriod: {
            from: startOfMonth.format('YYYY-MM-DD'),
            to: endOfGracePeriod.format('YYYY-MM-DD')
          }
        }
      });
    } else {
      res.json({ 
        success: true, 
        message: `Not suspension day. Current: ${currentDate.format('YYYY-MM-DD')}, Next suspension: ${currentDate.clone().date(6).format('YYYY-MM-DD')}` 
      });
    }
  } catch (error) {
    console.error('❌ Error in suspend-overdue:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      timestamp: getJakartaTime().format('YYYY-MM-DD HH:mm:ss')
    });
  }
});

// Test suspend single customer
router.post('/test-suspend/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    
    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json({ 
        success: false, 
        message: 'Customer not found' 
      });
    }
    
    console.log(`🧪 Testing suspend for customer: ${customer.name} (${customer.pppSecret})`);
    
    try {
      // Test disable PPP Secret di Mikrotik
      const mikrotikAPI = require('../utils/mikrotik');
      const disableResult = await mikrotikAPI.disablePPPSecret(customer.router, customer.pppSecret);
      
      if (disableResult.success) {
        // Update customer status
        await customer.update({
          billingStatus: 'suspend',
          mikrotikStatus: 'disabled',
          lastSuspendDate: getJakartaTime().toDate()
        });
        
        res.json({
          success: true,
          message: `Customer ${customer.name} successfully suspended`,
          data: {
            customer: {
              id: customer.id,
              name: customer.name,
              pppSecret: customer.pppSecret,
              router: customer.router,
              billingStatus: 'suspend',
              mikrotikStatus: 'disabled'
            },
            mikrotikResult: disableResult,
            timestamp: getJakartaTime().format('YYYY-MM-DD HH:mm:ss')
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: `Failed to suspend customer ${customer.name}: ${disableResult.message}`,
          data: {
            customer: {
              id: customer.id,
              name: customer.name,
              pppSecret: customer.pppSecret,
              router: customer.router
            },
            mikrotikResult: disableResult,
            timestamp: getJakartaTime().format('YYYY-MM-DD HH:mm:ss')
          }
        });
      }
    } catch (mikrotikError) {
      console.error(`❌ Failed to disable PPP Secret for customer ${customer.id}:`, mikrotikError);
      
      res.json({
        success: false,
        message: `Failed to suspend customer ${customer.name}`,
        data: {
          customer: {
            id: customer.id,
            name: customer.name,
            pppSecret: customer.pppSecret,
            router: customer.router
          },
          mikrotikResult: { 
            success: false, 
            error: mikrotikError.message 
          },
          timestamp: getJakartaTime().format('YYYY-MM-DD HH:mm:ss')
        }
      });
    }
  } catch (error) {
    console.error('Error in test suspend:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// Test enable single customer
router.post('/test-enable/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    
    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json({ 
        success: false, 
        message: 'Customer not found' 
      });
    }
    
    console.log(`🧪 Testing enable for customer: ${customer.name} (${customer.pppSecret})`);
    
    try {
      // Test enable PPP Secret di Mikrotik
      const mikrotikAPI = require('../utils/mikrotik');
      const enableResult = await mikrotikAPI.enablePPPSecret(customer.router, customer.pppSecret);
      
      if (enableResult.success) {
        // Update customer status
        await customer.update({
          billingStatus: 'lunas',
          mikrotikStatus: 'enabled',
          serviceStatus: 'active'
        });
        
        res.json({
          success: true,
          message: `Customer ${customer.name} successfully enabled`,
          data: {
            customer: {
              id: customer.id,
              name: customer.name,
              pppSecret: customer.pppSecret,
              router: customer.router,
              billingStatus: 'lunas',
              mikrotikStatus: 'enabled',
              serviceStatus: 'active'
            },
            mikrotikResult: enableResult,
            timestamp: getJakartaTime().format('YYYY-MM-DD HH:mm:ss')
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: `Failed to enable customer ${customer.name}: ${enableResult.message}`,
          data: {
            customer: {
              id: customer.id,
              name: customer.name,
              pppSecret: customer.pppSecret,
              router: customer.router
            },
            mikrotikResult: enableResult,
            timestamp: getJakartaTime().format('YYYY-MM-DD HH:mm:ss')
          }
        });
      }
    } catch (mikrotikError) {
      console.error(`❌ Failed to enable PPP Secret for customer ${customer.id}:`, mikrotikError);
      
      res.json({
        success: false,
        message: `Failed to enable customer ${customer.name}`,
        data: {
          customer: {
            id: customer.id,
            name: customer.name,
            pppSecret: customer.pppSecret,
            router: customer.router
          },
          mikrotikResult: { 
            success: false, 
            error: mikrotikError.message 
          },
          timestamp: getJakartaTime().format('YYYY-MM-DD HH:mm:ss')
        }
      });
    }
  } catch (error) {
    console.error('Error in test enable:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// Test suspend customer by name
router.post('/test-suspend-by-name', async (req, res) => {
  try {
    const { customerName } = req.body;
    
    if (!customerName || !customerName.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Customer name is required' 
      });
    }
    
    // Search customer by name (case insensitive, partial match)
    const customer = await Customer.findOne({
      where: {
        name: {
          [Op.like]: `%${customerName.trim()}%`
        }
      }
    });
    
    if (!customer) {
      return res.status(404).json({ 
        success: false, 
        message: `Customer dengan nama '${customerName}' tidak ditemukan` 
      });
    }
    
    console.log(`🧪 Testing suspend by name for customer: ${customer.name} (${customer.pppSecret})`);
    
    try {
      // Test disable PPP Secret di Mikrotik
      const mikrotikAPI = require('../utils/mikrotik');
      const disableResult = await mikrotikAPI.disablePPPSecret(customer.router, customer.pppSecret);
      
      if (disableResult.success) {
        // Update customer status
        await customer.update({
          billingStatus: 'suspend',
          mikrotikStatus: 'disabled',
          lastSuspendDate: getJakartaTime().toDate()
        });
        
        res.json({
          success: true,
          message: `Customer ${customer.name} berhasil di-suspend`,
          data: {
            customer: {
              id: customer.id,
              name: customer.name,
              pppSecret: customer.pppSecret,
              router: customer.router,
              billingStatus: 'suspend',
              mikrotikStatus: 'disabled'
            },
            mikrotikResult: disableResult,
            timestamp: getJakartaTime().format('YYYY-MM-DD HH:mm:ss')
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: `Gagal suspend customer ${customer.name}: ${disableResult.message}`,
          data: {
            customer: {
              id: customer.id,
              name: customer.name,
              pppSecret: customer.pppSecret,
              router: customer.router
            },
            mikrotikResult: disableResult,
            timestamp: getJakartaTime().format('YYYY-MM-DD HH:mm:ss')
          }
        });
      }
    } catch (mikrotikError) {
      console.error(`❌ Failed to disable PPP Secret for customer ${customer.id}:`, mikrotikError);
      
      res.json({
        success: false,
        message: `Gagal suspend customer ${customer.name}`,
        data: {
          customer: {
            id: customer.id,
            name: customer.name,
            pppSecret: customer.pppSecret,
            router: customer.router
          },
          mikrotikResult: { 
            success: false, 
            error: mikrotikError.message 
          },
          timestamp: getJakartaTime().format('YYYY-MM-DD HH:mm:ss')
        }
      });
    }
  } catch (error) {
    console.error('Error in test suspend by name:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// Test enable customer by name
router.post('/test-enable-by-name', async (req, res) => {
  try {
    const { customerName } = req.body;
    
    if (!customerName || !customerName.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Customer name is required' 
      });
    }
    
    // Search customer by name (case insensitive, partial match)
    const customer = await Customer.findOne({
      where: {
        name: {
          [Op.like]: `%${customerName.trim()}%`
        }
      }
    });
    
    if (!customer) {
      return res.status(404).json({ 
        success: false, 
        message: `Customer dengan nama '${customerName}' tidak ditemukan` 
      });
    }
    
    console.log(`🧪 Testing enable by name for customer: ${customer.name} (${customer.pppSecret})`);
    
    try {
      // Test enable PPP Secret di Mikrotik
      const mikrotikAPI = require('../utils/mikrotik');
      const enableResult = await mikrotikAPI.enablePPPSecret(customer.router, customer.pppSecret);
      
      if (enableResult.success) {
        // Update customer status
        await customer.update({
          billingStatus: 'lunas',
          mikrotikStatus: 'enabled',
          serviceStatus: 'active'
        });
        
        res.json({
          success: true,
          message: `Customer ${customer.name} berhasil di-enable`,
          data: {
            customer: {
              id: customer.id,
              name: customer.name,
              pppSecret: customer.pppSecret,
              router: customer.router,
              billingStatus: 'lunas',
              mikrotikStatus: 'enabled',
              serviceStatus: 'active'
            },
            mikrotikResult: enableResult,
            timestamp: getJakartaTime().format('YYYY-MM-DD HH:mm:ss')
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: `Gagal enable customer ${customer.name}: ${enableResult.message}`,
          data: {
            customer: {
              id: customer.id,
              name: customer.name,
              pppSecret: customer.pppSecret,
              router: customer.router
            },
            mikrotikResult: enableResult,
            timestamp: getJakartaTime().format('YYYY-MM-DD HH:mm:ss')
          }
        });
      }
    } catch (mikrotikError) {
      console.error(`❌ Failed to enable PPP Secret for customer ${customer.id}:`, mikrotikError);
      
      res.json({
        success: false,
        message: `Gagal enable customer ${customer.name}`,
        data: {
          customer: {
            id: customer.id,
            name: customer.name,
            pppSecret: customer.pppSecret,
            router: customer.router
          },
          mikrotikResult: { 
            success: false, 
            error: mikrotikError.message 
          },
          timestamp: getJakartaTime().format('YYYY-MM-DD HH:mm:ss')
        }
      });
    }
  } catch (error) {
    console.error('Error in test enable by name:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: error.message 
    });
  }
});

module.exports = router;