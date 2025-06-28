const ServiceRegistration = require('./container/ServiceRegistration');

/**
 * Main Application class following Single Responsibility Principle
 * Responsible for orchestrating the application flow and coordinating services
 */
class SpotifyShowApp {
    constructor() {
        this.container = null;
        this.logger = null;
        this.showService = null;
        this.configuration = null;
        this.initialized = false;
    }

    /**
     * Initialize the application and its dependencies
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            // Configure dependency injection container
            this.container = ServiceRegistration.configureContainer();
            
            // Validate container configuration
            if (!ServiceRegistration.validateContainer(this.container)) {
                throw new Error('Container validation failed');
            }

            // Resolve core services
            this.logger = this.container.resolve('logger');
            this.showService = this.container.resolve('showService');
            this.configuration = this.container.resolve('configuration');

            this.logger.info('Application initialized successfully');
            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize application:', error.message);
            throw error;
        }
    }

    /**
     * Run the application with default show ID
     * @returns {Promise<void>}
     */
    async run() {
        if (!this.initialized) {
            await this.initialize();
        }

        const defaultShowId = this.configuration.getAppConfig().defaultShowId;
        await this.displayShowDetails(defaultShowId);
    }

    /**
     * Display show details for a specific show ID
     * @param {string} showId - The Spotify show ID
     * @returns {Promise<void>}
     */
    async displayShowDetails(showId) {
        try {
            this.logger.info(`Fetching show details for ID: ${showId}`);
            
            const showDetails = await this.showService.getShowDetails(showId);
            
            this.displayFormattedShowDetails(showDetails);
            
        } catch (error) {
            this.logger.error(`Failed to display show details: ${error.message}`);
            throw error;
        }
    }

    /**
     * Display show summary for a specific show ID
     * @param {string} showId - The Spotify show ID
     * @returns {Promise<void>}
     */
    async displayShowSummary(showId) {
        try {
            this.logger.info(`Fetching show summary for ID: ${showId}`);
            
            const showSummary = await this.showService.getShowSummary(showId);
            
            this.displayFormattedShowSummary(showSummary);
            
        } catch (error) {
            this.logger.error(`Failed to display show summary: ${error.message}`);
            throw error;
        }
    }

    /**
     * Display show episodes for a specific show ID
     * @param {string} showId - The Spotify show ID
     * @param {number} page - Page number (default: 1)
     * @param {number} pageSize - Page size (default: 10)
     * @returns {Promise<void>}
     */
    async displayShowEpisodes(showId, page = 1, pageSize = 10) {
        try {
            this.logger.info(`Fetching episodes for show ID: ${showId}, page: ${page}`);
            
            const episodesData = await this.showService.getShowEpisodes(showId, page, pageSize);
            
            this.displayFormattedEpisodes(episodesData);
            
        } catch (error) {
            this.logger.error(`Failed to display show episodes: ${error.message}`);
            throw error;
        }
    }

    /**
     * Display formatted show details to console
     * @private
     * @param {object} showDetails - The show details object
     */
    displayFormattedShowDetails(showDetails) {
        console.log('\n=== SHOW DETAILS ===');
        console.log(`Name: ${showDetails.name}`);
        console.log(`Publisher: ${showDetails.publisher}`);
        console.log(`Language: ${showDetails.language}`);
        console.log(`Total Episodes: ${showDetails.totalEpisodes}`);
        console.log(`Explicit: ${showDetails.explicit ? 'Yes' : 'No'}`);
        console.log(`Description: ${showDetails.description}`);
        
        if (showDetails.externalUrls?.spotify) {
            console.log(`Spotify URL: ${showDetails.externalUrls.spotify}`);
        }
        
        if (showDetails.images && showDetails.images.length > 0) {
            console.log(`Cover Image: ${showDetails.images[0].url}`);
        }
        
        console.log('==================\n');
    }

    /**
     * Display formatted show summary to console
     * @private
     * @param {object} showSummary - The show summary object
     */
    displayFormattedShowSummary(showSummary) {
        console.log('\n=== SHOW SUMMARY ===');
        console.log(`Name: ${showSummary.name}`);
        console.log(`Publisher: ${showSummary.publisher}`);
        console.log(`Episodes: ${showSummary.totalEpisodes}`);
        console.log(`Language: ${showSummary.language}`);
        console.log(`Description: ${showSummary.description}`);
        
        if (showSummary.spotifyUrl) {
            console.log(`Spotify URL: ${showSummary.spotifyUrl}`);
        }
        
        console.log('===================\n');
    }

    /**
     * Display formatted episodes to console
     * @private
     * @param {object} episodesData - The episodes data object
     */
    displayFormattedEpisodes(episodesData) {
        console.log('\n=== SHOW EPISODES ===');
        console.log(`Page ${episodesData.pagination.currentPage} of ${episodesData.pagination.totalPages}`);
        console.log(`Total Episodes: ${episodesData.pagination.totalItems}\n`);
        
        // Episodes are already sorted in reverse chronological order (newest first)
        // The most recent episode is assigned episode number 1
        episodesData.episodes.forEach((episode, index) => {
            // Simple index + 1 since episodes are already sorted by date (newest first)
            const episodeNumber = index + 1;
            console.log(`${episodeNumber}. ${episode.name}`);
            console.log(`   Released: ${episode.releaseDate}`);
            console.log(`   Duration: ${this.formatDuration(episode.durationMs)}`);
            console.log(`   Description: ${episode.description}`);
            if (episode.spotifyUrl) {
                console.log(`   URL: ${episode.spotifyUrl}`);
            }
            console.log('');
        });
        
        console.log('====================\n');
    }

    /**
     * Format duration from milliseconds to readable format
     * @private
     * @param {number} durationMs - Duration in milliseconds
     * @returns {string} Formatted duration string
     */
    formatDuration(durationMs) {
        const minutes = Math.floor(durationMs / 60000);
        const seconds = Math.floor((durationMs % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Gracefully shutdown the application
     * @returns {Promise<void>}
     */
    async shutdown() {
        if (this.logger) {
            this.logger.info('Application shutting down');
        }
        
        // Clear container if needed
        if (this.container) {
            this.container.clear();
        }
        
        this.initialized = false;
    }
}

module.exports = SpotifyShowApp;
