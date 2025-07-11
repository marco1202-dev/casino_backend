const express = require('express');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: { exclude: ['passwordHash', 'securityAnswerHash'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile'
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('firstName').optional().trim().isLength({ min: 1 }).withMessage('First name cannot be empty'),
  body('lastName').optional().trim().isLength({ min: 1 }).withMessage('Last name cannot be empty'),
  body('countryOfResidence').optional().trim().isLength({ min: 1 }).withMessage('Country cannot be empty'),
  body('nationality').optional().trim().isLength({ min: 1 }).withMessage('Nationality cannot be empty'),
  body('street').optional().trim().isLength({ min: 1 }).withMessage('Street cannot be empty'),
  body('houseNumber').optional().trim().isLength({ min: 1 }).withMessage('House number cannot be empty'),
  body('city').optional().trim().isLength({ min: 1 }).withMessage('City cannot be empty'),
  body('postalCode').optional().trim().isLength({ min: 1 }).withMessage('Postal code cannot be empty'),
  body('mobileNumber').optional().trim().isLength({ min: 1 }).withMessage('Mobile number cannot be empty'),
  body('bankrollCurrency').optional().isIn(['USD', 'EUR', 'GBP', 'BTC', 'ETH', 'USDT', 'BNB', 'ADA', 'SOL', 'DOT']).withMessage('Valid currency is required')
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

    const user = await User.findByPk(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Extract allowed update fields
    const allowedFields = [
      'firstName', 'lastName', 'countryOfResidence', 'nationality',
      'street', 'houseNumber', 'city', 'postalCode', 'mobileNumber', 'bankrollCurrency'
    ];

    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    await user.update(updateData);

    // Return updated user (excluding sensitive fields)
    const updatedUser = await User.findByPk(user.id, {
      attributes: { exclude: ['passwordHash', 'securityAnswerHash'] }
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// Check username availability
router.get('/check-username/:username', async (req, res) => {
  try {
    const { username } = req.params;

    if (!username || username.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Username must be at least 3 characters'
      });
    }

    const existingUser = await User.findOne({ where: { username } });
    const isAvailable = !existingUser;

    res.json({
      success: true,
      data: {
        username,
        available: isAvailable
      }
    });

  } catch (error) {
    console.error('Check username error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check username availability'
    });
  }
});

// Check email availability
router.get('/check-email/:email', async (req, res) => {
  try {
    const { email } = req.params;

    const existingUser = await User.findOne({ where: { email } });
    const isAvailable = !existingUser;

    res.json({
      success: true,
      data: {
        email,
        available: isAvailable
      }
    });

  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check email availability'
    });
  }
});

// Get all countries
router.get('/getAllCountries', async (req, res) => {
  try {
    // Static list of countries with ISO2 codes for the dropdown
    const countries = [
      { name: 'Afghanistan', iso2: 'af' },
      { name: 'Albania', iso2: 'al' },
      { name: 'Algeria', iso2: 'dz' },
      { name: 'Argentina', iso2: 'ar' },
      { name: 'Australia', iso2: 'au' },
      { name: 'Austria', iso2: 'at' },
      { name: 'Bangladesh', iso2: 'bd' },
      { name: 'Belgium', iso2: 'be' },
      { name: 'Brazil', iso2: 'br' },
      { name: 'Canada', iso2: 'ca' },
      { name: 'China', iso2: 'cn' },
      { name: 'Denmark', iso2: 'dk' },
      { name: 'Egypt', iso2: 'eg' },
      { name: 'Finland', iso2: 'fi' },
      { name: 'France', iso2: 'fr' },
      { name: 'Germany', iso2: 'de' },
      { name: 'Greece', iso2: 'gr' },
      { name: 'India', iso2: 'in' },
      { name: 'Indonesia', iso2: 'id' },
      { name: 'Ireland', iso2: 'ie' },
      { name: 'Italy', iso2: 'it' },
      { name: 'Japan', iso2: 'jp' },
      { name: 'Mexico', iso2: 'mx' },
      { name: 'Netherlands', iso2: 'nl' },
      { name: 'New Zealand', iso2: 'nz' },
      { name: 'Norway', iso2: 'no' },
      { name: 'Pakistan', iso2: 'pk' },
      { name: 'Poland', iso2: 'pl' },
      { name: 'Portugal', iso2: 'pt' },
      { name: 'Russia', iso2: 'ru' },
      { name: 'South Africa', iso2: 'za' },
      { name: 'South Korea', iso2: 'kr' },
      { name: 'Spain', iso2: 'es' },
      { name: 'Sweden', iso2: 'se' },
      { name: 'Switzerland', iso2: 'ch' },
      { name: 'Turkey', iso2: 'tr' },
      { name: 'United Kingdom', iso2: 'gb' },
      { name: 'United States', iso2: 'us' }
    ];

    res.json(countries);

  } catch (error) {
    console.error('Get countries error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch countries'
    });
  }
});

// Get user registration status
router.get('/registration-status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId, {
      attributes: ['id', 'registrationStep', 'registrationCompleted', 'emailVerified']
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
        registrationStep: user.registrationStep,
        registrationCompleted: user.registrationCompleted,
        emailVerified: user.emailVerified,

      }
    });

  } catch (error) {
    console.error('Get registration status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get registration status'
    });
  }
});

// Deactivate user account
router.patch('/deactivate', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.update({ isActive: false });

    res.json({
      success: true,
      message: 'Account deactivated successfully'
    });

  } catch (error) {
    console.error('Deactivate account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate account'
    });
  }
});

module.exports = router; 