const { AppError } = require('./AppError');

/**
 * Global Error Handler following Single Responsibility Principle
 * Responsible for handling and formatting errors consistently
 */
class ErrorHandler {
    constructor(logger) {
        this.logger = logger;
    }

    /**
     * Handle an error and determine appropriate response
     * @param {Error} error - The error to handle
     * @returns {object} Error response object
     */
    handleError(error) {
        // Log the error
        this.logError(error);

        // Determine if error is operational
        if (this.isOperationalError(error)) {
            return this.createErrorResponse(error);
        }

        // For non-operational errors, create a generic response
        return this.createGenericErrorResponse(error);
    }

    /**
     * Handle errors in async functions
     * @param {Function} fn - The async function to wrap
     * @returns {Function} Wrapped function with error handling
     */
    asyncErrorHandler(fn) {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                this.handleError(error);
                throw error;
            }
        };
    }

    /**
     * Log error with appropriate level
     * @private
     * @param {Error} error - The error to log
     */
    logError(error) {
        const errorInfo = {
            message: error.message,
            stack: error.stack,
            code: error.code || 'UNKNOWN',
            statusCode: error.statusCode || 500
        };

        if (this.isOperationalError(error)) {
            this.logger.warn('Operational error occurred', errorInfo);
        } else {
            this.logger.error('Unexpected error occurred', errorInfo);
        }
    }

    /**
     * Check if error is operational (expected) or programming error
     * @private
     * @param {Error} error - The error to check
     * @returns {boolean} True if error is operational
     */
    isOperationalError(error) {
        if (error instanceof AppError) {
            return error.isOperational;
        }

        // Check for known operational error patterns
        const operationalPatterns = [
            /ENOTFOUND/,
            /ECONNREFUSED/,
            /ETIMEDOUT/,
            /HTTP 4\d\d/,
            /HTTP 5\d\d/
        ];

        return operationalPatterns.some(pattern => pattern.test(error.message));
    }

    /**
     * Create error response for operational errors
     * @private
     * @param {Error} error - The error to create response for
     * @returns {object} Error response object
     */
    createErrorResponse(error) {
        return {
            success: false,
            error: {
                message: error.message,
                code: error.code || 'OPERATIONAL_ERROR',
                statusCode: error.statusCode || 500,
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Create generic error response for programming errors
     * @private
     * @param {Error} error - The error to create response for
     * @returns {object} Error response object
     */
    createGenericErrorResponse(error) {
        return {
            success: false,
            error: {
                message: 'An unexpected error occurred',
                code: 'INTERNAL_ERROR',
                statusCode: 500,
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Handle unhandled promise rejections
     * @param {Error} error - The unhandled rejection
     */
    handleUnhandledRejection(error) {
        this.logger.error('Unhandled Promise Rejection', {
            message: error.message,
            stack: error.stack
        });

        // In production, you might want to gracefully shutdown
        // process.exit(1);
    }

    /**
     * Handle uncaught exceptions
     * @param {Error} error - The uncaught exception
     */
    handleUncaughtException(error) {
        this.logger.error('Uncaught Exception', {
            message: error.message,
            stack: error.stack
        });

        // Gracefully shutdown the application
        process.exit(1);
    }

    /**
     * Setup global error handlers
     */
    setupGlobalHandlers() {
        process.on('unhandledRejection', (error) => {
            this.handleUnhandledRejection(error);
        });

        process.on('uncaughtException', (error) => {
            this.handleUncaughtException(error);
        });
    }
}

module.exports = ErrorHandler;
