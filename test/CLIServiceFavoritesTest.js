const assert = require('assert');
const CLIService = require('../src/services/CLIService');

describe('CLIService Favorites Functionality', () => {
    let cliService;
    let mockFavoritesService;
    let mockSpotifyApiClient;
    let mockLogger;

    beforeEach(() => {
        // Create mock dependencies
        mockFavoritesService = {
            addToFavorites: (showId, showName) => {
                return true;
            },
            getFavorites: () => {
                return [
                    { id: 'show1', name: 'Test Show 1' },
                    { id: 'show2', name: 'Test Show 2' }
                ];
            },
            removeFromFavorites: (showId) => {
                return showId === 'show1';
            },
            clearFavorites: () => {
                return true;
            }
        };
        
        mockSpotifyApiClient = {
            searchShows: async (query, limit, offset) => {
                if (query === 'test') {
                    return {
                        shows: {
                            items: [
                                {
                                    id: 'show1',
                                    name: 'Test Show 1',
                                    publisher: 'Test Publisher 1',
                                    description: 'Test Description 1'
                                },
                                {
                                    id: 'show2',
                                    name: 'Test Show 2',
                                    publisher: 'Test Publisher 2',
                                    description: 'Test Description 2'
                                }
                            ]
                        }
                    };
                } else if (query === 'empty') {
                    return { shows: { items: [] } };
                } else if (query === 'error') {
                    throw new Error('API Error');
                }
                return { shows: { items: [] } };
            }
        };
        
        mockLogger = {
            info: () => {},
            error: () => {},
            debug: () => {},
            warn: () => {}
        };
        
        // Create test instance
        cliService = new CLIService({
            favoritesService: mockFavoritesService,
            spotifyApiClient: mockSpotifyApiClient,
            logger: mockLogger
        });
    });
    
    describe('getFavorites', () => {
        it('should return favorites from the service', async () => {
            const result = await cliService.getFavorites();
            
            assert.strictEqual(result.success, true);
            assert.strictEqual(Array.isArray(result.data), true);
            assert.strictEqual(result.data.length, 2);
            assert.strictEqual(result.data[0].id, 'show1');
            assert.strictEqual(result.data[1].id, 'show2');
        });
        
        it('should handle errors gracefully', async () => {
            // Override the mock to throw an error
            mockFavoritesService.getFavorites = () => {
                throw new Error('Test error');
            };
            
            const result = await cliService.getFavorites();
            
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.error, 'Failed to get favorites: Test error');
        });
    });
    
    describe('addToFavorites', () => {
        it('should add a show to favorites', async () => {
            const result = await cliService.addToFavorites('show3', 'Test Show 3');
            
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.message, 'Show added to favorites');
        });
        
        it('should handle errors gracefully', async () => {
            // Override the mock to throw an error
            mockFavoritesService.addToFavorites = () => {
                throw new Error('Test error');
            };
            
            const result = await cliService.addToFavorites('show3', 'Test Show 3');
            
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.error, 'Failed to add to favorites: Test error');
        });
    });
    
    describe('removeFromFavorites', () => {
        it('should remove a show from favorites if it exists', async () => {
            const result = await cliService.removeFromFavorites('show1');
            
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.message, 'Show removed from favorites');
        });
        
        it('should return error if show does not exist', async () => {
            const result = await cliService.removeFromFavorites('nonexistent');
            
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.error, 'Show not found in favorites');
        });
        
        it('should handle errors gracefully', async () => {
            // Override the mock to throw an error
            mockFavoritesService.removeFromFavorites = () => {
                throw new Error('Test error');
            };
            
            const result = await cliService.removeFromFavorites('show1');
            
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.error, 'Failed to remove from favorites: Test error');
        });
    });
    
    describe('clearFavorites', () => {
        it('should clear all favorites', async () => {
            const result = await cliService.clearFavorites();
            
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.message, 'All favorites cleared');
        });
        
        it('should handle errors gracefully', async () => {
            // Override the mock to throw an error
            mockFavoritesService.clearFavorites = () => {
                throw new Error('Test error');
            };
            
            const result = await cliService.clearFavorites();
            
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.error, 'Failed to clear favorites: Test error');
        });
    });
    
    describe('searchShows', () => {
        it('should return search results from Spotify API', async () => {
            const result = await cliService.searchShows('test');
            
            assert.strictEqual(result.success, true);
            assert.strictEqual(Array.isArray(result.data), true);
            assert.strictEqual(result.data.length, 2);
            assert.strictEqual(result.data[0].id, 'show1');
            assert.strictEqual(result.data[1].id, 'show2');
        });
        
        it('should return empty array for no results', async () => {
            const result = await cliService.searchShows('empty');
            
            assert.strictEqual(result.success, true);
            assert.strictEqual(Array.isArray(result.data), true);
            assert.strictEqual(result.data.length, 0);
        });
        
        it('should handle API errors gracefully', async () => {
            const result = await cliService.searchShows('error');
            
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.error, 'Failed to search shows: API Error');
        });
        
        it('should validate search query', async () => {
            const result = await cliService.searchShows('');
            
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.error, 'Search query is required');
        });
    });
});
