const SpotifyApiClient = require('../src/clients/SpotifyApiClient');

// Mock dependencies
class MockHttpClient {
    constructor() {
        this.responses = new Map();
        this.lastRequest = null;
    }

    setResponse(url, response) {
        this.responses.set(url, response);
    }

    async get(url, options) {
        this.lastRequest = { url, options };

        // Check for search endpoint
        if (url.includes('/search')) {
            return {
                episodes: {
                    items: [
                        {
                            id: 'episode123',
                            name: 'Test Episode 201: Advanced Topics',
                            description: 'This is episode 201 covering advanced topics',
                            release_date: '2023-01-01',
                            duration_ms: 1800000,
                            explicit: false,
                            external_urls: { spotify: 'https://spotify.com/episode/123' }
                        }
                    ]
                }
            };
        }

        const response = this.responses.get(url);
        if (response) {
            return response;
        }

        throw new Error(`No mock response set for URL: ${url}`);
    }
}

class MockConfiguration {
    getSpotifyConfig() {
        return {
            apiBaseUrl: 'https://api.spotify.com/v1'
        };
    }
}

class MockAuthenticationService {
    constructor() {
        this.accessToken = 'mock_access_token';
    }

    async getAccessToken() {
        return this.accessToken;
    }
}

class MockLogger {
    info() { }
    error() { }
    warn() { }
    debug() { }
}

module.exports = function (runner) {
    runner.test('SpotifyApiClient - should perform search with required parameters', async () => {
        const mockHttpClient = new MockHttpClient();
        const mockConfig = new MockConfiguration();
        const mockAuthService = new MockAuthenticationService();
        const mockLogger = new MockLogger();

        const apiClient = new SpotifyApiClient(mockHttpClient, mockAuthService, mockConfig);

        const searchOptions = {
            q: 'show:123 episode:201',
            type: 'episode',
            market: 'US',
            limit: 50
        };

        const result = await apiClient.search(searchOptions);

        runner.assert(result.episodes, 'Should return episodes in response');
        runner.assert(Array.isArray(result.episodes.items), 'Should have episodes items array');
        runner.assertEqual(result.episodes.items.length, 1, 'Should return one episode');

        // Check that the request was made correctly
        runner.assert(mockHttpClient.lastRequest, 'Should have made HTTP request');
        runner.assert(mockHttpClient.lastRequest.url.includes('/search'), 'Should call search endpoint');
        runner.assert(mockHttpClient.lastRequest.url.includes('q=show%3A123+episode%3A201'), 'Should include encoded query');
        runner.assert(mockHttpClient.lastRequest.url.includes('type=episode'), 'Should include type parameter');
        runner.assert(mockHttpClient.lastRequest.url.includes('market=US'), 'Should include market parameter');
        runner.assert(mockHttpClient.lastRequest.url.includes('limit=50'), 'Should include limit parameter');
    });

    runner.test('SpotifyApiClient - should validate required search parameters', async () => {
        const mockHttpClient = new MockHttpClient();
        const mockConfig = new MockConfiguration();
        const mockAuthService = new MockAuthenticationService();
        const mockLogger = new MockLogger();

        const apiClient = new SpotifyApiClient(mockHttpClient, mockAuthService, mockConfig);

        // Test missing query
        try {
            await apiClient.search({ type: 'episode' });
            runner.assert(false, 'Should throw error for missing query');
        } catch (error) {
            runner.assert(error.message.includes('Search query (q) is required'), 'Should require query parameter');
        }

        // Test missing type
        try {
            await apiClient.search({ q: 'test query' });
            runner.assert(false, 'Should throw error for missing type');
        } catch (error) {
            runner.assert(error.message.includes('Search type is required'), 'Should require type parameter');
        }
    });

    runner.test('SpotifyApiClient - should use default search parameters', async () => {
        const mockHttpClient = new MockHttpClient();
        const mockConfig = new MockConfiguration();
        const mockAuthService = new MockAuthenticationService();
        const mockLogger = new MockLogger();

        const apiClient = new SpotifyApiClient(mockHttpClient, mockAuthService, mockConfig);

        const searchOptions = {
            q: 'test query',
            type: 'episode'
        };

        await apiClient.search(searchOptions);

        // Check that default parameters were used
        runner.assert(mockHttpClient.lastRequest.url.includes('market=US'), 'Should use default market US');
        runner.assert(mockHttpClient.lastRequest.url.includes('limit=20'), 'Should use default limit 20');
        runner.assert(mockHttpClient.lastRequest.url.includes('offset=0'), 'Should use default offset 0');
    });

    runner.test('SpotifyApiClient - should limit search results to maximum 50', async () => {
        const mockHttpClient = new MockHttpClient();
        const mockConfig = new MockConfiguration();
        const mockAuthService = new MockAuthenticationService();
        const mockLogger = new MockLogger();

        const apiClient = new SpotifyApiClient(mockHttpClient, mockAuthService, mockConfig);

        const searchOptions = {
            q: 'test query',
            type: 'episode',
            limit: 100 // Try to exceed maximum
        };

        await apiClient.search(searchOptions);

        // Should clamp to maximum of 50
        runner.assert(mockHttpClient.lastRequest.url.includes('limit=50'), 'Should clamp limit to maximum 50');
    });

    runner.test('SpotifyApiClient - should handle search API errors', async () => {
        const mockHttpClient = {
            get: async () => { throw new Error('Network error'); }
        };
        const mockConfig = new MockConfiguration();
        const mockAuthService = new MockAuthenticationService();
        const mockLogger = new MockLogger();

        const apiClient = new SpotifyApiClient(mockHttpClient, mockAuthService, mockConfig);

        const searchOptions = {
            q: 'test query',
            type: 'episode'
        };

        try {
            await apiClient.search(searchOptions);
            runner.assert(false, 'Should throw error for network failure');
        } catch (error) {
            runner.assert(error.message.includes('Search failed'), 'Should wrap error with search context');
            runner.assert(error.message.includes('Network error'), 'Should include original error message');
        }
    });

    runner.test('SpotifyApiClient - should include authorization headers in search requests', async () => {
        const mockHttpClient = new MockHttpClient();
        const mockConfig = new MockConfiguration();
        const mockAuthService = new MockAuthenticationService();
        const mockLogger = new MockLogger();

        const apiClient = new SpotifyApiClient(mockHttpClient, mockAuthService, mockConfig);

        const searchOptions = {
            q: 'test query',
            type: 'episode'
        };

        await apiClient.search(searchOptions);

        // Check that authorization headers were included
        runner.assert(mockHttpClient.lastRequest.options, 'Should include request options');
        runner.assert(mockHttpClient.lastRequest.options.headers, 'Should include headers');
        runner.assert(mockHttpClient.lastRequest.options.headers.Authorization, 'Should include Authorization header');
        runner.assertEqual(mockHttpClient.lastRequest.options.headers.Authorization, 'Bearer mock_access_token', 'Should have correct authorization header');
    });
};
