'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('password_resets', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      resetToken: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      resetCode: {
        type: Sequelize.STRING(6),
        allowNull: true,
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      isUsed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      resetType: {
        type: Sequelize.ENUM('password', 'username'),
        allowNull: false,
      },
      requestedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      usedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      attempts: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
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
    await queryInterface.addIndex('password_resets', ['userId']);
    await queryInterface.addIndex('password_resets', ['resetToken'], { unique: true });
    await queryInterface.addIndex('password_resets', ['resetCode']);
    await queryInterface.addIndex('password_resets', ['expiresAt']);
    await queryInterface.addIndex('password_resets', ['resetType']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('password_resets');
  }
}; 