import express from 'express';
import * as controllers from '../controllers/posts.controllers.js';

const router = express.Router();

//implémenter un middleware pour vérifier l'authentification
router.post('/', controllers.publishPost); 
router.get('/', controllers.getPosts);
router.get('/:id', controllers.getPost);
router.put('/:id', controllers.updatePost); 
router.delete('/:id', controllers.deletePost);

/**
 * @swagger
 * tags:
 *   name: Posts
 *   description: API for posts management
 */

/**
 * @swagger
 * /posts:
 *   post:
 *     summary: Publish a new post
 *     tags: [Posts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               author:
 *                 type: string
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
 */

/**
 * @swagger
 * /posts:
 *   get:
 *     summary: Get all posts
 *     tags: [Posts]
 *     responses:
 *       200:
 *         description: List of posts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */

/**
 * @swagger
 * /posts/{id}:
 *   get:
 *     summary: Get a post by ID
 *     tags: [Posts]
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
 *       404:
 *         description: Post not found
 */

/**
 * @swagger
 * /posts/{id}:
 *   put:
 *     summary: Update a post by ID
 *     tags: [Posts]
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
 *       404:
 *         description: Post not found
 */

/**
 * @swagger
 * /posts/{id}:
 *   delete:
 *     summary: Delete a post by ID
 *     tags: [Posts]
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
 *       404:
 *         description: Post not found
 */

export default router;