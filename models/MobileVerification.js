const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MobileVerification = sequelize.define('MobileVerification', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },

    mobileNumber: {
      type: DataTypes.STRING(20),
      allowNull: false
    },

    verificationCode: {
      type: DataTypes.STRING(6),
      allowNull: true, // Allow null initially, will be set by SMS service
      validate: {
        len: [0, 6], // Allow empty string initially
        isNumeric: function (value) {
          if (value && value.length > 0) {
            return /^\d+$/.test(value);
          }
          return true; // Allow empty string
        }
      }
    },

    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false
    },

    isUsed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },

    attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 5
      }
    },

    sentAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'mobile_verifications',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['mobileNumber']
      },
      {
        fields: ['verificationCode']
      },
      {
        fields: ['expiresAt']
      }
    ]
  });

  return MobileVerification;
}; 