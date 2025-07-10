require('dotenv').config();

console.log('Environment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DB_USERNAME:', process.env.DB_USERNAME);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_USER:', process.env.SMTP_USER);

// Test database connection
const db = require('./models');

async function testDB() {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
}

testDB(); 