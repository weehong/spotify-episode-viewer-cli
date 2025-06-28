/**
 * Jest setup file for the Spotify podcast CLI application
 * This file runs before each test file
 */

// Import custom matchers
const { customMatchers } = require('./jest/testUtils');

// Set timeout for all tests to 10 seconds
jest.setTimeout(10000);

// Add custom matchers
expect.extend(customMatchers);

// Global test utilities or mocks can be defined here
global.createMockLogger = () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
});

// Mock modules that might be problematic in tests
jest.mock('ora', () => {
  return jest.fn().mockImplementation(() => {
    return {
      start: jest.fn().mockReturnThis(),
      stop: jest.fn().mockReturnThis(),
      succeed: jest.fn().mockReturnThis(),
      fail: jest.fn().mockReturnThis(),
      info: jest.fn().mockReturnThis(),
      text: 'mock-spinner'
    };
  });
});
