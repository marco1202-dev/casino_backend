'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },

      // Step 1 - Personal Information
      firstName: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      lastName: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      countryOfResidence: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      nationality: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      emailVerified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      dateOfBirth: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      isOver18: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      acceptedTerms: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      // Step 2 - Account Credentials
      username: {
        type: Sequelize.STRING(30),
        allowNull: false,
        unique: true,
      },
      passwordHash: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      securityQuestion: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      securityAnswerHash: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },

      // Step 3 - Address and Additional Info
      street: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      houseNumber: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      postalCode: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      mobileNumber: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
      },

      bankrollCurrency: {
        type: Sequelize.STRING(10),
        allowNull: false,
      },

      // Account Status
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      lastLoginAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      registrationStep: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
      },
      registrationCompleted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
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
    await queryInterface.addIndex('users', ['email'], { unique: true });
    await queryInterface.addIndex('users', ['username'], { unique: true });
    await queryInterface.addIndex('users', ['mobileNumber'], { unique: true });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('users');
  }
}; 