/**
 * Tests for Error Handling
 */

const { AppError, ConfigurationError, AuthenticationError, ApiError, ValidationError, NetworkError } = require('../src/errors/AppError');
const ErrorHandler = require('../src/errors/ErrorHandler');
const ConsoleLogger = require('../src/logging/ConsoleLogger');

module.exports = function(runner) {
    runner.test('AppError - should create error with correct properties', () => {
        const error = new AppError('Test error', 'TEST_ERROR', 400, true);
        
        runner.assertEqual(error.message, 'Test error');
        runner.assertEqual(error.code, 'TEST_ERROR');
        runner.assertEqual(error.statusCode, 400);
        runner.assertEqual(error.isOperational, true);
        runner.assert(error.timestamp, 'Should have timestamp');
    });

    runner.test('AppError - should convert to JSON', () => {
        const error = new AppError('Test error', 'TEST_ERROR', 400);
        const json = error.toJSON();
        
        runner.assertEqual(json.message, 'Test error');
        runner.assertEqual(json.code, 'TEST_ERROR');
        runner.assertEqual(json.statusCode, 400);
        runner.assert(json.timestamp, 'Should have timestamp in JSON');
        runner.assert(json.stack, 'Should have stack trace in JSON');
    });

    runner.test('ConfigurationError - should extend AppError', () => {
        const error = new ConfigurationError('Config missing');
        
        runner.assert(error instanceof AppError, 'Should be instance of AppError');
        runner.assertEqual(error.code, 'CONFIGURATION_ERROR');
        runner.assertEqual(error.statusCode, 500);
    });

    runner.test('AuthenticationError - should extend AppError', () => {
        const error = new AuthenticationError('Auth failed');
        
        runner.assert(error instanceof AppError, 'Should be instance of AppError');
        runner.assertEqual(error.code, 'AUTHENTICATION_ERROR');
        runner.assertEqual(error.statusCode, 401);
    });

    runner.test('ValidationError - should include field information', () => {
        const error = new ValidationError('Invalid field', 'email');
        const json = error.toJSON();
        
        runner.assertEqual(error.code, 'VALIDATION_ERROR');
        runner.assertEqual(error.field, 'email');
        runner.assertEqual(json.field, 'email');
    });

    runner.test('ErrorHandler - should handle operational errors', () => {
        const logger = new ConsoleLogger('error'); // Only log errors to reduce test output
        const handler = new ErrorHandler(logger);
        
        const operationalError = new AppError('Operational error', 'OP_ERROR', 400, true);
        const response = handler.handleError(operationalError);
        
        runner.assertEqual(response.success, false);
        runner.assertEqual(response.error.message, 'Operational error');
        runner.assertEqual(response.error.code, 'OP_ERROR');
    });

    runner.test('ErrorHandler - should handle programming errors', () => {
        const logger = new ConsoleLogger('error');
        const handler = new ErrorHandler(logger);
        
        const programmingError = new Error('Unexpected error');
        const response = handler.handleError(programmingError);
        
        runner.assertEqual(response.success, false);
        runner.assertEqual(response.error.message, 'An unexpected error occurred');
        runner.assertEqual(response.error.code, 'INTERNAL_ERROR');
    });

    runner.test('ErrorHandler - should identify operational errors', () => {
        const logger = new ConsoleLogger('error');
        const handler = new ErrorHandler(logger);
        
        const networkError = new Error('ENOTFOUND example.com');
        runner.assert(handler.isOperationalError(networkError), 'Should identify network error as operational');
        
        const appError = new AppError('Test', 'TEST', 400, true);
        runner.assert(handler.isOperationalError(appError), 'Should identify AppError as operational');
        
        const programmingError = new Error('Unexpected programming error');
        runner.assert(!handler.isOperationalError(programmingError), 'Should not identify programming error as operational');
    });

    runner.test('ConsoleLogger - should log at correct levels', () => {
        const logger = new ConsoleLogger('warn');
        
        // These won't actually output during tests due to log level
        logger.debug('Debug message'); // Should not log
        logger.info('Info message');   // Should not log
        logger.warn('Warn message');   // Should log
        logger.error('Error message'); // Should log
        
        runner.assertEqual(logger.getLogLevel(), 'warn');
    });

    runner.test('ConsoleLogger - should set log level', () => {
        const logger = new ConsoleLogger('info');
        
        logger.setLogLevel('debug');
        runner.assertEqual(logger.getLogLevel(), 'debug');
        
        runner.assertThrows(() => {
            logger.setLogLevel('invalid');
        }, 'Should throw error for invalid log level');
    });
};
