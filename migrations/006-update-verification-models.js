'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Modify email_verifications table to allow null userId
    await queryInterface.changeColumn('email_verifications', 'userId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    });

    // Modify mobile_verifications table to allow null userId
    await queryInterface.changeColumn('mobile_verifications', 'userId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert email_verifications table
    await queryInterface.changeColumn('email_verifications', 'userId', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    });

    // Revert mobile_verifications table
    await queryInterface.changeColumn('mobile_verifications', 'userId', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    });
  }
}; 