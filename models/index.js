const { Sequelize } = require('sequelize');
const config = require('../config/database');

// Get the current environment (default to 'development')
const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Initialize Sequelize
const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
  host: dbConfig.host,
  port: dbConfig.port,
  dialect: dbConfig.dialect,
  logging: dbConfig.logging,
  pool: dbConfig.pool,
  timezone: '+00:00', // UTC
  ...(dbConfig.dialectOptions && { dialectOptions: dbConfig.dialectOptions }),
  ...(dbConfig.define && { define: dbConfig.define })
});

// Import models
const User = require('./User')(sequelize);
const EmailVerification = require('./EmailVerification')(sequelize);
const PasswordReset = require('./PasswordReset')(sequelize);
const LoginAttempt = require('./LoginAttempt')(sequelize);

// Define associations
User.hasMany(EmailVerification, {
  foreignKey: 'userId',
  as: 'emailVerifications',
  onDelete: 'CASCADE'
});
EmailVerification.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});



User.hasMany(PasswordReset, {
  foreignKey: 'userId',
  as: 'passwordResets',
  onDelete: 'CASCADE'
});
PasswordReset.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

User.hasMany(LoginAttempt, {
  foreignKey: 'userId',
  as: 'loginAttempts',
  onDelete: 'SET NULL'
});
LoginAttempt.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// Export models and sequelize
module.exports = {
  sequelize,
  User,
  EmailVerification,
  PasswordReset,
  LoginAttempt,
}; 