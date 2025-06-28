/**
 * Base Application Error class following Single Responsibility Principle
 * Responsible for providing structured error information
 */
class AppError extends Error {
    constructor(message, code = 'GENERIC_ERROR', statusCode = 500, isOperational = true) {
        super(message);
        
        this.name = this.constructor.name;
        this.code = code;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.timestamp = new Date().toISOString();
        
        // Capture stack trace
        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * Convert error to JSON representation
     * @returns {object} JSON representation of the error
     */
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            statusCode: this.statusCode,
            isOperational: this.isOperational,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }
}

/**
 * Configuration Error class
 */
class ConfigurationError extends AppError {
    constructor(message) {
        super(message, 'CONFIGURATION_ERROR', 500, true);
    }
}

/**
 * Authentication Error class
 */
class AuthenticationError extends AppError {
    constructor(message) {
        super(message, 'AUTHENTICATION_ERROR', 401, true);
    }
}

/**
 * API Error class
 */
class ApiError extends AppError {
    constructor(message, statusCode = 500) {
        super(message, 'API_ERROR', statusCode, true);
    }
}

/**
 * Validation Error class
 */
class ValidationError extends AppError {
    constructor(message, field = null) {
        super(message, 'VALIDATION_ERROR', 400, true);
        this.field = field;
    }

    toJSON() {
        const json = super.toJSON();
        if (this.field) {
            json.field = this.field;
        }
        return json;
    }
}

/**
 * Network Error class
 */
class NetworkError extends AppError {
    constructor(message) {
        super(message, 'NETWORK_ERROR', 503, true);
    }
}

module.exports = {
    AppError,
    ConfigurationError,
    AuthenticationError,
    ApiError,
    ValidationError,
    NetworkError
};
