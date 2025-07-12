'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Tambah field billing status ke customers
    await queryInterface.addColumn('customers', 'billingStatus', {
      type: Sequelize.ENUM('belum_lunas', 'lunas', 'suspend'),
      defaultValue: 'belum_lunas',
      allowNull: false
    });
    
    // Tambah field untuk tracking billing cycle
    await queryInterface.addColumn('customers', 'lastBillingDate', {
      type: Sequelize.DATE,
      allowNull: true
    });
    
    await queryInterface.addColumn('customers', 'nextBillingDate', {
      type: Sequelize.DATE,
      allowNull: true
    });
    
    // Tambah field untuk MikroTik integration
    await queryInterface.addColumn('customers', 'mikrotikStatus', {
      type: Sequelize.ENUM('active', 'disabled'),
      defaultValue: 'active',
      allowNull: false
    });
    
    await queryInterface.addColumn('customers', 'lastSuspendDate', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('customers', 'billingStatus');
    await queryInterface.removeColumn('customers', 'lastBillingDate');
    await queryInterface.removeColumn('customers', 'nextBillingDate');
    await queryInterface.removeColumn('customers', 'mikrotikStatus');
    await queryInterface.removeColumn('customers', 'lastSuspendDate');
  }
};