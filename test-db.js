const { User, PasswordReset } = require('./models');
const { Op } = require('sequelize');

async function testDatabase() {
  console.log('🔍 Testing Database Connection and Password Reset Records...\n');

  try {
    // Test 1: Check if we can connect to the database
    console.log('1️⃣ Testing database connection...');
    await User.findOne({ limit: 1 });
    console.log('✅ Database connection successful');

    // Test 2: Check password_resets table structure
    console.log('\n2️⃣ Checking password_resets table...');
    const resetRecords = await PasswordReset.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']]
    });

    console.log(`Found ${resetRecords.length} password reset records`);

    if (resetRecords.length > 0) {
      console.log('\nLatest password reset records:');
      resetRecords.forEach((record, index) => {
        console.log(`\nRecord ${index + 1}:`);
        console.log(`  ID: ${record.id}`);
        console.log(`  Email: ${record.email}`);
        console.log(`  Reset Code: ${record.resetCode || 'NULL'}`);
        console.log(`  Reset Type: ${record.resetType}`);
        console.log(`  Is Used: ${record.isUsed}`);
        console.log(`  Expires At: ${record.expiresAt}`);
        console.log(`  Attempts: ${record.attempts}`);
        console.log(`  Created At: ${record.createdAt}`);
      });
    }

    // Test 3: Check for test email records
    console.log('\n3️⃣ Checking for test email records...');
    const testRecords = await PasswordReset.findAll({
      where: {
        email: 'test@example.com',
        resetType: 'password',
        isUsed: false
      },
      order: [['createdAt', 'DESC']]
    });

    console.log(`Found ${testRecords.length} test email records`);

    if (testRecords.length > 0) {
      const latestTest = testRecords[0];
      console.log('\nLatest test record:');
      console.log(`  Reset Code: ${latestTest.resetCode || 'NULL'}`);
      console.log(`  Expires At: ${latestTest.expiresAt}`);
      console.log(`  Is Expired: ${new Date() > latestTest.expiresAt}`);

      if (latestTest.resetCode) {
        console.log('\n4️⃣ Testing verification query...');
        const verificationTest = await PasswordReset.findOne({
          where: {
            email: 'test@example.com',
            resetCode: latestTest.resetCode,
            resetType: 'password',
            isUsed: false,
            expiresAt: { [Op.gt]: new Date() }
          }
        });

        if (verificationTest) {
          console.log('✅ Verification query works! Found matching record');
        } else {
          console.log('❌ Verification query failed! No matching record found');
          console.log('This explains the "Failed to verify reset code" error');
        }
      } else {
        console.log('❌ Reset code is NULL - this is the problem!');
        console.log('The email service is not saving the verification code to the database');
      }
    }

  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testDatabase();