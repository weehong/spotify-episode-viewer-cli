/**
 * CLI Service interface following Interface Segregation Principle
 * Defines the contract for CLI business logic operations
 */
class ICLIService {
    /**
     * Get show details with CLI-friendly formatting
     * @param {string} showId - The Spotify show ID
     * @returns {Promise<object>} Formatted show details
     */
    async getShowDetailsForCLI(showId) {
        throw new Error('Method must be implemented');
    }

    /**
     * Get show episodes with pagination for CLI
     * @param {string} showId - The Spotify show ID
     * @param {number} page - Page number
     * @param {number} pageSize - Items per page
     * @returns {Promise<object>} Formatted episodes data with pagination info
     */
    async getShowEpisodesForCLI(showId, page = 1, pageSize = 10) {
        throw new Error('Method must be implemented');
    }

    /**
     * Get popular shows list for selection
     * @returns {Promise<object[]>} Array of popular shows
     */
    async getPopularShows() {
        throw new Error('Method must be implemented');
    }

    /**
     * Validate show ID format
     * @param {string} showId - The show ID to validate
     * @returns {boolean} True if valid
     */
    validateShowId(showId) {
        throw new Error('Method must be implemented');
    }

    /**
     * Get application configuration summary
     * @returns {Promise<object>} Configuration summary
     */
    async getConfigurationSummary() {
        throw new Error('Method must be implemented');
    }

    /**
     * Run application health checks
     * @returns {Promise<object>} Health check results
     */
    async runHealthChecks() {
        throw new Error('Method must be implemented');
    }

    /**
     * Search shows by name (if implemented)
     * @param {string} query - Search query
     * @returns {Promise<object[]>} Search results
     */
    async searchShows(query) {
        throw new Error('Method must be implemented');
    }

    /**
     * Get show playlist with all episodes for CLI display
     * @param {string} showId - The Spotify show ID
     * @param {number} page - Page number
     * @param {number} pageSize - Items per page
     * @returns {Promise<object>} Formatted playlist data with pagination info
     */
    async getShowPlaylistForCLI(showId, page = 1, pageSize = 10) {
        throw new Error('Method must be implemented');
    }

    /**
     * Search episodes within a show's playlist
     * @param {string} showId - The Spotify show ID
     * @param {string} searchQuery - Search term for episode title/description
     * @param {number} page - Page number
     * @param {number} pageSize - Items per page
     * @returns {Promise<object>} Formatted search results with pagination info
     */
    async searchPlaylistEpisodes(showId, searchQuery, page = 1, pageSize = 10) {
        throw new Error('Method must be implemented');
    }

    /**
     * Jump to a specific episode number in the playlist
     * @param {string} showId - The Spotify show ID
     * @param {number} episodeNumber - Episode number to jump to (1-based)
     * @param {number} pageSize - Items per page
     * @returns {Promise<object>} Formatted playlist data starting from the episode
     */
    async jumpToEpisode(showId, episodeNumber, pageSize = 10) {
        throw new Error('Method must be implemented');
    }

    /**
     * Filter episodes by date range
     * @param {string} showId - The Spotify show ID
     * @param {string} dateFilter - Date filter type ('30days', '90days', '1year', 'custom')
     * @param {string} startDate - Start date for custom filter (YYYY-MM-DD)
     * @param {string} endDate - End date for custom filter (YYYY-MM-DD)
     * @param {number} page - Page number
     * @param {number} pageSize - Items per page
     * @returns {Promise<object>} Formatted filtered episodes with pagination info
     */
    async filterEpisodesByDate(showId, dateFilter, startDate = null, endDate = null, page = 1, pageSize = 10) {
        throw new Error('Method must be implemented');
    }

    /**
     * Search episodes by episode number for browsing
     * @param {string} showId - The Spotify show ID
     * @param {number} episodeNumber - Episode number to search for
     * @param {number} pageSize - Items per page
     * @returns {Promise<object>} Formatted episodes data with the target episode
     */
    async searchEpisodeByNumber(showId, episodeNumber, pageSize = 10) {
        throw new Error('Method must be implemented');
    }

    /**
     * Get episodes with enhanced pagination options
     * @param {string} showId - The Spotify show ID
     * @param {number} page - Page number
     * @param {number} pageSize - Items per page (10, 20, or 'unlimited')
     * @returns {Promise<object>} Formatted episodes data with enhanced pagination info
     */
    async getShowEpisodesEnhanced(showId, page = 1, pageSize = 10) {
        throw new Error('Method must be implemented');
    }
}

module.exports = ICLIService;
