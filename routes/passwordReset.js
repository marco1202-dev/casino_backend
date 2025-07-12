const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { User, PasswordReset } = require('../models');
const { Op } = require('sequelize');
const emailService = require('../services/emailService');
const router = express.Router();

// Helper function to generate reset token
function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Request password reset
router.post('/request-password-reset', [
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

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Don't reveal if email exists for security
      return res.json({
        success: true,
        message: 'If an account with this email exists, a password reset code has been sent.'
      });
    }

    // Invalidate any existing password reset tokens for this user
    await PasswordReset.update(
      { isUsed: true },
      { where: { userId: user.id, isUsed: false } }
    );

    // Generate reset token and expiration date
    const resetToken = generateResetToken();
    const expiresAt = new Date(Date.now() + (process.env.PASSWORD_RESET_EXPIRY || 3600000)); // 1 hour

    // Create password reset record without reset code
    const resetRecord = await PasswordReset.create({
      userId: user.id,
      email: user.email,
      resetToken,
      resetCode: '', // Will be set by email service
      resetType: 'password',
      expiresAt,
      attempts: 0,
      isUsed: false
    });

    // Send email via SMTP service
    let emailResult;
    try {
      emailResult = await emailService.sendPasswordResetEmail(user.email, resetRecord.id, expiresAt);
    } catch (emailError) {
      console.error('Email service error:', emailError);
      // Delete the reset record if email failed
      await resetRecord.destroy();
      return res.status(500).json({
        success: false,
        message: 'Failed to send password reset email. Please try again.'
      });
    }

    if (!emailResult.success) {
      // Delete the reset record if email failed
      await resetRecord.destroy();
      return res.status(500).json({
        success: false,
        message: 'Failed to send password reset email. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'If an account with this email exists, a password reset code has been sent.',
      data: {
        expiresAt
      }
    });

  } catch (error) {
    console.error('Request password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request'
    });
  }
});

// Verify password reset code
router.post('/verify-reset-code', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('verificationCode').isLength({ min: 6, max: 6 }).withMessage('Verification code must be 6 digits')
], async (req, res) => {
  try {
    console.log('🔍 Verify reset code endpoint called');
    console.log('Request body:', req.body);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    console.log('✅ Validation passed');

    const { email, verificationCode } = req.body;

    console.log('🔍 Verifying reset code:', { email, verificationCode, currentTime: new Date() });

    // Find password reset record
    let resetRecord;
    try {
      resetRecord = await PasswordReset.findOne({
        where: {
          email,
          resetCode: verificationCode,
          resetType: 'password',
          isUsed: false,
          expiresAt: { [Op.gt]: new Date() }
        }
      });
    } catch (queryError) {
      console.error('❌ Database query error:', queryError);
      throw new Error('Database query failed: ' + queryError.message);
    }

    console.log('🔍 Reset record found:', resetRecord ? 'Yes' : 'No');
    if (resetRecord) {
      console.log('🔍 Reset record details:', {
        id: resetRecord.id,
        email: resetRecord.email,
        resetCode: resetRecord.resetCode,
        resetType: resetRecord.resetType,
        isUsed: resetRecord.isUsed,
        expiresAt: resetRecord.expiresAt,
        attempts: resetRecord.attempts
      });
    } else {
      // Debug: Check if there are any password reset records for this email
      try {
        const allRecords = await PasswordReset.findAll({
          where: { email, resetType: 'password' },
          order: [['createdAt', 'DESC']]
        });
        console.log('🔍 All password reset records for email:', allRecords.map(r => ({
          id: r.id,
          resetCode: r.resetCode,
          isUsed: r.isUsed,
          expiresAt: r.expiresAt,
          attempts: r.attempts,
          createdAt: r.createdAt
        })));
      } catch (debugError) {
        console.error('❌ Error fetching debug records:', debugError);
      }
    }

    if (!resetRecord) {
      // Increment attempts for any valid reset record (only if records exist)
      try {
        const validRecords = await PasswordReset.findAll({
          where: {
            email,
            resetType: 'password',
            isUsed: false,
            expiresAt: { [Op.gt]: new Date() }
          }
        });

        if (validRecords.length > 0) {
          await PasswordReset.increment('attempts', {
            where: {
              email,
              resetType: 'password',
              isUsed: false,
              expiresAt: { [Op.gt]: new Date() }
            }
          });
        }
      } catch (incrementError) {
        console.error('Error incrementing attempts:', incrementError);
        // Don't fail the request if increment fails
      }

      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    // Check attempts limit
    if (resetRecord.attempts >= 5) {
      try {
        await resetRecord.update({ isUsed: true });
      } catch (updateError) {
        console.error('❌ Error updating reset record:', updateError);
        throw new Error('Failed to update reset record: ' + updateError.message);
      }
      return res.status(400).json({
        success: false,
        message: 'Too many verification attempts. Please request a new reset code.'
      });
    }

    console.log('✅ Verification successful, returning reset token');
    res.json({
      success: true,
      message: 'Verification code confirmed. You can now reset your password.',
      data: {
        resetToken: resetRecord.resetToken
      }
    });

  } catch (error) {
    console.error('Verify reset code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify reset code'
    });
  }
});

// Reset password
router.post('/reset-password', [
  body('resetToken').isLength({ min: 1 }).withMessage('Reset token is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
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

    const { resetToken, newPassword } = req.body;

    // Find password reset record
    const resetRecord = await PasswordReset.findOne({
      where: {
        resetToken,
        resetType: 'password',
        isUsed: false,
        expiresAt: { [Op.gt]: new Date() }
      }
    });

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Find user
    const user = await User.findByPk(resetRecord.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update user password and mark reset record as used
    await user.update({ passwordHash });
    await resetRecord.update({ isUsed: true });

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
});

// Request username recovery
router.post('/request-username-recovery', [
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

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Don't reveal if email exists for security
      return res.json({
        success: true,
        message: 'If an account with this email exists, username recovery information has been sent.'
      });
    }

    // Invalidate any existing username recovery tokens for this user
    await PasswordReset.update(
      { isUsed: true },
      { where: { userId: user.id, resetType: 'username', isUsed: false } }
    );

    // Generate reset token and expiration date
    const resetToken = generateResetToken();
    const expiresAt = new Date(Date.now() + (process.env.PASSWORD_RESET_EXPIRY || 3600000)); // 1 hour

    // Create username recovery record without verification code
    const resetRecord = await PasswordReset.create({
      userId: user.id,
      email: user.email,
      resetToken,
      resetCode: '', // Will be set by email service
      resetType: 'username',
      expiresAt,
      attempts: 0,
      isUsed: false
    });

    // Send email via SMTP service
    const emailResult = await emailService.sendPasswordResetEmail(user.email, resetRecord.id, expiresAt);

    if (!emailResult.success) {
      // Delete the reset record if email failed
      await resetRecord.destroy();
      return res.status(500).json({
        success: false,
        message: 'Failed to send username recovery email. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'If an account with this email exists, username recovery information has been sent.',
      data: {
        expiresAt
      }
    });

  } catch (error) {
    console.error('Request username recovery error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process username recovery request'
    });
  }
});

// Verify username recovery code and return username
router.post('/verify-username-recovery', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('verificationCode').isLength({ min: 6, max: 6 }).withMessage('Verification code must be 6 digits')
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

    const { email, verificationCode } = req.body;

    // Find username recovery record
    const resetRecord = await PasswordReset.findOne({
      where: {
        email,
        resetCode: verificationCode,
        resetType: 'username',
        isUsed: false,
        expiresAt: { [Op.gt]: new Date() }
      }
    });

    if (!resetRecord) {
      // Increment attempts for any valid reset record (only if records exist)
      try {
        const validRecords = await PasswordReset.findAll({
          where: {
            email,
            resetType: 'username',
            isUsed: false,
            expiresAt: { [Op.gt]: new Date() }
          }
        });

        if (validRecords.length > 0) {
          await PasswordReset.increment('attempts', {
            where: {
              email,
              resetType: 'username',
              isUsed: false,
              expiresAt: { [Op.gt]: new Date() }
            }
          });
        }
      } catch (incrementError) {
        console.error('Error incrementing attempts:', incrementError);
        // Don't fail the request if increment fails
      }

      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    // Check attempts limit
    if (resetRecord.attempts >= 5) {
      await resetRecord.update({ isUsed: true });
      return res.status(400).json({
        success: false,
        message: 'Too many verification attempts. Please request a new recovery code.'
      });
    }

    // Find user to get username
    const user = await User.findByPk(resetRecord.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Mark recovery record as used
    await resetRecord.update({ isUsed: true });

    res.json({
      success: true,
      message: 'Username recovered successfully',
      data: {
        username: user.username
      }
    });

  } catch (error) {
    console.error('Verify username recovery error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify recovery code'
    });
  }
});

// Verify using security question (alternative recovery method)
router.post('/verify-security-question', [
  body('emailOrUsername').trim().isLength({ min: 1 }).withMessage('Email or username is required'),
  body('securityAnswer').trim().isLength({ min: 1 }).withMessage('Security answer is required')
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

    const { emailOrUsername, securityAnswer } = req.body;

    // Find user by email or username
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: emailOrUsername },
          { username: emailOrUsername }
        ]
      }
    });

    if (!user || !user.securityAnswerHash) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials or security question not set'
      });
    }

    // Verify security answer
    const isValidAnswer = await bcrypt.compare(securityAnswer.toLowerCase(), user.securityAnswerHash);
    if (!isValidAnswer) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect security answer'
      });
    }

    res.json({
      success: true,
      message: 'Security question verified successfully',
      data: {
        userId: user.id,
        email: user.email,
        username: user.username,
        securityQuestion: user.securityQuestion
      }
    });

  } catch (error) {
    console.error('Verify security question error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify security question'
    });
  }
});

module.exports = router; 