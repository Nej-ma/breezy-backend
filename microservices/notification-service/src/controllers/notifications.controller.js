import Notification from '../models/Notification.js';
import axios from 'axios';

/**
 * Get all notifications for the authenticated user
 */
const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, unread } = req.query;
    const userId = req.user.id;

    // Build filter
    const filter = { 
      recipient: userId,
      isDeleted: false 
    };
    
    if (type) {
      filter.type = type;
    }
    
    if (unread === 'true') {
      filter.isRead = false;
    }

    // Get notifications with pagination
    const notifications = await Notification.find(filter)
      .populate('sender', 'username displayName profilePicture')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Get total count for pagination
    const totalCount = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
      isDeleted: false
    });

    res.status(200).json({
      success: true,
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / parseInt(limit)),
        hasMore: parseInt(page) * parseInt(limit) < totalCount
      },
      unreadCount
    });

  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications',
      service: 'Notification Service'
    });
  }
};

/**
 * Create and send a notification
 */
const createNotification = async (req, res) => {
  try {
    const { recipientId, type, targetType, targetId, message, data } = req.body;
    const senderId = req.user.id;

    // Validate required fields
    if (!recipientId || !type || !targetType || !targetId || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: recipientId, type, targetType, targetId, message'
      });
    }

    // Validate notification type
    const validTypes = ['like', 'comment', 'follow', 'mention', 'message'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid notification type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    // Validate target type
    const validTargetTypes = ['Post', 'Comment', 'User', 'PrivateMessage'];
    if (!validTargetTypes.includes(targetType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid target type. Must be one of: ${validTargetTypes.join(', ')}`
      });
    }

    // Don't create notification if user is notifying themselves
    if (senderId === recipientId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot send notification to yourself'
      });
    }

    // Check if recipient exists
    try {
      const userServiceUrl = process.env.USER_SERVICE_URL || 'http://user-service:3002';
      await axios.get(`${userServiceUrl}/id/${recipientId}`);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'Recipient user not found'
      });
    }

    // Create notification
    const notification = new Notification({
      recipient: recipientId,
      sender: senderId,
      type,
      targetType,
      targetId,
      message,
      data: data || {}
    });

    await notification.save();

    // Populate sender info for real-time delivery
    await notification.populate('sender', 'username displayName profilePicture');

    // Send real-time notification via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`user-${recipientId}`).emit('notification', {
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
      message: 'Notification created and sent successfully',
      notification
    });

  } catch (error) {
    console.error('❌ Error creating notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create notification',
      service: 'Notification Service'
    });
  }
};

/**
 * Mark notification as read
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOne({
      _id: id,
      recipient: userId,
      isDeleted: false
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read',
      service: 'Notification Service'
    });
  }
};

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await Notification.updateMany(
      { 
        recipient: userId, 
        isRead: false,
        isDeleted: false 
      },
      { isRead: true }
    );

    res.status(200).json({
      success: true,
      message: `Marked ${result.modifiedCount} notifications as read`
    });

  } catch (error) {
    console.error('❌ Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read',
      service: 'Notification Service'
    });
  }
};

/**
 * Delete a notification
 */
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOne({
      _id: id,
      recipient: userId,
      isDeleted: false
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    notification.isDeleted = true;
    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification',
      service: 'Notification Service'
    });
  }
};

/**
 * Get notification statistics
 */
const getNotificationStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await Notification.aggregate([
      {
        $match: {
          recipient: userId,
          isDeleted: false
        }
      },
      {
        $group: {
          _id: null,
          totalNotifications: { $sum: 1 },
          unreadCount: {
            $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
          },
          typeBreakdown: {
            $push: '$type'
          }
        }
      }
    ]);

    // Count notifications by type
    const typeStats = {};
    if (stats.length > 0) {
      stats[0].typeBreakdown.forEach(type => {
        typeStats[type] = (typeStats[type] || 0) + 1;
      });
    }

    res.status(200).json({
      success: true,
      stats: {
        total: stats.length > 0 ? stats[0].totalNotifications : 0,
        unread: stats.length > 0 ? stats[0].unreadCount : 0,
        byType: typeStats
      }
    });

  } catch (error) {
    console.error('❌ Error fetching notification stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notification statistics',
      service: 'Notification Service'
    });
  }
};

export {
  getNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationStats
};
