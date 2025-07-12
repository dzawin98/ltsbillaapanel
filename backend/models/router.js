'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Router = sequelize.define('Router', {
    name: DataTypes.STRING,
    ipAddress: DataTypes.STRING,
    port: DataTypes.INTEGER,
    username: DataTypes.STRING,
    password: DataTypes.STRING,
    status: DataTypes.STRING,
    lastSeen: DataTypes.DATE,
    area: DataTypes.STRING,
    model: DataTypes.STRING,
    firmware: DataTypes.STRING,
    uptime: DataTypes.STRING
  }, {
    tableName: 'routers',
    timestamps: true
  });

  // Definisikan associations
  Router.associate = function(models) {
    // Router has many Customers
    Router.hasMany(models.Customer, {
      foreignKey: 'routerId',
      as: 'customers'
    });
  };

  return Router;
};