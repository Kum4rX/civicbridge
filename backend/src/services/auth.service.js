const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user.model');
const emailService = require('./email.service');

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const register = async (userData) => {
  const { fullName, email, password, role, location } = userData;
  
  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const error = new Error('User already exists with this email');
    error.statusCode = 400;
    throw error;
  }
  
  // Create new user
  const user = await User.create({
    fullName: fullName || userData.name,
    email: email.toLowerCase().trim(),
    password,
    role: (role || 'CITIZEN').toUpperCase(),
    location: location || {},
    verified: false // Default to not verified
  });
  
  // Generate token
  const token = generateToken(user._id);
  
  return {
    token,
    user: user.toJSON()
  };
};

const login = async (email, password) => {
  // Find user and include password for comparison
  const user = await User.findOne({ email: (email || '').toLowerCase().trim() }).select('+password');
  
  if (!user) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }
  
  // Compare password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }
  
  // Generate token
  const token = generateToken(user._id);
  
  return {
    token,
    user: user.toJSON()
  };
};

const getUserById = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }
  return user.toJSON();
};

/**
 * Updates editable profile fields while preserving protected fields (role, verified, _id)
 */
const updateProfile = async (userId, updateData = {}) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const { fullName, name, email, address, city, state, pincode, location } = updateData;

  // If email is changed, verify uniqueness
  if (email && email.toLowerCase().trim() !== user.email) {
    const emailNorm = email.toLowerCase().trim();
    const existing = await User.findOne({ email: emailNorm, _id: { $ne: userId } });
    if (existing) {
      const error = new Error('Email is already registered by another account');
      error.statusCode = 400;
      throw error;
    }
    user.email = emailNorm;
  }

  if (fullName !== undefined || name !== undefined) {
    user.fullName = (fullName || name || '').trim();
  }

  // Handle location fields (support both flat and nested location payloads)
  user.location = user.location || {};
  const loc = location || {};

  if (address !== undefined || loc.address !== undefined) {
    user.location.address = (address !== undefined ? address : loc.address || '').trim();
  }
  if (city !== undefined || loc.city !== undefined) {
    user.location.city = (city !== undefined ? city : loc.city || '').trim();
  }
  if (state !== undefined || loc.state !== undefined) {
    user.location.state = (state !== undefined ? state : loc.state || '').trim();
  }
  if (pincode !== undefined || loc.pincode !== undefined) {
    user.location.pincode = (pincode !== undefined ? pincode : loc.pincode || '').trim();
  }

  // Save changes to database
  await user.save();

  return user.toJSON();
};

/**
 * Changes password for authenticated user after verifying current password
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select('+password');
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    const error = new Error('Current password is incorrect');
    error.statusCode = 400;
    throw error;
  }

  if (currentPassword === newPassword) {
    const error = new Error('New password must be different from current password');
    error.statusCode = 400;
    throw error;
  }

  user.password = newPassword;
  await user.save();

  return true;
};

/**
 * Initiates password reset by generating a secure time-limited token and sending an email
 */
const requestPasswordReset = async (email) => {
  if (!email) {
    return {
      message: 'If an account exists with that email address, a password reset link has been sent.'
    };
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (user) {
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });
    await emailService.sendPasswordResetEmail({ email: user.email, resetToken, user });
  }

  // Always return identical generic message to avoid email enumeration
  return {
    message: 'If an account exists with that email address, a password reset link has been sent.'
  };
};

/**
 * Resets user password using the cryptographically verified single-use token
 */
const resetPassword = async (token, newPassword) => {
  if (!token) {
    const error = new Error('Password reset token is required');
    error.statusCode = 400;
    throw error;
  }

  const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() }
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    const error = new Error('Password reset token is invalid or has expired');
    error.statusCode = 400;
    throw error;
  }

  user.password = newPassword;
  // Invalidate token after single use
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  return true;
};

module.exports = {
  register,
  login,
  getUserById,
  updateProfile,
  changePassword,
  requestPasswordReset,
  resetPassword,
  generateToken
};
