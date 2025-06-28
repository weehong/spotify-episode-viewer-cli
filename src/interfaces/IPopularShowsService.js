/**
 * Popular Shows Service interface following Interface Segregation Principle
 * Defines the contract for managing popular show data
 */
class IPopularShowsService {
    /**
     * Get list of popular shows
     * @returns {Promise<object[]>} Array of popular shows with metadata
     */
    async getPopularShows() {
        throw new Error('Method must be implemented');
    }

    /**
     * Get popular show by ID
     * @param {string} showId - The show ID
     * @returns {Promise<object|null>} Show data or null if not found
     */
    async getPopularShowById(showId) {
        throw new Error('Method must be implemented');
    }

    /**
     * Search popular shows by name
     * @param {string} query - Search query
     * @returns {Promise<object[]>} Matching shows
     */
    async searchPopularShows(query) {
        throw new Error('Method must be implemented');
    }

    /**
     * Get shows by category
     * @param {string} category - Category name
     * @returns {Promise<object[]>} Shows in category
     */
    async getShowsByCategory(category) {
        throw new Error('Method must be implemented');
    }

    /**
     * Get available categories
     * @returns {Promise<string[]>} Array of category names
     */
    async getCategories() {
        throw new Error('Method must be implemented');
    }
}

module.exports = IPopularShowsService;
