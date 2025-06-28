const fs = require('fs');
const path = require('path');
const IHistoryService = require('../interfaces/IHistoryService');

/**
 * History Service following Single Responsibility Principle
 * Responsible for managing and persisting show ID history
 */
class HistoryService extends IHistoryService {
    constructor(configuration, logger) {
        super(); // Call parent class constructor
        this.configuration = configuration;
        this.logger = logger;
        this.historyFilePath = path.join(process.cwd(), 'data', 'show_history.json');
        this.showHistory = [];
        this.ensureHistoryFileExists();
        this.loadHistory();
    }

    /**
     * Ensure the history file and directory exist
     * @private
     */
    ensureHistoryFileExists() {
        const dataDir = path.dirname(this.historyFilePath);
        
        try {
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
                this.logger.info(`Created history data directory: ${dataDir}`);
            }
            
            if (!fs.existsSync(this.historyFilePath)) {
                fs.writeFileSync(this.historyFilePath, JSON.stringify({ history: [] }, null, 2));
                this.logger.info(`Created new history file: ${this.historyFilePath}`);
            }
        } catch (error) {
            this.logger.error(`Failed to ensure history file exists: ${error.message}`);
        }
    }

    /**
     * Load show history from file
     * @private
     */
    loadHistory() {
        try {
            const data = fs.readFileSync(this.historyFilePath, 'utf8');
            const parsedData = JSON.parse(data);
            this.showHistory = parsedData.history || [];
            this.logger.info(`Loaded ${this.showHistory.length} show history entries`);
        } catch (error) {
            this.logger.error(`Failed to load show history: ${error.message}`);
            this.showHistory = [];
        }
    }

    /**
     * Save show history to file
     * @private
     */
    saveHistory() {
        try {
            fs.writeFileSync(this.historyFilePath, JSON.stringify({ history: this.showHistory }, null, 2));
            this.logger.info(`Saved ${this.showHistory.length} show history entries`);
        } catch (error) {
            this.logger.error(`Failed to save show history: ${error.message}`);
        }
    }

    /**
     * Add a show to history
     * @param {string} showId - The Spotify show ID
     * @param {string} showName - The show name (optional)
     * @returns {boolean} True if successful
     */
    addToHistory(showId, showName = null) {
        try {
            // Check if show already exists in history
            const existingIndex = this.showHistory.findIndex(item => item.id === showId);
            
            if (existingIndex !== -1) {
                // Update existing entry (move to top and update name if provided)
                const existingItem = this.showHistory[existingIndex];
                this.showHistory.splice(existingIndex, 1);
                
                // Update name if provided and different from existing
                if (showName && existingItem.name !== showName) {
                    existingItem.name = showName;
                }
                
                // Update lastAccessed timestamp
                existingItem.lastAccessed = new Date().toISOString();
                
                // Add to top of history
                this.showHistory.unshift(existingItem);
            } else {
                // Add new entry
                this.showHistory.unshift({
                    id: showId,
                    name: showName || 'Unknown Show',
                    firstAccessed: new Date().toISOString(),
                    lastAccessed: new Date().toISOString()
                });
            }
            
            // Limit history size to 20 items
            if (this.showHistory.length > 20) {
                this.showHistory = this.showHistory.slice(0, 20);
            }
            
            this.saveHistory();
            return true;
        } catch (error) {
            this.logger.error(`Failed to add show to history: ${error.message}`);
            return false;
        }
    }

    /**
     * Update show name in history
     * @param {string} showId - The Spotify show ID
     * @param {string} showName - The show name
     * @returns {boolean} True if successful
     */
    updateShowName(showId, showName) {
        try {
            const show = this.showHistory.find(item => item.id === showId);
            if (show) {
                show.name = showName;
                this.saveHistory();
                return true;
            }
            return false;
        } catch (error) {
            this.logger.error(`Failed to update show name: ${error.message}`);
            return false;
        }
    }

    /**
     * Get all shows in history
     * @returns {Array} Array of show history items
     */
    getHistory() {
        return this.showHistory;
    }

    /**
     * Remove a specific show from history
     * @param {string} showId - The Spotify show ID to remove
     * @returns {boolean} True if successful
     */
    removeFromHistory(showId) {
        try {
            const initialLength = this.showHistory.length;
            this.showHistory = this.showHistory.filter(item => item.id !== showId);
            
            if (this.showHistory.length < initialLength) {
                this.saveHistory();
                return true;
            }
            return false;
        } catch (error) {
            this.logger.error(`Failed to remove show from history: ${error.message}`);
            return false;
        }
    }

    /**
     * Clear all show history
     * @returns {boolean} True if successful
     */
    clearHistory() {
        try {
            this.showHistory = [];
            this.saveHistory();
            return true;
        } catch (error) {
            this.logger.error(`Failed to clear history: ${error.message}`);
            return false;
        }
    }
}

module.exports = HistoryService;
