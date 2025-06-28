/**
 * Integration tests for the complete Spotify Show Application
 * Tests the full application flow with mocked external dependencies
 */

const SpotifyShowApp = require('../src/SpotifyShowApp');
const ServiceRegistration = require('../src/container/ServiceRegistration');

// Mock HTTP Client for integration testing
class MockHttpClientForIntegration {
    constructor() {
        this.requests = [];
    }

    async get(url, options = {}) {
        this.requests.push({ method: 'GET', url, options });

        // Mock Spotify API responses
        if (url.includes('/episodes')) {
            return this.getMockEpisodesResponse();
        }

        if (url.includes('/shows/')) {
            return this.getMockShowResponse();
        }

        throw new Error(`Unexpected GET request to: ${url}`);
    }

    async post(url, data, options = {}) {
        this.requests.push({ method: 'POST', url, data, options });

        // Mock token response
        if (url.includes('token')) {
            return {
                access_token: 'mock_access_token_12345',
                token_type: 'Bearer',
                expires_in: 3600
            };
        }

        throw new Error(`Unexpected POST request to: ${url}`);
    }

    getMockShowResponse() {
        return {
            id: 'test-show-123',
            name: 'Test Podcast Show',
            description: 'A comprehensive test podcast for integration testing',
            publisher: 'Test Publisher Inc.',
            language: 'en',
            total_episodes: 42,
            explicit: false,
            images: [
                { url: 'https://example.com/show-image.jpg', width: 640, height: 640 }
            ],
            external_urls: {
                spotify: 'https://open.spotify.com/show/test-show-123'
            },
            copyrights: [
                { text: '© 2023 Test Publisher Inc.', type: 'C' }
            ],
            media_type: 'audio',
            is_externally_hosted: false,
            available_markets: ['US', 'CA', 'GB'],
            html_description: '<p>A comprehensive test podcast for integration testing</p>'
        };
    }

    getMockEpisodesResponse() {
        return {
            items: [
                {
                    id: 'episode-1',
                    name: 'Test Episode 1: Introduction',
                    description: 'The first episode of our test podcast series',
                    release_date: '2023-12-01',
                    duration_ms: 2400000, // 40 minutes
                    explicit: false,
                    language: 'en',
                    images: [
                        { url: 'https://example.com/episode-1.jpg', width: 640, height: 640 }
                    ],
                    external_urls: {
                        spotify: 'https://open.spotify.com/episode/episode-1'
                    }
                },
                {
                    id: 'episode-2',
                    name: 'Test Episode 2: Deep Dive',
                    description: 'A deeper exploration of our test topics',
                    release_date: '2023-12-08',
                    duration_ms: 3600000, // 60 minutes
                    explicit: false,
                    language: 'en',
                    images: [
                        { url: 'https://example.com/episode-2.jpg', width: 640, height: 640 }
                    ],
                    external_urls: {
                        spotify: 'https://open.spotify.com/episode/episode-2'
                    }
                }
            ],
            total: 42,
            next: 'https://api.spotify.com/v1/shows/test-show-123/episodes?offset=20',
            previous: null
        };
    }

    getRequestHistory() {
        return this.requests;
    }

    clearHistory() {
        this.requests = [];
    }
}

module.exports = function (runner) {
    runner.test('Integration - Full application initialization', async () => {
        // Set up test environment
        process.env.CLIENT_ID = 'test_client_id';
        process.env.CLIENT_SECRET = 'test_client_secret';
        process.env.DEFAULT_SHOW_ID = 'test-show-123';

        const app = new SpotifyShowApp();

        try {
            await app.initialize();
            runner.assert(app.initialized, 'Application should be initialized');
            runner.assert(app.container, 'Should have DI container');
            runner.assert(app.logger, 'Should have logger');
            runner.assert(app.showService, 'Should have show service');
        } finally {
            await app.shutdown();
        }
    });

    runner.test('Integration - Service dependency resolution', async () => {
        const container = ServiceRegistration.configureContainer();

        // Test that all services can be resolved
        const config = container.resolve('configuration');
        const httpClient = container.resolve('httpClient');
        const authService = container.resolve('authenticationService');
        const apiClient = container.resolve('spotifyApiClient');
        const showService = container.resolve('showService');
        const logger = container.resolve('logger');

        runner.assert(config, 'Should resolve configuration');
        runner.assert(httpClient, 'Should resolve HTTP client');
        runner.assert(authService, 'Should resolve auth service');
        runner.assert(apiClient, 'Should resolve API client');
        runner.assert(showService, 'Should resolve show service');
        runner.assert(logger, 'Should resolve logger');

        // Test dependency injection worked correctly
        runner.assert(authService.httpClient === httpClient, 'Auth service should have HTTP client injected');
        runner.assert(apiClient.httpClient === httpClient, 'API client should have HTTP client injected');
        runner.assert(apiClient.authService === authService, 'API client should have auth service injected');
    });

    runner.test('Integration - End-to-end show details flow with mocks', async () => {
        // Set up test environment
        process.env.CLIENT_ID = 'test_client_id';
        process.env.CLIENT_SECRET = 'test_client_secret';

        // Create container and replace HTTP client with mock
        const container = ServiceRegistration.configureContainer();
        const mockHttpClient = new MockHttpClientForIntegration();
        container.registerInstance('httpClient', mockHttpClient);

        // Re-register services that depend on HTTP client
        const config = container.resolve('configuration');
        const SpotifyAuthenticationService = require('../src/services/SpotifyAuthenticationService');
        const SpotifyApiClient = require('../src/clients/SpotifyApiClient');
        const ShowService = require('../src/services/ShowService');

        const authService = new SpotifyAuthenticationService(mockHttpClient, config);
        const apiClient = new SpotifyApiClient(mockHttpClient, authService, config);
        const logger = container.resolve('logger');
        const showService = new ShowService(apiClient, logger);

        // Test the complete flow
        const showDetails = await showService.getShowDetails('test-show-123');

        // Verify the response
        runner.assertEqual(showDetails.id, 'test-show-123');
        runner.assertEqual(showDetails.name, 'Test Podcast Show');
        runner.assertEqual(showDetails.publisher, 'Test Publisher Inc.');
        runner.assertEqual(showDetails.totalEpisodes, 42);
        runner.assert(Array.isArray(showDetails.images), 'Should have images array');

        // Verify the correct API calls were made
        const requests = mockHttpClient.getRequestHistory();
        runner.assert(requests.length >= 2, 'Should have made at least 2 requests (token + show)');

        const tokenRequest = requests.find(r => r.url.includes('token'));
        const showRequest = requests.find(r => r.url.includes('/shows/'));

        runner.assert(tokenRequest, 'Should have made token request');
        runner.assert(showRequest, 'Should have made show request');
        runner.assertEqual(tokenRequest.method, 'POST');
        runner.assertEqual(showRequest.method, 'GET');
    });

    runner.test('Integration - End-to-end episodes flow with mocks', async () => {
        // Set up test environment
        process.env.CLIENT_ID = 'test_client_id';
        process.env.CLIENT_SECRET = 'test_client_secret';

        // Create container and replace HTTP client with mock
        const container = ServiceRegistration.configureContainer();
        const mockHttpClient = new MockHttpClientForIntegration();
        mockHttpClient.clearHistory(); // Clear any previous requests
        container.registerInstance('httpClient', mockHttpClient);

        // Re-register services
        const config = container.resolve('configuration');
        const SpotifyAuthenticationService = require('../src/services/SpotifyAuthenticationService');
        const SpotifyApiClient = require('../src/clients/SpotifyApiClient');
        const ShowService = require('../src/services/ShowService');

        const authService = new SpotifyAuthenticationService(mockHttpClient, config);
        const apiClient = new SpotifyApiClient(mockHttpClient, authService, config);
        const logger = container.resolve('logger');
        const showService = new ShowService(apiClient, logger);

        // Test episodes retrieval
        const episodesData = await showService.getShowEpisodes('test-show-123', 1, 20);

        // Verify the response
        runner.assert(Array.isArray(episodesData.episodes), 'Should have episodes array');
        runner.assertEqual(episodesData.episodes.length, 2);
        runner.assert(episodesData.pagination, 'Should have pagination info');
        runner.assertEqual(episodesData.pagination.currentPage, 1);
        runner.assertEqual(episodesData.pagination.totalItems, 42);

        // With reverse chronological order, episode-2 (Dec 8) should be first as it's newer than episode-1 (Dec 1)
        const firstEpisode = episodesData.episodes[0];
        runner.assertEqual(firstEpisode.id, 'episode-2', 'First episode should be the newest (episode-2)');
        runner.assertEqual(firstEpisode.name, 'Test Episode 2: Deep Dive');
        
        const secondEpisode = episodesData.episodes[1];
        runner.assertEqual(secondEpisode.id, 'episode-1', 'Second episode should be older (episode-1)');
        runner.assertEqual(secondEpisode.name, 'Test Episode 1: Introduction');

        // Verify API calls
        const requests = mockHttpClient.getRequestHistory();
        const episodesRequest = requests.find(r => r.url.includes('/episodes'));
        runner.assert(episodesRequest, 'Should have made episodes request');
    });

    runner.test('Integration - Error handling throughout the stack', async () => {
        // Create a mock that throws errors
        class ErrorHttpClient {
            async get() { throw new Error('Network error'); }
            async post() { throw new Error('Network error'); }
        }

        const container = ServiceRegistration.configureContainer();
        container.registerInstance('httpClient', new ErrorHttpClient());

        const config = container.resolve('configuration');
        const SpotifyAuthenticationService = require('../src/services/SpotifyAuthenticationService');
        const authService = new SpotifyAuthenticationService(container.resolve('httpClient'), config);

        // Test that errors propagate correctly
        await runner.assertThrows(async () => {
            await authService.getAccessToken();
        }, 'Should throw error when HTTP client fails');
    });
};
