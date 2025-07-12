'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Ubah kolom price dari DECIMAL(10,2) ke INTEGER
    await queryInterface.changeColumn('Packages', 'price', {
      type: Sequelize.INTEGER,
      allowNull: false
    });
    
    // Ubah kolom agentCommission dari DECIMAL(10,2) ke INTEGER (opsional)
    await queryInterface.changeColumn('Packages', 'agentCommission', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Rollback: kembalikan ke DECIMAL jika diperlukan
    await queryInterface.changeColumn('Packages', 'price', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false
    });
    
    await queryInterface.changeColumn('Packages', 'agentCommission', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    });
  }
};