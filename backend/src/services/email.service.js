const path = require('path');
// Ensure backend/.env is loaded before service initialization
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();

const nodemailer = require('nodemailer');

let recordedTestEmails = [];

class EmailService {
  /**
   * Helper to mask email address for safe logging (e.g. j***e@gmail.com)
   */
  getMaskedEmail(email) {
    if (!email || typeof email !== 'string') return 'unknown';
    const [local, domain] = email.split('@');
    if (!domain) return '***';
    const maskedLocal = local.length <= 2 
      ? local[0] + '***' 
      : local[0] + '***' + local[local.length - 1];
    return `${maskedLocal}@${domain}`;
  }

  /**
   * Removes passwords or reset tokens from error messages for safe logging
   */
  sanitizeErrorMessage(msg) {
    if (!msg || typeof msg !== 'string') return '';
    let sanitized = msg;
    if (process.env.SMTP_PASS) {
      sanitized = sanitized.split(process.env.SMTP_PASS).join('[REDACTED_PASSWORD]');
      const cleanPass = process.env.SMTP_PASS.replace(/\s+/g, '');
      if (cleanPass) {
        sanitized = sanitized.split(cleanPass).join('[REDACTED_PASSWORD]');
      }
    }
    return sanitized;
  }

  /**
   * Checks if SMTP email delivery is fully configured
   */
  isConfigured() {
    return Boolean(
      process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    );
  }

  /**
   * Creates a configured Nodemailer transporter
   */
  getTransporter() {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT, 10) || 587;
    const isSecure = process.env.SMTP_SECURE === 'true' || port === 465;
    const user = (process.env.SMTP_USER || '').trim();
    // Strip any spaces from Google App Passwords (e.g. 'abcd efgh ijkl mnop')
    const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');

    const options = {
      host,
      port,
      secure: isSecure,
      auth: {
        user,
        pass
      },
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,
      socketTimeout: 15000
    };

    // Use service: 'gmail' shortcut for Gmail hosts or addresses
    if (host === 'smtp.gmail.com' || (user && user.endsWith('@gmail.com'))) {
      options.service = 'gmail';
    }

    return nodemailer.createTransport(options);
  }

  /**
   * Safe SMTP connection verification (never logs passwords or secrets)
   */
  async verifyConnection() {
    if (!this.isConfigured()) {
      const missing = [];
      if (!process.env.SMTP_HOST) missing.push('SMTP_HOST');
      if (!process.env.SMTP_PORT) missing.push('SMTP_PORT');
      if (!process.env.SMTP_USER) missing.push('SMTP_USER');
      if (!process.env.SMTP_PASS) missing.push('SMTP_PASS');
      return {
        configured: false,
        verified: false,
        message: `SMTP not configured. Missing required variables: ${missing.join(', ')}`
      };
    }

    try {
      const transporter = this.getTransporter();
      await transporter.verify();
      const maskedUser = this.getMaskedEmail(process.env.SMTP_USER);
      return {
        configured: true,
        verified: true,
        message: `SMTP connection established and verified successfully for ${maskedUser}`
      };
    } catch (err) {
      const safeError = this.sanitizeErrorMessage(err.message || 'Unknown SMTP error');
      return {
        configured: true,
        verified: false,
        error: safeError,
        code: err.code || 'SMTP_ERROR'
      };
    }
  }

  /**
   * Dispatches a password reset email to the recipient
   * @param {Object} options
   * @param {string} options.email - Recipient email
   * @param {string} options.resetToken - Raw cryptographically generated reset token
   * @param {Object} [options.user] - User document
   */
  async sendPasswordResetEmail({ email, resetToken, user }) {
    if (!email || !resetToken) {
      throw new Error('Recipient email and reset token are required to dispatch email');
    }

    const frontendBaseUrl =
      process.env.CLIENT_ORIGIN ||
      process.env.FRONTEND_URL ||
      'http://localhost:4200';
    const resetUrl = `${frontendBaseUrl}/reset-password?token=${resetToken}`;
    const maskedRecipient = this.getMaskedEmail(email);

    // Record in-memory for testing purposes in test environment
    if (process.env.NODE_ENV === 'test') {
      recordedTestEmails.push({
        email,
        resetToken,
        resetUrl,
        timestamp: new Date()
      });
      return true;
    }

    // Check configuration in dev/prod
    if (!this.isConfigured()) {
      console.warn(`[EmailService] SMTP not configured. Cannot deliver reset email to ${maskedRecipient}. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in backend/.env.`);
      const err = new Error('SMTP email delivery is not configured on the server. Please configure backend/.env.');
      err.code = 'SMTP_NOT_CONFIGURED';
      throw err;
    }

    try {
      const transporter = this.getTransporter();
      const fromAddress = process.env.EMAIL_FROM || `CivicBridge <${process.env.SMTP_USER}>`;

      const info = await transporter.sendMail({
        from: fromAddress,
        to: email,
        subject: 'CivicBridge - Password Reset Request',
        text: `Hello,\n\nYou recently requested to reset your password for your CivicBridge account.\nClick the link below to reset it (valid for 15 minutes):\n\n${resetUrl}\n\nIf you did not request a password reset, please ignore this email.\n\nBest regards,\nThe CivicBridge Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
            <div style="border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 20px;">
              <h2 style="color: #1e293b; margin: 0; font-size: 20px;">CivicBridge &bull; Password Reset</h2>
            </div>
            <p style="color: #334155; font-size: 15px; line-height: 1.6; margin-top: 0;">
              Hello,
            </p>
            <p style="color: #334155; font-size: 15px; line-height: 1.6;">
              We received a request to reset the password for your CivicBridge account. Click the button below to choose a new password. This link is valid for <strong>15 minutes</strong> and can only be used once.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 15px;">
                Reset My Password
              </a>
            </div>
            <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
              If you're having trouble clicking the button, copy and paste this link into your web browser:<br />
              <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">
              If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.<br />
              CivicBridge Platform &bull; Digital Civic Engagement
            </p>
          </div>
        `
      });

      console.log(`[EmailService] Password reset email successfully submitted to SMTP server for ${maskedRecipient} (Message ID: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      const safeMsg = this.sanitizeErrorMessage(err.message || 'SMTP delivery failure');
      console.error(`[EmailService] SMTP delivery failed for ${maskedRecipient}: [${err.code || 'UNKNOWN'}] ${safeMsg}`);
      const deliveryError = new Error(`Failed to deliver password reset email: ${safeMsg}`);
      deliveryError.code = err.code || 'SMTP_DELIVERY_FAILED';
      throw deliveryError;
    }
  }

  /**
   * Helper for automated test verification
   */
  getLatestTestEmail(email) {
    if (email) {
      return [...recordedTestEmails].reverse().find((e) => e.email === email);
    }
    return recordedTestEmails[recordedTestEmails.length - 1];
  }

  clearTestEmails() {
    recordedTestEmails = [];
  }
}

module.exports = new EmailService();
