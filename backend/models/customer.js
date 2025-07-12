module.exports = (sequelize, DataTypes) => {
  const Customer = sequelize.define('Customer', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    customerNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    idNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    area: {
      type: DataTypes.STRING,
      allowNull: false
    },
    package: {
      type: DataTypes.STRING,
      allowNull: false
    },
    packagePrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    addonPrice: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    discount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    pppSecret: {
      type: DataTypes.STRING,
      allowNull: true
    },
    pppSecretType: {
      type: DataTypes.ENUM('existing', 'new', 'none'),
      defaultValue: 'none'
    },
    odpSlot: {
      type: DataTypes.STRING,
      allowNull: true
    },
    odpId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'ODPs',
        key: 'id'
      }
    },
    billingType: {
      type: DataTypes.ENUM('prepaid', 'postpaid'),
      defaultValue: 'prepaid'
    },
    activePeriod: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    activePeriodUnit: {
      type: DataTypes.ENUM('days', 'months'),
      defaultValue: 'months'
    },
    installationStatus: {
      type: DataTypes.ENUM('not_installed', 'installed'),
      defaultValue: 'not_installed'
    },
    serviceStatus: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'inactive'
    },
    activeDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    expireDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    paymentDueDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('active', 'suspended', 'terminated', 'pending'),
      defaultValue: 'pending'
    },
    isIsolated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    routerName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    routerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'routers',
        key: 'id'
      }
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    billingStatus: {
      type: DataTypes.ENUM('belum_lunas', 'lunas', 'suspend'),
      defaultValue: 'belum_lunas',
      allowNull: false
    },
    lastBillingDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    nextBillingDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    mikrotikStatus: {
      type: DataTypes.ENUM('active', 'disabled'),
      defaultValue: 'active',
      allowNull: false
    },
    lastSuspendDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isProRataApplied: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    proRataAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    }
  }, {
    tableName: 'customers',
    timestamps: true
  });

  Customer.associate = function(models) {
    Customer.belongsTo(models.Router, {
      foreignKey: 'routerId',
      as: 'routerData'
    });
    
    Customer.belongsTo(models.ODP, {
      foreignKey: 'odpId',
      as: 'odpData'
    });
    
    Customer.hasMany(models.Transaction, {
      foreignKey: 'customerId',
      as: 'transactions'
    });
    
    Customer.hasMany(models.AddonItem, {
      foreignKey: 'customerId',
      as: 'addonItems'
    });
  };

  return Customer;
};