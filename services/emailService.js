const nodemailer = require('nodemailer');
const { EmailVerification, PasswordReset } = require('../models');

class EmailService {
  constructor() {
    this.transporter = null;
    this.fallbackTransporter = null;
    this.initializeTransporter();
    this.initializeFallbackTransporter();
  }

  initializeTransporter() {
    try {
      // Enhanced SMTP Configuration with better error handling
      const smtpConfig = {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === 'TLS',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false,
          // Remove specific cipher restrictions to allow server negotiation
          // ciphers: 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256'
        },
        connectionTimeout: 30000, // Reduced to 30 seconds
        greetingTimeout: 30000,
        socketTimeout: 30000,
        debug: false, // Set to false to hide detailed SMTP logs
        logger: false, // Set to false to hide SMTP logger output
        pool: false, // Disable pooling to avoid connection issues
        maxConnections: 1,
        maxMessages: 1
      };

      this.transporter = nodemailer.createTransport(smtpConfig);

      console.log('📧 SMTP Transporter initialized');
      console.log('🔗 SMTP Host:', process.env.SMTP_HOST);
      console.log('📍 SMTP Port:', process.env.SMTP_PORT);
      console.log('🔐 SMTP Secure:', process.env.SMTP_SECURE);
      console.log('👤 SMTP User:', process.env.SMTP_USER);

      // Test the connection once
      this.testConnection();

    } catch (error) {
      console.error('❌ SMTP Setup failed:', error.message);
      this.transporter = null;
    }
  }

  initializeFallbackTransporter() {
    // Initialize a fallback transporter using Gmail or other free SMTP
    // This is useful when the primary SMTP fails
    try {
      if (process.env.FALLBACK_SMTP_HOST) {
        const fallbackConfig = {
          host: process.env.FALLBACK_SMTP_HOST,
          port: parseInt(process.env.FALLBACK_SMTP_PORT) || 587,
          secure: process.env.FALLBACK_SMTP_SECURE === 'true',
          auth: {
            user: process.env.FALLBACK_SMTP_USER,
            pass: process.env.FALLBACK_SMTP_PASS
          },
          tls: {
            rejectUnauthorized: false
          },
          connectionTimeout: 15000,
          greetingTimeout: 15000
        };

        this.fallbackTransporter = nodemailer.createTransport(fallbackConfig);
        console.log('📧 Fallback SMTP Transporter initialized');
      }
    } catch (error) {
      console.error('❌ Fallback SMTP Setup failed:', error.message);
      this.fallbackTransporter = null;
    }
  }

  async testConnection() {
    if (!this.transporter) {
      console.log('❌ SMTP transporter not initialized - check environment variables');
      return false;
    }

    console.log('📧 SMTP Configuration:');
    console.log(`   Host: ${process.env.SMTP_HOST || 'Not set'}`);
    console.log(`   Port: ${process.env.SMTP_PORT || 'Not set'}`);
    console.log(`   User: ${process.env.SMTP_USER || 'Not set'}`);
    console.log(`   Secure: ${process.env.SMTP_SECURE || 'Not set'}`);

    try {
      console.log('🔍 Testing SMTP connection...');
      await this.transporter.verify();
      console.log('✅ SMTP connection verified successfully');
      return true;
    } catch (error) {
      console.error('❌ Primary SMTP connection test failed:', error.message);

      // Try alternative configurations
      console.log('🔄 Trying alternative SMTP configurations...');
      const alternativeTransporter = await this.tryAlternativeConfigurations();

      if (alternativeTransporter) {
        this.transporter = alternativeTransporter;
        console.log('✅ Alternative SMTP configuration successful!');
        return true;
      }

      console.log('📧 SMTP will fall back to console logging');
      return false;
    }
  }

  getConnectionStatus() {
    return {
      configured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
      transporter: !!this.transporter,
      host: process.env.SMTP_HOST || 'Not set',
      port: process.env.SMTP_PORT || 'Not set',
      user: process.env.SMTP_USER || 'Not set',
      secure: process.env.SMTP_SECURE || 'Not set'
    };
  }

  async sendEmailWithRetry(mailOptions, maxRetries = 2) {
    // Try primary transporter first
    if (this.transporter) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`📧 Attempting to send email via primary SMTP (attempt ${attempt}/${maxRetries})...`);

          const info = await Promise.race([
            this.transporter.sendMail(mailOptions),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Email timeout after 30 seconds')), 30000)
            )
          ]);

          console.log('✅ Email sent successfully via primary SMTP!');
          console.log('📧 Message ID:', info.messageId);
          return { success: true, messageId: info.messageId };

        } catch (error) {
          console.error(`❌ Primary SMTP failed (attempt ${attempt}/${maxRetries}):`, error.message);

          if (attempt === maxRetries) {
            console.log('🔄 Trying fallback SMTP...');
            break; // Try fallback instead of throwing
          }

          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    // Try fallback transporter
    if (this.fallbackTransporter) {
      try {
        console.log('📧 Attempting to send email via fallback SMTP...');

        const info = await Promise.race([
          this.fallbackTransporter.sendMail(mailOptions),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Fallback email timeout after 30 seconds')), 30000)
          )
        ]);

        console.log('✅ Email sent successfully via fallback SMTP!');
        console.log('📧 Message ID:', info.messageId);
        return { success: true, messageId: info.messageId };

      } catch (error) {
        console.error('❌ Fallback SMTP failed:', error.message);
        throw error;
      }
    }

    throw new Error('No SMTP transporters available');
  }

  async sendVerificationEmail(email, verificationRecordId, expiresAt) {
    console.log('📧 Attempting to send verification email...');
    console.log('📮 To:', email);
    console.log('🆔 Verification Record ID:', verificationRecordId);

    // Generate verification code
    const verificationCode = this.generateVerificationCode();
    console.log('🔑 Generated verification code:', verificationCode);

    // Update the verification record with the code
    try {
      const verificationRecord = await EmailVerification.findByPk(verificationRecordId);
      if (verificationRecord) {
        await verificationRecord.update({ verificationCode });
        console.log('✅ Verification code saved to database');
      }
    } catch (error) {
      console.error('❌ Failed to save verification code:', error.message);
    }

    // Always try SMTP first if configured
    if (this.transporter && process.env.SMTP_HOST) {
      try {
        const mailOptions = {
          from: process.env.FROM_EMAIL || process.env.SMTP_USER,
          to: email,
          subject: 'Email Verification Code - Interactive Companies',
          html: this.createVerificationEmailTemplate(expiresAt, verificationCode),
          text: `Your verification code is: ${verificationCode}. This code will expire in 5 minutes.`
        };

        console.log('📧 Mail options:', {
          from: mailOptions.from,
          to: mailOptions.to,
          subject: mailOptions.subject
        });

        return await this.sendEmailWithRetry(mailOptions);

      } catch (error) {
        console.error('❌ SMTP failed after retries:', error.message);
        console.error('❌ SMTP error details:', error);
        console.log('📧 Falling back to console logging...');
        return {
          success: false,
          message: error.message
        };
      }
    }

    // Fallback: Console logging (always works)
    console.log('');
    console.log('🔑==================================🔑');
    console.log('📧 EMAIL VERIFICATION REQUESTED');
    console.log('📮 To:', email);
    console.log('🔑 Verification Code:', verificationCode);
    console.log('⏰ Expires:', new Date(expiresAt).toLocaleString());
    console.log('🔑==================================🔑');
    console.log('');

    return { success: true, messageId: 'console-fallback' };
  }

  async sendPasswordResetEmail(email, verificationRecordId, expiresAt) {
    console.log('🔒 Attempting to send password reset email...');
    console.log('📮 To:', email);
    console.log('🆔 Verification Record ID:', verificationRecordId);

    // Generate verification code
    const verificationCode = this.generateVerificationCode();
    console.log('🔑 Generated password reset code:', verificationCode);

    // Update the password reset record with the code
    try {
      const resetRecord = await PasswordReset.findByPk(verificationRecordId);
      if (resetRecord) {
        await resetRecord.update({ resetCode: verificationCode });
        console.log('✅ Password reset code saved to database');
      }
    } catch (error) {
      console.error('❌ Failed to save password reset code:', error.message);
      throw error; // Re-throw to catch issues in the calling function
    }

    if (this.transporter && process.env.SMTP_HOST) {
      try {
        const mailOptions = {
          from: process.env.FROM_EMAIL || process.env.SMTP_USER,
          to: email,
          subject: 'Password Reset Code - Interactive Companies',
          html: this.createPasswordResetEmailTemplate(expiresAt, verificationCode),
          text: `Your password reset code is: ${verificationCode}. This code will expire in 5 minutes.`
        };

        return await this.sendEmailWithRetry(mailOptions);

      } catch (error) {
        console.log('❌ SMTP failed after retries:', error.message);
      }
    }

    // Fallback: Console logging
    console.log('');
    console.log('🔒==================================🔒');
    console.log('🔑 PASSWORD RESET REQUESTED');
    console.log('📮 To:', email);
    console.log('🔑 Reset Code:', verificationCode);
    console.log('⏰ Expires:', new Date(expiresAt).toLocaleString());
    console.log('🔒==================================🔒');
    console.log('');

    return { success: true, messageId: 'console-fallback' };
  }

  generateVerificationCode() {
    // Generate a 6-digit numeric verification code
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  createVerificationEmailTemplate(expiresAt, verificationCode) {
    const expiresInMinutes = Math.round((new Date(expiresAt) - new Date()) / 60000);

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Email Verification</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #16153D; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 40px; border: 1px solid #ddd; }
            .code-container { text-align: center; margin: 30px 0; }
            .code { background: #16153D; color: white; padding: 20px; font-size: 32px; font-weight: bold; letter-spacing: 5px; border-radius: 8px; display: inline-block; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; border-radius: 0 0 8px 8px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Email Verification</h1>
                <p>Interaction Casino</p>
            </div>
            <div class="content">
                <h2>Welcome!</h2>
                <p>Thank you for signing up with Interactive Companies. Here is your verification code:</p>
                
                <div class="code-container">
                    <p><strong>Your verification code:</strong></p>
                    <div class="code">${verificationCode}</div>
                </div>
                
                <p><strong>This code expires in ${expiresInMinutes} minutes.</strong></p>
                
                <p>Best regards,<br><strong>The Interactive Companies Team</strong></p>
            </div>
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Interactive Companies. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  createPasswordResetEmailTemplate(expiresAt, verificationCode) {
    const expiresInMinutes = Math.round((new Date(expiresAt) - new Date()) / 60000);

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Password Reset</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc3545; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 40px; border: 1px solid #ddd; }
            .code-container { text-align: center; margin: 30px 0; }
            .code { background: #dc3545; color: white; padding: 20px; font-size: 32px; font-weight: bold; letter-spacing: 5px; border-radius: 8px; display: inline-block; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔒 Password Reset</h1>
                <p>Interactive Casino</p>
            </div>
            <div class="content">
                <h2>Reset Your Password</h2>
                <p>Here is your password reset code:</p>
                
                <div class="code-container">
                    <p><strong>Your reset code:</strong></p>
                    <div class="code">${verificationCode}</div>
                </div>
                
                <p><strong>This code expires in ${expiresInMinutes} minutes.</strong></p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  async tryAlternativeConfigurations() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      console.log('❌ Missing SMTP credentials for alternative configurations');
      return null;
    }

    const configurations = [
      // Try port 587 with STARTTLS
      {
        host,
        port: 587,
        secure: false,
        auth: { user, pass },
        tls: { rejectUnauthorized: false }
      },
      // Try port 465 with SSL
      {
        host,
        port: 465,
        secure: true,
        auth: { user, pass },
        tls: { rejectUnauthorized: false }
      },
      // Try port 25 (non-SSL)
      {
        host,
        port: 25,
        secure: false,
        auth: { user, pass },
        tls: { rejectUnauthorized: false }
      },
      // Try port 2525 (alternative)
      {
        host,
        port: 2525,
        secure: false,
        auth: { user, pass },
        tls: { rejectUnauthorized: false }
      }
    ];

    for (const config of configurations) {
      try {
        console.log(`🔍 Trying SMTP configuration: ${config.host}:${config.port} (secure: ${config.secure})`);
        const transporter = nodemailer.createTransport(config);
        await transporter.verify();
        console.log(`✅ SMTP connection successful with ${config.host}:${config.port}`);
        return transporter;
      } catch (error) {
        console.log(`❌ Failed with ${config.host}:${config.port}: ${error.message}`);
      }
    }

    return null;
  }
}

module.exports = new EmailService(); 