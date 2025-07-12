const { User, PasswordReset } = require('./models');
const { Op } = require('sequelize');

async function testVerify() {
  console.log('🔍 Testing Verify Code Issue...\n');

  try {
    // Check if we have any users
    console.log('1️⃣ Checking users table...');
    const users = await User.findAll({ limit: 5 });
    console.log(`Found ${users.length} users`);

    if (users.length > 0) {
      users.forEach((user, index) => {
        console.log(`User ${index + 1}: ${user.email} (${user.username})`);
      });
    } else {
      console.log('❌ No users found! You need to create a user first.');
      return;
    }

    // Check password reset records
    console.log('\n2️⃣ Checking password reset records...');
    const resetRecords = await PasswordReset.findAll({
      order: [['createdAt', 'DESC']]
    });
    console.log(`Found ${resetRecords.length} password reset records`);

    if (resetRecords.length > 0) {
      const latest = resetRecords[0];
      console.log('\nLatest reset record:');
      console.log(`  Email: ${latest.email}`);
      console.log(`  Reset Code: ${latest.resetCode || 'NULL'}`);
      console.log(`  Reset Type: ${latest.resetType}`);
      console.log(`  Is Used: ${latest.isUsed}`);
      console.log(`  Expires At: ${latest.expiresAt}`);
      console.log(`  Is Expired: ${new Date() > latest.expiresAt}`);
      console.log(`  Attempts: ${latest.attempts}`);

      if (latest.resetCode) {
        console.log('\n3️⃣ Testing verification query...');
        const verificationTest = await PasswordReset.findOne({
          where: {
            email: latest.email,
            resetCode: latest.resetCode,
            resetType: 'password',
            isUsed: false,
            expiresAt: { [Op.gt]: new Date() }
          }
        });

        if (verificationTest) {
          console.log('✅ Verification query works! Found matching record');
        } else {
          console.log('❌ Verification query failed! No matching record found');
          console.log('Possible reasons:');
          console.log('  - Code is expired');
          console.log('  - Record is already used');
          console.log('  - Email/code mismatch');
        }
      } else {
        console.log('❌ Reset code is NULL - email service not saving codes');
      }
    } else {
      console.log('❌ No password reset records found');
      console.log('This means the password reset request is not creating records');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testVerify(); 