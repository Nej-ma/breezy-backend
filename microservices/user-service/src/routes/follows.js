import express from 'express';
import controller from '../controllers/follow.controllers.js';
import authMiddleware from '../middleware/auth.middleware.js';
import User from '../models/User.js';

const router = express.Router();

//protected routes

router.post('/:userId/follow', authMiddleware, controller.followUser);
router.get('/:userId/is-following', authMiddleware, controller.isFollowingUser);
router.get('/:userId/followers', authMiddleware, controller.getFollowers);
router.get('/:userId/following', authMiddleware, controller.getFollowing);
router.delete('/:userId/unfollow', authMiddleware, controller.unfollowUser);

// Route pour synchroniser tous les compteurs (développement)
router.post('/sync-counts', authMiddleware, controller.syncAllCounts);

/**
 * @swagger
 * /{userId}/follow:
 *   post:
 *     summary: Follow a user
 *     tags: [Follows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user to follow
 *     responses:
 *       200:
 *         description: User followed successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *
 * /{userId}/is-following:
 *   get:
 *     summary: Check if following a user
 *     tags: [Follows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user to check
 *     responses:
 *       200:
 *         description: Following status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isFollowing:
 *                   type: boolean
 *       401:
 *         description: Unauthorized
 * 
 * /{userId}/followers:
 *   get:
 *     summary: Get user followers
 *     tags: [Follows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user
 *     responses:
 *       200:
 *         description: Followers list retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         description: Unauthorized
 * 
 * /{userId}/following:
 *   get:
 *     summary: Get users being followed
 *     tags: [Follows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user
 *     responses:
 *       200:
 *         description: Following list retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         description: Unauthorized
 * 
 * /{userId}/unfollow:
 *   delete:
 *     summary: Unfollow a user
 *     tags: [Follows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user to unfollow
 *     responses:
 *       200:
 *         description: User unfollowed successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */

// Route de synchronisation pour recalculer les compteurs (utile en développement)
router.post('/sync-counts', authMiddleware, async (req, res) => {
    try {
        // Recalculer les compteurs pour tous les utilisateurs
        const users = await User.find({});
        const syncPromises = users.map(user => controller.syncUserCounts(user.userId));
        
        await Promise.all(syncPromises);
        
        res.status(200).json({ 
            message: 'All user counts synchronized successfully',
            usersUpdated: users.length
        });
    } catch (error) {
        console.error('Error syncing all counts:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;