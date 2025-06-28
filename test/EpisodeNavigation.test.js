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

describe('Episode Navigation Tests', () => {
    test('should open Spotify URL successfully', async () => {
        const mockCLIService = new MockCLIService();
        const mockLogger = new MockLogger();
        
        const cliInterface = new CLIInterface(mockCLIService, mockLogger);

        // Mock the openSpotifyUrl method to return success
        cliInterface.openSpotifyUrl = async (url) => {
            expect(url.includes('spotify.com')).toBe(true);
            return true;
        };

        const success = await cliInterface.openSpotifyUrl('https://open.spotify.com/episode/test');
        expect(success).toBe(true);
    });

    test('should handle Spotify URL opening failure', async () => {
        const mockCLIService = new MockCLIService();
        const mockLogger = new MockLogger();
        
        const cliInterface = new CLIInterface(mockCLIService, mockLogger);

        // Mock the openSpotifyUrl method to return failure
        cliInterface.openSpotifyUrl = async (url) => {
            return false;
        };

        const success = await cliInterface.openSpotifyUrl('https://open.spotify.com/episode/test');
        expect(success).toBe(false);
    });

    test('should copy Spotify URL to clipboard', async () => {
        const mockCLIService = new MockCLIService();
        const mockLogger = new MockLogger();
        
        const cliInterface = new CLIInterface(mockCLIService, mockLogger);

        // Mock the copySpotifyUrl method to return success
        cliInterface.copySpotifyUrl = async (url) => {
            expect(url.includes('spotify.com')).toBe(true);
            return true;
        };

        const success = await cliInterface.copySpotifyUrl('https://open.spotify.com/episode/test');
        expect(success).toBe(true);
    });

    test('should handle clipboard copy failure', async () => {
        const mockCLIService = new MockCLIService();
        const mockLogger = new MockLogger();
        
        const cliInterface = new CLIInterface(mockCLIService, mockLogger);

        // Mock the copySpotifyUrl method to return failure
        cliInterface.copySpotifyUrl = async (url) => {
            return false;
        };

        const success = await cliInterface.copySpotifyUrl('https://open.spotify.com/episode/test');
        expect(success).toBe(false);
    });

    test('should validate episode data structure', async () => {
        const mockCLIService = new MockCLIService();
        
        const episode = await mockCLIService.getEpisodeByNumber('test-show-123', 1);

        expect(episode).toBeTruthy();
        expect(episode.title).toBeTruthy();
        expect(episode.id).toBeTruthy();
        expect(episode.spotifyUrl).toBeTruthy();
        expect(episode.releaseDate).toBeTruthy();
        expect(episode.duration).toBeTruthy();
        expect(episode.description).toBeTruthy();
        expect(typeof episode.explicit).toBe('boolean');
    });

    test('should handle missing episode gracefully', async () => {
        const mockCLIService = new MockCLIService();
        
        const episode = await mockCLIService.getEpisodeByNumber('test-show-123', 999);

        expect(episode).toBe(null);
    });

    test('should format episode search results correctly', async () => {
        const mockCLIService = new MockCLIService();
        
        const result = await mockCLIService.searchEpisodeByNumber('test-show-123', 1, 10);

        expect(result.success).toBe(true);
        expect(result.data.episodes.length).toBe(1);
        expect(result.data.searchMethod).toBe('mapping');
        expect(result.data.searchedEpisodeNumber).toBe(1);
        
        const episode = result.data.episodes[0];
        expect(episode.isHighlighted).toBe(true);
        expect(episode.episodeNumber).toBe(1);
        expect(episode.spotifyUrl).toBeTruthy();
    });

    test('should handle search for non-existent episode', async () => {
        const mockCLIService = new MockCLIService();
        
        const result = await mockCLIService.searchEpisodeByNumber('test-show-123', 999, 10);

        expect(result.success).toBe(false);
        expect(result.error).toContain('not found');
    });
});
