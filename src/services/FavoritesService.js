const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const IFavoritesService = require('../interfaces/IFavoritesService');

/**
 * Favorites Service following Single Responsibility Principle
 * Responsible for managing and persisting favorite show IDs using SQLite
 */
class FavoritesService extends IFavoritesService {
    constructor(configuration, logger, dbPath = null) {
        super(); // Call parent class constructor
        this.configuration = configuration;
        this.logger = logger;
        this.dbPath = dbPath || path.join(process.cwd(), 'data', 'favorites.db');
        this.db = null;
        this.dbReady = this.initializeDatabase();
    }

    /**
     * Initialize SQLite database and create table if it doesn't exist
     * @private
     */
    async initializeDatabase() {
        return new Promise((resolve, reject) => {
            try {
                // Ensure data directory exists
                const dataDir = path.dirname(this.dbPath);
                if (!fs.existsSync(dataDir)) {
                    fs.mkdirSync(dataDir, { recursive: true });
                    this.logger.info(`Created favorites data directory: ${dataDir}`);
                }

                // Create or open database
                this.db = new sqlite3.Database(this.dbPath, (err) => {
                    if (err) {
                        this.logger.error(`Failed to connect to SQLite database: ${err.message}`);
                        reject(err);
                        return;
                    }

                    // Create favorites table if it doesn't exist
                    this.db.run(`
                        CREATE TABLE IF NOT EXISTS favorites (
                            id TEXT PRIMARY KEY,
                            name TEXT NOT NULL,
                            dateAdded TEXT NOT NULL
                        )
                    `, (tableErr) => {
                        if (tableErr) {
                            this.logger.error(`Failed to create favorites table: ${tableErr.message}`);
                            reject(tableErr);
                        } else {
                            resolve();
                        }
                    });
                });

            } catch (error) {
                this.logger.error(`Failed to initialize database: ${error.message}`);
                reject(error);
            }
        });
    }

    /**
     * Ensure database is ready before operations
     * @private
     */
    async ensureDbReady() {
        await this.dbReady;
    }

    /**
     * Add a show to favorites
     * @param {string} showId - The Spotify show ID
     * @param {string} showName - The show name
     * @returns {Promise<boolean>} True if successful
     */
    async addToFavorites(showId, showName) {
        await this.ensureDbReady();

        return new Promise((resolve, reject) => {
            try {
                this.logger.info(`Adding show ${showName} to favorites`);
                // Check if show already exists in favorites
                this.db.get(
                    'SELECT id, name, dateAdded FROM favorites WHERE id = ?',
                    [showId],
                    (err, row) => {
                        if (err) {
                            this.logger.error(`Failed to check existing favorite: ${err.message}`);
                            resolve(false);
                            return;
                        }

                        if (row) {
                            this.logger.info(`Show "${showName}" is already in favorites`);
                            // Show already exists, update name if different
                            if (row.name !== showName) {
                                this.db.run(
                                    'UPDATE favorites SET name = ? WHERE id = ?',
                                    [showName, showId],
                                    (updateErr) => {
                                        if (updateErr) {
                                            this.logger.error(`Failed to update favorite name: ${updateErr.message}`);
                                            resolve(false);
                                        } else {
                                            this.logger.info(`Updated favorite show name: ${showName}`);
                                            resolve(true);
                                        }
                                    }
                                );
                            } else {
                                this.logger.info(`Show "${showName}" is already in favorites`);
                                resolve(true);
                            }
                        } else {
                            this.logger.info(`Adding new favorite show: ${showName}`);
                            // Add new favorite
                            const dateAdded = new Date().toISOString();
                            this.db.run(
                                'INSERT INTO favorites (id, name, dateAdded) VALUES (?, ?, ?)',
                                [showId, showName, dateAdded],
                                (insertErr) => {
                                    if (insertErr) {
                                        this.logger.error(`Failed to add favorite: ${insertErr.message}`);
                                        resolve(false);
                                    } else {
                                        this.logger.info(`Added "${showName}" to favorites`);
                                        resolve(true);
                                    }
                                }
                            );
                        }
                    }
                );
            } catch (error) {
                this.logger.error(`Failed to add show to favorites: ${error.message}`);
                resolve(false);
            }
        });
    }

    /**
     * Update show name in favorites
     * @param {string} showId - The Spotify show ID
     * @param {string} showName - The show name
     * @returns {Promise<boolean>} True if successful
     */
    async updateShowName(showId, showName) {
        await this.ensureDbReady();

        return new Promise((resolve, reject) => {
            try {
                const logger = this.logger;
                this.db.run(
                    'UPDATE favorites SET name = ? WHERE id = ?',
                    [showName, showId],
                    function (err) {
                        if (err) {
                            logger.error(`Failed to update show name: ${err.message}`);
                            resolve(false);
                        } else if (this.changes === 0) {
                            logger.warn(`Show with ID ${showId} not found in favorites`);
                            resolve(false);
                        } else {
                            logger.info(`Updated show name to: ${showName}`);
                            resolve(true);
                        }
                    }
                );
            } catch (error) {
                this.logger.error(`Failed to update show name: ${error.message}`);
                resolve(false);
            }
        });
    }

    /**
     * Get all shows in favorites
     * @returns {Promise<Array>} Array of favorite show items
     */
    async getFavorites() {
        await this.ensureDbReady();

        return new Promise((resolve, reject) => {
            try {
                this.db.all(
                    'SELECT id, name, dateAdded FROM favorites ORDER BY dateAdded DESC',
                    [],
                    (err, rows) => {
                        if (err) {
                            this.logger.error(`Failed to get favorites: ${err.message}`);
                            resolve([]);
                        } else {
                            this.logger.info(`Retrieved ${rows.length} favorite shows`);
                            resolve(rows);
                        }
                    }
                );
            } catch (error) {
                this.logger.error(`Failed to get favorites: ${error.message}`);
                resolve([]);
            }
        });
    }

    /**
     * Remove a specific show from favorites
     * @param {string} showId - The Spotify show ID to remove
     * @returns {Promise<boolean>} True if successful
     */
    async removeFromFavorites(showId) {
        await this.ensureDbReady();

        return new Promise((resolve, reject) => {
            try {
                const logger = this.logger;
                this.db.run(
                    'DELETE FROM favorites WHERE id = ?',
                    [showId],
                    function (err) {
                        if (err) {
                            logger.error(`Failed to remove favorite: ${err.message}`);
                            resolve(false);
                        } else if (this.changes === 0) {
                            logger.warn(`Show with ID ${showId} not found in favorites`);
                            resolve(false);
                        } else {
                            logger.info(`Removed show from favorites: ${showId}`);
                            resolve(true);
                        }
                    }
                );
            } catch (error) {
                this.logger.error(`Failed to remove show from favorites: ${error.message}`);
                resolve(false);
            }
        });
    }

    /**
     * Clear all favorite shows
     * @returns {Promise<boolean>} True if successful
     */
    async clearFavorites() {
        await this.ensureDbReady();

        return new Promise((resolve, reject) => {
            try {
                const logger = this.logger;
                this.db.run('DELETE FROM favorites', [], function (err) {
                    if (err) {
                        logger.error(`Failed to clear favorites: ${err.message}`);
                        resolve(false);
                    } else {
                        logger.info(`Cleared all favorites (${this.changes} items removed)`);
                        resolve(true);
                    }
                });
            } catch (error) {
                this.logger.error(`Failed to clear favorites: ${error.message}`);
                resolve(false);
            }
        });
    }

    /**
     * Close database connection
     * Should be called when the application is shutting down
     */
    close() {
        return new Promise((resolve) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        this.logger.error(`Failed to close database: ${err.message}`);
                    } else {
                        this.logger.info('Database connection closed');
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = FavoritesService;
