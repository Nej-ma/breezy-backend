import { jest } from '@jest/globals';

// Configure global test environment
global.jest = jest;

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/breezy_notifications_test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.PORT = '3005';

// Mock console methods to reduce noise during testing
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Setup timeout for async operations
jest.setTimeout(10000);
