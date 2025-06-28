const { AppError } = require('./AppError');

/**
 * CLI-specific error classes following Single Responsibility Principle
 * Responsible for CLI-specific error handling and user-friendly messages
 */

/**
 * Base CLI Error class
 */
class CLIError extends AppError {
    constructor(message, code = 'CLI_ERROR', statusCode = 400) {
        super(message, code, statusCode, true);
        this.userFriendly = true;
    }

    /**
     * Get user-friendly error message
     * @returns {string} User-friendly message
     */
    getUserMessage() {
        return this.message;
    }
}

/**
 * CLI Input Validation Error
 */
class CLIValidationError extends CLIError {
    constructor(message, field = null) {
        super(message, 'CLI_VALIDATION_ERROR', 400);
        this.field = field;
    }

    getUserMessage() {
        return `Invalid input: ${this.message}`;
    }
}

/**
 * CLI Navigation Error
 */
class CLINavigationError extends CLIError {
    constructor(message) {
        super(message, 'CLI_NAVIGATION_ERROR', 400);
    }

    getUserMessage() {
        return `Navigation error: ${this.message}`;
    }
}

/**
 * CLI Service Error
 */
class CLIServiceError extends CLIError {
    constructor(message, originalError = null) {
        super(message, 'CLI_SERVICE_ERROR', 500);
        this.originalError = originalError;
    }

    getUserMessage() {
        return `Service error: ${this.message}. Please try again or contact support.`;
    }
}

/**
 * CLI Configuration Error
 */
class CLIConfigurationError extends CLIError {
    constructor(message) {
        super(message, 'CLI_CONFIGURATION_ERROR', 500);
    }

    getUserMessage() {
        return `Configuration error: ${this.message}. Please check your environment variables.`;
    }
}

/**
 * CLI Network Error
 */
class CLINetworkError extends CLIError {
    constructor(message) {
        super(message, 'CLI_NETWORK_ERROR', 503);
    }

    getUserMessage() {
        return `Network error: ${this.message}. Please check your internet connection and try again.`;
    }
}

/**
 * CLI User Cancellation (not really an error, but handled as one)
 */
class CLIUserCancellation extends CLIError {
    constructor(message = 'Operation cancelled by user') {
        super(message, 'CLI_USER_CANCELLED', 200);
    }

    getUserMessage() {
        return 'Operation cancelled.';
    }
}

module.exports = {
    CLIError,
    CLIValidationError,
    CLINavigationError,
    CLIServiceError,
    CLIConfigurationError,
    CLINetworkError,
    CLIUserCancellation
};
