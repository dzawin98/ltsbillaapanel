'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('customers', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      customerNumber: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true,
        validate: {
          isEmail: true
        }
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: false
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      idNumber: {
        type: Sequelize.STRING,
        allowNull: false
      },
      area: {
        type: Sequelize.STRING,
        allowNull: false
      },
      package: {
        type: Sequelize.STRING,
        allowNull: false
      },
      packagePrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      addonPrice: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      discount: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      pppSecret: {
        type: Sequelize.STRING,
        allowNull: true
      },
      pppSecretType: {
        type: Sequelize.ENUM('existing', 'new', 'none'),
        defaultValue: 'none'
      },
      odpSlot: {
        type: Sequelize.STRING,
        allowNull: true
      },
      billingType: {
        type: Sequelize.ENUM('prepaid', 'postpaid'),
        defaultValue: 'prepaid'
      },
      activePeriod: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      },
      activePeriodUnit: {
        type: Sequelize.ENUM('days', 'months'),
        defaultValue: 'months'
      },
      installationStatus: {
        type: Sequelize.ENUM('not_installed', 'installed'),
        defaultValue: 'not_installed'
      },
      serviceStatus: {
        type: Sequelize.ENUM('active', 'inactive'),
        defaultValue: 'inactive'
      },
      activeDate: {
        type: Sequelize.DATE,
        allowNull: false
      },
      expireDate: {
        type: Sequelize.DATE,
        allowNull: false
      },
      paymentDueDate: {
        type: Sequelize.DATE,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('active', 'suspended', 'terminated', 'pending'),
        defaultValue: 'pending'
      },
      isIsolated: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      routerName: {
        type: Sequelize.STRING,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('customers');
  }
};