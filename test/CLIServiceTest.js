/**
 * Tests for CLI Service
 */

const CLIService = require('../src/services/CLIService');

// Mock dependencies
class MockShowService {
    constructor(shouldThrow = false) {
        this.shouldThrow = shouldThrow;
    }

    async getShowDetails(showId) {
        if (this.shouldThrow) {
            throw new Error('Mock show service error');
        }

        return {
            id: showId,
            name: 'Test Show',
            publisher: 'Test Publisher',
            description: 'A test show description that is quite long and should be truncated when displayed in CLI format',
            language: 'en',
            totalEpisodes: 100,
            explicit: false,
            externalUrls: { spotify: 'https://spotify.com/show/test' },
            images: [{ url: 'https://example.com/image.jpg' }],
            copyrights: [{ text: 'Copyright Test' }]
        };
    }

    async getShowEpisodes(showId, page, pageSize) {
        if (this.shouldThrow) {
            throw new Error('Mock episodes service error');
        }

        return {
            episodes: [
                {
                    id: 'episode1',
                    name: 'Test Episode 1',
                    description: 'First test episode with a long description that should be truncated',
                    releaseDate: '2023-01-01',
                    durationMs: 1800000,
                    explicit: false,
                    spotifyUrl: 'https://spotify.com/episode/1'
                }
            ],
            pagination: {
                currentPage: page,
                totalPages: 10,
                totalItems: 100,
                hasNext: page < 10,
                hasPrevious: page > 1,
                pageSize: pageSize
            }
        };
    }

    async getShowSummary(showId) {
        if (this.shouldThrow) {
            throw new Error('Mock summary service error');
        }

        return {
            id: showId,
            name: 'Test Show',
            publisher: 'Test Publisher'
        };
    }
}

class MockConfiguration {
    getSpotifyConfig() {
        return {
            clientId: 'test_client_id',
            clientSecret: 'test_client_secret',
            tokenUrl: 'https://accounts.spotify.com/api/token',
            apiBaseUrl: 'https://api.spotify.com/v1'
        };
    }

    getAppConfig() {
        return {
            defaultShowId: 'test123',
            logLevel: 'info'
        };
    }

    isValid() {
        return true;
    }
}

class MockPopularShowsService {
    async getPopularShows() {
        return [
            {
                id: 'popular1',
                name: 'Popular Show 1',
                publisher: 'Publisher 1',
                description: 'A popular show'
            },
            {
                id: 'popular2',
                name: 'Popular Show 2',
                publisher: 'Publisher 2',
                description: 'Another popular show'
            }
        ];
    }

    async searchPopularShows(query) {
        const shows = await this.getPopularShows();
        return shows.filter(show =>
            show.name.toLowerCase().includes(query.toLowerCase())
        );
    }
}

class MockAuthenticationService {
    constructor() {
        this.accessToken = 'mock_access_token_1234567890abcdef';
        this.tokenExpiry = Date.now() + (3600 * 1000); // 1 hour from now
    }

    async getAccessToken() {
        return this.accessToken;
    }

    async isTokenValid() {
        return Date.now() < this.tokenExpiry;
    }

    async refreshToken() {
        return this.accessToken;
    }
}

class MockSpotifyApiClient {
    constructor() {
        this.searchResults = {
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

    async search(options) {
        if (options.q.includes('episode:201')) {
            return this.searchResults;
        }
        return { episodes: { items: [] } };
    }
}

class MockLogger {
    info(message) { }
    error(message) { }
    debug(message) { }
    warn(message) { }
}

module.exports = function (runner) {
    runner.test('CLIService - should get show details for CLI', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        const result = await cliService.getShowDetailsForCLI('test123');

        runner.assert(result.success, 'Should return success');
        runner.assertEqual(result.data.id, 'test123');
        runner.assertEqual(result.data.name, 'Test Show');
        runner.assertEqual(result.data.publisher, 'Test Publisher');
        runner.assertEqual(result.data.explicit, 'No');
        runner.assert(result.data.description.length <= 203, 'Description should be truncated'); // 200 + "..."
    });

    runner.test('CLIService - should get episodes for CLI with pagination', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        const result = await cliService.getShowEpisodesForCLI('test123', 2, 5);

        runner.assert(result.success, 'Should return success');
        runner.assertEqual(result.data.episodes.length, 1);
        runner.assertEqual(result.data.pagination.currentPage, 2);
        runner.assertEqual(result.data.pagination.pageSize, 5);
        runner.assert(result.data.pagination.hasPrevious, 'Should have previous page');
        runner.assert(result.data.pagination.hasNext, 'Should have next page');

        const episode = result.data.episodes[0];
        runner.assertEqual(episode.id, 'episode1');
        runner.assertEqual(episode.duration, '30:00'); // 1800000ms = 30 minutes
    });

    runner.test('CLIService - should get popular shows for CLI', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        const result = await cliService.getPopularShows();

        runner.assert(result.success, 'Should return success');
        runner.assertEqual(result.data.length, 2);
        runner.assertEqual(result.data[0].value, 'popular1');
        runner.assertEqual(result.data[0].name, 'Popular Show 1 - Publisher 1');
        runner.assertEqual(result.data[0].short, 'Popular Show 1');
    });

    runner.test('CLIService - should validate show IDs correctly', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        // Valid show ID (22 alphanumeric characters)
        runner.assert(cliService.validateShowId('11ktWYpzznMCpvGtXsiYxE'), 'Should validate correct show ID');

        // Invalid show IDs
        runner.assert(!cliService.validateShowId(''), 'Should reject empty string');
        runner.assert(!cliService.validateShowId('short'), 'Should reject short ID');
        runner.assert(!cliService.validateShowId('11ktWYpzznMCpvGtXsiYxE123'), 'Should reject long ID');
        runner.assert(!cliService.validateShowId('11ktWYpzznMCpvGtXsiY!'), 'Should reject special characters');
        runner.assert(!cliService.validateShowId(null), 'Should reject null');
        runner.assert(!cliService.validateShowId(undefined), 'Should reject undefined');
    });

    runner.test('CLIService - should get configuration summary', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        const result = await cliService.getConfigurationSummary();

        runner.assert(result.success, 'Should return success');
        runner.assert(result.data.clientIdConfigured, 'Should show client ID configured');
        runner.assert(result.data.clientSecretConfigured, 'Should show client secret configured');
        runner.assertEqual(result.data.defaultShowId, 'test123');
        runner.assertEqual(result.data.logLevel, 'info');
        runner.assert(result.data.configurationValid, 'Should show configuration as valid');
    });

    runner.test('CLIService - should run health checks', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        const result = await cliService.runHealthChecks();

        runner.assert(result.success, 'Should return success');
        runner.assert(result.data.configuration, 'Configuration should be healthy');
        runner.assert(result.data.connectivity, 'Connectivity should be healthy');
        runner.assert(result.data.environment.nodeVersion, 'Should have Node version');
        runner.assert(result.data.environment.platform, 'Should have platform info');
        runner.assert(result.data.environment.memory, 'Should have memory info');
    });

    runner.test('CLIService - should handle errors gracefully', async () => {
        const mockShowService = new MockShowService(true); // Configure to throw errors
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        const result = await cliService.getShowDetailsForCLI('test123');

        runner.assert(!result.success, 'Should return failure');
        runner.assert(result.error, 'Should have error message');
        runner.assertEqual(result.error, 'Mock show service error');
    });

    runner.test('CLIService - should search shows', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        const result = await cliService.searchShows('Popular Show 1');

        runner.assert(result.success, 'Should return success');
        runner.assertEqual(result.data.length, 1);
        runner.assertEqual(result.data[0].value, 'popular1');
        runner.assertEqual(result.data[0].short, 'Popular Show 1');
    });

    runner.test('CLIService - should format duration correctly', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        // Test various durations
        runner.assertEqual(cliService.formatDuration(60000), '1:00'); // 1 minute
        runner.assertEqual(cliService.formatDuration(3600000), '1h 0m'); // 1 hour
        runner.assertEqual(cliService.formatDuration(3900000), '1h 5m'); // 1 hour 5 minutes
        runner.assertEqual(cliService.formatDuration(0), 'Unknown');
        runner.assertEqual(cliService.formatDuration(null), 'Unknown');
    });

    runner.test('CLIService - should get playlist for CLI with pagination', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        const result = await cliService.getShowPlaylistForCLI('test123', 1, 10);

        runner.assert(result.success, 'Should return success');
        runner.assert(Array.isArray(result.data.episodes), 'Should have episodes array');
        runner.assert(result.data.pagination, 'Should have pagination info');
        runner.assertEqual(result.data.pagination.currentPage, 1);
        runner.assertEqual(result.data.pagination.pageSize, 10);

        const episode = result.data.episodes[0];
        runner.assert(episode.episodeNumber, 'Should have episode number');
        runner.assert(episode.name, 'Should have episode name');
        runner.assert(episode.releaseDate, 'Should have release date');
        runner.assert(episode.duration, 'Should have formatted duration');
        runner.assert(episode.description, 'Should have description');
    });

    runner.test('CLIService - should handle playlist errors gracefully', async () => {
        const mockShowService = new MockShowService(true); // Configure to throw errors
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        const result = await cliService.getShowPlaylistForCLI('test123', 1, 10);

        runner.assert(!result.success, 'Should return failure');
        runner.assert(result.error, 'Should have error message');
    });

    runner.test('CLIService - should format playlist data correctly', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        const result = await cliService.getShowPlaylistForCLI('test123', 1, 10);

        runner.assert(result.success, 'Should return success');

        const episode = result.data.episodes[0];
        runner.assertEqual(episode.episodeNumber, 1, 'Should have correct episode number');
        runner.assert(episode.name.length <= 43, 'Episode name should be truncated to 40 chars + "..."'); // 40 + "..."
        runner.assert(episode.description.length <= 103, 'Description should be truncated to 100 chars + "..."'); // 100 + "..."
        runner.assertEqual(episode.duration, '30:00', 'Should format duration correctly');
    });

    runner.test('CLIService - should validate show ID for playlist requests', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        // The validation is done at the CLI level, but we can test that the service
        // handles valid show IDs correctly
        const result = await cliService.getShowPlaylistForCLI('11ktWYpzznMCpvGtXsiYxE', 1, 10);

        runner.assert(result.success, 'Should handle valid show ID');
    });

    runner.test('CLIService - should search playlist episodes with partial matches', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        const result = await cliService.searchPlaylistEpisodes('test123', 'test', 1, 10);

        runner.assert(result.success, 'Should return success for search');
        runner.assert(Array.isArray(result.data.episodes), 'Should have episodes array');
        runner.assertEqual(result.data.searchQuery, 'test', 'Should include search query');
        runner.assert(typeof result.data.totalMatches === 'number', 'Should include total matches count');
    });

    runner.test('CLIService - should handle search with no results', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        const result = await cliService.searchPlaylistEpisodes('test123', 'nonexistent', 1, 10);

        runner.assert(result.success, 'Should return success even with no results');
        runner.assertEqual(result.data.episodes.length, 0, 'Should have empty episodes array');
        runner.assertEqual(result.data.totalMatches, 0, 'Should have zero total matches');
    });

    runner.test('CLIService - should jump to specific episode number', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        const result = await cliService.jumpToEpisode('test123', 1, 10);

        runner.assert(result.success, 'Should return success for valid episode number');
        runner.assert(Array.isArray(result.data.episodes), 'Should have episodes array');
        runner.assert(result.data.pagination, 'Should have pagination info');

        // Check if the first episode is highlighted
        const firstEpisode = result.data.episodes[0];
        if (firstEpisode) {
            runner.assertEqual(firstEpisode.episodeNumber, 1, 'Should start with episode 1');
        }
    });

    runner.test('CLIService - should handle invalid episode number for jump', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        const result = await cliService.jumpToEpisode('test123', 999, 10);

        runner.assert(!result.success, 'Should return failure for invalid episode number');
        runner.assert(result.error.includes('out of range'), 'Should include range error message');
    });

    runner.test('CLIService - should filter episodes by date range', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        const result = await cliService.filterEpisodesByDate('test123', '30days', null, null, 1, 10);

        runner.assert(result.success, 'Should return success for date filter');
        runner.assert(Array.isArray(result.data.episodes), 'Should have episodes array');
        runner.assertEqual(result.data.dateFilter, '30days', 'Should include date filter type');
        runner.assert(typeof result.data.totalMatches === 'number', 'Should include total matches count');
        runner.assert(result.data.filterStartDate, 'Should include filter start date');
        runner.assert(result.data.filterEndDate, 'Should include filter end date');
    });

    runner.test('CLIService - should handle custom date range filter', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        const result = await cliService.filterEpisodesByDate('test123', 'custom', '2023-01-01', '2023-12-31', 1, 10);

        runner.assert(result.success, 'Should return success for custom date filter');
        runner.assertEqual(result.data.dateFilter, 'custom', 'Should include custom date filter type');
        runner.assertEqual(result.data.filterStartDate, '2023-01-01', 'Should include custom start date');
        runner.assertEqual(result.data.filterEndDate, '2023-12-31', 'Should include custom end date');
    });

    runner.test('CLIService - should handle invalid date filter', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        const result = await cliService.filterEpisodesByDate('test123', 'invalid', null, null, 1, 10);

        runner.assert(!result.success, 'Should return failure for invalid date filter');
        runner.assert(result.error.includes('Invalid date filter'), 'Should include invalid filter error message');
    });

    // Browse Episodes Enhanced Features Tests
    runner.test('CLIService - should search episode by number with regular pagination', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        const result = await cliService.searchEpisodeByNumber('test123', 1, 10);

        runner.assert(result.success, 'Should return success for valid episode number');
        runner.assert(Array.isArray(result.data.episodes), 'Should have episodes array');
        runner.assertEqual(result.data.searchedEpisodeNumber, 1, 'Should include searched episode number');
        runner.assert(result.data.pagination, 'Should have pagination info');
        // Page size will be 1 for mapping search since it finds exactly one episode
        runner.assert(result.data.pagination.pageSize === 1 || result.data.pagination.pageSize === 10, 'Should have appropriate page size');

        // Check if episode is highlighted
        const highlightedEpisode = result.data.episodes.find(ep => ep.isHighlighted);
        runner.assert(highlightedEpisode, 'Should have highlighted episode');
        runner.assertEqual(highlightedEpisode.episodeNumber, 1, 'Should highlight correct episode');
    });

    runner.test('CLIService - should search episode by number with unlimited pagination', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        const result = await cliService.searchEpisodeByNumber('test123', 1, 'unlimited');

        runner.assert(result.success, 'Should return success for unlimited page size');
        runner.assert(Array.isArray(result.data.episodes), 'Should have episodes array');
        runner.assertEqual(result.data.searchedEpisodeNumber, 1, 'Should include searched episode number');
        runner.assertEqual(result.data.pagination.pageSize, 'unlimited', 'Should have unlimited page size');
        runner.assertEqual(result.data.pagination.totalPages, 1, 'Should have single page for unlimited');

        // Check if episode is highlighted
        const highlightedEpisode = result.data.episodes.find(ep => ep.isHighlighted);
        runner.assert(highlightedEpisode, 'Should have highlighted episode');
        runner.assertEqual(highlightedEpisode.episodeNumber, 1, 'Should highlight correct episode');
    });

    runner.test('CLIService - should handle invalid episode number search', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        const result = await cliService.searchEpisodeByNumber('test123', 999, 10);

        runner.assert(!result.success, 'Should return failure for invalid episode number');
        runner.assert(result.error.includes('not found'), 'Should include not found error message');
        runner.assert(result.error.includes('valid range'), 'Should include valid range information');
    });

    runner.test('CLIService - should get enhanced episodes with regular pagination', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        const result = await cliService.getShowEpisodesEnhanced('test123', 1, 20);

        runner.assert(result.success, 'Should return success for enhanced episodes');
        runner.assert(Array.isArray(result.data.episodes), 'Should have episodes array');
        runner.assert(result.data.pagination, 'Should have pagination info');
        runner.assertEqual(result.data.pagination.pageSize, 20, 'Should have correct page size');
        runner.assertEqual(result.data.pagination.currentPage, 1, 'Should have correct current page');

        // Check episode formatting
        const episode = result.data.episodes[0];
        runner.assert(episode.episodeNumber, 'Should have episode number');
        runner.assert(episode.name, 'Should have episode name');
        runner.assert(episode.duration, 'Should have formatted duration');
    });

    runner.test('CLIService - should get enhanced episodes with unlimited pagination', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        const result = await cliService.getShowEpisodesEnhanced('test123', 1, 'unlimited');

        runner.assert(result.success, 'Should return success for unlimited episodes');
        runner.assert(Array.isArray(result.data.episodes), 'Should have episodes array');
        runner.assertEqual(result.data.pagination.pageSize, 'unlimited', 'Should have unlimited page size');
        runner.assertEqual(result.data.pagination.totalPages, 1, 'Should have single page');
        runner.assert(!result.data.pagination.hasNext, 'Should not have next page');
        runner.assert(!result.data.pagination.hasPrevious, 'Should not have previous page');
    });

    runner.test('CLIService - should format duration correctly for different lengths', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        // Test short duration (under 1 hour)
        const shortDuration = cliService.formatDuration(1800000); // 30 minutes
        runner.assertEqual(shortDuration, '30:00', 'Should format short duration correctly');

        // Test long duration (over 1 hour)
        const longDuration = cliService.formatDuration(5400000); // 1.5 hours
        runner.assertEqual(longDuration, '1h 30m', 'Should format long duration correctly');

        // Test unknown duration
        const unknownDuration = cliService.formatDuration(null);
        runner.assertEqual(unknownDuration, 'Unknown', 'Should handle null duration');
    });

    // Access Token Display Tests
    runner.test('CLIService - should get access token information', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();
        const mockAuthService = new MockAuthenticationService();
        const mockApiClient = new MockSpotifyApiClient();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger, mockAuthService, mockApiClient);

        const result = await cliService.getAccessTokenInfo();

        runner.assert(result.success, 'Should return success for token info');
        runner.assert(result.data.token, 'Should have token');
        runner.assertEqual(result.data.tokenType, 'Bearer', 'Should have Bearer token type');
        runner.assert(result.data.isValid, 'Should indicate token is valid');
        runner.assert(result.data.expiresAt, 'Should have expiry time');
        runner.assert(result.data.timeUntilExpiry, 'Should have time until expiry');
    });

    runner.test('CLIService - should handle access token errors', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();
        const mockAuthService = {
            getAccessToken: async () => { throw new Error('Token error'); },
            isTokenValid: async () => false
        };
        const mockApiClient = new MockSpotifyApiClient();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger, mockAuthService, mockApiClient);

        const result = await cliService.getAccessTokenInfo();

        runner.assert(!result.success, 'Should return failure for token error');
        runner.assert(result.error.includes('Token error'), 'Should include error message');
    });

    // API-based Episode Search Tests
    runner.test('CLIService - should search episode by number using API', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();
        const mockAuthService = new MockAuthenticationService();
        const mockApiClient = new MockSpotifyApiClient();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger, mockAuthService, mockApiClient);

        const result = await cliService.searchEpisodeByNumber('test123456789012345678', 201, 10);

        runner.assert(result.success, 'Should return success for API search');
        runner.assert(Array.isArray(result.data.episodes), 'Should have episodes array');
        runner.assertEqual(result.data.searchedEpisodeNumber, 201, 'Should have correct searched episode number');
        runner.assertEqual(result.data.searchMethod, 'api', 'Should indicate API search method');

        // Check if episode is highlighted
        const highlightedEpisode = result.data.episodes.find(ep => ep.isHighlighted);
        runner.assert(highlightedEpisode, 'Should have highlighted episode');
    });

    runner.test('CLIService - should fallback to local search when API fails', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();
        const mockAuthService = new MockAuthenticationService();
        const mockApiClient = {
            search: async () => { throw new Error('API Error'); }
        };

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger, mockAuthService, mockApiClient);

        const result = await cliService.searchEpisodeByNumber('test123456789012345678', 1, 10);

        runner.assert(result.success, 'Should return success with fallback');
        runner.assert(Array.isArray(result.data.episodes), 'Should have episodes array');
        runner.assertEqual(result.data.searchedEpisodeNumber, 1, 'Should have correct searched episode number');
        // Should not have searchMethod 'api' since it fell back to local search
    });

    runner.test('CLIService - should handle API search with no results', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();
        const mockAuthService = new MockAuthenticationService();
        const mockApiClient = {
            search: async () => ({ episodes: { items: [] } })
        };

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger, mockAuthService, mockApiClient);

        const result = await cliService.searchEpisodeByNumber('test123456789012345678', 999, 10);

        // Should fallback to local search and return error for invalid episode number
        runner.assert(!result.success, 'Should return failure for non-existent episode');
        runner.assert(result.error.includes('not found'), 'Should include not found message');
    });

    // Access Token Copy Functionality Tests
    runner.test('CLIService - should provide full token for copying', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();
        const mockAuthService = new MockAuthenticationService();
        const mockApiClient = new MockSpotifyApiClient();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger, mockAuthService, mockApiClient);

        const result = await cliService.getAccessTokenInfo();

        runner.assert(result.success, 'Should return success for token info');
        runner.assert(result.data.token, 'Should have full token available');
        runner.assertEqual(result.data.token, 'mock_access_token_1234567890abcdef', 'Should return full unmasked token');
        runner.assert(result.data.token.length > 20, 'Token should be long enough to be meaningful');
    });

    // Episode Mapping Tests
    runner.test('CLIService - should create episode mapping correctly', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();
        const mockAuthService = new MockAuthenticationService();
        const mockApiClient = new MockSpotifyApiClient();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger, mockAuthService, mockApiClient);

        const mapping = await cliService.getEpisodeMapping('test-show-123');

        runner.assert(mapping, 'Should return episode mapping');
        runner.assert(mapping[1], 'Should have episode 1 in mapping');
        runner.assertEqual(mapping[1].title, 'Test Episode 1', 'Should have correct episode title');
        runner.assert(mapping[1].spotifyUrl, 'Should have Spotify URL');
        runner.assert(mapping[1].id, 'Should have episode ID');
    });

    runner.test('CLIService - should cache episode mapping', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();
        const mockAuthService = new MockAuthenticationService();
        const mockApiClient = new MockSpotifyApiClient();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger, mockAuthService, mockApiClient);

        // First call should create mapping
        const mapping1 = await cliService.getEpisodeMapping('test-show-123');

        // Second call should use cached mapping
        const mapping2 = await cliService.getEpisodeMapping('test-show-123');

        runner.assertEqual(mapping1, mapping2, 'Should return same cached mapping');
    });

    runner.test('CLIService - should get episode by number using mapping', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();
        const mockAuthService = new MockAuthenticationService();
        const mockApiClient = new MockSpotifyApiClient();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger, mockAuthService, mockApiClient);

        const episode = await cliService.getEpisodeByNumber('test-show-123', 1);

        runner.assert(episode, 'Should return episode data');
        runner.assertEqual(episode.title, 'Test Episode 1', 'Should have correct episode title');
        runner.assert(episode.spotifyUrl, 'Should have Spotify URL');
    });

    runner.test('CLIService - should return null for non-existent episode number', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();
        const mockAuthService = new MockAuthenticationService();
        const mockApiClient = new MockSpotifyApiClient();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger, mockAuthService, mockApiClient);

        const episode = await cliService.getEpisodeByNumber('test-show-123', 999);

        runner.assertEqual(episode, null, 'Should return null for non-existent episode');
    });

    runner.test('CLIService - should clear episode mapping cache', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();
        const mockAuthService = new MockAuthenticationService();
        const mockApiClient = new MockSpotifyApiClient();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger, mockAuthService, mockApiClient);

        // Create mapping
        await cliService.getEpisodeMapping('test-show-123');

        // Clear cache
        cliService.clearEpisodeMapping('test-show-123');

        // Should not have cached mapping anymore
        runner.assert(!cliService.episodeMappingCache.has('test-show-123'), 'Should clear specific show cache');
    });

    runner.test('CLIService - should use episode mapping for faster search', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();
        const mockAuthService = new MockAuthenticationService();
        const mockApiClient = new MockSpotifyApiClient();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger, mockAuthService, mockApiClient);

        const result = await cliService.searchEpisodeByNumber('test-show-123', 1, 10);

        runner.assert(result.success, 'Should return success for episode search');
        runner.assert(result.data.episodes.length > 0, 'Should find episodes');
        runner.assertEqual(result.data.searchMethod, 'mapping', 'Should use mapping search method');
        runner.assertEqual(result.data.searchedEpisodeNumber, 1, 'Should search for correct episode number');
    });

    // Bulk Episode Fetching Performance Tests
    runner.test('CLIService - should perform bulk episode fetching efficiently', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();
        const mockAuthService = new MockAuthenticationService();
        const mockApiClient = new MockSpotifyApiClient();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger, mockAuthService, mockApiClient);

        const startTime = Date.now();
        const episodes = await cliService.getAllEpisodes('test-show-123');
        const duration = Date.now() - startTime;

        runner.assert(episodes.length > 0, 'Should return episodes');
        runner.assert(duration < 5000, 'Should complete within reasonable time (5s)'); // Generous timeout for testing
        runner.assert(Array.isArray(episodes), 'Should return array of episodes');
    });

    runner.test('CLIService - should track performance statistics', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();
        const mockAuthService = new MockAuthenticationService();
        const mockApiClient = new MockSpotifyApiClient();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger, mockAuthService, mockApiClient);

        // Trigger episode mapping creation
        await cliService.getEpisodeMapping('test-show-123');

        const stats = cliService.getPerformanceStats();

        runner.assert(stats.totalRequests >= 1, 'Should track total requests');
        runner.assert(typeof stats.cacheHitRate === 'string', 'Should have cache hit rate');
        runner.assert(typeof stats.averageFetchTime === 'number', 'Should have average fetch time');
        runner.assert(stats.totalApiCalls >= 0, 'Should track API calls');
    });

    runner.test('CLIService - should handle cache hits correctly', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();
        const mockAuthService = new MockAuthenticationService();
        const mockApiClient = new MockSpotifyApiClient();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger, mockAuthService, mockApiClient);

        // First call - should be cache miss
        await cliService.getEpisodeMapping('test-show-123');

        // Second call - should be cache hit
        await cliService.getEpisodeMapping('test-show-123');

        const stats = cliService.getPerformanceStats();

        runner.assert(stats.cacheHits >= 1, 'Should have at least one cache hit');
        runner.assert(stats.totalRequests >= 2, 'Should have at least two total requests');
    });

    runner.test('CLIService - should handle bulk fetch errors gracefully', async () => {
        const mockShowService = {
            getShowEpisodes: async (showId, page, pageSize) => {
                if (page === 1) {
                    // Return first page successfully
                    return {
                        episodes: [
                            { id: 'ep1', name: 'Test Episode 1', releaseDate: '2023-01-01', durationMs: 1800000, description: 'Test', explicit: false }
                        ],
                        pagination: { totalItems: 100 } // Indicate more episodes exist
                    };
                } else {
                    // Simulate error on subsequent pages
                    throw new Error('API Error');
                }
            }
        };

        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();
        const mockAuthService = new MockAuthenticationService();
        const mockApiClient = new MockSpotifyApiClient();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger, mockAuthService, mockApiClient);

        // Should not throw error, should return partial data
        const episodes = await cliService.getAllEpisodes('test-show-123');

        runner.assert(episodes.length >= 1, 'Should return at least first page of episodes');
        runner.assert(Array.isArray(episodes), 'Should return array even with partial failure');
    });

    runner.test('CLIService - should validate episode data in mapping', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();
        const mockAuthService = new MockAuthenticationService();
        const mockApiClient = new MockSpotifyApiClient();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger, mockAuthService, mockApiClient);

        const mapping = await cliService.getEpisodeMapping('test-show-123');

        // Validate mapping structure
        runner.assert(mapping[1], 'Should have episode 1 in mapping');
        runner.assert(mapping[1].title, 'Episode should have title');
        runner.assert(mapping[1].id, 'Episode should have ID');
        runner.assert(mapping[1].spotifyUrl, 'Episode should have Spotify URL');
        runner.assert(mapping[1].releaseDate, 'Episode should have release date');
        runner.assert(mapping[1].duration, 'Episode should have formatted duration');
        runner.assert(typeof mapping[1].explicit === 'boolean', 'Episode should have explicit flag');
    });

    runner.test('CLIService - should handle empty episode list gracefully', async () => {
        const mockShowService = {
            getShowEpisodes: async () => ({
                episodes: [],
                pagination: { totalItems: 0 }
            })
        };

        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();
        const mockAuthService = new MockAuthenticationService();
        const mockApiClient = new MockSpotifyApiClient();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger, mockAuthService, mockApiClient);

        const mapping = await cliService.getEpisodeMapping('empty-show');

        runner.assertEqual(Object.keys(mapping).length, 0, 'Should return empty mapping for show with no episodes');
        runner.assert(typeof mapping === 'object', 'Should return object even when empty');
    });
};
