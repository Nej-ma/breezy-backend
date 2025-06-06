export default {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.js'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  transform: {},
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  testTimeout: 30000, // 30 secondes par test
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/app.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  // Éviter les problèmes de handles ouverts
  forceExit: true,
  detectOpenHandles: true
};