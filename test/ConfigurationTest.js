/**
 * Tests for Configuration class
 */

const Configuration = require('../src/config/Configuration');

module.exports = function(runner) {
    runner.test('Configuration - should load environment variables', () => {
        // Set test environment variables
        process.env.CLIENT_ID = 'test_client_id';
        process.env.CLIENT_SECRET = 'test_client_secret';
        
        const config = new Configuration();
        
        runner.assertEqual(config.get('spotify.clientId'), 'test_client_id');
        runner.assertEqual(config.get('spotify.clientSecret'), 'test_client_secret');
    });

    runner.test('Configuration - should have default values', () => {
        const config = new Configuration();
        
        runner.assertEqual(config.get('spotify.tokenUrl'), 'https://accounts.spotify.com/api/token');
        runner.assertEqual(config.get('spotify.apiBaseUrl'), 'https://api.spotify.com/v1');
    });

    runner.test('Configuration - should validate required fields', async () => {
        // Clear required environment variables
        delete process.env.CLIENT_ID;
        delete process.env.CLIENT_SECRET;
        
        await runner.assertThrows(() => {
            new Configuration();
        }, 'Should throw error for missing required configuration');
        
        // Restore for other tests
        process.env.CLIENT_ID = 'test_client_id';
        process.env.CLIENT_SECRET = 'test_client_secret';
    });

    runner.test('Configuration - should return nested values', () => {
        const config = new Configuration();
        
        const spotifyConfig = config.getSpotifyConfig();
        runner.assert(spotifyConfig.clientId, 'Should have clientId in spotify config');
        runner.assert(spotifyConfig.clientSecret, 'Should have clientSecret in spotify config');
        
        const appConfig = config.getAppConfig();
        runner.assert(appConfig.defaultShowId, 'Should have defaultShowId in app config');
    });

    runner.test('Configuration - should check validity', () => {
        const config = new Configuration();
        runner.assert(config.isValid(), 'Configuration should be valid with required fields');
    });
};
