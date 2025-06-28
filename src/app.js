/**
 * Main application entry point
 * Demonstrates the refactored Spotify Show application following SOLID principles
 */

const SpotifyShowApp = require('./SpotifyShowApp');
const ConsoleLogger = require('./logging/ConsoleLogger');
const ErrorHandler = require('./errors/ErrorHandler');
const ServiceRegistration = require('./container/ServiceRegistration');

/**
 * Main function to run the application in command-line mode
 */
async function main() {
    // Create logger
    const logger = new ConsoleLogger('info');

    // Create error handler
    const errorHandler = new ErrorHandler(logger);

    // Setup global error handlers
    errorHandler.setupGlobalHandlers();

    // Create and run the application
    const app = new SpotifyShowApp();

    try {
        logger.info('Starting Spotify Show Application...');

        // Run the application with default show
        await app.run();

        logger.info('Application completed successfully');

    } catch (error) {
        const errorResponse = errorHandler.handleError(error);
        console.error('\nApplication failed:', errorResponse.error.message);
        process.exit(1);

    } finally {
        // Cleanup
        await app.shutdown();
    }
}

/**
 * Interactive CLI function
 */
async function runInteractiveCLI() {
    // Create logger with reduced verbosity for CLI
    const logger = new ConsoleLogger('warn');

    // Create error handler
    const errorHandler = new ErrorHandler(logger);

    // Setup global error handlers
    errorHandler.setupGlobalHandlers();

    try {
        // Configure DI container
        const container = ServiceRegistration.configureContainer();

        // Validate container
        if (!ServiceRegistration.validateContainer(container)) {
            throw new Error('Container validation failed');
        }

        // Resolve CLI interface
        const cliInterface = container.resolve('cliInterface');

        // Start interactive CLI
        await cliInterface.start();

    } catch (error) {
        const errorResponse = errorHandler.handleError(error);
        console.error('\nCLI failed:', errorResponse.error.message);
        process.exit(1);
    }
}

// Run specific commands
async function runCommand() {
    const logger = new ConsoleLogger('info');
    const errorHandler = new ErrorHandler(logger);
    errorHandler.setupGlobalHandlers();

    const app = new SpotifyShowApp();

    try {
        await app.initialize();

        switch (command) {
            case 'details':
                if (!showId) {
                    throw new Error('Show ID is required for details command');
                }
                await app.displayShowDetails(showId);
                break;

            case 'summary':
                if (!showId) {
                    throw new Error('Show ID is required for summary command');
                }
                await app.displayShowSummary(showId);
                break;

            case 'episodes':
                if (!showId) {
                    throw new Error('Show ID is required for episodes command');
                }
                const page = parseInt(args[2]) || 1;
                await app.displayShowEpisodes(showId, page);
                break;

            default:
                // No command specified, run default
                await main();
                return;
        }

        logger.info('Command completed successfully');

    } catch (error) {
        const errorResponse = errorHandler.handleError(error);
        console.error('\nCommand failed:', errorResponse.error.message);
        process.exit(1);

    } finally {
        await app.shutdown();
    }
}

// Handle command line arguments for different operations
const args = process.argv.slice(2);
const command = args[0];
const showId = args[1];

if (command === 'help' || command === '--help' || command === '-h') {
    console.log(`
Spotify Show Application - SOLID Principles Refactored

Usage:
  node app.js                           - Launch interactive CLI mode
  node app.js details <showId>          - Show details for specific show
  node app.js summary <showId>          - Show summary for specific show
  node app.js episodes <showId> [page]  - Show episodes for specific show
  node app.js cli                       - Launch interactive CLI mode (explicit)
  node app.js legacy                    - Run legacy mode with default show

Examples:
  node app.js                           # Interactive CLI
  node app.js cli                       # Interactive CLI (explicit)
  node app.js details 11ktWYpzznMCpvGtXsiYxE
  node app.js summary 11ktWYpzznMCpvGtXsiYxE
  node app.js episodes 11ktWYpzznMCpvGtXsiYxE 1
  node app.js legacy                    # Original behavior

Environment Variables:
  CLIENT_ID       - Spotify Client ID (required)
  CLIENT_SECRET   - Spotify Client Secret (required)
  DEFAULT_SHOW_ID - Default show ID to use
  LOG_LEVEL       - Log level (debug, info, warn, error)
    `);
    process.exit(0);
}

// Run the appropriate function based on command line arguments
if (!command) {
    // No arguments provided - launch interactive CLI
    runInteractiveCLI();
} else if (command === 'cli') {
    // Explicit CLI mode
    runInteractiveCLI();
} else if (command === 'legacy') {
    // Legacy mode - run with default show
    main();
} else if (['details', 'summary', 'episodes'].includes(command)) {
    // Specific command mode
    runCommand();
} else {
    // Unknown command - show help
    console.error(`Unknown command: ${command}`);
    console.log('Run "node app.js help" for usage information.');
    process.exit(1);
}

