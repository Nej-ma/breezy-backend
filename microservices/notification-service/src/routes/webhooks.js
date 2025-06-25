import express from 'express';
import Notification from '../models/Notification.js';

const router = express.Router();

/**
 * Internal webhook endpoints for other microservices to trigger notifications
 * These endpoints are called by other services (post, user, etc.) when events occur
 */

/**
 * @swagger
 * /webhook/like:
 *   post:
 *     summary: Create notification for a like (Internal API)
 *     tags: [Webhooks]
 *     description: Called by post service when a user likes a post
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - postId
 *               - postAuthorId
 *               - likerUserId
 *               - likerUsername
 *               - likerDisplayName
 *             properties:
 *               postId:
 *                 type: string
 *                 description: ID of the liked post
 *               postAuthorId:
 *                 type: string
 *                 description: ID of the post author
 *               likerUserId:
 *                 type: string
 *                 description: ID of the user who liked
 *               likerUsername:
 *                 type: string
 *                 description: Username of the user who liked
 *               likerDisplayName:
 *                 type: string
 *                 description: Display name of the user who liked
 *               postContent:
 *                 type: string
 *                 description: Excerpt of the post content
 *     responses:
 *       201:
 *         description: Like notification created
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Server error
 */
router.post('/webhook/like', async (req, res) => {
  try {
    const { postId, postAuthorId, likerUserId, likerUsername, likerDisplayName, postContent } = req.body;

    // Validate required fields
    if (!postId || !postAuthorId || !likerUserId || !likerUsername || !likerDisplayName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Don't notify if user likes their own post
    if (postAuthorId === likerUserId) {
      return res.status(200).json({
        success: true,
        message: 'No notification sent for self-like'
      });
    }

    // Create notification
    const notification = new Notification({
      recipient: postAuthorId,
      sender: likerUserId,
      type: 'like',
      targetType: 'Post',
      targetId: postId,
      message: `${likerDisplayName} liked your post`,
      data: {
        postContent: postContent ? postContent.substring(0, 100) : '',
        likerUsername
      }
    });

    await notification.save();
    await notification.populate('sender', 'username displayName profilePicture');

    // Send real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(`user-${postAuthorId}`).emit('notification', {
        id: notification._id,
        type: notification.type,
        message: notification.message,
        data: notification.data,
        sender: notification.sender,
        targetType: notification.targetType,
        targetId: notification.targetId,
        timestamp: notification.createdAt,
        isRead: false
      });
    }

    res.status(201).json({
      success: true,
      message: 'Like notification created',
      notificationId: notification._id
    });

  } catch (error) {
    console.error('❌ Error creating like notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create like notification'
    });
  }
});

/**
 * @swagger
 * /webhook/comment:
 *   post:
 *     summary: Create notification for a comment (Internal API)
 *     tags: [Webhooks]
 *     description: Called by post service when a user comments on a post
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - postId
 *               - postAuthorId
 *               - commentId
 *               - commenterUserId
 *               - commenterUsername
 *               - commenterDisplayName
 *               - commentContent
 *             properties:
 *               postId:
 *                 type: string
 *                 description: ID of the commented post
 *               postAuthorId:
 *                 type: string
 *                 description: ID of the post author
 *               commentId:
 *                 type: string
 *                 description: ID of the comment
 *               commenterUserId:
 *                 type: string
 *                 description: ID of the user who commented
 *               commenterUsername:
 *                 type: string
 *                 description: Username of the commenter
 *               commenterDisplayName:
 *                 type: string
 *                 description: Display name of the commenter
 *               commentContent:
 *                 type: string
 *                 description: Content of the comment
 *               parentCommentId:
 *                 type: string
 *                 description: ID of parent comment if this is a reply
 *     responses:
 *       201:
 *         description: Comment notification created
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Server error
 */
router.post('/webhook/comment', async (req, res) => {
  try {
    const { 
      postId, 
      postAuthorId, 
      commentId, 
      commenterUserId, 
      commenterUsername, 
      commenterDisplayName, 
      commentContent,
      parentCommentId 
    } = req.body;

    // Validate required fields
    if (!postId || !postAuthorId || !commentId || !commenterUserId || !commenterUsername || !commenterDisplayName || !commentContent) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Don't notify if user comments on their own post
    if (postAuthorId === commenterUserId) {
      return res.status(200).json({
        success: true,
        message: 'No notification sent for self-comment'
      });
    }

    const isReply = !!parentCommentId;
    const message = isReply 
      ? `${commenterDisplayName} replied to your comment`
      : `${commenterDisplayName} commented on your post`;

    // Create notification
    const notification = new Notification({
      recipient: postAuthorId,
      sender: commenterUserId,
      type: 'comment',
      targetType: 'Comment',
      targetId: commentId,
      message,
      data: {
        postId,
        commentContent: commentContent.substring(0, 100),
        commenterUsername,
        isReply,
        parentCommentId
      }
    });

    await notification.save();
    await notification.populate('sender', 'username displayName profilePicture');

    // Send real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(`user-${postAuthorId}`).emit('notification', {
        id: notification._id,
        type: notification.type,
        message: notification.message,
        data: notification.data,
        sender: notification.sender,
        targetType: notification.targetType,
        targetId: notification.targetId,
        timestamp: notification.createdAt,
        isRead: false
      });
    }

    res.status(201).json({
      success: true,
      message: 'Comment notification created',
      notificationId: notification._id
    });

  } catch (error) {
    console.error('❌ Error creating comment notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create comment notification'
    });
  }
});

/**
 * @swagger
 * /webhook/follow:
 *   post:
 *     summary: Create notification for a follow (Internal API)
 *     tags: [Webhooks]
 *     description: Called by user service when a user follows another user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - followedUserId
 *               - followerUserId
 *               - followerUsername
 *               - followerDisplayName
 *             properties:
 *               followedUserId:
 *                 type: string
 *                 description: ID of the user being followed
 *               followerUserId:
 *                 type: string
 *                 description: ID of the user who followed
 *               followerUsername:
 *                 type: string
 *                 description: Username of the follower
 *               followerDisplayName:
 *                 type: string
 *                 description: Display name of the follower
 *     responses:
 *       201:
 *         description: Follow notification created
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Server error
 */
router.post('/webhook/follow', async (req, res) => {
  try {
    const { followedUserId, followerUserId, followerUsername, followerDisplayName } = req.body;

    // Validate required fields
    if (!followedUserId || !followerUserId || !followerUsername || !followerDisplayName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Create notification
    const notification = new Notification({
      recipient: followedUserId,
      sender: followerUserId,
      type: 'follow',
      targetType: 'User',
      targetId: followerUserId,
      message: `${followerDisplayName} started following you`,
      data: {
        followerUsername
      }
    });

    await notification.save();
    await notification.populate('sender', 'username displayName profilePicture');

    // Send real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(`user-${followedUserId}`).emit('notification', {
        id: notification._id,
        type: notification.type,
        message: notification.message,
        data: notification.data,
        sender: notification.sender,
        targetType: notification.targetType,
        targetId: notification.targetId,
        timestamp: notification.createdAt,
        isRead: false
      });
    }

    res.status(201).json({
      success: true,
      message: 'Follow notification created',
      notificationId: notification._id
    });

  } catch (error) {
    console.error('❌ Error creating follow notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create follow notification'
    });
  }
});

/**
 * @swagger
 * /webhook/mention:
 *   post:
 *     summary: Create notification for a mention (Internal API)
 *     tags: [Webhooks]
 *     description: Called by post service when a user is mentioned in a post or comment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mentionedUserId
 *               - mentionerUserId
 *               - mentionerUsername
 *               - mentionerDisplayName
 *               - targetType
 *               - targetId
 *               - content
 *             properties:
 *               mentionedUserId:
 *                 type: string
 *                 description: ID of the mentioned user
 *               mentionerUserId:
 *                 type: string
 *                 description: ID of the user who mentioned
 *               mentionerUsername:
 *                 type: string
 *                 description: Username of the mentioner
 *               mentionerDisplayName:
 *                 type: string
 *                 description: Display name of the mentioner
 *               targetType:
 *                 type: string
 *                 enum: [Post, Comment]
 *                 description: Type of content where mention occurred
 *               targetId:
 *                 type: string
 *                 description: ID of the post or comment
 *               content:
 *                 type: string
 *                 description: Content containing the mention
 *     responses:
 *       201:
 *         description: Mention notification created
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Server error
 */
router.post('/webhook/mention', async (req, res) => {
  try {
    const { 
      mentionedUserId, 
      mentionerUserId, 
      mentionerUsername, 
      mentionerDisplayName, 
      targetType, 
      targetId, 
      content 
    } = req.body;

    // Validate required fields
    if (!mentionedUserId || !mentionerUserId || !mentionerUsername || !mentionerDisplayName || !targetType || !targetId || !content) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Don't notify if user mentions themselves
    if (mentionedUserId === mentionerUserId) {
      return res.status(200).json({
        success: true,
        message: 'No notification sent for self-mention'
      });
    }

    const isInComment = targetType === 'Comment';
    const message = isInComment 
      ? `${mentionerDisplayName} mentioned you in a comment`
      : `${mentionerDisplayName} mentioned you in a post`;

    // Create notification
    const notification = new Notification({
      recipient: mentionedUserId,
      sender: mentionerUserId,
      type: 'mention',
      targetType,
      targetId,
      message,
      data: {
        content: content.substring(0, 100),
        mentionerUsername,
        isInComment
      }
    });

    await notification.save();
    await notification.populate('sender', 'username displayName profilePicture');

    // Send real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(`user-${mentionedUserId}`).emit('notification', {
        id: notification._id,
        type: notification.type,
        message: notification.message,
        data: notification.data,
        sender: notification.sender,
        targetType: notification.targetType,
        targetId: notification.targetId,
        timestamp: notification.createdAt,
        isRead: false
      });
    }

    res.status(201).json({
      success: true,
      message: 'Mention notification created',
      notificationId: notification._id
    });

  } catch (error) {
    console.error('❌ Error creating mention notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create mention notification'
    });
  }
});

export default router;
