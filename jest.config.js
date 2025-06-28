/**
 * Jest configuration for Spotify podcast CLI application
 */

module.exports = {
  // The test environment for Node.js
  testEnvironment: 'node',
  
  // The root directory where Jest should scan for tests
  roots: ['<rootDir>/test'],
  
  // File patterns for test files
  testMatch: ['**/*.test.js'],
  
  // Transform files for the test runner
  transform: {},
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/app.js', // Entry point that bootstraps the app
  ],
  
  // Indicates whether each individual test should be reported during the run
  verbose: true,
  
  // Set timeout to accommodate for potentially slower API tests
  testTimeout: 10000,
  
  // Setup files that should be processed before all tests
  setupFilesAfterEnv: ['<rootDir>/test/jest.setup.js'],
};
