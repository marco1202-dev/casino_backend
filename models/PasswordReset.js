const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PasswordReset = sequelize.define('PasswordReset', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },

    resetToken: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },

    resetCode: {
      type: DataTypes.STRING(6),
      allowNull: true, // Allow null initially, will be set by email service
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

    resetType: {
      type: DataTypes.ENUM('password', 'username'),
      allowNull: false
    },

    requestedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },

    usedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },

    attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 5
      }
    },

    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true
      }
    }
  }, {
    tableName: 'password_resets',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['resetToken']
      },
      {
        fields: ['resetCode']
      },
      {
        fields: ['expiresAt']
      },
      {
        fields: ['resetType']
      }
    ]
  });

  return PasswordReset;
}; 