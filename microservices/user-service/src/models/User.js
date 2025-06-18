import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

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
// Schema pour le User Service - UNIQUEMENT les données de profil
const userProfileSchema = new mongoose.Schema({  userId: {
    type: String, // ID de l'utilisateur depuis l'Auth Service
    required: true,
    unique: true
  },// Données dupliquées pour faciliter les requêtes (eventual consistency)
  username: {
    type: String,
    required: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true,
    maxLength: 50
  },
  // Données de profil uniquement au User Service
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
  },
  // Métadonnées pour la synchronisation
  lastSyncedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes for better search performance
userProfileSchema.index({ username: 'text', displayName: 'text' });
userProfileSchema.index({ displayName: 1 });
userProfileSchema.index({ followersCount: -1 });

// Hash password before saving (supprimé car plus nécessaire)
// userProfileSchema.pre('save', async function(next) {
//   if (!this.isModified('password')) return next();
//   this.password = await bcrypt.hash(this.password, 12);
//   next();
// });

// Compare password method (supprimé car plus nécessaire) 
// userProfileSchema.methods.comparePassword = async function(candidatePassword) {
//   return bcrypt.compare(candidatePassword, this.password);
// };

// Create and export the UserProfile model
export default mongoose.model('UserProfile', userProfileSchema);
