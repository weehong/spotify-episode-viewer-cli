/**
 * Interface for History Service
 * Defines the contract for history management functionality
 */
class IHistoryService {
    constructor() {
        if (this.constructor === IHistoryService) {
            throw new Error('Cannot instantiate abstract class');
        }
    }

    /**
     * Add a show to history
     * @param {string} showId - The Spotify show ID
     * @param {string} showName - The show name (optional)
     * @returns {boolean} True if successful
     */
    addToHistory(showId, showName = null) {
        throw new Error('Method not implemented');
    }

    /**
     * Update show name in history
     * @param {string} showId - The Spotify show ID
     * @param {string} showName - The show name
     * @returns {boolean} True if successful
     */
    updateShowName(showId, showName) {
        throw new Error('Method not implemented');
    }

    /**
     * Get all shows in history
     * @returns {Array} Array of show history items
     */
    getHistory() {
        throw new Error('Method not implemented');
    }

    /**
     * Remove a specific show from history
     * @param {string} showId - The Spotify show ID to remove
     * @returns {boolean} True if successful
     */
    removeFromHistory(showId) {
        throw new Error('Method not implemented');
    }

    /**
     * Clear all show history
     * @returns {boolean} True if successful
     */
    clearHistory() {
        throw new Error('Method not implemented');
    }
}

module.exports = IHistoryService;
