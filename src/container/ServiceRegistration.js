// Import all required classes
const Configuration = require('../config/Configuration');
const AxiosHttpClient = require('../http/AxiosHttpClient');
const SpotifyAuthenticationService = require('../services/SpotifyAuthenticationService');
const SpotifyApiClient = require('../clients/SpotifyApiClient');
const ShowService = require('../services/ShowService');
const ConsoleLogger = require('../logging/ConsoleLogger');
const CLIService = require('../services/CLIService');
const PopularShowsService = require('../services/PopularShowsService');
const FavoritesService = require('../services/FavoritesService');
const CLIInterface = require('../cli/CLIInterface');
const DIContainer = require('./DIContainer');

/**
 * Service Registration utility following Dependency Inversion Principle
 * Configures the DI container with all application services
 */
class ServiceRegistration {
    /**
     * Configure and return a fully configured DI container
     * @returns {DIContainer} Configured container
     */
    static configureContainer() {
        const container = new DIContainer();

        // Register configuration as singleton instance
        const config = new Configuration();
        container.registerInstance('configuration', config);

        // Register HTTP client
        container.register('httpClient', AxiosHttpClient, [], true);

        // Register authentication service
        container.register(
            'authenticationService',
            SpotifyAuthenticationService,
            ['httpClient', 'configuration'],
            true
        );

        // Register Spotify API client
        container.register(
            'spotifyApiClient',
            SpotifyApiClient,
            ['httpClient', 'authenticationService', 'configuration'],
            true
        );

        // Register logger first (needed by other services)
        container.registerFactory('logger', (container) => {
            const config = container.resolve('configuration');
            const logLevel = config.getAppConfig().logLevel;
            return new ConsoleLogger(logLevel);
        }, true);

        // Register show service with logger
        container.register(
            'showService',
            ShowService,
            ['spotifyApiClient', 'logger'],
            true
        );

        // Register popular shows service
        container.register(
            'popularShowsService',
            PopularShowsService,
            ['logger'],
            true
        );

        // Register favorites service
        container.register(
            'favoritesService',
            FavoritesService,
            ['configuration', 'logger'],
            true
        );

        // Register CLI service
        container.register(
            'cliService',
            CLIService,
            ['showService', 'configuration', 'popularShowsService', 'logger', 'authenticationService', 'spotifyApiClient', 'favoritesService'],
            true
        );

        // Register CLI interface
        container.register(
            'cliInterface',
            CLIInterface,
            ['cliService', 'logger'],
            true
        );

        return container;
    }

    /**
     * Validate that all services can be resolved
     * @param {DIContainer} container - The container to validate
     * @returns {boolean} True if all services can be resolved
     */
    static validateContainer(container) {
        const requiredServices = [
            'configuration',
            'httpClient',
            'authenticationService',
            'spotifyApiClient',
            'showService',
            'logger',
            'popularShowsService',
            'favoritesService',
            'cliService',
            'cliInterface'
        ];

        try {
            for (const serviceName of requiredServices) {
                const service = container.resolve(serviceName);
                if (!service) {
                    throw new Error(`Service '${serviceName}' resolved to null/undefined`);
                }
            }
            return true;
        } catch (error) {
            console.error(`Container validation failed: ${error.message}`);
            return false;
        }
    }
}

module.exports = ServiceRegistration;
