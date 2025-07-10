const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LoginAttempt = sequelize.define('LoginAttempt', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    userId: {
      type: DataTypes.UUID,
      allowNull: true, // Can be null for failed attempts with invalid username
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },

    username: {
      type: DataTypes.STRING(30),
      allowNull: false
    },

    ipAddress: {
      type: DataTypes.STRING(45), // IPv6 compatible
      allowNull: false
    },

    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    success: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },

    failureReason: {
      type: DataTypes.ENUM(
        'invalid_username',
        'invalid_password',
        'account_locked',
        'account_inactive',
        'email_not_verified',
        'mobile_not_verified'
      ),
      allowNull: true
    },

    attemptedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'login_attempts',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['username']
      },
      {
        fields: ['ipAddress']
      },
      {
        fields: ['success']
      },
      {
        fields: ['attemptedAt']
      }
    ]
  });

  return LoginAttempt;
}; 