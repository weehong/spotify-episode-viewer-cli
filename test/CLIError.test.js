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

describe('CLI Error Classes', () => {
    test('CLIError - should create basic CLI error', () => {
        const error = new CLIError('Test CLI error');
        
        expect(error instanceof Error).toBe(true);
        expect(error.message).toBe('Test CLI error');
        expect(error.code).toBe('CLI_ERROR');
        expect(error.statusCode).toBe(400);
        expect(error.userFriendly).toBe(true);
        expect(error.getUserMessage()).toBe('Test CLI error');
    });

    test('CLIValidationError - should create validation error', () => {
        const error = new CLIValidationError('Invalid input', 'showId');
        
        expect(error instanceof CLIError).toBe(true);
        expect(error.code).toBe('CLI_VALIDATION_ERROR');
        expect(error.field).toBe('showId');
        expect(error.getUserMessage()).toBe('Invalid input: Invalid input');
    });

    test('CLINavigationError - should create navigation error', () => {
        const error = new CLINavigationError('Navigation failed');
        
        expect(error.code).toBe('CLI_NAVIGATION_ERROR');
        expect(error.getUserMessage()).toBe('Navigation error: Navigation failed');
    });

    test('CLIServiceError - should create service error', () => {
        const originalError = new Error('Original error');
        const error = new CLIServiceError('Service failed', originalError);
        
        expect(error.code).toBe('CLI_SERVICE_ERROR');
        expect(error.statusCode).toBe(500);
        expect(error.originalError).toBe(originalError);
        expect(error.getUserMessage()).toContain('Service error');
    });

    test('CLIConfigurationError - should create configuration error', () => {
        const error = new CLIConfigurationError('Config missing');
        
        expect(error.code).toBe('CLI_CONFIGURATION_ERROR');
        expect(error.getUserMessage()).toContain('Configuration error');
    });

    test('CLINetworkError - should create network error', () => {
        const error = new CLINetworkError('Network failed');
        
        expect(error.code).toBe('CLI_NETWORK_ERROR');
        expect(error.statusCode).toBe(503);
        expect(error.getUserMessage()).toContain('Network error');
    });

    test('CLIUserCancellation - should create user cancellation', () => {
        const error = new CLIUserCancellation();
        
        expect(error.code).toBe('CLI_USER_CANCELLED');
        expect(error.statusCode).toBe(200);
        expect(error.getUserMessage()).toBe('Operation cancelled.');
    });
});

describe('CLI Error Handler', () => {
    test('should handle CLI errors', () => {
        const logger = new MockLogger();
        const handler = new CLIErrorHandler(logger);
        
        const cliError = new CLIValidationError('Invalid show ID');
        const response = handler.handleCLIError(cliError);
        
        expect(response.success).toBe(false);
        expect(response.userMessage).toBe('Invalid input: Invalid show ID');
        expect(response.error.code).toBe('CLI_VALIDATION_ERROR');
        expect(response.helpText).toBeTruthy();
    });

    test('should handle operational errors', () => {
        const logger = new MockLogger();
        const handler = new CLIErrorHandler(logger);
        
        const networkError = new Error('ENOTFOUND api.spotify.com');
        const response = handler.handleCLIError(networkError);
        
        expect(response.success).toBe(false);
        expect(response.userMessage).toContain('connect to Spotify API');
        expect(response.helpText).toContain('internet connection');
    });

    test('should handle authentication errors', () => {
        const logger = new MockLogger();
        const handler = new CLIErrorHandler(logger);
        
        const authError = new Error('HTTP 401: Authentication failed');
        const response = handler.handleCLIError(authError);
        
        expect(response.success).toBe(false);
        expect(response.userMessage).toContain('Authentication failed');
        expect(response.helpText).toContain('CLIENT_ID');
    });

    test('should handle 404 errors', () => {
        const logger = new MockLogger();
        const handler = new CLIErrorHandler(logger);
        
        const notFoundError = new Error('HTTP 404: Not Found');
        const response = handler.handleCLIError(notFoundError);
        
        expect(response.success).toBe(false);
        expect(response.userMessage).toContain('not found');
        expect(response.helpText).toContain('Show ID');
    });

    test('should handle rate limit errors', () => {
        const logger = new MockLogger();
        const handler = new CLIErrorHandler(logger);
        
        const rateLimitError = new Error('HTTP 429: Too Many Requests');
        const response = handler.handleCLIError(rateLimitError);
        
        expect(response.success).toBe(false);
        expect(response.userMessage).toContain('Rate limit');
        expect(response.helpText).toContain('wait');
    });

    test('should handle server errors', () => {
        const logger = new MockLogger();
        const handler = new CLIErrorHandler(logger);
        
        const serverError = new Error('HTTP 500: Internal Server Error');
        const response = handler.handleCLIError(serverError);
        
        expect(response.success).toBe(false);
        expect(response.userMessage).toContain('temporarily unavailable');
        expect(response.helpText).toContain('try again later');
    });

    test('should handle unexpected errors', () => {
        const logger = new MockLogger();
        const handler = new CLIErrorHandler(logger);
        
        const unexpectedError = new Error('Something completely unexpected');
        const response = handler.handleCLIError(unexpectedError);
        
        expect(response.success).toBe(false);
        expect(response.userMessage).toBe('An unexpected error occurred. Please try again.');
        expect(response.error.code).toBe('INTERNAL_ERROR');
        expect(response.helpText).toContain('contact support');
    });

    test('should provide help text for CLI errors', () => {
        const logger = new MockLogger();
        const handler = new CLIErrorHandler(logger);
        
        const validationError = new CLIValidationError('Invalid input');
        const response = handler.handleCLIError(validationError);
        
        expect(response.helpText).toContain('check your input');
        
        const configError = new CLIConfigurationError('Config missing');
        const configResponse = handler.handleCLIError(configError);
        
        expect(configResponse.helpText).toContain('.env file');
    });
});
