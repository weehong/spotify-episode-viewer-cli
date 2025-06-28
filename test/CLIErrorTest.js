/**
 * Tests for CLI Error classes
 */

const {
    CLIError,
    CLIValidationError,
    CLINavigationError,
    CLIServiceError,
    CLIConfigurationError,
    CLINetworkError,
    CLIUserCancellation
} = require('../src/errors/CLIError');

const CLIErrorHandler = require('../src/errors/CLIErrorHandler');

class MockLogger {
    info(message) {}
    error(message) {}
    debug(message) {}
    warn(message) {}
}

module.exports = function(runner) {
    runner.test('CLIError - should create basic CLI error', () => {
        const error = new CLIError('Test CLI error');
        
        runner.assert(error instanceof Error, 'Should be instance of Error');
        runner.assertEqual(error.message, 'Test CLI error');
        runner.assertEqual(error.code, 'CLI_ERROR');
        runner.assertEqual(error.statusCode, 400);
        runner.assert(error.userFriendly, 'Should be user friendly');
        runner.assertEqual(error.getUserMessage(), 'Test CLI error');
    });

    runner.test('CLIValidationError - should create validation error', () => {
        const error = new CLIValidationError('Invalid input', 'showId');
        
        runner.assert(error instanceof CLIError, 'Should be instance of CLIError');
        runner.assertEqual(error.code, 'CLI_VALIDATION_ERROR');
        runner.assertEqual(error.field, 'showId');
        runner.assertEqual(error.getUserMessage(), 'Invalid input: Invalid input');
    });

    runner.test('CLINavigationError - should create navigation error', () => {
        const error = new CLINavigationError('Navigation failed');
        
        runner.assertEqual(error.code, 'CLI_NAVIGATION_ERROR');
        runner.assertEqual(error.getUserMessage(), 'Navigation error: Navigation failed');
    });

    runner.test('CLIServiceError - should create service error', () => {
        const originalError = new Error('Original error');
        const error = new CLIServiceError('Service failed', originalError);
        
        runner.assertEqual(error.code, 'CLI_SERVICE_ERROR');
        runner.assertEqual(error.statusCode, 500);
        runner.assertEqual(error.originalError, originalError);
        runner.assert(error.getUserMessage().includes('Service error'), 'Should include service error text');
    });

    runner.test('CLIConfigurationError - should create configuration error', () => {
        const error = new CLIConfigurationError('Config missing');
        
        runner.assertEqual(error.code, 'CLI_CONFIGURATION_ERROR');
        runner.assert(error.getUserMessage().includes('Configuration error'), 'Should include configuration error text');
    });

    runner.test('CLINetworkError - should create network error', () => {
        const error = new CLINetworkError('Network failed');
        
        runner.assertEqual(error.code, 'CLI_NETWORK_ERROR');
        runner.assertEqual(error.statusCode, 503);
        runner.assert(error.getUserMessage().includes('Network error'), 'Should include network error text');
    });

    runner.test('CLIUserCancellation - should create user cancellation', () => {
        const error = new CLIUserCancellation();
        
        runner.assertEqual(error.code, 'CLI_USER_CANCELLED');
        runner.assertEqual(error.statusCode, 200);
        runner.assertEqual(error.getUserMessage(), 'Operation cancelled.');
    });

    runner.test('CLIErrorHandler - should handle CLI errors', () => {
        const logger = new MockLogger();
        const handler = new CLIErrorHandler(logger);
        
        const cliError = new CLIValidationError('Invalid show ID');
        const response = handler.handleCLIError(cliError);
        
        runner.assert(!response.success, 'Should return failure');
        runner.assertEqual(response.userMessage, 'Invalid input: Invalid show ID');
        runner.assertEqual(response.error.code, 'CLI_VALIDATION_ERROR');
        runner.assert(response.helpText, 'Should have help text');
    });

    runner.test('CLIErrorHandler - should handle operational errors', () => {
        const logger = new MockLogger();
        const handler = new CLIErrorHandler(logger);
        
        const networkError = new Error('ENOTFOUND api.spotify.com');
        const response = handler.handleCLIError(networkError);
        
        runner.assert(!response.success, 'Should return failure');
        runner.assert(response.userMessage.includes('connect to Spotify API'), 'Should have network-specific message');
        runner.assert(response.helpText.includes('internet connection'), 'Should have network-specific help');
    });

    runner.test('CLIErrorHandler - should handle authentication errors', () => {
        const logger = new MockLogger();
        const handler = new CLIErrorHandler(logger);
        
        const authError = new Error('HTTP 401: Authentication failed');
        const response = handler.handleCLIError(authError);
        
        runner.assert(!response.success, 'Should return failure');
        runner.assert(response.userMessage.includes('Authentication failed'), 'Should have auth-specific message');
        runner.assert(response.helpText.includes('CLIENT_ID'), 'Should mention credentials');
    });

    runner.test('CLIErrorHandler - should handle 404 errors', () => {
        const logger = new MockLogger();
        const handler = new CLIErrorHandler(logger);
        
        const notFoundError = new Error('HTTP 404: Not Found');
        const response = handler.handleCLIError(notFoundError);
        
        runner.assert(!response.success, 'Should return failure');
        runner.assert(response.userMessage.includes('not found'), 'Should have 404-specific message');
        runner.assert(response.helpText.includes('Show ID'), 'Should mention Show ID');
    });

    runner.test('CLIErrorHandler - should handle rate limit errors', () => {
        const logger = new MockLogger();
        const handler = new CLIErrorHandler(logger);
        
        const rateLimitError = new Error('HTTP 429: Too Many Requests');
        const response = handler.handleCLIError(rateLimitError);
        
        runner.assert(!response.success, 'Should return failure');
        runner.assert(response.userMessage.includes('Rate limit'), 'Should have rate limit message');
        runner.assert(response.helpText.includes('wait'), 'Should suggest waiting');
    });

    runner.test('CLIErrorHandler - should handle server errors', () => {
        const logger = new MockLogger();
        const handler = new CLIErrorHandler(logger);
        
        const serverError = new Error('HTTP 500: Internal Server Error');
        const response = handler.handleCLIError(serverError);
        
        runner.assert(!response.success, 'Should return failure');
        runner.assert(response.userMessage.includes('temporarily unavailable'), 'Should have server error message');
        runner.assert(response.helpText.includes('try again later'), 'Should suggest trying later');
    });

    runner.test('CLIErrorHandler - should handle unexpected errors', () => {
        const logger = new MockLogger();
        const handler = new CLIErrorHandler(logger);
        
        const unexpectedError = new Error('Something completely unexpected');
        const response = handler.handleCLIError(unexpectedError);
        
        runner.assert(!response.success, 'Should return failure');
        runner.assertEqual(response.userMessage, 'An unexpected error occurred. Please try again.');
        runner.assertEqual(response.error.code, 'INTERNAL_ERROR');
        runner.assert(response.helpText.includes('contact support'), 'Should suggest contacting support');
    });

    runner.test('CLIErrorHandler - should provide help text for CLI errors', () => {
        const logger = new MockLogger();
        const handler = new CLIErrorHandler(logger);
        
        const validationError = new CLIValidationError('Invalid input');
        const response = handler.handleCLIError(validationError);
        
        runner.assert(response.helpText.includes('check your input'), 'Should have validation help text');
        
        const configError = new CLIConfigurationError('Config missing');
        const configResponse = handler.handleCLIError(configError);
        
        runner.assert(configResponse.helpText.includes('.env file'), 'Should have config help text');
    });
};
