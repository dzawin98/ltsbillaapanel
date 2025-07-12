'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ODP extends Model {
    // Update bagian associate
    static associate(models) {
      // Relasi dengan Customer
      ODP.hasMany(models.Customer, {
        foreignKey: 'odpId',
        as: 'customers'
      });
    }
  }
  
  ODP.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    location: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    area: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    totalSlots: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 8,
      validate: {
        min: 1
      }
    },
    usedSlots: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    availableSlots: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 8,
      validate: {
        min: 0
      }
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('active', 'maintenance', 'inactive'),
      allowNull: false,
      defaultValue: 'active'
    }
  }, {
    sequelize,
    modelName: 'ODP',
    hooks: {
      beforeSave: (odp) => {
        // Auto calculate available slots
        odp.availableSlots = odp.totalSlots - odp.usedSlots;
      }
    }
  });
  
  return ODP;
};