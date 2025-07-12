'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Ubah kolom idNumber menjadi nullable
    await queryInterface.changeColumn('customers', 'idNumber', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    // Kembalikan ke NOT NULL (hati-hati dengan data yang sudah ada)
    await queryInterface.changeColumn('customers', 'idNumber', {
      type: Sequelize.STRING,
      allowNull: false
    });
  }
};