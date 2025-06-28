const assert = require('assert');
const fs = require('fs');
const path = require('path');
const FavoritesService = require('../src/services/FavoritesService');

describe('FavoritesService', () => {
    let favoritesService;
    let mockConfig;
    let mockLogger;
    let testFavoritesPath;

    beforeEach(() => {
        // Setup test environment
        testFavoritesPath = path.join(process.cwd(), 'data', 'test_favorites.json');
        
        // Create mock dependencies
        mockConfig = {
            get: (key) => {
                if (key === 'favoritesFilePath') return testFavoritesPath;
                return null;
            }
        };
        
        mockLogger = {
            info: () => {},
            error: () => {},
            debug: () => {},
            warn: () => {}
        };
        
        // Create test instance with test file path
        favoritesService = new FavoritesService(mockConfig, mockLogger);
        
        // Ensure test file exists but is empty
        const testDir = path.dirname(testFavoritesPath);
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
        fs.writeFileSync(testFavoritesPath, JSON.stringify([]));
        
        // Override the file path in the service
        favoritesService.favoritesFilePath = testFavoritesPath;
        favoritesService.favorites = [];
    });
    
    afterEach(() => {
        // Clean up test file
        if (fs.existsSync(testFavoritesPath)) {
            fs.unlinkSync(testFavoritesPath);
        }
    });
    
    describe('addToFavorites', () => {
        it('should add a new show to favorites', () => {
            const showId = '1234567890abcdefghijkl';
            const showName = 'Test Show';
            
            favoritesService.addToFavorites(showId, showName);
            
            const favorites = favoritesService.getFavorites();
            assert.strictEqual(favorites.length, 1);
            assert.strictEqual(favorites[0].id, showId);
            assert.strictEqual(favorites[0].name, showName);
        });
        
        it('should not add duplicate shows', () => {
            const showId = '1234567890abcdefghijkl';
            const showName = 'Test Show';
            
            favoritesService.addToFavorites(showId, showName);
            favoritesService.addToFavorites(showId, 'Updated Name');
            
            const favorites = favoritesService.getFavorites();
            assert.strictEqual(favorites.length, 1);
            assert.strictEqual(favorites[0].id, showId);
            assert.strictEqual(favorites[0].name, 'Updated Name'); // Name should be updated
        });
    });
    
    describe('getFavorites', () => {
        it('should return empty array when no favorites exist', () => {
            const favorites = favoritesService.getFavorites();
            assert.strictEqual(Array.isArray(favorites), true);
            assert.strictEqual(favorites.length, 0);
        });
        
        it('should return all favorites', () => {
            favoritesService.addToFavorites('id1', 'Show 1');
            favoritesService.addToFavorites('id2', 'Show 2');
            
            const favorites = favoritesService.getFavorites();
            assert.strictEqual(favorites.length, 2);
            assert.strictEqual(favorites[0].id, 'id1');
            assert.strictEqual(favorites[1].id, 'id2');
        });
    });
    
    describe('removeFromFavorites', () => {
        it('should remove a show from favorites', () => {
            favoritesService.addToFavorites('id1', 'Show 1');
            favoritesService.addToFavorites('id2', 'Show 2');
            
            const result = favoritesService.removeFromFavorites('id1');
            assert.strictEqual(result, true);
            
            const favorites = favoritesService.getFavorites();
            assert.strictEqual(favorites.length, 1);
            assert.strictEqual(favorites[0].id, 'id2');
        });
        
        it('should return false when trying to remove non-existent show', () => {
            favoritesService.addToFavorites('id1', 'Show 1');
            
            const result = favoritesService.removeFromFavorites('non-existent-id');
            assert.strictEqual(result, false);
            
            const favorites = favoritesService.getFavorites();
            assert.strictEqual(favorites.length, 1);
        });
    });
    
    describe('clearFavorites', () => {
        it('should clear all favorites', () => {
            favoritesService.addToFavorites('id1', 'Show 1');
            favoritesService.addToFavorites('id2', 'Show 2');
            
            const result = favoritesService.clearFavorites();
            assert.strictEqual(result, true);
            
            const favorites = favoritesService.getFavorites();
            assert.strictEqual(favorites.length, 0);
        });
    });
    
    describe('file operations', () => {
        it('should load favorites from file', () => {
            // Setup test data
            const testData = [
                { id: 'test1', name: 'Test Show 1' },
                { id: 'test2', name: 'Test Show 2' }
            ];
            fs.writeFileSync(testFavoritesPath, JSON.stringify(testData));
            
            // Create new instance to force loading from file
            const newService = new FavoritesService(mockConfig, mockLogger);
            newService.favoritesFilePath = testFavoritesPath;
            newService.loadFavorites();
            
            const favorites = newService.getFavorites();
            assert.strictEqual(favorites.length, 2);
            assert.strictEqual(favorites[0].id, 'test1');
            assert.strictEqual(favorites[1].id, 'test2');
        });
        
        it('should save favorites to file', () => {
            favoritesService.addToFavorites('id1', 'Show 1');
            favoritesService.addToFavorites('id2', 'Show 2');
            
            // Create new instance to force loading from file
            const newService = new FavoritesService(mockConfig, mockLogger);
            newService.favoritesFilePath = testFavoritesPath;
            newService.loadFavorites();
            
            const favorites = newService.getFavorites();
            assert.strictEqual(favorites.length, 2);
            assert.strictEqual(favorites[0].id, 'id1');
            assert.strictEqual(favorites[1].id, 'id2');
        });
        
        it('should handle file read errors gracefully', () => {
            // Make the file unreadable
            fs.chmodSync(testFavoritesPath, 0);
            
            // This should not throw an error, but log it and use empty array
            const newService = new FavoritesService(mockConfig, mockLogger);
            newService.favoritesFilePath = testFavoritesPath;
            
            const favorites = newService.getFavorites();
            assert.strictEqual(Array.isArray(favorites), true);
            assert.strictEqual(favorites.length, 0);
            
            // Reset permissions for cleanup
            fs.chmodSync(testFavoritesPath, 0o666);
        });
    });
});
