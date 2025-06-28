const ILogger = require('../interfaces/ILogger');

/**
 * Console Logger implementation following Single Responsibility Principle
 * Responsible only for logging messages to the console
 */
class ConsoleLogger extends ILogger {
    constructor(logLevel = 'info') {
        super();
        this.logLevel = logLevel;
        this.logLevels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };
    }

    /**
     * Log an info message
     * @param {string} message - The message to log
     * @param {object} meta - Optional metadata
     */
    info(message, meta = {}) {
        if (this.shouldLog('info')) {
            this.writeLog('INFO', message, meta);
        }
    }

    /**
     * Log an error message
     * @param {string} message - The message to log
     * @param {object} meta - Optional metadata
     */
    error(message, meta = {}) {
        if (this.shouldLog('error')) {
            this.writeLog('ERROR', message, meta, console.error);
        }
    }

    /**
     * Log a warning message
     * @param {string} message - The message to log
     * @param {object} meta - Optional metadata
     */
    warn(message, meta = {}) {
        if (this.shouldLog('warn')) {
            this.writeLog('WARN', message, meta, console.warn);
        }
    }

    /**
     * Log a debug message
     * @param {string} message - The message to log
     * @param {object} meta - Optional metadata
     */
    debug(message, meta = {}) {
        if (this.shouldLog('debug')) {
            this.writeLog('DEBUG', message, meta);
        }
    }

    /**
     * Check if a message should be logged based on current log level
     * @private
     * @param {string} level - The log level to check
     * @returns {boolean} True if message should be logged
     */
    shouldLog(level) {
        const currentLevelValue = this.logLevels[this.logLevel] || 1;
        const messageLevelValue = this.logLevels[level] || 1;
        return messageLevelValue >= currentLevelValue;
    }

    /**
     * Write a log message to console
     * @private
     * @param {string} level - The log level
     * @param {string} message - The message to log
     * @param {object} meta - Optional metadata
     * @param {Function} logFunction - Console function to use (default: console.log)
     */
    writeLog(level, message, meta = {}, logFunction = console.log) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${level}] ${timestamp} - ${message}`;
        
        if (Object.keys(meta).length > 0) {
            logFunction(logMessage, meta);
        } else {
            logFunction(logMessage);
        }
    }

    /**
     * Set the log level
     * @param {string} level - The new log level
     */
    setLogLevel(level) {
        if (this.logLevels.hasOwnProperty(level)) {
            this.logLevel = level;
        } else {
            throw new Error(`Invalid log level: ${level}. Valid levels are: ${Object.keys(this.logLevels).join(', ')}`);
        }
    }

    /**
     * Get the current log level
     * @returns {string} The current log level
     */
    getLogLevel() {
        return this.logLevel;
    }
}

module.exports = ConsoleLogger;
