import { jest } from '@jest/globals';

describe('Notification Service Setup', () => {
  test('Jest should be working', () => {
    expect(true).toBe(true);
  });

  test('Environment variables should be set', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.JWT_SECRET).toBe('test-jwt-secret');
  });
});
