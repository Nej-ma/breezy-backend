import express from 'express';
import { 
  getNotifications, 
  createNotification, 
  markAsRead, 
  markAllAsRead, 
  deleteNotification, 
  getNotificationStats 
} from '../controllers/notifications.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { 
  validateObjectId, 
  validateNotificationType, 
  validateTargetType, 
  validatePagination,
  rateLimitNotifications,
  sanitizeInput
} from '../middleware/validation.middleware.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Notification ID
 *         recipient:
 *           type: string
 *           description: User ID of the recipient
 *         sender:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             username:
 *               type: string
 *             displayName:
 *               type: string
 *             profilePicture:
 *               type: string
 *         type:
 *           type: string
 *           enum: [like, comment, follow, mention, message]
 *           description: Type of notification
 *         targetType:
 *           type: string
 *           enum: [Post, Comment, User, PrivateMessage]
 *           description: Type of target object
 *         targetId:
 *           type: string
 *           description: ID of the target object
 *         message:
 *           type: string
 *           description: Notification message
 *         data:
 *           type: object
 *           description: Additional data for the notification
 *         isRead:
 *           type: boolean
 *           description: Whether the notification has been read
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *       example:
 *         id: "60d0fe4f5311236168a109ca"
 *         recipient: "60d0fe4f5311236168a109cb"
 *         sender:
 *           id: "60d0fe4f5311236168a109cc"
 *           username: "johndoe"
 *           displayName: "John Doe"
 *           profilePicture: "https://example.com/avatar.jpg"
 *         type: "like"
 *         targetType: "Post"
 *         targetId: "60d0fe4f5311236168a109cd"
 *         message: "John Doe liked your post"
 *         data: {}
 *         isRead: false
 *         createdAt: "2023-01-01T00:00:00.000Z"
 * 
 *     NotificationRequest:
 *       type: object
 *       required:
 *         - recipientId
 *         - type
 *         - targetType
 *         - targetId
 *         - message
 *       properties:
 *         recipientId:
 *           type: string
 *           description: User ID of the recipient
 *         type:
 *           type: string
 *           enum: [like, comment, follow, mention, message]
 *           description: Type of notification
 *         targetType:
 *           type: string
 *           enum: [Post, Comment, User, PrivateMessage]
 *           description: Type of target object
 *         targetId:
 *           type: string
 *           description: ID of the target object
 *         message:
 *           type: string
 *           description: Notification message
 *         data:
 *           type: object
 *           description: Additional data for the notification
 *       example:
 *         recipientId: "60d0fe4f5311236168a109cb"
 *         type: "like"
 *         targetType: "Post"
 *         targetId: "60d0fe4f5311236168a109cd"
 *         message: "John Doe liked your post"
 *         data: { postTitle: "My awesome post" }
 */

/**
 * @swagger
 * /:
 *   get:
 *     summary: Get notifications for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of notifications per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [like, comment, follow, mention, message]
 *         description: Filter by notification type
 *       - in: query
 *         name: unread
 *         schema:
 *           type: boolean
 *         description: Filter for unread notifications only
 *     responses:
 *       200:
 *         description: List of notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 notifications:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notification'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *                     hasMore:
 *                       type: boolean
 *                 unreadCount:
 *                   type: integer
 *       401:
 *         description: Unauthorized - Access token required
 *       500:
 *         description: Server error
 */
router.get('/', authMiddleware, validatePagination, getNotifications);

/**
 * @swagger
 * /:
 *   post:
 *     summary: Create and send a notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotificationRequest'
 *     responses:
 *       201:
 *         description: Notification created and sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Notification created and sent successfully"
 *                 notification:
 *                   $ref: '#/components/schemas/Notification'
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized - Access token required
 *       404:
 *         description: Recipient user not found
 *       500:
 *         description: Server error
 */
router.post('/', authMiddleware, sanitizeInput, validateNotificationType, validateTargetType, rateLimitNotifications, createNotification);

/**
 * @swagger
 * /{id}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Notification marked as read"
 *       401:
 *         description: Unauthorized - Access token required
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Server error
 */
router.patch('/:id/read', authMiddleware, validateObjectId('id'), markAsRead);

/**
 * @swagger
 * /read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Marked 5 notifications as read"
 *       401:
 *         description: Unauthorized - Access token required
 *       500:
 *         description: Server error
 */
router.patch('/read-all', authMiddleware, markAllAsRead);

/**
 * @swagger
 * /{id}:
 *   delete:
 *     summary: Delete a notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Notification deleted successfully"
 *       401:
 *         description: Unauthorized - Access token required
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', authMiddleware, validateObjectId('id'), deleteNotification);

/**
 * @swagger
 * /stats:
 *   get:
 *     summary: Get notification statistics for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 stats:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       description: Total number of notifications
 *                     unread:
 *                       type: integer
 *                       description: Number of unread notifications
 *                     byType:
 *                       type: object
 *                       description: Breakdown by notification type
 *                       properties:
 *                         like:
 *                           type: integer
 *                         comment:
 *                           type: integer
 *                         follow:
 *                           type: integer
 *                         mention:
 *                           type: integer
 *                         message:
 *                           type: integer
 *       401:
 *         description: Unauthorized - Access token required
 *       500:
 *         description: Server error
 */
router.get('/stats', authMiddleware, getNotificationStats);

export default router;
