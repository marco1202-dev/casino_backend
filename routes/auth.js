const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { User, LoginAttempt } = require('../models');
const { Op } = require('sequelize');
const router = express.Router();

// Helper function to log login attempts
async function logLoginAttempt(email, success, failureReason = null, req) {
  try {
    await LoginAttempt.create({
      email,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success,
      failureReason
    });
  } catch (error) {
    console.error('Failed to log login attempt:', error);
  }
}

// Register - Step 1: Personal Information
router.post('/register/step1', [
  body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('dateOfBirth').isISO8601().withMessage('Valid date of birth is required'),
  body('countryOfResidence').trim().isLength({ min: 1 }).withMessage('Country of residence is required'),
  body('nationality').trim().isLength({ min: 1 }).withMessage('Nationality is required'),
  body('isOver18').isBoolean().withMessage('Age confirmation is required'),
  body('acceptedTerms').isBoolean().withMessage('Terms acceptance is required')
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

    const {
      firstName,
      lastName,
      email,
      dateOfBirth,
      countryOfResidence,
      nationality,
      isOver18,
      acceptedTerms
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Validate age confirmation
    if (!isOver18) {
      return res.status(400).json({
        success: false,
        message: 'You must be over 18 to register'
      });
    }

    // Validate terms acceptance
    if (!acceptedTerms) {
      return res.status(400).json({
        success: false,
        message: 'You must accept the terms and conditions'
      });
    }

    // Create user with step 1 data
    const user = await User.create({
      firstName,
      lastName,
      email,
      dateOfBirth,
      countryOfResidence,
      nationality,
      isOver18,
      acceptedTerms,
      registrationStep: 1
    });

    res.status(201).json({
      success: true,
      message: 'Step 1 completed successfully',
      data: {
        userId: user.id,
        registrationStep: 1
      }
    });

  } catch (error) {
    console.error('Registration step 1 error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

// Register - Step 2: Account Credentials
router.post('/register/step2', [
  body('userId').isUUID().withMessage('Valid user ID is required'),
  body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('securityQuestion').trim().isLength({ min: 1 }).withMessage('Security question is required'),
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

    const { userId, username, password, securityQuestion, securityAnswer } = req.body;

    // Find user and validate step
    const user = await User.findByPk(userId);
    if (!user || user.registrationStep !== 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user or registration step'
      });
    }

    // Check username uniqueness
    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      return res.status(409).json({
        success: false,
        message: 'Username already taken'
      });
    }

    // Hash password and security answer
    const passwordHash = await bcrypt.hash(password, 12);
    const securityAnswerHash = await bcrypt.hash(securityAnswer.toLowerCase(), 12);

    // Update user with step 2 data
    await user.update({
      username,
      passwordHash,
      securityQuestion,
      securityAnswerHash,
      registrationStep: 2
    });

    res.json({
      success: true,
      message: 'Step 2 completed successfully',
      data: {
        userId: user.id,
        registrationStep: 2
      }
    });

  } catch (error) {
    console.error('Registration step 2 error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

// Register - Step 3: Address & Additional Info
router.post('/register/step3', [
  body('userId').isUUID().withMessage('Valid user ID is required'),
  body('street').trim().isLength({ min: 1 }).withMessage('Street is required'),
  body('houseNumber').trim().isLength({ min: 1 }).withMessage('House number is required'),
  body('city').trim().isLength({ min: 1 }).withMessage('City is required'),
  body('postalCode').trim().isLength({ min: 1 }).withMessage('Postal code is required'),
  body('mobileNumber').trim().isLength({ min: 1 }).withMessage('Mobile number is required'),
  body('bankrollCurrency').isIn(['USD', 'EUR', 'GBP', 'BTC', 'ETH', 'USDT', 'BNB', 'ADA', 'SOL', 'DOT']).withMessage('Valid currency is required')
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

    const {
      userId,
      street,
      houseNumber,
      city,
      postalCode,
      mobileNumber,
      bankrollCurrency
    } = req.body;

    // Find user and validate step
    const user = await User.findByPk(userId);
    if (!user || user.registrationStep !== 2) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user or registration step'
      });
    }

    // Update user with step 3 data and complete registration
    await user.update({
      street,
      houseNumber,
      city,
      postalCode,
      mobileNumber,
      bankrollCurrency,
      registrationStep: 3,
      registrationCompleted: true,
      isActive: true
    });

    res.json({
      success: true,
      message: 'Registration completed successfully',
      data: {
        userId: user.id,
        registrationStep: 3,
        registrationCompleted: true
      }
    });

  } catch (error) {
    console.error('Registration step 3 error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

// Login
router.post('/login', [
  body('emailOrUsername').trim().isLength({ min: 1 }).withMessage('Email or username is required'),
  body('password').isLength({ min: 1 }).withMessage('Password is required')
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

    const { emailOrUsername, password } = req.body;

    // Find user by email or username
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: emailOrUsername },
          { username: emailOrUsername }
        ]
      }
    });

    if (!user) {
      await logLoginAttempt(emailOrUsername, false, 'User not found', req);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user account is active
    if (!user.isActive) {
      await logLoginAttempt(user.email, false, 'Account inactive', req);
      return res.status(401).json({
        success: false,
        message: 'Account is inactive'
      });
    }

    // Check if registration is completed
    if (!user.registrationCompleted) {
      await logLoginAttempt(user.email, false, 'Registration incomplete', req);
      return res.status(401).json({
        success: false,
        message: 'Please complete your registration'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      await logLoginAttempt(user.email, false, 'Invalid password', req);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await user.update({ lastLoginAt: new Date() });

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        username: user.username
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Log successful login
    await logLoginAttempt(user.email, true, null, req);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Get current user (requires authentication)
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['passwordHash', 'securityAnswerHash'] }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
});

// Complete signup endpoint (all steps in one)
router.post('/signup', [
  // Step 1 validations
  body('first_name').trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('last_name').trim().isLength({ min: 1 }).withMessage('Last name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('dob').isISO8601().withMessage('Valid date of birth is required'),
  body('country').trim().isLength({ min: 1 }).withMessage('Country of residence is required'),
  body('nationality').trim().isLength({ min: 1 }).withMessage('Nationality is required'),
  body('accept_age').isBoolean().withMessage('Age confirmation is required'),
  body('accept_terms').isBoolean().withMessage('Terms acceptance is required'),
  body('email_verified').isBoolean().withMessage('Email verification is required'),

  // Step 2 validations
  body('user_id').trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('security_question').trim().isLength({ min: 1 }).withMessage('Security question is required'),
  body('security_answer').trim().isLength({ min: 1 }).withMessage('Security answer is required'),

  // Step 3 validations
  body('street').trim().isLength({ min: 1 }).withMessage('Street is required'),
  body('house_number').trim().isLength({ min: 1 }).withMessage('House number is required'),
  body('city').trim().isLength({ min: 1 }).withMessage('City is required'),
  body('zipcode').trim().isLength({ min: 1 }).withMessage('Postal code is required'),
  body('phone').trim().isLength({ min: 1 }).withMessage('Mobile number is required'),
  body('bankroll_currency').isIn(['USD', 'EUR', 'GBP', 'BTC', 'ETH', 'USDT', 'BNB', 'ADA', 'SOL', 'DOT']).withMessage('Valid currency is required')
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

    const {
      // Step 1 fields
      first_name, last_name, email, dob, country, nationality, accept_age, accept_terms, email_verified,
      // Step 2 fields
      user_id, password, security_question, security_answer,
      // Step 3 fields
      street, house_number, city, zipcode, phone, bankroll_currency
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { email },
          { username: user_id },
          { mobileNumber: phone }
        ]
      }
    });

    if (existingUser) {
      let message = 'User already exists';
      if (existingUser.email === email) message = 'Email already registered';
      else if (existingUser.username === user_id) message = 'Username already taken';
      else if (existingUser.mobileNumber === phone) message = 'Mobile number already registered';

      return res.status(409).json({
        success: false,
        message
      });
    }

    // Validate required confirmations
    if (!accept_age) {
      return res.status(400).json({
        success: false,
        message: 'You must be over 18 to register'
      });
    }

    if (!accept_terms) {
      return res.status(400).json({
        success: false,
        message: 'You must accept the terms and conditions'
      });
    }

    if (!email_verified) {
      return res.status(400).json({
        success: false,
        message: 'Email must be verified before completing registration'
      });
    }



    // Hash password and security answer
    const passwordHash = await bcrypt.hash(password, 12);
    const securityAnswerHash = await bcrypt.hash(security_answer.toLowerCase(), 12);

    // Create user with all data
    const user = await User.create({
      // Step 1 data
      firstName: first_name,
      lastName: last_name,
      email,
      dateOfBirth: dob,
      countryOfResidence: country,
      nationality,
      isOver18: accept_age,
      acceptedTerms: accept_terms,
      emailVerified: email_verified,

      // Step 2 data
      username: user_id,
      passwordHash,
      securityQuestion: security_question,
      securityAnswerHash,

      // Step 3 data
      street,
      houseNumber: house_number,
      city,
      postalCode: zipcode,
      mobileNumber: phone,
      bankrollCurrency: bankroll_currency,

      // Registration status
      registrationStep: 3,
      registrationCompleted: true
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        username: user.username
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'Registration completed successfully',
      data: {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          username: user.username,
          registrationCompleted: true
        },
        token
      }
    });

  } catch (error) {
    console.error('Complete signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
});

module.exports = router; 