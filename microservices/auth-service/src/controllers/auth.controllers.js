import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import axios from 'axios';
import User from '../models/User.js';
import * as emailService from '../services/email.js';
import { ROLES, isValidRole, canModifyUser } from '../utils/roles.js';

// Générer les tokens JWT
const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { 
      userId,
      role
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

  const refreshToken = jwt.sign(
    { 
      userId,
      role
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Trouver l'utilisateur
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Vérifier si le compte est activé
    if (!user.isVerified) {
      return res.status(401).json({ error: 'Please verify your email address first' });
    }    // Générer les tokens
    const { accessToken, refreshToken } = generateTokens(user._id, user.role);

    // Sauvegarder le refresh token (en cookie HTTP-only)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 jours
    });    // Réponse sans mot de passe et uniquement les données d'auth
    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      isVerified: user.isVerified,
      role: user.role,
      createdAt: user.createdAt
    };

    res.status(200).json({
      message: 'Login successful',
      token: accessToken,
      user: userResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Logout
const logout = async (req, res) => {
  try {
    res.clearCookie('refreshToken');
    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Refresh token
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token not provided' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Get user to fetch current role (in case it changed)
    const user = await User.findById(decoded.userId).select('role');
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    const { accessToken: newAccessToken } = generateTokens(decoded.userId, user.role);

    res.status(200).json({
      message: 'Token refreshed successfully',
      token: newAccessToken
    });

  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password -verificationToken -passwordResetToken');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Forgot password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Générer un token de reset
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetTokenExpiry;
    await user.save();

    // Envoyer l'email de reset
    await emailService.sendPasswordResetEmail(email, resetToken);

    res.status(200).json({ message: 'Password reset email sent successfully' });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Changer le mot de passe
    user.password = newPassword;
    user.passwordResetToken = '';
    user.passwordResetExpires = null;
    await user.save();

    res.status(200).json({ message: 'Password reset successful' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create user (pour compatibilité)
const createUser = async (req, res) => {
  try {
    const { username, displayName, email, password } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Créer le token de vérification
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures

    const newUser = new User({
      username,
      displayName,
      email,
      password,
      verificationToken,
      verificationTokenExpires: verificationTokenExpiry
    });

    await newUser.save();

    // Créer le profil utilisateur dans le User Service
    try {
      const userServiceUrl = process.env.USER_SERVICE_URL || 'http://user-service:3002';
      await axios.post(`${userServiceUrl}/create-profile`, {
        userId: newUser._id.toString(),
        username: newUser.username,
        displayName: newUser.displayName
      }, {
        timeout: 5000,
        headers: { 'Content-Type': 'application/json' }
      });
      console.log('✅ Profil utilisateur créé dans User Service');
    } catch (error) {
      console.error('⚠️ Erreur création profil User Service (non bloquant):', error.message);
      // Ne pas faire échouer la création d'utilisateur pour cette erreur
    }

    // Envoyer l'email de confirmation
    await emailService.sendConfirmationEmail(email, verificationToken);

    res.status(201).json({
      message: 'User created successfully',
      verificationRequired: true
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Activate user
const activateUser = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    user.isVerified = true;
    user.verificationToken = '';
    user.verificationTokenExpires = null;
    await user.save();

    res.status(200).json({ message: 'Email validated successfully' });

  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Envoyer un email de vérification (appelé par d'autres services)
const sendVerificationEmail = async (req, res) => {
  try {
    const { email, token } = req.body;
    
    if (!email || !token) {
      return res.status(400).json({ error: 'Email and token are required' });
    }

    await emailService.sendConfirmationEmail(email, token);
    
    res.status(200).json({ 
      message: 'Verification email sent successfully',
      email: email 
    });
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    res.status(500).json({ 
      error: 'Failed to send verification email',
      details: error.message 
    });
  }
};

// Validate token (called by other microservices)
const validateToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        valid: false,
        error: 'Token is required'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists and is active
    const user = await User.findById(decoded.userId).select('-password -verificationToken -passwordResetToken');
    
    if (!user) {
      return res.status(401).json({
        valid: false,
        error: 'User not found'
      });
    }

    if (!user.isVerified) {
      return res.status(401).json({
        valid: false,
        error: 'User account is not verified'
      });
    }

    if (user.isSuspended) {
      // Check if suspension has expired
      if (user.suspendedUntil && new Date() > user.suspendedUntil) {
        user.isSuspended = false;
        user.suspendedUntil = null;
        await user.save();
      } else {
        return res.status(401).json({
          valid: false,
          error: 'User account is suspended'
        });
      }
    }

    if (!user.isVerified) {
      return res.status(401).json({
        valid: false,
        error: 'User email not verified'
      });
    }    // Return user info (auth data only)
    res.status(200).json({
      valid: true,
      user: {
        id: user._id,
        userId: user._id, // For compatibility
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        isVerified: user.isVerified,
        role: user.role,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Token validation error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        valid: false,
        error: 'Token expired'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        valid: false,
        error: 'Invalid token'
      });
    }

    return res.status(500).json({
      valid: false,
      error: 'Token validation failed'
    });
  }
};

// Admin functions for user management
/**
 * Update user role (Admin only)
 */
const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    // Validate role using utility
    if (!isValidRole(role)) {
      return res.status(400).json({ 
        error: 'Invalid role',
        validRoles: Object.values(ROLES)
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent self-demotion from admin
    if (req.user.id === userId && req.user.role === ROLES.ADMIN && role !== ROLES.ADMIN) {
      return res.status(400).json({ 
        error: 'Cannot demote yourself from admin role'
      });
    }

    // Check if current user can modify target user's role
    if (!canModifyUser(req.user.role, user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions to modify this user\'s role'
      });
    }

    // Update role
    user.role = role;
    await user.save();

    res.status(200).json({
      message: 'User role updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Suspend user (Admin/Moderator)
 */
const suspendUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { duration, reason } = req.body; // duration in hours

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }    // Prevent suspending admins (unless you're also admin)
    if (user.role === ROLES.ADMIN && req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({ 
        error: 'Cannot suspend an admin user'
      });
    }

    // Prevent self-suspension
    if (req.user.id === userId) {
      return res.status(400).json({ 
        error: 'Cannot suspend yourself'
      });
    }

    // Calculate suspension end date
    const suspendedUntil = duration ? 
      new Date(Date.now() + duration * 60 * 60 * 1000) : 
      null; // Permanent if no duration

    user.isSuspended = true;
    user.suspendedUntil = suspendedUntil;
    await user.save();

    res.status(200).json({
      message: 'User suspended successfully',
      user: {
        id: user._id,
        username: user.username,
        isSuspended: user.isSuspended,
        suspendedUntil: user.suspendedUntil
      },
      reason
    });

  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Unsuspend user (Admin/Moderator)
 */
const unsuspendUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isSuspended = false;
    user.suspendedUntil = null;
    await user.save();

    res.status(200).json({
      message: 'User unsuspended successfully',
      user: {
        id: user._id,
        username: user.username,
        isSuspended: user.isSuspended,
        suspendedUntil: user.suspendedUntil
      }
    });

  } catch (error) {
    console.error('Unsuspend user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get all users (Admin/Moderator)
 */
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, suspended } = req.query;
    
    // Build filter
    const filter = {};
    if (role) filter.role = role;
    if (suspended !== undefined) filter.isSuspended = suspended === 'true';

    const users = await User.find(filter)
      .select('-password -verificationToken -passwordResetToken')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(filter);

    res.status(200).json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get user by ID (Admin/Moderator)
 */
const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('-password -verificationToken -passwordResetToken');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ user });

  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export {
  login,
  logout,
  refreshToken,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  createUser,
  activateUser,
  sendVerificationEmail,
  validateToken,
  // Admin functions
  updateUserRole,
  suspendUser,
  unsuspendUser,
  getAllUsers,
  getUserById
};
