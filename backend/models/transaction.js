'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Transaction extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Transaction.belongsTo(models.Customer, {
        foreignKey: 'customerId',
        as: 'customer'
      });
    }
  }
  
  Transaction.init({
    customerId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    customerName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('payment', 'penalty', 'discount', 'refund'),
      allowNull: false,
      defaultValue: 'payment'
    },
    method: {
      type: DataTypes.ENUM('cash', 'transfer', 'digital_wallet', 'other'),
      allowNull: false,
      defaultValue: 'cash'
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false
    },
    periodFrom: {
      type: DataTypes.DATE,
      allowNull: false
    },
    periodTo: {
      type: DataTypes.DATE,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('paid', 'pending', 'overdue', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    receiptNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Transaction',
  });
  
  return Transaction;
};