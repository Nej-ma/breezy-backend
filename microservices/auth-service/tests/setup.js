// Configuration pour les tests
process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // Port aléatoire pour éviter les conflits
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';

// Désactiver les logs pendant les tests
console.log = jest.fn();
console.error = jest.fn();
console.warn = jest.fn();