/**
 * Configuration management class following Single Responsibility Principle
 * Responsible only for loading and providing access to configuration values
 */
class Configuration {
    constructor() {
        this.config = {};
        this.loadConfiguration();
    }

    /**
     * Load configuration from environment variables
     * @private
     */
    loadConfiguration() {
        // Load environment variables
        require('dotenv').config();

        this.config = {
            spotify: {
                clientId: process.env.CLIENT_ID,
                clientSecret: process.env.CLIENT_SECRET,
                tokenUrl: process.env.TOKEN_URL || 'https://accounts.spotify.com/api/token',
                apiBaseUrl: process.env.API_BASE_URL || 'https://api.spotify.com/v1'
            },
            app: {
                defaultShowId: process.env.DEFAULT_SHOW_ID || '11ktWYpzznMCpvGtXsiYxE',
                logLevel: process.env.LOG_LEVEL || 'info'
            }
        };

        this.validateConfiguration();
    }

    /**
     * Validate that required configuration values are present
     * @private
     */
    validateConfiguration() {
        const required = [
            'spotify.clientId',
            'spotify.clientSecret'
        ];

        for (const key of required) {
            if (!this.getNestedValue(key)) {
                throw new Error(`Missing required configuration: ${key}`);
            }
        }
    }

    /**
     * Get a configuration value using dot notation
     * @param {string} key - The configuration key (e.g., 'spotify.clientId')
     * @returns {*} The configuration value
     */
    get(key) {
        return this.getNestedValue(key);
    }

    /**
     * Get Spotify-specific configuration
     * @returns {object} Spotify configuration object
     */
    getSpotifyConfig() {
        return this.config.spotify;
    }

    /**
     * Get application-specific configuration
     * @returns {object} Application configuration object
     */
    getAppConfig() {
        return this.config.app;
    }

    /**
     * Helper method to get nested object values using dot notation
     * @private
     * @param {string} key - The key in dot notation
     * @returns {*} The value at the specified path
     */
    getNestedValue(key) {
        return key.split('.').reduce((obj, k) => obj && obj[k], this.config);
    }

    /**
     * Check if the configuration is valid
     * @returns {boolean} True if configuration is valid
     */
    isValid() {
        try {
            this.validateConfiguration();
            return true;
        } catch (error) {
            return false;
        }
    }
}

module.exports = Configuration;
