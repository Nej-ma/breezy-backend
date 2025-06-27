# 🔔 Breezy Notification Service

A comprehensive real-time notification and messaging microservice for the Breezy social network platform.

## ✨ Features

### Core Notification System
- ✅ **Real-time notifications** via Socket.IO
- ✅ **Persistent notification storage** in MongoDB
- ✅ **Multiple notification types**: likes, comments, follows, mentions, messages
- ✅ **Read/unread status tracking**
- ✅ **Notification statistics and analytics**
- ✅ **Bulk notification support** for system announcements

### Private Messaging System
- ✅ **One-on-one private messaging**
- ✅ **Message history and conversation management**
- ✅ **Image support in messages**
- ✅ **Read receipts and status tracking**
- ✅ **Conversation-based organization**
- ✅ **Soft delete with user-specific deletion**

### Advanced Features
- ✅ **Webhook integration** for other microservices
- ✅ **Rate limiting** to prevent spam
- ✅ **Input sanitization** and validation
- ✅ **Automatic cleanup** of old data
- ✅ **Comprehensive error handling**
- ✅ **JWT-based authentication**
- ✅ **Swagger API documentation**

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway    │    │  Notification   │
│   (React)       │◄───┤    (Traefik)     │◄───┤    Service      │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                          │
                       ┌──────────────────┐              │
                       │  Other Services  │              │
                       │  (Post, User,    │──────────────┘
                       │   Auth)          │
                       └──────────────────┘
                                                          │
                                               ┌─────────────────┐
                                               │    MongoDB      │
                                               │  (Notifications │
                                               │   & Messages)   │
                                               └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB 7.0+
- Docker & Docker Compose

### Environment Setup
```bash
# Copy environment variables
cp .env.example .env

# Edit environment variables
nano .env
```

### Required Environment Variables
```env
PORT=3004
MONGODB_URI=mongodb://mongodb-notification:27017/breezy_notifications
AUTH_SERVICE_URL=http://auth-service:3001
USER_SERVICE_URL=http://user-service:3002
POST_SERVICE_URL=http://post-service:3003
JWT_SECRET=your-super-secret-jwt-key-change-in-production-auth
FRONTEND_URL=http://localhost:3000
```

### Development
```bash
# Install dependencies
npm install

# Start in development mode
npm run dev

# Run tests
npm test
```

### Docker
```bash
# Start the entire stack
docker-compose up

# Start only notification service
docker-compose up notification-service
```

## 📡 API Endpoints

### Authentication Required
All endpoints except `/health` require a valid JWT token in the `Authorization` header:
```
Authorization: Bearer <your-jwt-token>
```

### Notification Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Get user notifications with pagination |
| `POST` | `/` | Create a manual notification |
| `PATCH` | `/:id/read` | Mark specific notification as read |
| `PATCH` | `/read-all` | Mark all notifications as read |
| `DELETE` | `/:id` | Delete a notification |
| `GET` | `/stats` | Get notification statistics |

### Message Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/messages` | Send a private message |
| `GET` | `/messages/conversations` | Get all conversations |
| `GET` | `/messages/conversation/:userId` | Get messages with specific user |
| `PATCH` | `/messages/conversation/:userId/read` | Mark conversation as read |
| `DELETE` | `/messages/:messageId` | Delete a message |

### Webhook Endpoints (Internal)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/webhook/like` | Trigger like notification |
| `POST` | `/webhook/comment` | Trigger comment notification |
| `POST` | `/webhook/follow` | Trigger follow notification |
| `POST` | `/webhook/mention` | Trigger mention notification |

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Service health check |
| `GET` | `/docs` | Swagger API documentation |

## 🔌 Real-time Integration

### Socket.IO Connection
```javascript
import io from 'socket.io-client';

const socket = io('ws://api.breezy.website/api/notifications', {
  auth: { token: userJwtToken }
});

// Listen for notifications
socket.on('notification', (notification) => {
  console.log('New notification:', notification);
});

// Listen for private messages
socket.on('privateMessage', (message) => {
  console.log('New message:', message);
});
```

### Webhook Integration
```javascript
// From Post Service - when someone likes a post
await axios.post('http://notification-service:3004/webhook/like', {
  postId: '507f1f77bcf86cd799439011',
  postAuthorId: '507f1f77bcf86cd799439012',
  likerUserId: '507f1f77bcf86cd799439013',
  likerUsername: 'johndoe',
  likerDisplayName: 'John Doe',
  postContent: 'This is my awesome post...'
});
```

## 📊 Data Models

### Notification Schema
```javascript
{
  recipient: ObjectId,        // User receiving the notification
  sender: ObjectId,           // User who triggered the notification
  type: String,              // 'like', 'comment', 'follow', 'mention', 'message'
  targetType: String,        // 'Post', 'Comment', 'User', 'PrivateMessage'
  targetId: ObjectId,        // ID of the target object
  message: String,           // Human-readable notification message
  data: Object,              // Additional data (flexible)
  isRead: Boolean,           // Read status
  isDeleted: Boolean,        // Soft delete flag
  createdAt: Date,           // Creation timestamp
  updatedAt: Date            // Last update timestamp
}
```

### Private Message Schema
```javascript
{
  sender: ObjectId,          // User sending the message
  recipient: ObjectId,       // User receiving the message
  content: String,           // Message content (max 1000 chars)
  images: [String],          // Array of image URLs
  conversation: String,      // Conversation ID (auto-generated)
  isRead: Boolean,           // Read status
  isDeleted: Boolean,        // Soft delete flag
  deletedBy: [ObjectId],     // Users who deleted this message
  createdAt: Date,           // Creation timestamp
  updatedAt: Date            // Last update timestamp
}
```

## 🛡️ Security Features

- **JWT Authentication**: All endpoints require valid authentication
- **Rate Limiting**: Max 30 notifications per minute per user
- **Input Sanitization**: XSS protection and input cleaning
- **Validation**: Strict validation of all parameters
- **Permission Checks**: Users can only access their own data
- **CORS Protection**: Managed by Traefik API Gateway

## 🔧 Advanced Features

### Automatic Cleanup
- Old notifications (>30 days, read) are cleaned daily at 2 AM
- Old messages (>90 days, deleted by both users) are cleaned daily

### Performance Optimizations
- JWT token caching (5 minutes) to reduce auth service calls
- Database indexes for optimal query performance
- Pagination support for all list endpoints
- Connection pooling for MongoDB

### Monitoring
- Health check endpoint for service status
- Comprehensive error logging
- Request/response logging with Morgan
- Performance metrics tracking

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```

Test coverage includes:
- Unit tests for controllers and services
- Integration tests for API endpoints
- Validation middleware tests
- WebSocket connection tests

## 📚 Documentation

- **API Documentation**: Available at `/docs` when service is running
- **Integration Guide**: See `INTEGRATION.md` for detailed integration instructions
- **OpenAPI Spec**: Available at `/docs/swagger.json`

## 🏃‍♂️ Deployment

### Docker Production
```bash
# Build production image
docker build -t breezy-notification-service .

# Run with production settings
docker run -p 3004:3004 --env-file .env.production breezy-notification-service
```

### Environment-specific Configuration
- **Development**: Auto-reload, detailed logging
- **Production**: Optimized performance, error tracking
- **Testing**: Mock integrations, isolated database

## 🤝 Integration with Other Services

### Post Service Integration
- Automatically notifies users when their posts are liked or commented
- Supports mention detection and notification

### User Service Integration  
- Notifies users when they gain new followers
- Validates user existence before sending notifications

### Auth Service Integration
- Uses distributed authentication for JWT validation
- Caches tokens for improved performance

## 📈 Monitoring & Analytics

### Available Metrics
- Total notifications sent/received
- Notification types breakdown
- Unread notification counts
- Message delivery statistics
- WebSocket connection metrics

### Health Monitoring
```bash
# Check service health
curl http://api.breezy.website/api/notifications/health

# Expected response
{
  "service": "Notification Service",
  "status": "healthy",
  "timestamp": "2023-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "websocket": "active"
}
```

## 🐛 Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check JWT token validity
   - Verify CORS settings
   - Ensure proper authentication headers

2. **Notifications Not Received**
   - Check user is connected to Socket.IO
   - Verify notification creation in database
   - Check rate limiting status

3. **Database Connection Issues**
   - Verify MongoDB is running
   - Check connection string format
   - Ensure network connectivity

### Debug Mode
```bash
# Enable debug logging
DEBUG=notification-service:* npm run dev
```

## 🔮 Future Enhancements

- [ ] Push notification support (FCM/APNS)
- [ ] Notification preferences and filtering
- [ ] Message encryption for enhanced privacy
- [ ] File attachment support in messages
- [ ] Group messaging functionality
- [ ] Advanced analytics dashboard
- [ ] Multi-language notification templates

## 📄 License

This project is part of the Breezy social network platform.

---

**Need help?** Check the [Integration Guide](INTEGRATION.md) or create an issue in the repository.
