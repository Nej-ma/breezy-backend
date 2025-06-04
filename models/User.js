const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Define the User schema
/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *         - displayName
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated ID of the user
 *         username:
 *           type: string
 *           description: The username of the user
 *         email:
 *           type: string
 *           description: The email of the user
 *         password:
 *           type: string
 *           description: The hashed password of the user
 *         displayName:
 *           type: string
 *           description: The display name of the user
 *         bio:
 *           type: string
 *           description: A short biography of the user
 *         profilePicture:
 *           type: string
 *           description: URL of the user's profile picture
 *         coverPicture:
 *           type: string
 *           description: URL of the user's cover picture
 *         isVerified:
 *           type: boolean
 *           description: Whether the user is verified
 *         role:
 *           type: string
 *           enum: [user, moderator, admin]
 *           description: The role of the user
 *         isActive:
 *           type: boolean
 *           description: Whether the user account is active
 *         isSuspended:
 *           type: boolean
 *           description: Whether the user account is suspended
 *         suspendedUntil:
 *           type: string
 *           format: date-time
 *           description: The date until the user is suspended
 *         followersCount:
 *           type: integer
 *           description: The number of followers the user has
 *         followingCount:
 *           type: integer
 *           description: The number of users the user is following
 *         postsCount:
 *           type: integer
 *           description: The number of posts the user has made
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the user was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date the user was last updated
 *       example:
 *         id: "60d0fe4f5311236168a109ca"
 *         username: "johndoe"
 *         email: "johndoe@example.com"
 *         password: "hashedpassword123"
 *         displayName: "John Doe"
 *         bio: "Software developer and tech enthusiast."
 *         profilePicture: "https://example.com/profile.jpg"
 *         coverPicture: "https://example.com/cover.jpg"
 *         isVerified: true
 *         role: "user"
 *         isActive: true
 *         isSuspended: false
 *         suspendedUntil: null
 *         followersCount: 100
 *         followingCount: 50
 *         postsCount: 10
 *         createdAt: "2023-01-01T00:00:00.000Z"
 *         updatedAt: "2023-01-02T00:00:00.000Z"
 */
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minLength: 3,
    maxLength: 20
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minLength: 6
  },
  displayName: {
    type: String,
    required: true,
    trim: true,
    maxLength: 50
  },
  bio: {
    type: String,
    maxLength: 160,
    default: ''
  },
  profilePicture: {
    type: String,
    default: ''
  },
  coverPicture: {
    type: String,
    default: ''
  },
  verificationToken: {
    type: String,
    default: ''
  },
  verificationTokenExpires: {
    type: Date,
    default: null
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isSuspended: {
    type: Boolean,
    default: false
  },
  suspendedUntil: Date,
  followersCount: {
    type: Number,
    default: 0
  },
  followingCount: {
    type: Number,
    default: 0
  },
  postsCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Create and export the User model
module.exports = mongoose.model('User', userSchema);
