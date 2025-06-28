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

describe('CLI Service Tests', () => {
    test('should get show details for CLI', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        const result = await cliService.getShowDetailsForCLI('test123');

        expect(result.success).toBe(true);
        expect(result.data.id).toBe('test123');
        expect(result.data.name).toBe('Test Show');
        expect(result.data.publisher).toBe('Test Publisher');
        expect(result.data.explicit).toBe('No');
        expect(result.data.description.length).toBeLessThanOrEqual(203); // 200 + "..."
    });

    test('should get episodes for CLI with pagination', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        const result = await cliService.getShowEpisodesForCLI('test123', 2, 5);

        expect(result.success).toBe(true);
        expect(result.data.episodes.length).toBe(1);
        expect(result.data.pagination.currentPage).toBe(2);
        expect(result.data.pagination.pageSize).toBe(5);
        expect(result.data.pagination.hasPrevious).toBe(true);
        expect(result.data.pagination.hasNext).toBe(true);

        const episode = result.data.episodes[0];
        expect(episode.id).toBe('episode1');
        expect(episode.duration).toBe('30:00'); // 1800000ms = 30 minutes
    });

    test('should get popular shows for CLI', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        const result = await cliService.getPopularShows();

        expect(result.success).toBe(true);
        expect(result.data.length).toBe(2);
        expect(result.data[0].value).toBe('popular1');
        expect(result.data[0].name).toBe('Popular Show 1 - Publisher 1');
        expect(result.data[0].short).toBe('Popular Show 1');
    });

    test('should validate show IDs correctly', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        // Valid show ID (22 alphanumeric characters)
        expect(cliService.validateShowId('11ktWYpzznMCpvGtXsiYxE')).toBe(true);

        // Invalid show IDs
        expect(cliService.validateShowId('')).toBe(false);
        expect(cliService.validateShowId('short')).toBe(false);
        expect(cliService.validateShowId('11ktWYpzznMCpvGtXsiYxE123')).toBe(false);
        expect(cliService.validateShowId('11ktWYpzznMCpvGtXsiY!')).toBe(false);
        expect(cliService.validateShowId(null)).toBe(false);
        expect(cliService.validateShowId(undefined)).toBe(false);
    });

    test('should get configuration summary', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        const result = await cliService.getConfigurationSummary();

        expect(result.success).toBe(true);
        expect(result.data.clientIdConfigured).toBe(true);
        expect(result.data.clientSecretConfigured).toBe(true);
        expect(result.data.defaultShowId).toBe('test123');
        expect(result.data.logLevel).toBe('info');
        expect(result.data.configurationValid).toBe(true);
    });

    test('should run health checks', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        const result = await cliService.runHealthChecks();

        expect(result.success).toBe(true);
        expect(result.data.configuration).toBeTruthy();
        expect(result.data.connectivity).toBeTruthy();
        expect(result.data.environment.nodeVersion).toBeTruthy();
        expect(result.data.environment.platform).toBeTruthy();
        expect(result.data.environment.memory).toBeTruthy();
    });

    test('should handle errors gracefully', async () => {
        const mockShowService = new MockShowService(true); // Configure to throw errors
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        const result = await cliService.getShowDetailsForCLI('test123');

        expect(result.success).toBe(false);
        expect(result.error).toBeTruthy();
        expect(result.error).toBe('Mock show service error');
    });

    test('should search shows', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        const result = await cliService.searchShows('Popular Show 1');

        expect(result.success).toBe(true);
        expect(result.data.length).toBe(1);
        expect(result.data[0].value).toBe('popular1');
        expect(result.data[0].short).toBe('Popular Show 1');
    });

    test('should format duration correctly', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        // Test various durations
        expect(cliService.formatDuration(60000)).toBe('1:00'); // 1 minute
        expect(cliService.formatDuration(3600000)).toBe('60:00'); // 1 hour
        expect(cliService.formatDuration(3900000)).toBe('65:00'); // 1 hour 5 minutes
        expect(cliService.formatDuration(0)).toBe('0:00');
        expect(cliService.formatDuration(null)).toBe('0:00');
    });

    test('should get playlist for CLI with pagination', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        const result = await cliService.getShowPlaylistForCLI('test123', 1, 10);

        expect(result.success).toBe(true);
        expect(Array.isArray(result.data.episodes)).toBe(true);
        expect(result.data.pagination).toBeTruthy();
        expect(result.data.pagination.currentPage).toBe(1);
        expect(result.data.pagination.pageSize).toBe(10);

        const episode = result.data.episodes[0];
        expect(episode.episodeNumber).toBeTruthy();
        expect(episode.name).toBeTruthy();
        expect(episode.releaseDate).toBeTruthy();
        expect(episode.duration).toBeTruthy();
        expect(episode.description).toBeTruthy();
    });

    test('should handle playlist errors gracefully', async () => {
        const mockShowService = new MockShowService(true); // Configure to throw errors
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        const result = await cliService.getShowPlaylistForCLI('test123', 1, 10);

        expect(result.success).toBe(false);
        expect(result.error).toBeTruthy();
    });

    test('should format playlist data correctly', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        const result = await cliService.getShowPlaylistForCLI('test123', 1, 10);

        expect(result.success).toBe(true);

        const episode = result.data.episodes[0];
        expect(episode.episodeNumber).toBe(1);
        expect(episode.name.length).toBeLessThanOrEqual(43); // 40 + "..."
        expect(episode.description.length).toBeLessThanOrEqual(103); // 100 + "..."
        expect(episode.duration).toBe('30:00');
    });

    test('should validate show ID for playlist requests', async () => {
        const mockShowService = new MockShowService();
        const mockConfig = new MockConfiguration();
        const mockPopularShows = new MockPopularShowsService();
        const mockLogger = new MockLogger();

        const cliService = new CLIService(mockShowService, mockConfig, mockPopularShows, mockLogger);

        // Test with valid show ID
        const result = await cliService.getShowPlaylistForCLI('11ktWYpzznMCpvGtXsiYxE', 1, 10);
        expect(result.success).toBe(true);

        // Invalid ID validation would happen at CLI interface level
    });
});
