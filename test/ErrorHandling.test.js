/**
 * Tests for Error Handling
 */

const { AppError, ConfigurationError, AuthenticationError, ApiError, ValidationError, NetworkError } = require('../src/errors/AppError');
const ErrorHandler = require('../src/errors/ErrorHandler');
const ConsoleLogger = require('../src/logging/ConsoleLogger');

describe('Error Handling', () => {
    test('AppError - should create error with correct properties', () => {
        const error = new AppError('Test error', 'TEST_ERROR', 400, true);
        
        expect(error.message).toBe('Test error');
        expect(error.code).toBe('TEST_ERROR');
        expect(error.statusCode).toBe(400);
        expect(error.isOperational).toBe(true);
        expect(error.timestamp).toBeDefined();
    });

    test('AppError - should convert to JSON', () => {
        const error = new AppError('Test error', 'TEST_ERROR', 400);
        const json = error.toJSON();
        
        expect(json.message).toBe('Test error');
        expect(json.code).toBe('TEST_ERROR');
        expect(json.statusCode).toBe(400);
        expect(json.timestamp).toBeDefined();
        expect(json.stack).toBeDefined();
    });

    test('ConfigurationError - should extend AppError', () => {
        const error = new ConfigurationError('Config missing');
        
        expect(error instanceof AppError).toBe(true);
        expect(error.code).toBe('CONFIGURATION_ERROR');
        expect(error.statusCode).toBe(500);
    });

    test('AuthenticationError - should extend AppError', () => {
        const error = new AuthenticationError('Auth failed');
        
        expect(error instanceof AppError).toBe(true);
        expect(error.code).toBe('AUTHENTICATION_ERROR');
        expect(error.statusCode).toBe(401);
    });

    test('ValidationError - should include field information', () => {
        const error = new ValidationError('Invalid field', 'email');
        const json = error.toJSON();
        
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.field).toBe('email');
        expect(json.field).toBe('email');
    });

    test('ErrorHandler - should handle operational errors', () => {
        const logger = new ConsoleLogger('error'); // Only log errors to reduce test output
        const handler = new ErrorHandler(logger);
        
        const operationalError = new AppError('Operational error', 'OP_ERROR', 400, true);
        const response = handler.handleError(operationalError);
        
        expect(response.success).toBe(false);
        expect(response.error.message).toBe('Operational error');
        expect(response.error.code).toBe('OP_ERROR');
    });

    test('ErrorHandler - should handle programming errors', () => {
        const logger = new ConsoleLogger('error');
        const handler = new ErrorHandler(logger);
        
        const programmingError = new Error('Unexpected error');
        const response = handler.handleError(programmingError);
        
        expect(response.success).toBe(false);
        expect(response.error.message).toBe('An unexpected error occurred');
        expect(response.error.code).toBe('INTERNAL_ERROR');
    });

    test('ErrorHandler - should identify operational errors', () => {
        const logger = new ConsoleLogger('error');
        const handler = new ErrorHandler(logger);
        
        const networkError = new Error('ENOTFOUND example.com');
        expect(handler.isOperationalError(networkError)).toBe(true);
        
        const appError = new AppError('Test', 'TEST', 400, true);
        expect(handler.isOperationalError(appError)).toBe(true);
        
        const programmingError = new Error('Unexpected programming error');
        expect(handler.isOperationalError(programmingError)).toBe(false);
    });

    test('ConsoleLogger - should log at correct levels', () => {
        const logger = new ConsoleLogger('warn');
        
        // These won't actually output during tests due to log level
        logger.debug('Debug message'); // Should not log
        logger.info('Info message');   // Should not log
        logger.warn('Warn message');   // Should log
        logger.error('Error message'); // Should log
        
        expect(logger.getLogLevel()).toBe('warn');
    });

    test('ConsoleLogger - should set log level', () => {
        const logger = new ConsoleLogger('info');
        
        logger.setLogLevel('debug');
        expect(logger.getLogLevel()).toBe('debug');
        
        expect(() => {
            logger.setLogLevel('invalid');
        }).toThrow();
    });
});
