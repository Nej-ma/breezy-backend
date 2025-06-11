import express from 'express';
import * as controllers from '../controllers/users.controllers.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes (no authentication required)

/**
 * @swagger
 * /:
 *   get:
 *     summary: Retrieve a list of user profiles
 *     tags: [Users]
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
 *       404:
 *         description: No user profiles found
 */
router.get('/', controllers.getUsers);

/**
 * @swagger
 * /{id}:
 *   get:
 *     summary: Retrieve a user profile by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The user ID from Auth Service
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
 *                 followersCount:
 *                   type: integer
 *                 followingCount:
 *                   type: integer
 *                 postsCount:
 *                   type: integer
 *       404:
 *         description: User profile not found
 */
router.get('/:id', controllers.getUserById);

// Internal service routes (appelées par d'autres microservices)
router.post('/create-profile', controllers.createUserProfile);

// Legacy routes (redirect to Auth Service)
router.post('/', controllers.createAccount);
router.post("/activate/:token", controllers.validateEmail);

// Protected routes (authentication required)
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
router.get('/profile', authMiddleware, (req, res) => {
  res.json({
    message: 'Current user profile',
    user: req.user
  });
});

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
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Unauthorized
 */
router.put('/profile', authMiddleware, (req, res) => {
  res.json({
    message: 'Profile update functionality would be implemented here',
    user: req.user,
    updateData: req.body
  });
});

export default router;
