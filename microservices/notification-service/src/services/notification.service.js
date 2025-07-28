import Notification from '../models/Notification.js';
import PrivateMessage from '../models/PrivateMessage.js';

/**
 * Service for notification management and utilities
 */

/**
 * Clean up old notifications (older than 30 days)
 */
export const cleanupOldNotifications = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await Notification.deleteMany({
      createdAt: { $lt: thirtyDaysAgo },
      isRead: true
    });

    console.log(`🧹 Cleaned up ${result.deletedCount} old notifications`);
    return result.deletedCount;
  } catch (error) {
    console.error('❌ Error cleaning up notifications:', error);
    throw error;
  }
};

/**
 * Clean up old messages (older than 90 days and deleted by both users)
 */
export const cleanupOldMessages = async () => {
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const result = await PrivateMessage.deleteMany({
      createdAt: { $lt: ninetyDaysAgo },
      isDeleted: true
    });

    console.log(`🧹 Cleaned up ${result.deletedCount} old messages`);
    return result.deletedCount;
  } catch (error) {
    console.error('❌ Error cleaning up messages:', error);
    throw error;
  }
};

/**
 * Get notification summary for a user
 */
export const getNotificationSummary = async (userId) => {
  try {
    const summary = await Notification.aggregate([
      {
        $match: {
          recipient: userId,
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          unreadCount: {
            $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
          },
          lastNotification: { $max: '$createdAt' }
        }
      }
    ]);

    return summary;
  } catch (error) {
    console.error('❌ Error getting notification summary:', error);
    throw error;
  }
};

/**
 * Send bulk notifications (for system announcements)
 */
export const sendBulkNotification = async (io, userIds, notificationData) => {
  try {
    const notifications = userIds.map(userId => ({
      recipient: userId,
      sender: notificationData.senderId,
      type: notificationData.type,
      targetType: notificationData.targetType,
      targetId: notificationData.targetId,
      message: notificationData.message,
      data: notificationData.data || {}
    }));

    const savedNotifications = await Notification.insertMany(notifications);

    // Send real-time notifications
    userIds.forEach(userId => {
      io.to(`user-${userId}`).emit('notification', {
        type: notificationData.type,
        message: notificationData.message,
        data: notificationData.data,
        timestamp: new Date().toISOString(),
        isRead: false
      });
    });

    console.log(`📢 Sent bulk notification to ${userIds.length} users`);
    return savedNotifications;
  } catch (error) {
    console.error('❌ Error sending bulk notification:', error);
    throw error;
  }
};

/**
 * Check if notification already exists (to prevent duplicates)
 */
export const notificationExists = async (recipientId, senderId, type, targetId) => {
  try {
    const existing = await Notification.findOne({
      recipient: recipientId,
      sender: senderId,
      type,
      targetId,
      isDeleted: false
    });

    return !!existing;
  } catch (error) {
    console.error('❌ Error checking notification existence:', error);
    throw error;
  }
};

/**
 * Get unread count for a user
 */
export const getUnreadCount = async (userId) => {
  try {
    const count = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
      isDeleted: false
    });

    return count;
  } catch (error) {
    console.error('❌ Error getting unread count:', error);
    throw error;
  }
};

/**
 * Mark notifications as read by type
 */
export const markNotificationsByTypeAsRead = async (userId, type) => {
  try {
    const result = await Notification.updateMany(
      {
        recipient: userId,
        type,
        isRead: false,
        isDeleted: false
      },
      { isRead: true }
    );

    return result.modifiedCount;
  } catch (error) {
    console.error('❌ Error marking notifications by type as read:', error);
    throw error;
  }
};
