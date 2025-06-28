const FavoritesService = require('../src/services/FavoritesService');
const path = require('path');
const fs = require('fs');

describe('FavoritesService with SQLite', () => {
    let favoritesService;
    let mockLogger;
    let mockConfiguration;
    let testDbPath;

    beforeEach(async () => {
        // Create mock logger
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn()
        };

        // Create mock configuration
        mockConfiguration = {};

        // Use a test database path
        testDbPath = path.join(process.cwd(), 'data', 'test-favorites.db');
        
        // Clean up any existing test database
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }

        // Create service instance with test database path
        favoritesService = new FavoritesService(mockConfiguration, mockLogger, testDbPath);
        
        // Wait for database initialization to complete
        await favoritesService.dbReady;
    });

    afterEach(async () => {
        // Close database connection
        if (favoritesService && favoritesService.db) {
            await favoritesService.close();
        }

        // Clean up test database
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
    });

    describe('addToFavorites', () => {
        test('should add a new show to favorites', async () => {
            const showId = 'test123';
            const showName = 'Test Show';

            const result = await favoritesService.addToFavorites(showId, showName);

            expect(result).toBe(true);
            expect(mockLogger.info).toHaveBeenCalledWith(`Added "${showName}" to favorites`);
        });

        test('should update existing show name if different', async () => {
            const showId = 'test123';
            const oldName = 'Old Show Name';
            const newName = 'New Show Name';

            // Add show first
            await favoritesService.addToFavorites(showId, oldName);
            
            // Update with new name
            const result = await favoritesService.addToFavorites(showId, newName);

            expect(result).toBe(true);
            expect(mockLogger.info).toHaveBeenCalledWith(`Updated favorite show name: ${newName}`);
        });

        test('should not duplicate show if name is the same', async () => {
            const showId = 'test123';
            const showName = 'Test Show';

            // Add show first
            await favoritesService.addToFavorites(showId, showName);
            
            // Try to add same show again
            const result = await favoritesService.addToFavorites(showId, showName);

            expect(result).toBe(true);
            expect(mockLogger.info).toHaveBeenCalledWith(`Show "${showName}" is already in favorites`);
        });
    });

    describe('getFavorites', () => {
        test('should return empty array when no favorites exist', async () => {
            const favorites = await favoritesService.getFavorites();

            expect(favorites).toEqual([]);
        });

        test('should return all favorites ordered by date added (newest first)', async () => {
            // Add multiple shows
            await favoritesService.addToFavorites('show1', 'First Show');
            await favoritesService.addToFavorites('show2', 'Second Show');
            await favoritesService.addToFavorites('show3', 'Third Show');

            const favorites = await favoritesService.getFavorites();

            expect(favorites).toHaveLength(3);
            expect(favorites[0].name).toBe('Third Show'); // Most recent first
            expect(favorites[1].name).toBe('Second Show');
            expect(favorites[2].name).toBe('First Show');
        });
    });

    describe('removeFromFavorites', () => {
        test('should remove existing show from favorites', async () => {
            const showId = 'test123';
            const showName = 'Test Show';

            // Add show first
            await favoritesService.addToFavorites(showId, showName);
            
            // Remove show
            const result = await favoritesService.removeFromFavorites(showId);

            expect(result).toBe(true);
            expect(mockLogger.info).toHaveBeenCalledWith(`Removed show from favorites: ${showId}`);
        });

        test('should return false when trying to remove non-existent show', async () => {
            const result = await favoritesService.removeFromFavorites('nonexistent');

            expect(result).toBe(false);
            expect(mockLogger.warn).toHaveBeenCalledWith('Show with ID nonexistent not found in favorites');
        });
    });

    describe('clearFavorites', () => {
        test('should clear all favorites', async () => {
            // Add multiple shows
            await favoritesService.addToFavorites('show1', 'First Show');
            await favoritesService.addToFavorites('show2', 'Second Show');

            // Clear all
            const result = await favoritesService.clearFavorites();

            expect(result).toBe(true);
            
            // Verify all favorites are cleared
            const favorites = await favoritesService.getFavorites();
            expect(favorites).toHaveLength(0);
        });
    });

    describe('updateShowName', () => {
        test('should update show name for existing show', async () => {
            const showId = 'test123';
            const oldName = 'Old Name';
            const newName = 'New Name';

            // Add show first
            await favoritesService.addToFavorites(showId, oldName);
            
            // Update name
            const result = await favoritesService.updateShowName(showId, newName);

            expect(result).toBe(true);
            expect(mockLogger.info).toHaveBeenCalledWith(`Updated show name to: ${newName}`);
        });

        test('should return false when trying to update non-existent show', async () => {
            const result = await favoritesService.updateShowName('nonexistent', 'New Name');

            expect(result).toBe(false);
            expect(mockLogger.warn).toHaveBeenCalledWith('Show with ID nonexistent not found in favorites');
        });
    });
});
