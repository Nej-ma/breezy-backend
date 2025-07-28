import { jest } from '@jest/globals';

describe('Notification Service - Unit Tests', () => {
  describe('Validation Middleware', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
      mockReq = {
        body: {},
        params: {},
        query: {},
        user: { id: 'test-user-id' }
      };
      mockRes = {
        status: jest.fn(() => mockRes),
        json: jest.fn(() => mockRes)
      };
      mockNext = jest.fn();
    });

    test('validateNotificationType should accept valid types', async () => {
      const { validateNotificationType } = await import('../src/middleware/validation.middleware.js');
      
      mockReq.body.type = 'like';
      validateNotificationType(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('validateNotificationType should reject invalid types', async () => {
      const { validateNotificationType } = await import('../src/middleware/validation.middleware.js');
      
      mockReq.body.type = 'invalid-type';
      validateNotificationType(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid notification type. Must be one of: like, comment, follow, mention, message'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('validateTargetType should accept valid types', async () => {
      const { validateTargetType } = await import('../src/middleware/validation.middleware.js');
      
      mockReq.body.targetType = 'Post';
      validateTargetType(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('validateTargetType should reject invalid types', async () => {
      const { validateTargetType } = await import('../src/middleware/validation.middleware.js');
      
      mockReq.body.targetType = 'InvalidType';
      validateTargetType(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid target type. Must be one of: Post, Comment, User, PrivateMessage'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('validatePagination should accept valid pagination params', async () => {
      const { validatePagination } = await import('../src/middleware/validation.middleware.js');
      
      mockReq.query = { page: '1', limit: '20' };
      validatePagination(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('validatePagination should reject invalid page', async () => {
      const { validatePagination } = await import('../src/middleware/validation.middleware.js');
      
      mockReq.query = { page: '-1', limit: '20' };
      validatePagination(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Page must be a positive integer'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('validateMessageContent should accept valid content', async () => {
      const { validateMessageContent } = await import('../src/middleware/validation.middleware.js');
      
      mockReq.body.content = 'This is a valid message';
      validateMessageContent(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });    test('validateMessageContent should reject empty content', async () => {
      const { validateMessageContent } = await import('../src/middleware/validation.middleware.js');
      
      mockReq.body.content = '';
      validateMessageContent(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Content is required and must be a string'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('sanitizeInput should clean XSS attempts', async () => {
      const { sanitizeInput } = await import('../src/middleware/validation.middleware.js');
      
      mockReq.body = {
        message: '<script>alert("xss")</script>Hello world',
        data: {
          description: '<iframe src="malicious.com"></iframe>Safe content'
        }
      };
      
      sanitizeInput(mockReq, mockRes, mockNext);
      
      expect(mockReq.body.message).toBe('Hello world');
      expect(mockReq.body.data.description).toBe('Safe content');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Models', () => {
    test('Notification model should be importable', async () => {
      const Notification = await import('../src/models/Notification.js');
      expect(Notification.default).toBeDefined();
    });

    test('PrivateMessage model should be importable', async () => {
      const PrivateMessage = await import('../src/models/PrivateMessage.js');
      expect(PrivateMessage.default).toBeDefined();
    });
  });

  describe('Services', () => {
    test('Notification service should be importable', async () => {
      const service = await import('../src/services/notification.service.js');
      expect(service.cleanupOldNotifications).toBeDefined();
      expect(service.cleanupOldMessages).toBeDefined();
      expect(service.getNotificationSummary).toBeDefined();
    });
  });
});
