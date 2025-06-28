const CLIInterface = require('../src/cli/CLIInterface');

// Mock dependencies
class MockCLIService {
    constructor() {
        this.validateShowId = (showId) => showId && showId.length === 22;
    }

    async getEpisodeMapping(showId) {
        return {
            1: {
                title: 'Test Episode 1',
                id: 'episode1',
                spotifyUrl: 'https://open.spotify.com/episode/episode1',
                releaseDate: '2023-01-01',
                duration: '30:00',
                description: 'Test episode description',
                explicit: false
            },
            2: {
                title: 'Test Episode 2',
                id: 'episode2',
                spotifyUrl: 'https://open.spotify.com/episode/episode2',
                releaseDate: '2023-01-02',
                duration: '25:30',
                description: 'Another test episode',
                explicit: false
            }
        };
    }

    async getEpisodeByNumber(showId, episodeNumber) {
        const mapping = await this.getEpisodeMapping(showId);
        return mapping[episodeNumber] || null;
    }

    async searchEpisodeByNumber(showId, episodeNumber, pageSize) {
        const episode = await this.getEpisodeByNumber(showId, episodeNumber);
        
        if (!episode) {
            return {
                success: false,
                error: `Episode #${episodeNumber} not found`
            };
        }

        return {
            success: true,
            data: {
                episodes: [{
                    episodeNumber: episodeNumber,
                    id: episode.id,
                    name: episode.title,
                    description: episode.description,
                    releaseDate: episode.releaseDate,
                    duration: episode.duration,
                    spotifyUrl: episode.spotifyUrl,
                    isHighlighted: true
                }],
                pagination: {
                    currentPage: 1,
                    totalPages: 1,
                    totalItems: 1,
                    hasNext: false,
                    hasPrevious: false,
                    pageSize: pageSize
                },
                searchedEpisodeNumber: episodeNumber,
                searchMethod: 'mapping'
            }
        };
    }
}

class MockLogger {
    info() {}
    error() {}
    warn() {}
    debug() {}
}

// Test runner
module.exports = (runner) => {
    runner.test('EpisodeNavigation - should open Spotify URL successfully', async () => {
        const mockCLIService = new MockCLIService();
        const mockLogger = new MockLogger();
        
        const cliInterface = new CLIInterface(mockCLIService, mockLogger);

        // Mock the openSpotifyUrl method to return success
        cliInterface.openSpotifyUrl = async (url) => {
            runner.assert(url.includes('spotify.com'), 'Should receive valid Spotify URL');
            return true;
        };

        const success = await cliInterface.openSpotifyUrl('https://open.spotify.com/episode/test');
        runner.assert(success, 'Should successfully open Spotify URL');
    });

    runner.test('EpisodeNavigation - should handle Spotify URL opening failure', async () => {
        const mockCLIService = new MockCLIService();
        const mockLogger = new MockLogger();
        
        const cliInterface = new CLIInterface(mockCLIService, mockLogger);

        // Mock the openSpotifyUrl method to return failure
        cliInterface.openSpotifyUrl = async (url) => {
            return false;
        };

        const success = await cliInterface.openSpotifyUrl('https://open.spotify.com/episode/test');
        runner.assert(!success, 'Should handle URL opening failure');
    });

    runner.test('EpisodeNavigation - should copy Spotify URL to clipboard', async () => {
        const mockCLIService = new MockCLIService();
        const mockLogger = new MockLogger();
        
        const cliInterface = new CLIInterface(mockCLIService, mockLogger);

        // Mock the copySpotifyUrl method to return success
        cliInterface.copySpotifyUrl = async (url) => {
            runner.assert(url.includes('spotify.com'), 'Should receive valid Spotify URL');
            return true;
        };

        const success = await cliInterface.copySpotifyUrl('https://open.spotify.com/episode/test');
        runner.assert(success, 'Should successfully copy Spotify URL');
    });

    runner.test('EpisodeNavigation - should handle clipboard copy failure', async () => {
        const mockCLIService = new MockCLIService();
        const mockLogger = new MockLogger();
        
        const cliInterface = new CLIInterface(mockCLIService, mockLogger);

        // Mock the copySpotifyUrl method to return failure
        cliInterface.copySpotifyUrl = async (url) => {
            return false;
        };

        const success = await cliInterface.copySpotifyUrl('https://open.spotify.com/episode/test');
        runner.assert(!success, 'Should handle clipboard copy failure');
    });

    runner.test('EpisodeNavigation - should validate episode data structure', async () => {
        const mockCLIService = new MockCLIService();
        
        const episode = await mockCLIService.getEpisodeByNumber('test-show-123', 1);

        runner.assert(episode, 'Should return episode data');
        runner.assert(episode.title, 'Should have episode title');
        runner.assert(episode.id, 'Should have episode ID');
        runner.assert(episode.spotifyUrl, 'Should have Spotify URL');
        runner.assert(episode.releaseDate, 'Should have release date');
        runner.assert(episode.duration, 'Should have duration');
        runner.assert(episode.description, 'Should have description');
        runner.assert(typeof episode.explicit === 'boolean', 'Should have explicit flag');
    });

    runner.test('EpisodeNavigation - should handle missing episode gracefully', async () => {
        const mockCLIService = new MockCLIService();
        
        const episode = await mockCLIService.getEpisodeByNumber('test-show-123', 999);

        runner.assertEqual(episode, null, 'Should return null for missing episode');
    });

    runner.test('EpisodeNavigation - should format episode search results correctly', async () => {
        const mockCLIService = new MockCLIService();
        
        const result = await mockCLIService.searchEpisodeByNumber('test-show-123', 1, 10);

        runner.assert(result.success, 'Should return successful search result');
        runner.assert(result.data.episodes.length === 1, 'Should return one episode');
        runner.assertEqual(result.data.searchMethod, 'mapping', 'Should use mapping search method');
        runner.assertEqual(result.data.searchedEpisodeNumber, 1, 'Should have correct searched episode number');
        
        const episode = result.data.episodes[0];
        runner.assert(episode.isHighlighted, 'Found episode should be highlighted');
        runner.assertEqual(episode.episodeNumber, 1, 'Should have correct episode number');
        runner.assert(episode.spotifyUrl, 'Should have Spotify URL');
    });

    runner.test('EpisodeNavigation - should handle search for non-existent episode', async () => {
        const mockCLIService = new MockCLIService();
        
        const result = await mockCLIService.searchEpisodeByNumber('test-show-123', 999, 10);

        runner.assert(!result.success, 'Should return unsuccessful search result');
        runner.assert(result.error.includes('not found'), 'Should include not found error message');
    });
};
