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

module.exports = function(runner) {
    runner.test('PopularShowsService - should return popular shows', async () => {
        const logger = new MockLogger();
        const service = new PopularShowsService(logger);
        
        const shows = await service.getPopularShows();
        
        runner.assert(Array.isArray(shows), 'Should return an array');
        runner.assert(shows.length > 0, 'Should have popular shows');
        
        const firstShow = shows[0];
        runner.assert(firstShow.id, 'Show should have ID');
        runner.assert(firstShow.name, 'Show should have name');
        runner.assert(firstShow.publisher, 'Show should have publisher');
        runner.assert(firstShow.category, 'Show should have category');
    });

    runner.test('PopularShowsService - should find show by ID', async () => {
        const logger = new MockLogger();
        const service = new PopularShowsService(logger);
        
        const shows = await service.getPopularShows();
        const firstShowId = shows[0].id;
        
        const foundShow = await service.getPopularShowById(firstShowId);
        
        runner.assert(foundShow, 'Should find the show');
        runner.assertEqual(foundShow.id, firstShowId);
        runner.assertEqual(foundShow.name, shows[0].name);
    });

    runner.test('PopularShowsService - should return null for non-existent show', async () => {
        const logger = new MockLogger();
        const service = new PopularShowsService(logger);
        
        const foundShow = await service.getPopularShowById('non-existent-id');
        
        runner.assertEqual(foundShow, null);
    });

    runner.test('PopularShowsService - should search shows by name', async () => {
        const logger = new MockLogger();
        const service = new PopularShowsService(logger);
        
        const results = await service.searchPopularShows('Joe Rogan');
        
        runner.assert(Array.isArray(results), 'Should return an array');
        runner.assert(results.length > 0, 'Should find matching shows');
        
        const foundShow = results[0];
        runner.assert(foundShow.name.toLowerCase().includes('joe rogan'), 'Should match search term');
    });

    runner.test('PopularShowsService - should search shows by publisher', async () => {
        const logger = new MockLogger();
        const service = new PopularShowsService(logger);
        
        const results = await service.searchPopularShows('TED');
        
        runner.assert(Array.isArray(results), 'Should return an array');
        runner.assert(results.length > 0, 'Should find matching shows');
        
        const foundShow = results[0];
        runner.assert(
            foundShow.name.toLowerCase().includes('ted') || 
            foundShow.publisher.toLowerCase().includes('ted'),
            'Should match search term in name or publisher'
        );
    });

    runner.test('PopularShowsService - should return empty array for no matches', async () => {
        const logger = new MockLogger();
        const service = new PopularShowsService(logger);
        
        const results = await service.searchPopularShows('NonExistentShow12345');
        
        runner.assert(Array.isArray(results), 'Should return an array');
        runner.assertEqual(results.length, 0, 'Should return empty array for no matches');
    });

    runner.test('PopularShowsService - should get shows by category', async () => {
        const logger = new MockLogger();
        const service = new PopularShowsService(logger);
        
        const comedyShows = await service.getShowsByCategory('Comedy');
        
        runner.assert(Array.isArray(comedyShows), 'Should return an array');
        runner.assert(comedyShows.length > 0, 'Should find comedy shows');
        
        comedyShows.forEach(show => {
            runner.assertEqual(show.category, 'Comedy', 'All shows should be in Comedy category');
        });
    });

    runner.test('PopularShowsService - should get available categories', async () => {
        const logger = new MockLogger();
        const service = new PopularShowsService(logger);
        
        const categories = await service.getCategories();
        
        runner.assert(Array.isArray(categories), 'Should return an array');
        runner.assert(categories.length > 0, 'Should have categories');
        runner.assert(categories.includes('Comedy'), 'Should include Comedy category');
        runner.assert(categories.includes('Education'), 'Should include Education category');
        
        // Check that categories are sorted
        const sortedCategories = [...categories].sort();
        runner.assert(
            JSON.stringify(categories) === JSON.stringify(sortedCategories),
            'Categories should be sorted'
        );
    });

    runner.test('PopularShowsService - should get random shows', async () => {
        const logger = new MockLogger();
        const service = new PopularShowsService(logger);
        
        const randomShows = await service.getRandomShows(3);
        
        runner.assert(Array.isArray(randomShows), 'Should return an array');
        runner.assertEqual(randomShows.length, 3, 'Should return requested number of shows');
        
        // Check that all returned shows are valid
        randomShows.forEach(show => {
            runner.assert(show.id, 'Show should have ID');
            runner.assert(show.name, 'Show should have name');
        });
    });

    runner.test('PopularShowsService - should handle edge cases in search', async () => {
        const logger = new MockLogger();
        const service = new PopularShowsService(logger);
        
        // Test empty search
        const emptyResults = await service.searchPopularShows('');
        runner.assertEqual(emptyResults.length, 0, 'Should return empty array for empty search');
        
        // Test null search
        const nullResults = await service.searchPopularShows(null);
        runner.assertEqual(nullResults.length, 0, 'Should return empty array for null search');
        
        // Test undefined search
        const undefinedResults = await service.searchPopularShows(undefined);
        runner.assertEqual(undefinedResults.length, 0, 'Should return empty array for undefined search');
    });

    runner.test('PopularShowsService - should add new popular show', async () => {
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
        
        runner.assert(result, 'Should return true for successful addition');
        
        // Verify the show was added
        const foundShow = await service.getPopularShowById('test-show-123');
        runner.assert(foundShow, 'Should find the newly added show');
        runner.assertEqual(foundShow.name, 'Test Show');
    });

    runner.test('PopularShowsService - should reject duplicate show addition', async () => {
        const logger = new MockLogger();
        const service = new PopularShowsService(logger);
        
        const shows = await service.getPopularShows();
        const existingShow = shows[0];
        
        await runner.assertThrows(async () => {
            await service.addPopularShow(existingShow);
        }, 'Should throw error for duplicate show');
    });

    runner.test('PopularShowsService - should remove popular show', async () => {
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
        runner.assert(foundShow, 'Show should exist before removal');
        
        // Remove it
        const result = await service.removePopularShow('test-remove-123');
        runner.assert(result, 'Should return true for successful removal');
        
        // Verify it's gone
        foundShow = await service.getPopularShowById('test-remove-123');
        runner.assertEqual(foundShow, null, 'Show should not exist after removal');
    });

    runner.test('PopularShowsService - should return false for removing non-existent show', async () => {
        const logger = new MockLogger();
        const service = new PopularShowsService(logger);
        
        const result = await service.removePopularShow('non-existent-show');
        
        runner.assert(!result, 'Should return false for non-existent show removal');
    });
};
