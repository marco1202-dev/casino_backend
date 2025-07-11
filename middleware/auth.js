const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Middleware to authenticate JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    // Optionally verify user still exists and is active
    const user = await User.findByPk(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid user or account deactivated'
      });
    }

    req.user = decoded;
    req.userRecord = user;
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Optional authentication - won't fail if no token provided
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.replace('Bearer ', '');

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const user = await User.findByPk(decoded.userId);

      if (user && user.isActive) {
        req.user = decoded;
        req.userRecord = user;
      }
    }

    next();

  } catch (error) {
    // Don't fail on optional auth, just continue without user
    next();
  }
};

// Middleware to check if user completed registration
const requireCompleteRegistration = (req, res, next) => {
  if (!req.userRecord || !req.userRecord.registrationCompleted) {
    return res.status(403).json({
      success: false,
      message: 'Registration must be completed to access this resource'
    });
  }
  next();
};

// Middleware to check if email is verified
const requireEmailVerification = (req, res, next) => {
  if (!req.userRecord || !req.userRecord.emailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Email verification required to access this resource'
    });
  }
  next();
};



module.exports = {
  authenticateToken,
  optionalAuth,
  requireCompleteRegistration,
  requireEmailVerification,

}; 