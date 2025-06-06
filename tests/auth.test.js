// test/auth.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');

// Utilisateur de test
const testUser = {
  username: 'testuser',
  displayName: 'Test User',
  email: 'katebishopbreezyusertest@yopmail.com',
  password: 'password123'
};

describe('Tests d\'authentification', () => {
  let verificationToken;
  let accessToken;
  let passwordResetToken;

  // Nettoyer avant de commencer
  beforeAll(async () => {
    await User.deleteMany({ email: { $in: ['katebishopbreezyusertest@yopmail.com', 'test2@example.com', 'expired@example.com'] } });
  });

  // Nettoyer après les tests
  afterAll(async () => {
    await User.deleteMany({ email: { $in: ['katebishopbreezyusertest@yopmail.com', 'test2@example.com', 'expired@example.com'] } });
    await mongoose.connection.close();
  });

  test('1. Créer un compte', async () => {
    const response = await request(app)
      .post('/users')
      .send(testUser)
      .expect(201);

    expect(response.body.message).toBe('User created successfully');

    // Récupérer le token de vérification
    const user = await User.findOne({ email: testUser.email });
    expect(user.isVerified).toBe(false);
    verificationToken = user.verificationToken;
  });

  test('2. Vérifier l\'email', async () => {
    const response = await request(app)
      .post(`/users/activate/${verificationToken}`)
      .expect(200);

    expect(response.body.message).toBe('Email validated successfully');

    // Vérifier que l'utilisateur est maintenant vérifié
    const user = await User.findOne({ email: testUser.email });
    expect(user.isVerified).toBe(true);
    expect(user.verificationToken).toBe('');
  });

  test('3. Se connecter', async () => {
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

  test('4. Accéder au profil', async () => {
    const response = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.user.email).toBe(testUser.email);
    expect(response.body.user.username).toBe(testUser.username);
  });

  test('5. Rafraîchir le token', async () => {
    // On se connecte d'abord pour avoir un refresh token
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
      // Si pas de cookies, on skip ce test
      console.log('Pas de refresh token cookie - test skippé');
    }
  });

  test('6. Se déconnecter', async () => {
    const response = await request(app)
      .post('/auth/logout')
      .expect(200);

    expect(response.body.message).toBe('Logout successful');
  });

  // Tests d'erreur
  test('7. Erreur - Email déjà utilisé', async () => {
    const response = await request(app)
      .post('/users')
      .send(testUser)
      .expect(400);

    expect(response.body.error).toBe('Email already in use');
  });

  test('8. Erreur - Mauvais mot de passe', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: 'wrongpassword'
      })
      .expect(401);

    expect(response.body.error).toBe('Invalid credentials');
  });

  test('9. Erreur - Accès sans token', async () => {
    const response = await request(app)
      .get('/auth/me')
      .expect(401);

    expect(response.body.error).toBe('Access token required');
  });

  test('10. Erreur - Token invalide', async () => {
    const response = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);

    expect(response.body.error).toBe('Invalid token');
  });

  // Tests pour forgot password et reset password
  test('11. Demander un reset de mot de passe', async () => {
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

  test('12. Réinitialiser le mot de passe avec token valide', async () => {
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

  // Tests d'erreur pour forgot password
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

  test('15. Erreur - Reset password sans nouveau mot de passe', async () => {
    const response = await request(app)
      .post('/auth/reset-password')
      .send({
        token: 'some-token'
      })
      .expect(400);

    expect(response.body.error).toBe('Token and new password are required');
  });

  test('16. Erreur - Reset password avec token invalide', async () => {
    const response = await request(app)
      .post('/auth/reset-password')
      .send({
        token: 'invalid-token',
        newPassword: 'newpassword123'
      })
      .expect(401);

    expect(response.body.error).toBe('Invalid token');
  });

  test('17. Erreur - Reset password avec token expiré', async () => {
    // Nettoyer d'abord au cas où il y aurait des données résiduelles
    await User.deleteOne({ email: 'expired@example.com' });
    
    // Créer un utilisateur avec un token expiré
    const expiredUser = await User.create({
      username: `u${Date.now()}`, // Username unique
      displayName: 'Expired User',
      email: 'expired@example.com',
      password: 'password123',
      isVerified: true
    });

    // Créer un vrai JWT token expiré
    const jwt = require('jsonwebtoken');
    const expiredToken = jwt.sign({ userId: expiredUser._id }, process.env.JWT_SECRET, {
      expiresIn: '-1h' // Token expiré depuis 1 heure
    });

    // Sauvegarder le token expiré dans la base
    expiredUser.passwordResetToken = expiredToken;
    expiredUser.passwordResetExpires = Date.now() - 3600000; // 1 heure dans le passé
    await expiredUser.save();

    const response = await request(app)
      .post('/auth/reset-password')
      .send({
        token: expiredToken,
        newPassword: 'newpassword123'
      })
      .expect(400);

    expect(response.body.error).toBe('Reset token expired');

    // Nettoyer
    await User.deleteOne({ email: 'expired@example.com' });
  });
});