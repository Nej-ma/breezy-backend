import PrivateMessage from '../models/PrivateMessage.js';
import axios from 'axios';

/**
 * Send a private message
 */
const sendMessage = async (req, res) => {
  try {
    const { recipientId, content, images } = req.body;
    const senderId = req.user.id;

    // Validate required fields
    if (!recipientId || !content) {
      return res.status(400).json({
        success: false,
        error: 'Recipient ID and content are required'
      });
    }

    // Don't allow messaging yourself
    if (senderId === recipientId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot send message to yourself'
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

    // Create message
    const message = new PrivateMessage({
      sender: senderId,
      recipient: recipientId,
      content,
      images: images || []
    });

    await message.save();

    // Populate sender info
    await message.populate('sender', 'username displayName profilePicture');

    // Send real-time notification via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`user-${recipientId}`).emit('privateMessage', {
        id: message._id,
        sender: message.sender,
        content: message.content,
        images: message.images,
        conversation: message.conversation,
        timestamp: message.createdAt
      });

      // Also send notification
      io.to(`user-${recipientId}`).emit('notification', {
        type: 'message',
        message: `${message.sender.displayName} sent you a message`,
        data: {
          messageId: message._id,
          conversationId: message.conversation
        },
        sender: message.sender,
        targetType: 'PrivateMessage',
        targetId: message._id,
        timestamp: message.createdAt
      });
    }

    res.status(201).json({
      success: true,
      message: 'Private message sent successfully',
      data: message
    });

  } catch (error) {
    console.error('❌ Error sending private message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send private message',
      service: 'Notification Service'
    });
  }
};

/**
 * Get messages for a conversation
 */
const getConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;
    const { page = 1, limit = 50 } = req.query;

    // Generate conversation ID
    const conversationId = [currentUserId, userId].sort().join('_');

    // Get messages
    const messages = await PrivateMessage.find({
      conversation: conversationId,
      isDeleted: false,
      deletedBy: { $ne: currentUserId }
    })
    .populate('sender', 'username displayName profilePicture')
    .populate('recipient', 'username displayName profilePicture')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

    // Mark messages as read
    await PrivateMessage.updateMany(
      {
        conversation: conversationId,
        recipient: currentUserId,
        isRead: false
      },
      { isRead: true }
    );

    // Get total count
    const totalCount = await PrivateMessage.countDocuments({
      conversation: conversationId,
      isDeleted: false,
      deletedBy: { $ne: currentUserId }
    });

    res.status(200).json({
      success: true,
      messages: messages.reverse(), // Reverse to show oldest first
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / parseInt(limit)),
        hasMore: parseInt(page) * parseInt(limit) < totalCount
      },
      conversationId
    });

  } catch (error) {
    console.error('❌ Error fetching conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversation',
      service: 'Notification Service'
    });
  }
};

/**
 * Get all conversations for the current user
 */
const getConversations = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    // Get distinct conversations
    const conversations = await PrivateMessage.aggregate([
      {
        $match: {
          $or: [
            { sender: currentUserId },
            { recipient: currentUserId }
          ],
          isDeleted: false,
          deletedBy: { $ne: currentUserId }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$conversation',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$recipient', currentUserId] },
                    { $eq: ['$isRead', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      },
      {
        $skip: (parseInt(page) - 1) * parseInt(limit)
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    // Populate user info for each conversation
    const populatedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = await PrivateMessage.populate(conv.lastMessage, [
          { path: 'sender', select: 'username displayName profilePicture' },
          { path: 'recipient', select: 'username displayName profilePicture' }
        ]);

        // Determine the other user in the conversation
        const otherUser = lastMessage.sender._id.toString() === currentUserId 
          ? lastMessage.recipient 
          : lastMessage.sender;

        return {
          conversationId: conv._id,
          otherUser,
          lastMessage: {
            content: lastMessage.content,
            timestamp: lastMessage.createdAt,
            isFromMe: lastMessage.sender._id.toString() === currentUserId
          },
          unreadCount: conv.unreadCount
        };
      })
    );

    res.status(200).json({
      success: true,
      conversations: populatedConversations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversations',
      service: 'Notification Service'
    });
  }
};

/**
 * Delete a message
 */
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.user.id;

    const message = await PrivateMessage.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // Check if user is part of the conversation
    if (message.sender.toString() !== currentUserId && message.recipient.toString() !== currentUserId) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to delete this message'
      });
    }

    // Add user to deletedBy array instead of hard delete
    if (!message.deletedBy.includes(currentUserId)) {
      message.deletedBy.push(currentUserId);
    }

    // If both users have deleted it, mark as deleted
    if (message.deletedBy.length >= 2) {
      message.isDeleted = true;
    }

    await message.save();

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete message',
      service: 'Notification Service'
    });
  }
};

/**
 * Mark conversation as read
 */
const markConversationAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const conversationId = [currentUserId, userId].sort().join('_');

    const result = await PrivateMessage.updateMany(
      {
        conversation: conversationId,
        recipient: currentUserId,
        isRead: false
      },
      { isRead: true }
    );

    res.status(200).json({
      success: true,
      message: `Marked ${result.modifiedCount} messages as read`
    });

  } catch (error) {
    console.error('❌ Error marking conversation as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark conversation as read',
      service: 'Notification Service'
    });
  }
};

export {
  sendMessage,
  getConversation,
  getConversations,
  deleteMessage,
  markConversationAsRead
};
