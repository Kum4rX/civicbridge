const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const register = async (userData) => {
  const { fullName, email, password, role, location } = userData;
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const error = new Error('User already exists with this email');
    error.statusCode = 400;
    throw error;
  }
  const user = await User.create({
    fullName: fullName || userData.name,
    email: email.toLowerCase().trim(),
    password,
    role: (role || 'CITIZEN').toUpperCase(),
    location: location || {},
    verified: false
  });
  const token = generateToken(user._id);
  return { token, user: user.toJSON() };
};

const login = async (email, password) => {
  const user = await User.findOne({ email: (email || '').toLowerCase().trim() }).select('+password');
  if (!user) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }
  const token = generateToken(user._id);
  return { token, user: user.toJSON() };
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

const updateProfile = async (userId, updateData = {}) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }
  const { fullName, name, email, address, city, state, pincode, location } = updateData;
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
  await user.save();
  return user.toJSON();
};

module.exports = {
  register,
  login,
  getUserById,
  updateProfile,
  generateToken
};
