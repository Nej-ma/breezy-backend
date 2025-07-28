/**
 * Test file for role-based functionality
 * This demonstrates how to test the role system
 */

import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.js';
import { ROLES } from '../src/utils/roles.js';

describe('Role-based Access Control', () => {
  let adminToken, moderatorToken, userToken;
  let adminUser, moderatorUser, regularUser;

  beforeAll(async () => {
    // Create test users with different roles
    adminUser = await User.create({
      username: 'admin_test',
      email: 'admin@test.com',
      password: 'password123',
      displayName: 'Admin User',
      role: ROLES.ADMIN,
      isVerified: true
    });

    moderatorUser = await User.create({
      username: 'moderator_test',
      email: 'moderator@test.com',
      password: 'password123',
      displayName: 'Moderator User',
      role: ROLES.MODERATOR,
      isVerified: true
    });

    regularUser = await User.create({
      username: 'user_test',
      email: 'user@test.com',
      password: 'password123',
      displayName: 'Regular User',
      role: ROLES.USER,
      isVerified: true
    });

    // Get authentication tokens
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'password123' });
    adminToken = adminLogin.body.token;

    const moderatorLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'moderator@test.com', password: 'password123' });
    moderatorToken = moderatorLogin.body.token;

    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.com', password: 'password123' });
    userToken = userLogin.body.token;
  });

  afterAll(async () => {
    // Clean up test users
    await User.deleteMany({
      email: { $in: ['admin@test.com', 'moderator@test.com', 'user@test.com'] }
    });
  });

  describe('Admin Role Tests', () => {
    test('Admin should be able to get all users', async () => {
      const response = await request(app)
        .get('/api/auth/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.users).toBeDefined();
    });

    test('Admin should be able to update user roles', async () => {
      const response = await request(app)
        .put(`/api/auth/admin/users/${regularUser._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: ROLES.MODERATOR });

      expect(response.status).toBe(200);
      expect(response.body.user.role).toBe(ROLES.MODERATOR);
    });

    test('Admin should be able to suspend users', async () => {
      const response = await request(app)
        .post(`/api/auth/admin/users/${regularUser._id}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ 
          duration: 24, 
          reason: 'Test suspension' 
        });

      expect(response.status).toBe(200);
      expect(response.body.user.isSuspended).toBe(true);
    });

    test('Admin should not be able to demote themselves', async () => {
      const response = await request(app)
        .put(`/api/auth/admin/users/${adminUser._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: ROLES.USER });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Cannot demote yourself');
    });
  });

  describe('Moderator Role Tests', () => {
    test('Moderator should be able to get all users', async () => {
      const response = await request(app)
        .get('/api/auth/admin/users')
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.users).toBeDefined();
    });

    test('Moderator should NOT be able to update user roles', async () => {
      const response = await request(app)
        .put(`/api/auth/admin/users/${regularUser._id}/role`)
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({ role: ROLES.USER });

      expect(response.status).toBe(403);
    });

    test('Moderator should be able to suspend users', async () => {
      const response = await request(app)
        .post(`/api/auth/admin/users/${regularUser._id}/suspend`)
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({ 
          duration: 12, 
          reason: 'Moderator test suspension' 
        });

      expect(response.status).toBe(200);
    });
  });

  describe('Regular User Role Tests', () => {
    test('Regular user should NOT be able to access admin routes', async () => {
      const response = await request(app)
        .get('/api/auth/admin/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });

    test('Regular user should NOT be able to update roles', async () => {
      const response = await request(app)
        .put(`/api/auth/admin/users/${adminUser._id}/role`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ role: ROLES.ADMIN });

      expect(response.status).toBe(403);
    });

    test('Regular user should be able to access their own profile', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user.role).toBe(ROLES.USER);
    });
  });

  describe('Permission Edge Cases', () => {
    test('Invalid role should be rejected', async () => {
      const response = await request(app)
        .put(`/api/auth/admin/users/${regularUser._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'invalid_role' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid role');
    });

    test('Missing token should be rejected', async () => {
      const response = await request(app)
        .get('/api/auth/admin/users');

      expect(response.status).toBe(401);
    });

    test('Invalid token should be rejected', async () => {
      const response = await request(app)
        .get('/api/auth/admin/users')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
    });
  });
});
