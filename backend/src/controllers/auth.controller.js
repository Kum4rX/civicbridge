const {
  register,
  login,
  getUserById,
  updateProfile: updateProfileService,
  changePassword: changePasswordService
} = require('../services/auth.service');

const registerUser = async (req, res) => {
  try {
    const { fullName, name, email, password, role, location } = req.body;
    if ((!fullName && !name) || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }
    const result = await register({ fullName: fullName || name, email, password, role, location });
    res.status(201).json({ success: true, message: 'User registered successfully', data: result });
  } catch (error) {
    res.status(error.statusCode || 400).json({ success: false, message: error.message || 'Registration failed' });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    const result = await login(email, password);
    res.status(200).json({ success: true, message: 'Login successful', data: result });
  } catch (error) {
    res.status(error.statusCode || 401).json({ success: false, message: error.message || 'Login failed' });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await getUserById(userId);
    res.status(200).json({ success: true, message: 'User retrieved successfully', data: { user } });
  } catch (error) {
    res.status(error.statusCode || 404).json({ success: false, message: error.message || 'User not found' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const updatedUser = await updateProfileService(userId, req.body);
    res.status(200).json({ success: true, message: 'Profile updated successfully', data: { user: updatedUser } });
  } catch (error) {
    res.status(error.statusCode || 400).json({ success: false, message: error.message || 'Failed to update profile' });
  }
};

const changePassword = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { currentPassword, newPassword } = req.body;
    await changePasswordService(userId, currentPassword, newPassword);
    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(error.statusCode || 400).json({ success: false, message: error.message || 'Failed to change password' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
  updateProfile,
  changePassword
};
