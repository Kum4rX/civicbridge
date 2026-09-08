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
  
  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error('User already exists with this email');
  }
  
  // Create new user
  const user = await User.create({
    fullName,
    email,
    password,
    role: role || 'CITIZEN',
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
  const user = await User.findOne({ email }).select('+password');
  
  if (!user) {
    throw new Error('Invalid credentials');
  }
  
  // Compare password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
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
    throw new Error('User not found');
  }
  return user.toJSON();
};

module.exports = {
  register,
  login,
  getUserById,
  generateToken
};