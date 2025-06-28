/**
 * Interface for Favorites Service
 * Defines the contract for favorites management functionality
 */
class IFavoritesService {
    constructor() {
        if (this.constructor === IFavoritesService) {
            throw new Error('Cannot instantiate abstract class');
        }
    }

    /**
     * Add a show to favorites
     * @param {string} showId - The Spotify show ID
     * @param {string} showName - The show name
     * @returns {Promise<boolean>} True if successful
     */
    async addToFavorites(showId, showName) {
        throw new Error('Method not implemented');
    }

    /**
     * Update show name in favorites
     * @param {string} showId - The Spotify show ID
     * @param {string} showName - The show name
     * @returns {Promise<boolean>} True if successful
     */
    async updateShowName(showId, showName) {
        throw new Error('Method not implemented');
    }

    /**
     * Get all shows in favorites
     * @returns {Promise<Array>} Array of favorite show items
     */
    async getFavorites() {
        throw new Error('Method not implemented');
    }

    /**
     * Remove a specific show from favorites
     * @param {string} showId - The Spotify show ID to remove
     * @returns {Promise<boolean>} True if successful
     */
    async removeFromFavorites(showId) {
        throw new Error('Method not implemented');
    }

    /**
     * Clear all favorite shows
     * @returns {Promise<boolean>} True if successful
     */
    async clearFavorites() {
        throw new Error('Method not implemented');
    }
}

module.exports = IFavoritesService;
