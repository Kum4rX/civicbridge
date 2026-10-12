const path = require('path');
// Ensure backend/.env is loaded before all modules
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');
const emailService = require('./services/email.service');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB (optional for basic endpoints)
connectDB()
  .then(() => {
    console.log('MongoDB connected successfully');
  })
  .catch((error) => {
    console.warn('Warning: Failed to connect to MongoDB:', error.message);
    console.warn('Server will start anyway, but database features will not work');
  });

// Verify email delivery configuration safely on startup
emailService.verifyConnection().then((smtpResult) => {
  if (smtpResult.verified) {
    console.log('[EmailService] SMTP connection verified successfully (Gmail SMTP ready)');
  } else if (smtpResult.configured) {
    console.warn('[EmailService] Warning: SMTP configured but verification failed:', smtpResult.error);
  } else {
    console.log('[EmailService] SMTP is not configured. Configure SMTP_USER and SMTP_PASS in backend/.env to enable live email delivery.');
  }
}).catch((err) => {
  console.warn('[EmailService] Unexpected error during SMTP check:', err.message);
});

// Start server regardless of DB connection
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`CORS origin: ${process.env.CLIENT_ORIGIN || 'http://localhost:4200'}`);
});
