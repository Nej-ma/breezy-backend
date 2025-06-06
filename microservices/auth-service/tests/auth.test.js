import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import jwt from 'jsonwebtoken';

// Utilisateur de test
const testUser = {
  username: 'testuser',
  displayName: 'Test User',
  email: 'katebishopbreezyusertest@yopmail.com',
  password: 'password123'
};

describe('Tests Auth Service', () => {
  let accessToken;
  let passwordResetToken;
  let testUserId;

  // Configuration avant tous les tests
  beforeAll(async () => {
    // Utiliser une base de test différente
    const testDbUri = process.env.MONGODB_URI?.replace('/breezy_auth', '/breezy_auth_test') || 'mongodb://localhost:27017/breezy_auth_test';
    
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    
    await mongoose.connect(testDbUri);
    
    // Nettoyer avant de commencer
    await User.deleteMany({});
  }, 30000); // 30 secondes timeout

  // Nettoyer après les tests
  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  }, 30000); // 30 secondes timeout

  describe('Auth Routes', () => {
    test('1. Health check', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.service).toBe('Auth Service');
      expect(response.body.status).toBe('healthy');
    });

    test('2. Service info', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body.message).toBe('Breezy Auth Service API');
    });

    test('3. Erreur - Login sans compte existant', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
    });

    test('4. Erreur - Accès sans token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .expect(401);

      expect(response.body.error).toBe('Access token required');
    });

    test('5. Erreur - Token invalide', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });

    test('6. Logout', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .expect(200);

      expect(response.body.message).toBe('Logout successful');
    });
  });

  describe('Tests avec utilisateur créé manuellement', () => {
    beforeAll(async () => {
      // Créer un utilisateur directement dans la base pour tester l'auth
      const user = new User({
        ...testUser,
        isVerified: true
      });
      await user.save();
      testUserId = user._id;
    });

    test('7. Se connecter avec utilisateur existant', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body.message).toBe('Login successful');
      expect(response.body.token).toBeTruthy();
      expect(response.body.user.email).toBe(testUser.email);

      accessToken = response.body.token;
    });

    test('8. Accéder au profil avec token valide', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.username).toBe(testUser.username);
    });

    test('9. Rafraîchir le token', async () => {
      // Se connecter d'abord pour avoir un refresh token
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      const cookies = loginResponse.headers['set-cookie'];
      
      if (cookies && cookies.length > 0) {
        const response = await request(app)
          .post('/auth/refresh')
          .set('Cookie', cookies.join('; '))
          .expect(200);

        expect(response.body.message).toBe('Token refreshed successfully');
        expect(response.body.token).toBeTruthy();
      } else {
        console.log('Pas de refresh token cookie - test skippé');
      }
    });

    test('10. Demander un reset de mot de passe', async () => {
      const response = await request(app)
        .post('/auth/forgot-password')
        .send({
          email: testUser.email
        })
        .expect(200);

      expect(response.body.message).toBe('Password reset email sent successfully');

      // Récupérer le token de reset depuis la base de données
      const user = await User.findOne({ email: testUser.email });
      expect(user.passwordResetToken).toBeTruthy();
      expect(user.passwordResetExpires).toBeTruthy();
      passwordResetToken = user.passwordResetToken;
    });

    test('11. Réinitialiser le mot de passe avec token valide', async () => {
      const newPassword = 'newpassword123';
      
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: passwordResetToken,
          newPassword: newPassword
        })
        .expect(200);

      expect(response.body.message).toBe('Password reset successful');

      // Vérifier que le token a été effacé
      const user = await User.findOne({ email: testUser.email });
      expect(user.passwordResetToken).toBe('');
      expect(user.passwordResetExpires).toBeNull();

      // Tester la connexion avec le nouveau mot de passe
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: newPassword
        })
        .expect(200);

      expect(loginResponse.body.message).toBe('Login successful');
    });
  });

  describe('Tests d\'erreur', () => {
    test('12. Erreur - Mauvais mot de passe', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
    });

    test('13. Erreur - Forgot password avec email inexistant', async () => {
      const response = await request(app)
        .post('/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com'
        })
        .expect(404);

      expect(response.body.error).toBe('User not found');
    });

    test('14. Erreur - Reset password sans token', async () => {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          newPassword: 'newpassword123'
        })
        .expect(400);

      expect(response.body.error).toBe('Token and new password are required');
    });

    test('15. Erreur - Reset password avec token invalide', async () => {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'newpassword123'
        })
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });
  });

  describe('Routes non existantes', () => {
    test('16. Route non trouvée', async () => {
      const response = await request(app)
        .get('/nonexistent')
        .expect(404);

      expect(response.body.error).toBe('Route not found');
      expect(response.body.service).toBe('Auth Service');
    });
  });
});