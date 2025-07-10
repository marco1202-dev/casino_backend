require('dotenv').config();

async function testVerification() {
  try {
    console.log('Testing verification system...');
    
    // Test database connection
    const db = require('./models');
    await db.sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Test EmailVerification model
    const { EmailVerification } = require('./models');
    console.log('✅ EmailVerification model loaded');
    
    // Test email service
    const emailService = require('./services/emailService');
    console.log('✅ Email service loaded');
    
    // Test creating a verification record
    const testEmail = 'test@example.com';
    const expiresAt = new Date(Date.now() + 300000); // 5 minutes
    
    const verificationRecord = await EmailVerification.create({
      userId: null,
      email: testEmail,
      verificationCode: '',
      expiresAt,
      attempts: 0,
      isUsed: false
    });
    
    console.log('✅ Verification record created:', verificationRecord.id);
    
    // Test sending verification email
    const result = await emailService.sendVerificationEmail(testEmail, verificationRecord.id, expiresAt);
    console.log('✅ Email service result:', result);
    
    // Clean up
    await verificationRecord.destroy();
    console.log('✅ Test record cleaned up');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

testVerification();