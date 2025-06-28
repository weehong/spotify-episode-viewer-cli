/**
 * Tests for Popular Shows Service
 */

const PopularShowsService = require('../src/services/PopularShowsService');

class MockLogger {
    info(message) {}
    error(message) {}
    debug(message) {}
    warn(message) {}
}

describe('PopularShowsService', () => {
    test('should return popular shows', async () => {
        const logger = new MockLogger();
        const service = new PopularShowsService(logger);
        
        const shows = await service.getPopularShows();
        
        expect(Array.isArray(shows)).toBe(true);
        expect(shows.length).toBeGreaterThan(0);
        
        const firstShow = shows[0];
        expect(firstShow.id).toBeTruthy();
        expect(firstShow.name).toBeTruthy();
        expect(firstShow.publisher).toBeTruthy();
        expect(firstShow.category).toBeTruthy();
    });

    test('should find show by ID', async () => {
        const logger = new MockLogger();
        const service = new PopularShowsService(logger);
        
        const shows = await service.getPopularShows();
        const firstShowId = shows[0].id;
        
        const foundShow = await service.getPopularShowById(firstShowId);
        
        expect(foundShow).toBeTruthy();
        expect(foundShow.id).toBe(firstShowId);
        expect(foundShow.name).toBe(shows[0].name);
    });

    test('should return null for non-existent show', async () => {
        const logger = new MockLogger();
        const service = new PopularShowsService(logger);
        
        const foundShow = await service.getPopularShowById('non-existent-id');
        
        expect(foundShow).toBe(null);
    });

    test('should search shows by name', async () => {
        const logger = new MockLogger();
        const service = new PopularShowsService(logger);
        
        const results = await service.searchPopularShows('Joe Rogan');
        
        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBeGreaterThan(0);
        
        const foundShow = results[0];
        expect(foundShow.name.toLowerCase().includes('joe rogan')).toBe(true);
    });

    test('should search shows by publisher', async () => {
        const logger = new MockLogger();
        const service = new PopularShowsService(logger);
        
        const results = await service.searchPopularShows('TED');
        
        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBeGreaterThan(0);
        
        const foundShow = results[0];
        expect(
            foundShow.name.toLowerCase().includes('ted') || 
            foundShow.publisher.toLowerCase().includes('ted')
        ).toBe(true);
    });

    test('should return empty array for no matches', async () => {
        const logger = new MockLogger();
        const service = new PopularShowsService(logger);
        
        const results = await service.searchPopularShows('NonExistentShow12345');
        
        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBe(0);
    });

    test('should get shows by category', async () => {
        const logger = new MockLogger();
        const service = new PopularShowsService(logger);
        
        const comedyShows = await service.getShowsByCategory('Comedy');
        
        expect(Array.isArray(comedyShows)).toBe(true);
        expect(comedyShows.length).toBeGreaterThan(0);
        
        comedyShows.forEach(show => {
            expect(show.category).toBe('Comedy');
        });
    });

    test('should get available categories', async () => {
        const logger = new MockLogger();
        const service = new PopularShowsService(logger);
        
        const categories = await service.getCategories();
        
        expect(Array.isArray(categories)).toBe(true);
        expect(categories.length).toBeGreaterThan(0);
        expect(categories).toContain('Comedy');
        expect(categories).toContain('Education');
        
        // Check that categories are sorted
        const sortedCategories = [...categories].sort();
        expect(JSON.stringify(categories)).toBe(JSON.stringify(sortedCategories));
    });

    test('should get random shows', async () => {
        const logger = new MockLogger();
        const service = new PopularShowsService(logger);
        
        const randomShows = await service.getRandomShows(3);
        
        expect(Array.isArray(randomShows)).toBe(true);
        expect(randomShows.length).toBe(3);
        
        // Check that all returned shows are valid
        randomShows.forEach(show => {
            expect(show.id).toBeTruthy();
            expect(show.name).toBeTruthy();
        });
    });

    test('should handle edge cases in search', async () => {
        const logger = new MockLogger();
        const service = new PopularShowsService(logger);
        
        // Test empty search
        const emptyResults = await service.searchPopularShows('');
        expect(emptyResults.length).toBe(0);
        
        // Test null search
        const nullResults = await service.searchPopularShows(null);
        expect(nullResults.length).toBe(0);
        
        // Test undefined search
        const undefinedResults = await service.searchPopularShows(undefined);
        expect(undefinedResults.length).toBe(0);
    });

    test('should add new popular show', async () => {
        const logger = new MockLogger();
        const service = new PopularShowsService(logger);
        
        const newShow = {
            id: 'test-show-123',
            name: 'Test Show',
            publisher: 'Test Publisher',
            description: 'A test show',
            category: 'Test',
            language: 'en'
        };
        
        const result = await service.addPopularShow(newShow);
        
        expect(result).toBe(true);
        
        // Verify the show was added
        const foundShow = await service.getPopularShowById('test-show-123');
        expect(foundShow).toBeTruthy();
        expect(foundShow.name).toBe('Test Show');
    });

    test('should reject duplicate show addition', async () => {
        const logger = new MockLogger();
        const service = new PopularShowsService(logger);
        
        const shows = await service.getPopularShows();
        const existingShow = shows[0];
        
        await expect(async () => {
            await service.addPopularShow(existingShow);
        }).rejects.toThrow();
    });

    test('should remove popular show', async () => {
        const logger = new MockLogger();
        const service = new PopularShowsService(logger);
        
        // Add a test show first
        const testShow = {
            id: 'test-remove-123',
            name: 'Test Remove Show',
            publisher: 'Test Publisher'
        };
        
        await service.addPopularShow(testShow);
        
        // Verify it exists
        let foundShow = await service.getPopularShowById('test-remove-123');
        expect(foundShow).toBeTruthy();
        
        // Remove it
        const result = await service.removePopularShow('test-remove-123');
        expect(result).toBe(true);
        
        // Verify it's gone
        foundShow = await service.getPopularShowById('test-remove-123');
        expect(foundShow).toBe(null);
    });

    test('should return false for removing non-existent show', async () => {
        const logger = new MockLogger();
        const service = new PopularShowsService(logger);
        
        const result = await service.removePopularShow('non-existent-show');
        
        expect(result).toBe(false);
    });
});
