const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    // Step 1 - Personal Information
    firstName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 50]
      }
    },

    lastName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 50]
      }
    },

    countryOfResidence: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },

    nationality: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },

    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },

    emailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },

    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: true,
        isBefore: new Date().toISOString() // Must be in the past
      }
    },

    isOver18: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },

    acceptedTerms: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },

    // Step 2 - Account Credentials
    username: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 30],
        isAlphanumeric: true
      }
    },

    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },

    securityQuestion: {
      type: DataTypes.STRING(255),
      allowNull: false
    },

    securityAnswerHash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },

    // Step 3 - Address and Additional Info
    street: {
      type: DataTypes.STRING(255),
      allowNull: false
    },

    houseNumber: {
      type: DataTypes.STRING(20),
      allowNull: false
    },

    city: {
      type: DataTypes.STRING(100),
      allowNull: false
    },

    postalCode: {
      type: DataTypes.STRING(20),
      allowNull: false
    },

    mobileNumber: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true
    },

    bankrollCurrency: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        isIn: [['USD', 'EUR', 'GBP', 'BTC', 'ETH', 'USDT', 'BNB', 'ADA', 'SOL', 'DOT']]
      }
    },

    // Account Status
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },

    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true
    },

    registrationStep: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      validate: {
        min: 1,
        max: 3
      }
    },

    registrationCompleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'users',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['email']
      },
      {
        unique: true,
        fields: ['username']
      },
      {
        unique: true,
        fields: ['mobileNumber']
      }
    ]
  });

  return User;
}; 