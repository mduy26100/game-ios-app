const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createUser, getUserByEmail, getUserById } = require('./userService');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Hash password
 */
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare password with hash
 */
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token
 */
function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Register new user
 */
async function register(email, password, name) {
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }

  // Validate password strength
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  // Check if user already exists
  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    throw new Error('Email already exists');
  }

  // Hash password and create user
  const password_hash = await hashPassword(password);
  const user = await createUser({ email, password_hash, name });

  // Remove password hash from response
  delete user.password_hash;
  return user;
}

/**
 * Login user
 */
async function login(email, password) {
  // Get user by email
  const user = await getUserByEmail(email);
  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Check password
  const isValidPassword = await comparePassword(password, user.password_hash);
  if (!isValidPassword) {
    throw new Error('Invalid email or password');
  }

  // Check VIP expiration
  if (user.is_vip && user.vip_expires_at) {
    const now = new Date();
    const expiryDate = new Date(user.vip_expires_at);
    if (expiryDate < now) {
      // VIP expired, update user
      user.is_vip = false;
      const { updateUser } = require('./userService');
      await updateUser(user.id, { is_vip: false });
    }
  }

  // Generate token
  const token = generateToken(user.id);

  // Remove password hash from response
  delete user.password_hash;

  return { user, token };
}

/**
 * Get user from token
 */
async function getUserFromToken(token) {
  const decoded = verifyToken(token);
  if (!decoded || !decoded.userId) {
    return null;
  }

  const user = await getUserById(decoded.userId);
  if (!user) {
    return null;
  }

  // Check VIP expiration
  if (user.is_vip && user.vip_expires_at) {
    const now = new Date();
    const expiryDate = new Date(user.vip_expires_at);
    if (expiryDate < now) {
      user.is_vip = false;
      const { updateUser } = require('./userService');
      await updateUser(user.id, { is_vip: false });
    }
  }

  // Remove password hash
  delete user.password_hash;
  return user;
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  register,
  login,
  getUserFromToken
};
