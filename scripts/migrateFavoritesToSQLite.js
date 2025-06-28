#!/usr/bin/env node

/**
 * Migration script to transfer favorites from JSON file to SQLite database
 * This script should be run once when upgrading from JSON to SQLite storage
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

class FavoritesMigration {
    constructor() {
        this.jsonFilePath = path.join(process.cwd(), 'data', 'favorites.json');
        this.dbPath = path.join(process.cwd(), 'data', 'favorites.db');
        this.db = null;
    }

    /**
     * Run the migration process
     */
    async migrate() {
        try {
            console.log('🚀 Starting favorites migration from JSON to SQLite...');

            // Check if JSON file exists
            if (!fs.existsSync(this.jsonFilePath)) {
                console.log('ℹ️  No existing favorites.json file found. Nothing to migrate.');
                return;
            }

            // Read JSON data
            const jsonData = this.readJsonFile();
            if (!jsonData || !jsonData.favorites || jsonData.favorites.length === 0) {
                console.log('ℹ️  No favorites found in JSON file. Nothing to migrate.');
                return;
            }

            console.log(`📊 Found ${jsonData.favorites.length} favorites to migrate`);

            // Initialize SQLite database
            await this.initializeDatabase();

            // Migrate data
            await this.migrateData(jsonData.favorites);

            // Close database connection
            await this.closeDatabase();

            // Backup JSON file
            this.backupJsonFile();

            console.log('✅ Migration completed successfully!');
            console.log(`📁 Original JSON file backed up as: ${this.jsonFilePath}.backup`);
            console.log(`🗄️  SQLite database created at: ${this.dbPath}`);

        } catch (error) {
            console.error('❌ Migration failed:', error.message);
            process.exit(1);
        }
    }

    /**
     * Read and parse the JSON file
     */
    readJsonFile() {
        try {
            const data = fs.readFileSync(this.jsonFilePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Failed to read JSON file:', error.message);
            throw error;
        }
    }

    /**
     * Initialize SQLite database and create table
     */
    async initializeDatabase() {
        return new Promise((resolve, reject) => {
            // Ensure data directory exists
            const dataDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            // Create or open database
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    reject(new Error(`Failed to connect to SQLite database: ${err.message}`));
                    return;
                }
                console.log('📦 Connected to SQLite database');
            });

            // Create favorites table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS favorites (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    dateAdded TEXT NOT NULL
                )
            `, (err) => {
                if (err) {
                    reject(new Error(`Failed to create favorites table: ${err.message}`));
                } else {
                    console.log('📋 Favorites table created');
                    resolve();
                }
            });
        });
    }

    /**
     * Migrate favorites data to SQLite
     */
    async migrateData(favorites) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare('INSERT OR REPLACE INTO favorites (id, name, dateAdded) VALUES (?, ?, ?)');
            
            let completed = 0;
            let errors = 0;

            favorites.forEach((favorite, index) => {
                const { id, name, dateAdded } = favorite;
                
                // Validate required fields
                if (!id || !name) {
                    console.warn(`⚠️  Skipping invalid favorite at index ${index}: missing id or name`);
                    errors++;
                    return;
                }

                // Ensure dateAdded is in ISO format
                let formattedDate = dateAdded;
                if (!dateAdded) {
                    formattedDate = new Date().toISOString();
                } else {
                    try {
                        formattedDate = new Date(dateAdded).toISOString();
                    } catch (dateError) {
                        formattedDate = new Date().toISOString();
                        console.warn(`⚠️  Invalid date for favorite "${name}", using current date`);
                    }
                }

                stmt.run([id, name, formattedDate], (err) => {
                    if (err) {
                        console.error(`❌ Failed to migrate favorite "${name}":`, err.message);
                        errors++;
                    } else {
                        completed++;
                        console.log(`✓ Migrated: ${name}`);
                    }

                    // Check if all items have been processed
                    if (completed + errors === favorites.length) {
                        stmt.finalize();
                        console.log(`📊 Migration summary: ${completed} successful, ${errors} errors`);
                        resolve();
                    }
                });
            });
        });
    }

    /**
     * Close database connection
     */
    async closeDatabase() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        reject(new Error(`Failed to close database: ${err.message}`));
                    } else {
                        console.log('🔒 Database connection closed');
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }

    /**
     * Backup the original JSON file
     */
    backupJsonFile() {
        try {
            const backupPath = `${this.jsonFilePath}.backup`;
            fs.copyFileSync(this.jsonFilePath, backupPath);
            console.log(`💾 JSON file backed up to: ${backupPath}`);
        } catch (error) {
            console.warn(`⚠️  Failed to backup JSON file: ${error.message}`);
        }
    }
}

// Run migration if this script is executed directly
if (require.main === module) {
    const migration = new FavoritesMigration();
    migration.migrate().catch(error => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
}

module.exports = FavoritesMigration;
