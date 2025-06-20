import express from 'express';
import * as controllers from '../controllers/posts.controllers.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = express.Router();


// Protected routes (authentication required)
router.get('/', authMiddleware, controllers.getPosts);
router.get('/:id', authMiddleware, controllers.getPost);
router.get('/user/:userId', authMiddleware, controllers.getPostsByUserId);
router.post('/', authMiddleware, controllers.publishPost); 
router.put('/:id', authMiddleware, controllers.updatePost); 
router.put('/:id/like', authMiddleware, controllers.updatePostLikes);
router.delete('/:id', authMiddleware, controllers.deletePost);

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
 *   name: Posts
 *   description: API for posts management
 */

/**
 * @swagger
 * /:
 *   post:
 *     summary: Publish a new post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *               videos:
 *                 type: array
 *                 items:
 *                   type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               mentions:
 *                 type: array
 *                 items:
 *                   type: string
 *               visibility:
 *                 type: string
 *                 enum: [public, private, friends]
 *     responses:
 *       201:
 *         description: Post created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized - Access token required
 */

/**
 * @swagger
 * /:
 *   get:
 *     summary: Get all posts with optional filtering
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [all, following]
 *         description: Filter posts by relationship
 *     responses:
 *       200:
 *         description: List of posts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   items:
 *                     type: object
 *                 filter:
 *                   type: string
 *                 count:
 *                   type: integer
 *       401:
 *         description: Unauthorized - Access token required
 */

/**
 * @swagger
 * /user/{userId}:
 *   get:
 *     summary: Get all posts by a specific user
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID
 *     responses:
 *       200:
 *         description: List of posts by the user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         description: Unauthorized - Access token required
 *       404:
 *         description: User or posts not found
 */

/**
 * @swagger
 * /{id}:
 *   get:
 *     summary: Get a post by ID
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The post ID
 *     responses:
 *       200:
 *         description: Post found
 *       401:
 *         description: Unauthorized - Access token required
 *       404:
 *         description: Post not found
 */

/**
 * @swagger
 * /{id}:
 *   put:
 *     summary: Update a post by ID
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The post ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *               videos:
 *                 type: array
 *                 items:
 *                   type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               mentions:
 *                 type: array
 *                 items:
 *                   type: string
 *               visibility:
 *                 type: string
 *     responses:
 *       200:
 *         description: Post updated
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized - Access token required
 *       404:
 *         description: Post not found
 */

/**
 * @swagger
 * /{id}:
 *   delete:
 *     summary: Delete a post by ID
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The post ID
 *     responses:
 *       200:
 *         description: Post deleted
 *       401:
 *         description: Unauthorized - Access token required
 *       404:
 *         description: Post not found
 */

/**
 * @swagger
 * /{id}/like:
 *   put:
 *     summary: Like or unlike a post by ID
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The post ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: The ID of the user liking or unliking the post
 *     responses:
 *       200:
 *         description: Post like status updated
 *       401:
 *         description: Unauthorized - Access token required
 *       404:
 *         description: Post not found
 */

/**
 * @swagger
 * /{id}/visibility:
 *   put:
 *     summary: Update post visibility by ID
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The post ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               visibility:
 *                 type: string
 *                 enum: [public, private, friends]
 *                 description: The new visibility setting for the post
 *     responses:
 *       200:
 *         description: Post visibility updated successfully
 *       400:
 *         description: Invalid visibility value
 *       401:
 *         description: Unauthorized - Access token required
 *       404:
 *         description: Post not found
 */

export default router;