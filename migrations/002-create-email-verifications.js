'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('email_verifications', {
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
        onDelete: 'CASCADE'
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      verificationCode: {
        type: Sequelize.STRING(6),
        allowNull: false,
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      isUsed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      attempts: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      sentAt: {
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
    await queryInterface.addIndex('email_verifications', ['userId']);
    await queryInterface.addIndex('email_verifications', ['email']);
    await queryInterface.addIndex('email_verifications', ['verificationCode']);
    await queryInterface.addIndex('email_verifications', ['expiresAt']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('email_verifications');
  }
}; 