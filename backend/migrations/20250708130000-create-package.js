'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Packages', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      downloadSpeed: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Download speed in Mbps'
      },
      uploadSpeed: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Upload speed in Mbps'
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 30,
        comment: 'Duration in days'
      },
      mikrotikProfile: {
        type: Sequelize.STRING,
        allowNull: false
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      allowUpgradeDowngrade: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      onlineRegistration: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      taxPercentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0
      },
      agentCommission: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      routerName: {
        type: Sequelize.STRING,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Packages');
  }
};