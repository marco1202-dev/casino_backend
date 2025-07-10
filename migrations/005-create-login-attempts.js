'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('login_attempts', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      username: {
        type: Sequelize.STRING(30),
        allowNull: false,
      },
      ipAddress: {
        type: Sequelize.STRING(45),
        allowNull: false,
      },
      userAgent: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      success: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      failureReason: {
        type: Sequelize.ENUM(
          'invalid_username',
          'invalid_password',
          'account_locked',
          'account_inactive',
          'email_not_verified',
          'mobile_not_verified'
        ),
        allowNull: true,
      },
      attemptedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add indexes
    await queryInterface.addIndex('login_attempts', ['userId']);
    await queryInterface.addIndex('login_attempts', ['username']);
    await queryInterface.addIndex('login_attempts', ['ipAddress']);
    await queryInterface.addIndex('login_attempts', ['success']);
    await queryInterface.addIndex('login_attempts', ['attemptedAt']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('login_attempts');
  }
}; 