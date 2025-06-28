const chalk = require('chalk');
const { CLIError } = require('./CLIError');
const ErrorHandler = require('./ErrorHandler');

/**
 * CLI Error Handler following Single Responsibility Principle
 * Responsible for handling errors in CLI context with user-friendly messages
 */
class CLIErrorHandler extends ErrorHandler {
    constructor(logger) {
        super(logger);
    }

    /**
     * Handle CLI-specific errors with user-friendly output
     * @param {Error} error - The error to handle
     * @returns {object} Error response object
     */
    handleCLIError(error) {
        // Log the error for debugging
        this.logError(error);

        // Handle CLI-specific errors
        if (error instanceof CLIError) {
            return this.createCLIErrorResponse(error);
        }

        // Handle known operational errors with CLI-friendly messages
        if (this.isOperationalError(error)) {
            return this.createCLIOperationalErrorResponse(error);
        }

        // Handle unexpected errors
        return this.createCLIGenericErrorResponse(error);
    }

    /**
     * Display error in CLI format
     * @param {Error} error - The error to display
     */
    displayCLIError(error) {
        const response = this.handleCLIError(error);
        
        console.log('\n' + chalk.red.bold('❌ Error Occurred'));
        console.log(chalk.red('═'.repeat(40)));
        
        if (response.userMessage) {
            console.log(chalk.red(response.userMessage));
        } else {
            console.log(chalk.red(response.error.message));
        }

        // Show additional help for specific error types
        if (response.helpText) {
            console.log('\n' + chalk.yellow.bold('💡 Suggestion:'));
            console.log(chalk.yellow(response.helpText));
        }

        console.log(''); // Empty line for spacing
    }

    /**
     * Create CLI error response for CLI-specific errors
     * @private
     * @param {CLIError} error - The CLI error
     * @returns {object} CLI error response
     */
    createCLIErrorResponse(error) {
        return {
            success: false,
            userMessage: error.getUserMessage(),
            error: {
                message: error.message,
                code: error.code,
                statusCode: error.statusCode,
                timestamp: new Date().toISOString()
            },
            helpText: this.getHelpTextForError(error)
        };
    }

    /**
     * Create CLI error response for operational errors
     * @private
     * @param {Error} error - The operational error
     * @returns {object} CLI error response
     */
    createCLIOperationalErrorResponse(error) {
        let userMessage = 'An error occurred while processing your request.';
        let helpText = null;

        // Customize message based on error patterns
        if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
            userMessage = 'Unable to connect to Spotify API. Please check your internet connection.';
            helpText = 'Make sure you have an active internet connection and try again.';
        } else if (error.message.includes('401') || error.message.includes('Authentication')) {
            userMessage = 'Authentication failed. Please check your Spotify credentials.';
            helpText = 'Verify that your CLIENT_ID and CLIENT_SECRET are correct in your .env file.';
        } else if (error.message.includes('404')) {
            userMessage = 'The requested show was not found.';
            helpText = 'Please check the Show ID and try again. You can browse popular shows instead.';
        } else if (error.message.includes('429')) {
            userMessage = 'Rate limit exceeded. Please wait a moment before trying again.';
            helpText = 'Spotify API has rate limits. Please wait a few seconds and retry.';
        } else if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
            userMessage = 'Spotify API is temporarily unavailable.';
            helpText = 'This is likely a temporary issue with Spotify. Please try again later.';
        }

        return {
            success: false,
            userMessage,
            error: {
                message: error.message,
                code: 'OPERATIONAL_ERROR',
                statusCode: error.statusCode || 500,
                timestamp: new Date().toISOString()
            },
            helpText
        };
    }

    /**
     * Create CLI error response for unexpected errors
     * @private
     * @param {Error} error - The unexpected error
     * @returns {object} CLI error response
     */
    createCLIGenericErrorResponse(error) {
        return {
            success: false,
            userMessage: 'An unexpected error occurred. Please try again.',
            error: {
                message: 'Internal error',
                code: 'INTERNAL_ERROR',
                statusCode: 500,
                timestamp: new Date().toISOString()
            },
            helpText: 'If this problem persists, please check your configuration or contact support.'
        };
    }

    /**
     * Get help text for specific error types
     * @private
     * @param {CLIError} error - The CLI error
     * @returns {string|null} Help text or null
     */
    getHelpTextForError(error) {
        switch (error.code) {
            case 'CLI_VALIDATION_ERROR':
                return 'Please check your input and try again. Use the help option for format examples.';
            
            case 'CLI_CONFIGURATION_ERROR':
                return 'Check your .env file and ensure all required environment variables are set.';
            
            case 'CLI_NETWORK_ERROR':
                return 'Verify your internet connection and try again. You can also run health checks from the main menu.';
            
            case 'CLI_SERVICE_ERROR':
                return 'This might be a temporary issue. Try again or use the health check option to diagnose problems.';
            
            default:
                return null;
        }
    }

    /**
     * Handle graceful shutdown on CLI errors
     * @param {Error} error - The error that caused shutdown
     */
    handleCLIShutdown(error) {
        this.displayCLIError(error);
        
        console.log(chalk.gray('The application will now exit.'));
        console.log(chalk.gray('You can restart it anytime by running: node app.js\n'));
        
        // Log for debugging
        this.logger.error('CLI shutting down due to error', {
            error: error.message,
            stack: error.stack
        });
    }

    /**
     * Validate CLI prerequisites and show helpful errors
     * @param {object} configuration - Application configuration
     * @returns {boolean} True if valid, false otherwise
     */
    validateCLIPrerequisites(configuration) {
        try {
            if (!configuration.isValid()) {
                this.displayCLIError(new Error('Configuration validation failed. Please check your environment variables.'));
                return false;
            }
            return true;
        } catch (error) {
            this.displayCLIError(error);
            return false;
        }
    }

    /**
     * Show CLI startup errors with helpful guidance
     * @param {Error} error - Startup error
     */
    handleCLIStartupError(error) {
        console.log('\n' + chalk.red.bold('❌ Failed to Start CLI'));
        console.log(chalk.red('═'.repeat(40)));
        
        if (error.message.includes('CLIENT_ID') || error.message.includes('CLIENT_SECRET')) {
            console.log(chalk.red('Missing Spotify API credentials.'));
            console.log('\n' + chalk.yellow.bold('💡 Quick Setup:'));
            console.log(chalk.yellow('1. Copy .env.example to .env'));
            console.log(chalk.yellow('2. Get credentials from https://developer.spotify.com/dashboard'));
            console.log(chalk.yellow('3. Add your CLIENT_ID and CLIENT_SECRET to .env'));
            console.log(chalk.yellow('4. Run the application again'));
        } else {
            console.log(chalk.red(error.message));
            console.log('\n' + chalk.yellow.bold('💡 Suggestion:'));
            console.log(chalk.yellow('Run "node app.js help" for usage information.'));
        }
        
        console.log('');
    }
}

module.exports = CLIErrorHandler;
