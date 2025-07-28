import express from 'express';
import * as controllers from '../controllers/users.controllers.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes (no authentication required)
router.get('/', authMiddleware, controllers.getUsers);
router.get('/search', authMiddleware, controllers.searchUsers);
router.get('/username/:username', authMiddleware, controllers.getUserByUsername);
router.get('/id/:userId', authMiddleware, controllers.getUserById);

// Internal service routes (appelées par d'autres microservices)
router.post('/create-profile', controllers.createUserProfile);
router.post('/sync-auth-data', controllers.syncUserAuthData);

// Legacy routes (redirect to Auth Service)
router.post('/', controllers.createAccount);
router.post("/activate/:token", controllers.validateEmail);

// Protected routes (authentication required)
router.get('/profile', authMiddleware, controllers.getCurrentUserProfile);
router.put('/profile', authMiddleware, controllers.updateUserProfile);
router.delete('/profile/:id', authMiddleware, controllers.deleteUserProfile);

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 * 
 * tags:
 *   name: Users
 *   description: API for user profiles management
 */

/**
 * @swagger
 * /:
 *   get:
 *     summary: Retrieve a list of user profiles
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of user profiles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   userId:
 *                     type: string
 *                   username:
 *                     type: string
 *                   displayName:
 *                     type: string
 *                   bio:
 *                     type: string
 *                   profilePicture:
 *                     type: string
 *                   followersCount:
 *                     type: integer
 *                   followingCount:
 *                     type: integer
 *                   postsCount:
 *                     type: integer
 *       404:
 *         description: No user profiles found
 */

/**
 * @swagger
 * /search:
 *   get:
 *     summary: Search for users by username or display name
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         description: Search query (minimum 2 characters)
 *         schema:
 *           type: string
 *           minLength: 2
 *       - in: query
 *         name: limit
 *         required: false
 *         description: Maximum number of results to return
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *       - in: query
 *         name: skip
 *         required: false
 *         description: Number of results to skip (for pagination)
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       userId:
 *                         type: string
 *                       username:
 *                         type: string
 *                       displayName:
 *                         type: string
 *                       bio:
 *                         type: string
 *                       profilePicture:
 *                         type: string
 *                       followersCount:
 *                         type: integer
 *                       followingCount:
 *                         type: integer
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     skip:
 *                       type: integer
 *                     hasMore:
 *                       type: boolean
 *                 searchQuery:
 *                   type: string
 *       400:
 *         description: Invalid search query
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Search query parameter 'q' is required"
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /username/{username}:
 *   get:
 *     summary: Retrieve a user profile by username
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         description: The username of the user profile to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User profile found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                 username:
 *                   type: string
 *                 displayName:
 *                   type: string
 *                 bio:
 *                   type: string
 *                 profilePicture:
 *                   type: string
 *                 coverPicture:
 *                   type: string
 *                 location:
 *                   type: string
 *                 website:
 *                   type: string
 *                 followersCount:
 *                   type: integer
 *                 followingCount:
 *                   type: integer
 *                 postsCount:
 *                   type: integer
 *       404:
 *         description: User profile not found
 */

/**
 * @swagger
 * /id/{userId}:
 *   get:
 *     summary: Retrieve a user profile by user ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: The user ID of the user profile to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User profile found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                 username:
 *                   type: string
 *                 displayName:
 *                   type: string
 *                 bio:
 *                   type: string
 *                 profilePicture:
 *                   type: string
 *                 coverPicture:
 *                   type: string
 *                 location:
 *                   type: string
 *                 website:
 *                   type: string
 *                 followersCount:
 *                   type: integer
 *                 followingCount:
 *                   type: integer
 *                 postsCount:
 *                   type: integer
 *       404:
 *         description: User profile not found
 */

/**
 * @swagger
 * /create-profile:
 *   post:
 *     summary: Create a new user profile (Internal service route)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - username
 *               - displayName
 *             properties:
 *               userId:
 *                 type: string
 *               username:
 *                 type: string
 *               displayName:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [user, moderator, admin]
 *                 default: user
 *     responses:
 *       201:
 *         description: User profile created successfully
 *       400:
 *         description: Missing required fields or profile already exists
 */

/**
 * @swagger
 * /sync-auth-data:
 *   post:
 *     summary: Synchronize user auth data (Internal service route)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [user, moderator, admin]
 *               isSuspended:
 *                 type: boolean
 *               suspendedUntil:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: User auth data synchronized successfully
 *       400:
 *         description: Missing required field userId
 *       404:
 *         description: User profile not found
 */

/**
 * @swagger
 * /profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /profile:
 *   put:
 *     summary: Update current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:
 *                 type: string
 *               bio:
 *                 type: string
 *               profilePicture:
 *                 type: string
 *               coverPicture:
 *                 type: string
 *               location:
 *                 type: string
 *               website:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /profile/{id}:
 *   delete:
 *     summary: Delete a user profile by user ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The user ID of the profile to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User profile deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User profile not found
 */

export default router;