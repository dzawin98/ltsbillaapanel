'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Transactions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      customerId: {
        type: Sequelize.STRING,
        allowNull: false
      },
      customerName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('payment', 'penalty', 'discount', 'refund'),
        allowNull: false,
        defaultValue: 'payment'
      },
      method: {
        type: Sequelize.ENUM('cash', 'transfer', 'digital_wallet', 'other'),
        allowNull: false,
        defaultValue: 'cash'
      },
      description: {
        type: Sequelize.STRING,
        allowNull: false
      },
      periodFrom: {
        type: Sequelize.DATE,
        allowNull: false
      },
      periodTo: {
        type: Sequelize.DATE,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('paid', 'pending', 'overdue', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending'
      },
      paidAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      dueDate: {
        type: Sequelize.DATE,
        allowNull: false
      },
      receiptNumber: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      },
      notes: {
        type: Sequelize.TEXT,
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
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Transactions');
  }
};