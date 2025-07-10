'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Update email_verifications table
    await queryInterface.changeColumn('email_verifications', 'verificationCode', {
      type: Sequelize.STRING(6),
      allowNull: true,
    });

    // Update mobile_verifications table
    await queryInterface.changeColumn('mobile_verifications', 'verificationCode', {
      type: Sequelize.STRING(6),
      allowNull: true,
    });

    // Update password_resets table
    await queryInterface.changeColumn('password_resets', 'resetCode', {
      type: Sequelize.STRING(6),
      allowNull: true,
    });

    // Add missing fields to password_resets table
    await queryInterface.addColumn('password_resets', 'attempts', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
    });

    // Add email column with default value for existing records
    await queryInterface.addColumn('password_resets', 'email', {
      type: Sequelize.STRING(255),
      allowNull: true, // Allow null initially
    });

    // Update existing records to have a default email (you may want to handle this differently)
    await queryInterface.sequelize.query(`
      UPDATE password_resets 
      SET email = (SELECT email FROM users WHERE users.id = password_resets."userId")
      WHERE email IS NULL
    `);

    // Now make email column not null
    await queryInterface.changeColumn('password_resets', 'email', {
      type: Sequelize.STRING(255),
      allowNull: false,
    });

    console.log('✅ Updated verification models to allow empty codes initially');
  },

  down: async (queryInterface, Sequelize) => {
    // Revert email_verifications table
    await queryInterface.changeColumn('email_verifications', 'verificationCode', {
      type: Sequelize.STRING(6),
      allowNull: false,
    });

    // Revert mobile_verifications table
    await queryInterface.changeColumn('mobile_verifications', 'verificationCode', {
      type: Sequelize.STRING(6),
      allowNull: false,
    });

    // Revert password_resets table
    await queryInterface.changeColumn('password_resets', 'resetCode', {
      type: Sequelize.STRING(6),
      allowNull: false,
    });

    // Remove added fields from password_resets table
    await queryInterface.removeColumn('password_resets', 'attempts');
    await queryInterface.removeColumn('password_resets', 'email');

    console.log('✅ Reverted verification models changes');
  }
}; 