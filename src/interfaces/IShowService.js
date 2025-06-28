/**
 * Show Service interface following Interface Segregation Principle
 * Defines the contract for show business operations
 */
class IShowService {
    /**
     * Get formatted show details
     * @param {string} showId - The Spotify show ID
     * @returns {Promise<object>} Formatted show details
     */
    async getShowDetails(showId) {
        throw new Error('Method must be implemented');
    }

    /**
     * Get show summary with key information
     * @param {string} showId - The Spotify show ID
     * @returns {Promise<object>} Show summary
     */
    async getShowSummary(showId) {
        throw new Error('Method must be implemented');
    }

    /**
     * Get show episodes with pagination
     * @param {string} showId - The Spotify show ID
     * @param {number} page - Page number (1-based)
     * @param {number} pageSize - Number of episodes per page
     * @returns {Promise<object>} Paginated episodes data
     */
    async getShowEpisodes(showId, page = 1, pageSize = 20) {
        throw new Error('Method must be implemented');
    }

    /**
     * Search for shows by name
     * @param {string} query - Search query
     * @param {number} limit - Maximum number of results
     * @returns {Promise<object[]>} Array of show summaries
     */
    async searchShows(query, limit = 10) {
        throw new Error('Method must be implemented');
    }
}

module.exports = IShowService;
