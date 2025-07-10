const express = require('express');
const { body, validationResult } = require('express-validator');
const { EmailVerification, PasswordReset } = require('../models');
const router = express.Router();

// SMTP Server endpoint to set verification code for email verification
router.post('/set-email-verification-code', [
  body('verificationRecordId').isUUID().withMessage('Valid verification record ID is required'),
  body('verificationCode').isLength({ min: 6, max: 6 }).withMessage('Verification code must be 6 digits'),
  body('verificationCode').matches(/^\d+$/).withMessage('Verification code must be numeric')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { verificationRecordId, verificationCode } = req.body;

    // Find the verification record
    const verificationRecord = await EmailVerification.findByPk(verificationRecordId);

    if (!verificationRecord) {
      return res.status(404).json({
        success: false,
        message: 'Verification record not found'
      });
    }

    // Check if the verification is still valid (not expired, not used)
    if (verificationRecord.isUsed || new Date() > verificationRecord.expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'Verification record is expired or already used'
      });
    }

    // Update the verification record with the code from SMTP server
    await verificationRecord.update({
      verificationCode: verificationCode
    });

    console.log(`✅ Email verification code set for record ${verificationRecordId}: ${verificationCode}`);

    res.json({
      success: true,
      message: 'Verification code set successfully'
    });

  } catch (error) {
    console.error('Set email verification code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set verification code'
    });
  }
});

// SMTP Server endpoint to set verification code for password reset
router.post('/set-password-reset-code', [
  body('resetRecordId').isUUID().withMessage('Valid reset record ID is required'),
  body('resetCode').isLength({ min: 6, max: 6 }).withMessage('Reset code must be 6 digits'),
  body('resetCode').matches(/^\d+$/).withMessage('Reset code must be numeric')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { resetRecordId, resetCode } = req.body;

    // Find the reset record
    const resetRecord = await PasswordReset.findByPk(resetRecordId);

    if (!resetRecord) {
      return res.status(404).json({
        success: false,
        message: 'Reset record not found'
      });
    }

    // Check if the reset is still valid (not expired, not used)
    if (resetRecord.isUsed || new Date() > resetRecord.expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'Reset record is expired or already used'
      });
    }

    // Update the reset record with the code from SMTP server
    await resetRecord.update({
      resetCode: resetCode
    });

    console.log(`✅ Password reset code set for record ${resetRecordId}: ${resetCode}`);

    res.json({
      success: true,
      message: 'Reset code set successfully'
    });

  } catch (error) {
    console.error('Set password reset code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set reset code'
    });
  }
});

// Get verification record details (for SMTP server)
router.get('/verification-record/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;

    // Try to find in email verifications
    let record = await EmailVerification.findByPk(recordId);
    let recordType = 'email';

    if (!record) {
      // Try to find in password resets
      record = await PasswordReset.findByPk(recordId);
      recordType = 'password';
    }

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Record not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: record.id,
        type: recordType,
        email: record.email,
        expiresAt: record.expiresAt,
        isUsed: record.isUsed,
        createdAt: record.createdAt
      }
    });

  } catch (error) {
    console.error('Get verification record error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get verification record'
    });
  }
});

module.exports = router; 