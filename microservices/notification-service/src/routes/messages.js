import express from 'express';
import { 
  sendMessage, 
  getConversation, 
  getConversations, 
  deleteMessage, 
  markConversationAsRead 
} from '../controllers/messages.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { 
  validateObjectId, 
  validatePagination,
  validateMessageContent,
  sanitizeInput
} from '../middleware/validation.middleware.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     PrivateMessage:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Message ID
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
 *         recipient:
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
 *         content:
 *           type: string
 *           description: Message content
 *         images:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of image URLs
 *         conversation:
 *           type: string
 *           description: Conversation ID
 *         isRead:
 *           type: boolean
 *           description: Whether the message has been read
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *       example:
 *         id: "60d0fe4f5311236168a109ca"
 *         sender:
 *           id: "60d0fe4f5311236168a109cb"
 *           username: "johndoe"
 *           displayName: "John Doe"
 *           profilePicture: "https://example.com/avatar.jpg"
 *         recipient:
 *           id: "60d0fe4f5311236168a109cc"
 *           username: "janedoe"
 *           displayName: "Jane Doe"
 *           profilePicture: "https://example.com/avatar2.jpg"
 *         content: "Hello! How are you?"
 *         images: []
 *         conversation: "60d0fe4f5311236168a109cb_60d0fe4f5311236168a109cc"
 *         isRead: false
 *         createdAt: "2023-01-01T00:00:00.000Z"
 * 
 *     MessageRequest:
 *       type: object
 *       required:
 *         - recipientId
 *         - content
 *       properties:
 *         recipientId:
 *           type: string
 *           description: User ID of the recipient
 *         content:
 *           type: string
 *           description: Message content
 *           maxLength: 1000
 *         images:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of image URLs
 *       example:
 *         recipientId: "60d0fe4f5311236168a109cc"
 *         content: "Hello! How are you?"
 *         images: ["https://example.com/image1.jpg"]
 * 
 *     Conversation:
 *       type: object
 *       properties:
 *         conversationId:
 *           type: string
 *           description: Unique conversation ID
 *         otherUser:
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
 *         lastMessage:
 *           type: object
 *           properties:
 *             content:
 *               type: string
 *             timestamp:
 *               type: string
 *               format: date-time
 *             isFromMe:
 *               type: boolean
 *         unreadCount:
 *           type: integer
 *           description: Number of unread messages in this conversation
 *       example:
 *         conversationId: "60d0fe4f5311236168a109cb_60d0fe4f5311236168a109cc"
 *         otherUser:
 *           id: "60d0fe4f5311236168a109cc"
 *           username: "janedoe"
 *           displayName: "Jane Doe"
 *           profilePicture: "https://example.com/avatar2.jpg"
 *         lastMessage:
 *           content: "Hello! How are you?"
 *           timestamp: "2023-01-01T00:00:00.000Z"
 *           isFromMe: false
 *         unreadCount: 2
 */

/**
 * @swagger
 * /messages:
 *   post:
 *     summary: Send a private message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MessageRequest'
 *     responses:
 *       201:
 *         description: Message sent successfully
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
 *                   example: "Private message sent successfully"
 *                 data:
 *                   $ref: '#/components/schemas/PrivateMessage'
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized - Access token required
 *       404:
 *         description: Recipient user not found
 *       500:
 *         description: Server error
 */
router.post('/messages', authMiddleware, sanitizeInput, validateMessageContent, sendMessage);

/**
 * @swagger
 * /messages/conversations:
 *   get:
 *     summary: Get all conversations for the authenticated user
 *     tags: [Messages]
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
 *         description: Number of conversations per page
 *     responses:
 *       200:
 *         description: List of conversations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 conversations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Conversation'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *       401:
 *         description: Unauthorized - Access token required
 *       500:
 *         description: Server error
 */
router.get('/messages/conversations', authMiddleware, validatePagination, getConversations);

/**
 * @swagger
 * /messages/conversation/{userId}:
 *   get:
 *     summary: Get messages for a specific conversation
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID of the other participant
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
 *           default: 50
 *         description: Number of messages per page
 *     responses:
 *       200:
 *         description: List of messages in the conversation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PrivateMessage'
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
 *                 conversationId:
 *                   type: string
 *                   description: Unique conversation ID
 *       401:
 *         description: Unauthorized - Access token required
 *       500:
 *         description: Server error
 */
router.get('/messages/conversation/:userId', authMiddleware, validateObjectId('userId'), validatePagination, getConversation);

/**
 * @swagger
 * /messages/conversation/{userId}/read:
 *   patch:
 *     summary: Mark all messages in a conversation as read
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID of the other participant
 *     responses:
 *       200:
 *         description: Messages marked as read
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
 *                   example: "Marked 3 messages as read"
 *       401:
 *         description: Unauthorized - Access token required
 *       500:
 *         description: Server error
 */
router.patch('/messages/conversation/:userId/read', authMiddleware, validateObjectId('userId'), markConversationAsRead);

/**
 * @swagger
 * /messages/{messageId}:
 *   delete:
 *     summary: Delete a private message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message deleted successfully
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
 *                   example: "Message deleted successfully"
 *       401:
 *         description: Unauthorized - Access token required
 *       403:
 *         description: Not authorized to delete this message
 *       404:
 *         description: Message not found
 *       500:
 *         description: Server error
 */
router.delete('/messages/:messageId', authMiddleware, validateObjectId('messageId'), deleteMessage);

export default router;
