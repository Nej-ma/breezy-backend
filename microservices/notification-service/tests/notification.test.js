import { jest } from '@jest/globals';
import request from 'supertest';

// Mock the database connection before importing the app
const mockConnectDB = jest.fn();
jest.unstable_mockModule('../src/config/database.js', () => ({
  connectDB: mockConnectDB
}));

// Import the app after mocking
const { default: app } = await import('../src/app.js');

describe('Notification Service API', () => {
  describe('Health Check', () => {
    test('GET /health should return service status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        service: 'Notification Service',
        status: 'healthy',
        version: '1.0.0',
        websocket: 'active'
      });
    });
  });

  describe('Authentication', () => {
    test('GET / should require authentication', async () => {
      const response = await request(app)
        .get('/')
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'Access token required',
        service: 'Notification Service'
      });
    });

    test('POST / should require authentication', async () => {
      const response = await request(app)
        .post('/')
        .send({
          recipientId: '507f1f77bcf86cd799439011',
          type: 'like',
          targetType: 'Post',
          targetId: '507f1f77bcf86cd799439012',
          message: 'Test notification'
        })
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'Access token required',
        service: 'Notification Service'
      });
    });
  });

  describe('API Documentation', () => {
    test('GET /docs/swagger.json should return OpenAPI spec', async () => {
      const response = await request(app)
        .get('/docs/swagger.json')
        .expect(200);

      expect(response.body).toHaveProperty('openapi');
      expect(response.body).toHaveProperty('info');
      expect(response.body.info.title).toBe('Breezy Notification Service API');
    });
  });

  describe('Legacy Routes', () => {
    test('GET /notifications should return API info', async () => {
      const response = await request(app)
        .get('/notifications')
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Notification Service API',
        endpoints: {
          health: '/health',
          notifications: '/',
          messages: '/messages'
        }
      });
    });
  });

  describe('Validation', () => {
    test('POST / should validate notification type', async () => {
      const response = await request(app)
        .post('/')
        .set('Authorization', 'Bearer fake-token')
        .send({
          recipientId: '507f1f77bcf86cd799439011',
          type: 'invalid-type',
          targetType: 'Post',
          targetId: '507f1f77bcf86cd799439012',
          message: 'Test notification'
        })
        .expect(400);

      expect(response.body.error).toContain('Invalid notification type');
    });

    test('POST / should validate target type', async () => {
      const response = await request(app)
        .post('/')
        .set('Authorization', 'Bearer fake-token')
        .send({
          recipientId: '507f1f77bcf86cd799439011',
          type: 'like',
          targetType: 'InvalidType',
          targetId: '507f1f77bcf86cd799439012',
          message: 'Test notification'
        })
        .expect(400);

      expect(response.body.error).toContain('Invalid target type');
    });

    test('PATCH /:id/read should validate ObjectId', async () => {
      const response = await request(app)
        .patch('/invalid-id/read')
        .set('Authorization', 'Bearer fake-token')
        .expect(400);

      expect(response.body.error).toContain('Invalid id');
    });

    test('GET / should validate pagination', async () => {
      const response = await request(app)
        .get('/?page=-1')
        .set('Authorization', 'Bearer fake-token')
        .expect(400);

      expect(response.body.error).toContain('Page must be a positive integer');
    });
  });

  describe('Message Routes', () => {
    test('POST /messages should require authentication', async () => {
      const response = await request(app)
        .post('/messages')
        .send({
          recipientId: '507f1f77bcf86cd799439011',
          content: 'Test message'
        })
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'Access token required',
        service: 'Notification Service'
      });
    });

    test('POST /messages should validate content', async () => {
      const response = await request(app)
        .post('/messages')
        .set('Authorization', 'Bearer fake-token')
        .send({
          recipientId: '507f1f77bcf86cd799439011',
          content: ''
        })
        .expect(400);

      expect(response.body.error).toContain('Content cannot be empty');
    });

    test('GET /messages/conversations should require authentication', async () => {
      const response = await request(app)
        .get('/messages/conversations')
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'Access token required',
        service: 'Notification Service'
      });
    });
  });

  describe('Webhook Routes', () => {
    test('POST /webhook/like should validate required fields', async () => {
      const response = await request(app)
        .post('/webhook/like')
        .send({
          postId: '507f1f77bcf86cd799439011'
          // Missing required fields
        })
        .expect(400);

      expect(response.body.error).toBe('Missing required fields');
    });

    test('POST /webhook/follow should validate required fields', async () => {
      const response = await request(app)
        .post('/webhook/follow')
        .send({
          followedUserId: '507f1f77bcf86cd799439011'
          // Missing required fields
        })
        .expect(400);

      expect(response.body.error).toBe('Missing required fields');
    });
  });
});

describe('Error Handling', () => {
  test('Should handle 404 routes', async () => {
    const response = await request(app)
      .get('/non-existent-route')
      .expect(404);

    expect(response.body).toMatchObject({
      error: 'Route not found',
      service: 'Notification Service'
    });
  });
});

// Integration tests would go here with actual database
// describe('Integration Tests', () => {
//   // These would require a test database
// });
