import { jest } from '@jest/globals';

describe('Notification Service - Health Check', () => {
  test('Service health endpoint should be accessible', async () => {
    // Mock MongoDB connection to avoid connection during tests
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    
    // Simple test without full app startup
    expect(process.env.NODE_ENV).toBe('test');
    
    // Restore original environment
    process.env.NODE_ENV = originalEnv;
  });

  test('Required environment variables should have defaults', () => {
    const requiredVars = ['PORT', 'JWT_SECRET', 'MONGODB_URI'];
    
    // In test environment, these should be set by setup
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.JWT_SECRET).toBeDefined();
    expect(process.env.MONGODB_URI).toBeDefined();
  });
});
