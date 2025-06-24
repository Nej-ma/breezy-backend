import express from 'express';
import * as controllers from '../controllers/posts.controllers.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = express.Router();


// Protected routes (authentication required)
router.get('/', authMiddleware, controllers.getPosts);
router.get('/search', authMiddleware, controllers.searchPostsByTags);
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
 *     summary: Get posts with various filtering options
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         description: Get a specific post by ID
 *         required: false
 *         example: "6853c06e1bc5294ffc169bdc"
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [following]
 *         description: Filter posts by relationship (following users)
 *         required: false
 *       - in: query
 *         name: author
 *         schema:
 *           type: string
 *         description: Filter posts by specific author ID
 *         required: false
 *         example: "6853c06e1bc5294ffc169bdc"
 *     responses:
 *       200:
 *         description: Posts retrieved successfully
 *       403:
 *         description: Access denied for specific post
 *       404:
 *         description: Post not found (when using id parameter)
 *       500:
 *         description: Internal server error
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
 * /search:
 *   get:
 *     summary: Search posts by tags
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tags
 *         required: true
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *           minItems: 1
 *         style: form
 *         explode: true
 *         description: Tags to search for (without #). Can be provided as multiple query parameters (?tags=javascript&tags=react) or comma-separated (?tags=javascript,react)
 *         example: ["javascript", "react"]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Maximum number of results to return
 *         required: false
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of results to skip for pagination
 *         required: false
 *     responses:
 *       200:
 *         description: Posts found successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       author:
 *                         type: string
 *                       content:
 *                         type: string
 *                       tags:
 *                         type: array
 *                         items:
 *                           type: string
 *                       visibility:
 *                         type: string
 *                         enum: [public, followers, private]
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalResults:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     skip:
 *                       type: integer
 *                 searchCriteria:
 *                   type: object
 *                   properties:
 *                     tags:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         description: Invalid input - tags parameter required or invalid format
 *       401:
 *         description: Unauthorized - Access token required
 *       500:
 *         description: Internal server error
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


export default router;