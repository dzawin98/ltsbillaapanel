'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Tambah field prorata ke customers
    await queryInterface.addColumn('customers', 'isProRataApplied', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Apakah prorata sudah diterapkan untuk bulan pertama'
    });
    
    await queryInterface.addColumn('customers', 'proRataAmount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Jumlah prorata untuk bulan pertama'
    });
    
    // Buat tabel addon_items
    await queryInterface.createTable('addon_items', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      customerId: {
        type: Sequelize.UUID,  // Ubah dari INTEGER ke UUID
        allowNull: false,
        references: {
          model: 'customers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      itemName: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      itemType: {
        type: Sequelize.ENUM('one_time', 'monthly'),
        allowNull: false,
        defaultValue: 'monthly'
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      isPaid: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'Untuk one_time items, track apakah sudah dibayar'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
    
    // Tambah field breakdown ke transactions untuk detail tagihan
    await queryInterface.addColumn('transactions', 'breakdown', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Detail breakdown tagihan (package, addons, one-time items)'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('customers', 'isProRataApplied');
    await queryInterface.removeColumn('customers', 'proRataAmount');
    await queryInterface.dropTable('addon_items');
    await queryInterface.removeColumn('transactions', 'breakdown');
  }
};