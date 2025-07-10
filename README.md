# Interactive Companies - Backend Authentication System

This backend provides a comprehensive PostgreSQL-based authentication system with a 3-step registration process and secure login functionality.

## Database Models Overview

### 1. User Model (`users` table)
The main user model contains all user information collected through the 3-step registration process:

**Step 1 - Personal Information:**
- `firstName`, `lastName` - User's full name
- `countryOfResidence`, `nationality` - Location details
- `email` - Email address with verification status
- `dateOfBirth` - Date of birth
- `isOver18` - Age verification flag
- `acceptedTerms` - Terms and conditions acceptance

**Step 2 - Account Credentials:**
- `username` - Unique username
- `passwordHash` - Hashed password
- `securityQuestion`, `securityAnswerHash` - Security question/answer

**Step 3 - Address & Additional Info:**
- `street`, `houseNumber`, `city`, `postalCode` - Full address
- `mobileNumber` - Mobile number with verification status
- `bankrollCurrency` - Selected currency for transactions

**Account Management:**
- `registrationStep` - Current registration step (1-3)
- `registrationCompleted` - Full registration status
- `isActive` - Account status
- `lastLoginAt` - Last login timestamp

### 2. EmailVerification Model (`email_verifications` table)
Handles email verification codes:
- 6-digit numeric verification codes
- Expiration time (5 minutes default)
- Attempt tracking (max 5 attempts)
- Usage status tracking

### 3. MobileVerification Model (`mobile_verifications` table)
Handles mobile number verification codes:
- 6-digit numeric verification codes via SMS
- Expiration time (5 minutes default)
- Attempt tracking (max 5 attempts)
- Usage status tracking

### 4. PasswordReset Model (`password_resets` table)
Handles forgot password/username functionality:
- Reset tokens for secure password reset
- 6-digit verification codes
- Reset type (password or username)
- Expiration tracking

### 5. LoginAttempt Model (`login_attempts` table)
Security tracking for login attempts:
- IP address and user agent tracking
- Success/failure status
- Failure reasons (invalid credentials, account issues, etc.)
- Rate limiting support

## Setup Instructions

### 1. Environment Setup
```bash
# Copy environment template
cp env-template.txt .env

# Edit .env with your database credentials
```

### 2. Database Setup
```bash
# Install dependencies
npm install

# Create database
createdb interactivecompanies_dev
createdb interactivecompanies_test

# Run migrations
npm run migrate
```

### 3. Start Development Server
```bash
npm run dev
```

## Build Instructions

### Install Dependencies
```bash
# Development (all dependencies)
npm run build

# Production (production dependencies only)
npm run build:prod
```

### Docker
```bash
# Build and run with database
docker-compose up -d

# Build image only
docker build -t backend .
```

### Build Scripts
- `npm run build` - Install all dependencies
- `npm run build:prod` - Install production dependencies only

## Key Features

### Registration Flow
1. **Step 1**: Personal information collection with email verification
2. **Step 2**: Username/password setup with security questions
3. **Step 3**: Address details and mobile verification

### Verification System
- **Email Verification**: 6-digit codes sent via email
- **Mobile Verification**: 6-digit codes sent via SMS
- **Visual Feedback**: Green checkmark for success, red X for failure
- **Resend Functionality**: Users can request new verification codes

### Security Features
- Password hashing with bcrypt
- Security questions for account recovery
- Login attempt tracking and rate limiting
- IP address monitoring
- Account lockout protection

### Forgot Credentials
- **Forgot Password**: Reset via email with verification code
- **Forgot Username**: Recovery via email/mobile verification

## Database Relationships

```
User (1) → (Many) EmailVerification
User (1) → (Many) MobileVerification  
User (1) → (Many) PasswordReset
User (1) → (Many) LoginAttempt
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | localhost |
| `DB_PORT` | PostgreSQL port | 5432 |
| `DB_NAME` | Database name | interactivecompanies_dev |
| `DB_USERNAME` | Database username | postgres |
| `DB_PASSWORD` | Database password | password |
| `JWT_SECRET` | JWT signing secret | - |
| `BCRYPT_ROUNDS` | Password hashing rounds | 12 |
| `VERIFICATION_CODE_EXPIRY` | Code expiry (ms) | 300000 (5 min) |
| `PASSWORD_RESET_EXPIRY` | Reset expiry (ms) | 3600000 (1 hour) |

### SMTP Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `SMTP_HOST` | SMTP server hostname | Yes |
| `SMTP_PORT` | SMTP server port | Yes (587/465) |
| `SMTP_SECURE` | Use SSL/TLS | No (false) |
| `SMTP_USER` | SMTP username/email | Yes |
| `SMTP_PASS` | SMTP password/app password | Yes |
| `FROM_EMAIL` | From email address | No |
| `SKIP_SMTP_TEST` | Skip SMTP test on startup | No (false) |

**SMTP Setup Instructions:**

1. **Copy environment template:**
   ```bash
   cp env.example .env
   ```

2. **Configure your SMTP settings in `.env`:**
   ```bash
   # Example for Gmail
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   FROM_EMAIL=noreply@yourdomain.com
   ```

3. **Test SMTP configuration:**
   ```bash
   node test-smtp.js
   ```

**Popular SMTP Providers:**

- **Gmail**: `smtp.gmail.com:587` (requires app password)
- **Outlook**: `smtp-mail.outlook.com:587`
- **Yahoo**: `smtp.mail.yahoo.com:587`
- **Custom**: Use your email provider's SMTP settings

**Note:** If SMTP is not configured, emails will be logged to the console for development purposes.

## Supported Currencies

The system supports the following bankroll currencies:
- Fiat: USD, EUR, GBP
- Cryptocurrencies: BTC, ETH, USDT, BNB, ADA, SOL, DOT

## Migration Commands

```bash
# Create new migration
npm run migrate:create add-new-field

# Run migrations
npm run migrate

# Undo last migration
npm run migrate:undo
```

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm test:watch
```

This backend provides a robust foundation for user authentication with comprehensive verification, security tracking, and multi-step registration process. 

console.log('SMTP ENV:', {
  host: process.env.SMTP_HOST,
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS
}); 