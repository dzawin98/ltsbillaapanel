'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Hapus kolom router yang duplikat
    await queryInterface.removeColumn('customers', 'router');
  },

  async down (queryInterface, Sequelize) {
    // Tambahkan kembali kolom router jika rollback
    await queryInterface.addColumn('customers', 'router', {
      type: Sequelize.STRING,
      allowNull: true
    });
  }
};