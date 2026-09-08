const { register, login, getUserById } = require('../services/auth.service');

const registerUser = async (req, res) => {
  try {
    const { fullName, email, password, role, location } = req.body;
    
    // Basic validation
    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }
    
    const result = await register({ fullName, email, password, role, location });
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Registration failed'
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Basic validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    const result = await login(email, password);
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message || 'Login failed'
    });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    
    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: { user }
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message || 'User not found'
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser
};