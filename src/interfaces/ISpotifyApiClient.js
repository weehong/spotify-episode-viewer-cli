/**
 * Spotify API Client interface following Interface Segregation Principle
 * Defines the contract for Spotify API operations
 */
class ISpotifyApiClient {
    /**
     * Get show details by ID
     * @param {string} showId - The Spotify show ID
     * @returns {Promise<object>} The show details
     */
    async getShow(showId) {
        throw new Error('Method must be implemented');
    }

    /**
     * Get multiple shows by IDs
     * @param {string[]} showIds - Array of Spotify show IDs
     * @returns {Promise<object[]>} Array of show details
     */
    async getShows(showIds) {
        throw new Error('Method must be implemented');
    }

    /**
     * Get show episodes
     * @param {string} showId - The Spotify show ID
     * @param {object} options - Query options (limit, offset, etc.)
     * @returns {Promise<object>} The episodes data
     */
    async getShowEpisodes(showId, options = {}) {
        throw new Error('Method must be implemented');
    }
}

module.exports = ISpotifyApiClient;
