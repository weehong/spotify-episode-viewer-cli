/**
 * Logger interface following Interface Segregation Principle
 * Defines the contract for logging operations
 */
class ILogger {
    /**
     * Log an info message
     * @param {string} message - The message to log
     * @param {object} meta - Optional metadata
     */
    info(message, meta = {}) {
        throw new Error('Method must be implemented');
    }

    /**
     * Log an error message
     * @param {string} message - The message to log
     * @param {object} meta - Optional metadata
     */
    error(message, meta = {}) {
        throw new Error('Method must be implemented');
    }

    /**
     * Log a warning message
     * @param {string} message - The message to log
     * @param {object} meta - Optional metadata
     */
    warn(message, meta = {}) {
        throw new Error('Method must be implemented');
    }

    /**
     * Log a debug message
     * @param {string} message - The message to log
     * @param {object} meta - Optional metadata
     */
    debug(message, meta = {}) {
        throw new Error('Method must be implemented');
    }
}

module.exports = ILogger;
