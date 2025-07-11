const express = require('express');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { User, EmailVerification } = require('../models');
const { Op } = require('sequelize');
const emailService = require('../services/emailService');
const router = express.Router();

// Helper function to generate expiration date
function generateExpirationDate() {
  const expiryMs = parseInt(process.env.VERIFICATION_CODE_EXPIRY || '300000');
  return new Date(Date.now() + expiryMs);
}

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Verification routes are working'
  });
});

// Send email verification code (pre-registration - email only)
router.post('/send-email', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
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

    const { email } = req.body;

    // Check if user already exists with this email
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered'
      });
    }

    // Invalidate any existing verification codes for this email
    await EmailVerification.update(
      { isUsed: true },
      { where: { email, isUsed: false } }
    );

    // Generate expiration date
    const expiresAt = generateExpirationDate();

    // Create verification record without code (will be set by external SMTP service)
    const verificationRecord = await EmailVerification.create({
      userId: null, // null for pre-registration verification
      email,
      verificationCode: '', // Will be set by external service
      expiresAt,
      attempts: 0,
      isUsed: false
    });

    // Send email via SMTP service
    const emailResult = await emailService.sendVerificationEmail(email, verificationRecord.id, expiresAt);

    if (!emailResult.success) {
      // Delete the verification record if email failed
      await verificationRecord.destroy();
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'Verification code sent to your email',
      data: {
        expiresAt
      }
    });

  } catch (error) {
    console.error('Send email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send verification code'
    });
  }
});

// Verify email code (pre-registration - email only)
router.post('/verify-email', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('code').isLength({ min: 6, max: 6 }).withMessage('Verification code must be 6 digits')
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

    const { email, code } = req.body;

    // Find verification record for pre-registration (userId is null)
    const verification = await EmailVerification.findOne({
      where: {
        email,
        verificationCode: code,
        userId: null, // pre-registration verification
        isUsed: false,
        expiresAt: { [Op.gt]: new Date() }
      }
    });

    if (!verification) {
      // Increment attempts for any valid verification record
      await EmailVerification.increment('attempts', {
        where: {
          email,
          userId: null,
          isUsed: false,
          expiresAt: { [Op.gt]: new Date() }
        }
      });

      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    // Check attempts limit
    if (verification.attempts >= 5) {
      await verification.update({ isUsed: true });
      return res.status(400).json({
        success: false,
        message: 'Too many verification attempts. Please request a new code.'
      });
    }

    // Mark verification as used
    await verification.update({ isUsed: true });

    res.json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify email'
    });
  }
});



// Original endpoints with userId (for existing user verification)
// Send email verification code (existing user)
router.post('/send-email-user', [
  body('userId').isUUID().withMessage('Valid user ID is required')
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

    const { userId } = req.body;

    // Find user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if email is already verified
    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Invalidate any existing verification codes for this user
    await EmailVerification.update(
      { isUsed: true },
      { where: { userId, isUsed: false } }
    );

    // Generate expiration date
    const expiresAt = generateExpirationDate();

    // Create verification record without code (will be set by external SMTP service)
    const verificationRecord = await EmailVerification.create({
      userId,
      email: user.email,
      verificationCode: '', // Will be set by external service
      expiresAt,
      attempts: 0,
      isUsed: false
    });

    // Send email via SMTP service
    const emailResult = await emailService.sendVerificationEmail(user.email, verificationRecord.id, expiresAt);

    if (!emailResult.success) {
      // Delete the verification record if email failed
      await verificationRecord.destroy();
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'Verification code sent to your email',
      data: {
        expiresAt
      }
    });

  } catch (error) {
    console.error('Send email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send verification code'
    });
  }
});

// Check verification status
router.get('/status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId, {
      attributes: ['id', 'email', 'mobileNumber', 'emailVerified']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        userId: user.id,
        email: user.email,
        mobileNumber: user.mobileNumber,
        emailVerified: user.emailVerified
      }
    });

  } catch (error) {
    console.error('Get verification status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get verification status'
    });
  }
});

module.exports = router; 