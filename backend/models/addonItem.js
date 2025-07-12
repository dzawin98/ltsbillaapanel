'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AddonItem extends Model {
    static associate(models) {
      AddonItem.belongsTo(models.Customer, {
        foreignKey: 'customerId',
        as: 'customer'
      });
    }
  }
  
  AddonItem.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    customerId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    itemName: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    itemType: {
      type: DataTypes.ENUM('one_time', 'monthly'),
      allowNull: false,
      defaultValue: 'monthly'
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isPaid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'AddonItem',
    tableName: 'addon_items'
  });
  
  return AddonItem;
};