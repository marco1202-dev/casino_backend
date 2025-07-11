const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('SMTP ENV:', {
  host: process.env.SMTP_HOST,
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS
});
console.log('Current directory:', __dirname);
console.log('Env file path:', path.join(__dirname, '.env'));

// Import database models
const db = require('./models');

// Import email service
const emailService = require('./services/emailService');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 50 : 5, // Higher limit for development
  message: 'Too many authentication attempts, please try again later.'
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
  const smtpStatus = emailService.getConnectionStatus();

  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Interactive Companies Backend',
    database: 'connected',
    smtp: {
      configured: smtpStatus.configured,
      transporter: smtpStatus.transporter,
      host: smtpStatus.host
    }
  });
});

// Authentication routes
if (process.env.NODE_ENV === 'development') {
  app.use('/api/auth', require('./routes/auth')); // No rate limiting in development
} else {
  app.use('/api/auth', authLimiter, require('./routes/auth')); // Rate limiting in production
}

// User management routes
app.use('/api/users', require('./routes/users'));

// Verification routes
app.use('/api/verification', require('./routes/verification'));

// Password reset routes
app.use('/api/password-reset', authLimiter, require('./routes/passwordReset'));

// SMTP integration routes (for external SMTP server)
app.use('/api/smtp', require('./routes/smtpIntegration'));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  // Sequelize unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      message: 'Resource already exists',
      field: err.errors[0]?.path
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Database connection and server startup
async function startServer() {
  try {
    // Test database connection
    await db.sequelize.authenticate();
    console.log('✅ Database connection established successfully');

    // Sync database (in development)
    if (process.env.NODE_ENV === 'development') {
      await db.sequelize.sync({ alter: false });
      console.log('✅ Database synchronized');
    }

    // Test SMTP connection (fast test during startup)
    if (process.env.SKIP_SMTP_TEST === 'true') {
      console.log('⏭️  Skipping SMTP connection test (SKIP_SMTP_TEST=true)');
    } else {
      console.log('📧 Testing SMTP server connection...');
      const smtpStatus = emailService.getConnectionStatus();

      if (!smtpStatus.configured) {
        console.log('⚠️  SMTP not configured - emails will be logged to console');
        console.log('   Set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables to enable SMTP');
      } else {
        const smtpResult = await emailService.testConnection(); // Single connection test
        if (smtpResult) {
          console.log('✅ SMTP server connection established successfully');
        } else {
          console.log('⚠️  SMTP server connection failed - emails will be logged to console');
        }
      }
    }

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    });

  } catch (error) {
    console.error('❌ Unable to start server:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGTERM', async () => {
  console.log('⏹️  SIGTERM received, shutting down gracefully');
  await db.sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('⏹️  SIGINT received, shutting down gracefully');
  await db.sequelize.close();
  process.exit(0);
});

// Start the server
startServer();

module.exports = app; 