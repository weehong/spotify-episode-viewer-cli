/**
 * Tests for Configuration class
 */

const Configuration = require('../src/config/Configuration');

describe('Configuration Tests', () => {
    // Save original environment variables
    const originalEnv = { ...process.env };
    
    beforeEach(() => {
        // Set test environment variables before each test
        process.env.CLIENT_ID = 'test_client_id';
        process.env.CLIENT_SECRET = 'test_client_secret';
    });
    
    afterEach(() => {
        // Restore original environment variables after each test
        Object.keys(process.env).forEach(key => {
            process.env[key] = originalEnv[key];
        });
    });
    
    test('should load environment variables', () => {
        const config = new Configuration();
        
        expect(config.get('spotify.clientId')).toBe('test_client_id');
        expect(config.get('spotify.clientSecret')).toBe('test_client_secret');
    });

    test('should have default values', () => {
        const config = new Configuration();
        
        expect(config.get('spotify.tokenUrl')).toBe('https://accounts.spotify.com/api/token');
        expect(config.get('spotify.apiBaseUrl')).toBe('https://api.spotify.com/v1');
    });

    test('should validate required fields', async () => {
        // Clear required environment variables
        delete process.env.CLIENT_ID;
        delete process.env.CLIENT_SECRET;
        
        expect(() => {
            new Configuration();
        }).toThrow();
        
        // Restore for other tests
        process.env.CLIENT_ID = 'test_client_id';
        process.env.CLIENT_SECRET = 'test_client_secret';
    });

    test('should return nested values', () => {
        const config = new Configuration();
        
        const spotifyConfig = config.getSpotifyConfig();
        expect(spotifyConfig.clientId).toBeTruthy();
        expect(spotifyConfig.clientSecret).toBeTruthy();
        
        const appConfig = config.getAppConfig();
        expect(appConfig.defaultShowId).toBeTruthy();
    });

    test('should check validity', () => {
        const config = new Configuration();
        expect(config.isValid()).toBe(true);
    });
    
    test('should handle missing optional values', () => {
        // Test with only required fields
        process.env.CLIENT_ID = 'test_client_id';
        process.env.CLIENT_SECRET = 'test_client_secret';
        delete process.env.LOG_LEVEL;
        
        const config = new Configuration();
        expect(config.isValid()).toBe(true);
        // Should use default log level when not specified
        expect(config.get('app.logLevel')).toBe('info');
    });
    
    test('should override defaults with environment variables', () => {
        // Set custom values
        process.env.LOG_LEVEL = 'debug';
        process.env.DEFAULT_SHOW_ID = 'custom_show_id';
        
        const config = new Configuration();
        expect(config.get('app.logLevel')).toBe('debug');
        expect(config.get('app.defaultShowId')).toBe('custom_show_id');
    });
});
