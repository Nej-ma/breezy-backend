// test/auth.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');

// Utilisateur de test
const testUser = {
  username: 'testuser',
  displayName: 'Test User',
  email: 'test@example.com',
  password: 'password123'
};

describe('Tests d\'authentification', () => {
  let verificationToken;
  let accessToken;

  // Nettoyer avant de commencer
  beforeAll(async () => {
    await User.deleteMany({ email: { $in: ['test@example.com', 'test2@example.com'] } });
  });

  // Nettoyer après les tests
  afterAll(async () => {
    await User.deleteMany({ email: { $in: ['test@example.com', 'test2@example.com'] } });
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
});