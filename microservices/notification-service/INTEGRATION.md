# Notification Service Integration Guide

## Overview
The Breezy Notification Service provides real-time notifications and private messaging functionality for the social network platform.

## Service Architecture
- **Port**: 3004
- **Database**: MongoDB (port 27020)
- **Real-time**: Socket.IO WebSocket server
- **API Gateway**: Accessible via `/api/notifications`

## Integration Methods

### 1. Webhook Integration (Recommended for other microservices)

Other services can trigger notifications by calling webhook endpoints:

#### Like Notification
```javascript
// Post Service calls this when a user likes a post
await axios.post('http://notification-service:3004/webhook/like', {
  postId: '507f1f77bcf86cd799439011',
  postAuthorId: '507f1f77bcf86cd799439012',
  likerUserId: '507f1f77bcf86cd799439013',
  likerUsername: 'johndoe',
  likerDisplayName: 'John Doe',
  postContent: 'This is my awesome post content...'
});
```

#### Comment Notification
```javascript
// Post Service calls this when a user comments on a post
await axios.post('http://notification-service:3004/webhook/comment', {
  postId: '507f1f77bcf86cd799439011',
  postAuthorId: '507f1f77bcf86cd799439012',
  commentId: '507f1f77bcf86cd799439014',
  commenterUserId: '507f1f77bcf86cd799439013',
  commenterUsername: 'johndoe',
  commenterDisplayName: 'John Doe',
  commentContent: 'Great post! I really liked it.',
  parentCommentId: null // Optional for replies
});
```

#### Follow Notification
```javascript
// User Service calls this when a user follows another user
await axios.post('http://notification-service:3004/webhook/follow', {
  followedUserId: '507f1f77bcf86cd799439012',
  followerUserId: '507f1f77bcf86cd799439013',
  followerUsername: 'johndoe',
  followerDisplayName: 'John Doe'
});
```

#### Mention Notification
```javascript
// Post Service calls this when a user is mentioned
await axios.post('http://notification-service:3004/webhook/mention', {
  mentionedUserId: '507f1f77bcf86cd799439015',
  mentionerUserId: '507f1f77bcf86cd799439013',
  mentionerUsername: 'johndoe',
  mentionerDisplayName: 'John Doe',
  targetType: 'Post', // or 'Comment'
  targetId: '507f1f77bcf86cd799439011',
  content: 'Hey @janedoe, check this out!'
});
```

### 2. Frontend Integration

#### Socket.IO Connection
```javascript
import io from 'socket.io-client';

// Connect to notification service
const socket = io('ws://api.breezy.website/api/notifications', {
  auth: {
    token: userJwtToken
  }
});

// Listen for real-time notifications
socket.on('notification', (notification) => {
  console.log('New notification:', notification);
  // Update UI, show toast, play sound, etc.
  updateNotificationBadge(notification);
  showNotificationToast(notification);
});

// Listen for private messages
socket.on('privateMessage', (message) => {
  console.log('New message:', message);
  // Update chat UI
  updateChatWindow(message);
});

// Handle connection events
socket.on('connect', () => {
  console.log('Connected to notifications');
});

socket.on('disconnect', () => {
  console.log('Disconnected from notifications');
});
```

#### REST API Calls
```javascript
// Get user notifications
const getNotifications = async (page = 1, limit = 20, unread = false) => {
  const response = await fetch(`/api/notifications?page=${page}&limit=${limit}&unread=${unread}`, {
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    }
  });
  return response.json();
};

// Mark notification as read
const markAsRead = async (notificationId) => {
  await fetch(`/api/notifications/${notificationId}/read`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    }
  });
};

// Send private message
const sendMessage = async (recipientId, content, images = []) => {
  const response = await fetch('/api/notifications/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      recipientId,
      content,
      images
    })
  });
  return response.json();
};

// Get conversations
const getConversations = async () => {
  const response = await fetch('/api/notifications/messages/conversations', {
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    }
  });
  return response.json();
};
```

## Environment Variables

Required environment variables for the notification service:

```env
PORT=3004
MONGODB_URI=mongodb://mongodb-notification:27017/breezy_notifications
AUTH_SERVICE_URL=http://auth-service:3001
USER_SERVICE_URL=http://user-service:3002
POST_SERVICE_URL=http://post-service:3003
JWT_SECRET=your-super-secret-jwt-key-change-in-production-auth
FRONTEND_URL=http://localhost:3000
```

## API Endpoints

### Public Endpoints
- `GET /health` - Health check

### Protected Endpoints (require JWT)
- `GET /` - Get user notifications
- `POST /` - Create notification (manual)
- `PATCH /:id/read` - Mark notification as read
- `PATCH /read-all` - Mark all notifications as read
- `DELETE /:id` - Delete notification
- `GET /stats` - Get notification statistics

### Message Endpoints
- `POST /messages` - Send private message
- `GET /messages/conversations` - Get all conversations
- `GET /messages/conversation/:userId` - Get conversation with specific user
- `PATCH /messages/conversation/:userId/read` - Mark conversation as read
- `DELETE /messages/:messageId` - Delete message

### Webhook Endpoints (Internal)
- `POST /webhook/like` - Trigger like notification
- `POST /webhook/comment` - Trigger comment notification
- `POST /webhook/follow` - Trigger follow notification
- `POST /webhook/mention` - Trigger mention notification

## Data Models

### Notification
```javascript
{
  id: "60d0fe4f5311236168a109ca",
  recipient: "60d0fe4f5311236168a109cb",
  sender: {
    id: "60d0fe4f5311236168a109cc",
    username: "johndoe",
    displayName: "John Doe",
    profilePicture: "https://example.com/avatar.jpg"
  },
  type: "like", // like, comment, follow, mention, message
  targetType: "Post", // Post, Comment, User, PrivateMessage
  targetId: "60d0fe4f5311236168a109cd",
  message: "John Doe liked your post",
  data: {
    postContent: "This is my awesome post...",
    likerUsername: "johndoe"
  },
  isRead: false,
  createdAt: "2023-01-01T00:00:00.000Z"
}
```

### Private Message
```javascript
{
  id: "60d0fe4f5311236168a109ca",
  sender: {
    id: "60d0fe4f5311236168a109cb",
    username: "johndoe",
    displayName: "John Doe",
    profilePicture: "https://example.com/avatar.jpg"
  },
  recipient: {
    id: "60d0fe4f5311236168a109cc",
    username: "janedoe",
    displayName: "Jane Doe",
    profilePicture: "https://example.com/avatar2.jpg"
  },
  content: "Hello! How are you?",
  images: ["https://example.com/image1.jpg"],
  conversation: "60d0fe4f5311236168a109cb_60d0fe4f5311236168a109cc",
  isRead: false,
  createdAt: "2023-01-01T00:00:00.000Z"
}
```

## Real-time Events

### Socket.IO Events

#### Client → Server
- `ping` - Keep connection alive
- `joinConversation(conversationId)` - Join conversation room
- `leaveConversation(conversationId)` - Leave conversation room

#### Server → Client
- `notification` - New notification received
- `privateMessage` - New private message received
- `notificationCount` - Unread notification count update
- `pong` - Response to ping

## Security Features

1. **JWT Authentication** - All endpoints require valid JWT token
2. **Rate Limiting** - Max 30 notifications per minute per user
3. **Input Sanitization** - XSS protection and input cleaning
4. **Validation** - Strict validation of all input parameters
5. **User Permissions** - Users can only access their own data

## Monitoring & Maintenance

### Health Check
```bash
curl http://api.breezy.website/api/notifications/health
```

### Cleanup Jobs
- Old notifications (>30 days, read) are automatically cleaned up daily at 2 AM
- Old messages (>90 days, deleted by both users) are cleaned up daily

### API Documentation
- Swagger UI: `http://api.breezy.website/api/notifications/docs`
- OpenAPI JSON: `http://api.breezy.website/api/notifications/docs/swagger.json`

## Error Handling

All endpoints return consistent error format:
```javascript
{
  success: false,
  error: "Error message description",
  service: "Notification Service"
}
```

Common HTTP status codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

## Performance Considerations

1. **Token Caching** - JWT tokens are cached for 5 minutes to reduce auth service calls
2. **Database Indexes** - Optimized indexes for queries on recipient, type, and timestamps
3. **Pagination** - All list endpoints support pagination to prevent large data transfers
4. **Connection Pooling** - MongoDB connection pooling for optimal database performance

## Development & Testing

### Running Tests
```bash
npm test
```

### Development Mode
```bash
npm run dev
```

### Docker Development
```bash
docker-compose up notification-service
```

The service will be available at `http://api.breezy.website/api/notifications` via the API gateway.
