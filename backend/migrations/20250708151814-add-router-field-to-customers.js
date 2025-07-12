'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Tambah kolom routerId sebagai foreign key
    await queryInterface.addColumn('customers', 'routerId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Routers',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    
    // Tambah index untuk performa
    await queryInterface.addIndex('customers', ['routerId']);
  },

  async down (queryInterface, Sequelize) {
    // Hapus index terlebih dahulu
    await queryInterface.removeIndex('customers', ['routerId']);
    
    // Hapus kolom routerId
    await queryInterface.removeColumn('customers', 'routerId');
  }
};
