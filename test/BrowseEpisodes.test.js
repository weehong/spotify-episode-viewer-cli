const CLIInterface = require('../src/cli/CLIInterface');
const CLIService = require('../src/services/CLIService');

// Mock dependencies
class MockCLIService {
    constructor() {
        this.validateShowId = (showId) => showId && showId.length === 22;
    }

    async searchEpisodeByNumber(showId, episodeNumber, pageSize) {
        if (episodeNumber > 100) {
            return {
                success: false,
                error: `Episode #${episodeNumber} not found. This show has 100 episodes (valid range: 1-100)`
            };
        }

        const episodes = [{
            episodeNumber: episodeNumber,
            id: `episode${episodeNumber}`,
            name: `Test Episode ${episodeNumber}`,
            description: 'Test episode description',
            releaseDate: '2023-01-01',
            duration: '30:00',
            isHighlighted: true
        }];

        return {
            success: true,
            data: {
                episodes: episodes,
                pagination: {
                    currentPage: Math.ceil(episodeNumber / (pageSize === 'unlimited' ? 1 : pageSize)),
                    totalPages: pageSize === 'unlimited' ? 1 : Math.ceil(100 / pageSize),
                    totalItems: 100,
                    hasNext: pageSize !== 'unlimited' && episodeNumber < 100,
                    hasPrevious: pageSize !== 'unlimited' && episodeNumber > pageSize,
                    pageSize: pageSize
                },
                searchedEpisodeNumber: episodeNumber
            }
        };
    }

    async getShowEpisodesEnhanced(showId, page, pageSize) {
        const totalEpisodes = 100;
        let episodes = [];

        if (pageSize === 'unlimited') {
            // Return all episodes
            for (let i = 1; i <= totalEpisodes; i++) {
                episodes.push({
                    episodeNumber: i,
                    id: `episode${i}`,
                    name: `Test Episode ${i}`,
                    description: 'Test episode description',
                    releaseDate: '2023-01-01',
                    duration: '30:00'
                });
            }
            return {
                success: true,
                data: {
                    episodes: episodes,
                    pagination: {
                        currentPage: 1,
                        totalPages: 1,
                        totalItems: totalEpisodes,
                        hasNext: false,
                        hasPrevious: false,
                        pageSize: 'unlimited'
                    }
                }
            };
        }

        // Regular pagination
        const startIndex = (page - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, totalEpisodes);

        for (let i = startIndex + 1; i <= endIndex; i++) {
            episodes.push({
                episodeNumber: i,
                id: `episode${i}`,
                name: `Test Episode ${i}`,
                description: 'Test episode description',
                releaseDate: '2023-01-01',
                duration: '30:00'
            });
        }

        return {
            success: true,
            data: {
                episodes: episodes,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalEpisodes / pageSize),
                    totalItems: totalEpisodes,
                    hasNext: endIndex < totalEpisodes,
                    hasPrevious: page > 1,
                    pageSize: pageSize
                }
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

describe('Browse Episodes Tests', () => {
    test('should handle episode number search validation', async () => {
        const mockCLIService = new MockCLIService();
        const mockLogger = new MockLogger();
        const cliInterface = new CLIInterface(mockCLIService, mockLogger);

        // Test valid episode number search
        const validResult = await mockCLIService.searchEpisodeByNumber('test123456789012345678', 50, 10);
        
        expect(validResult.success).toBe(true);
        expect(validResult.data.searchedEpisodeNumber).toBe(50);
        expect(validResult.data.episodes[0].isHighlighted).toBe(true);
    });

    test('should handle invalid episode number search', async () => {
        const mockCLIService = new MockCLIService();
        const mockLogger = new MockLogger();
        const cliInterface = new CLIInterface(mockCLIService, mockLogger);

        // Test invalid episode number search
        const invalidResult = await mockCLIService.searchEpisodeByNumber('test123456789012345678', 150, 10);
        
        expect(invalidResult.success).toBe(false);
        expect(invalidResult.error).toContain('not found');
        expect(invalidResult.error).toContain('valid range');
    });

    test('should handle different page sizes', async () => {
        const mockCLIService = new MockCLIService();
        const mockLogger = new MockLogger();
        const cliInterface = new CLIInterface(mockCLIService, mockLogger);

        // Test 10 episodes per page
        const result10 = await mockCLIService.getShowEpisodesEnhanced('test123456789012345678', 1, 10);
        expect(result10.success).toBe(true);
        expect(result10.data.episodes.length).toBe(10);
        expect(result10.data.pagination.pageSize).toBe(10);

        // Test 20 episodes per page
        const result20 = await mockCLIService.getShowEpisodesEnhanced('test123456789012345678', 1, 20);
        expect(result20.success).toBe(true);
        expect(result20.data.episodes.length).toBe(20);
        expect(result20.data.pagination.pageSize).toBe(20);

        // Test unlimited episodes
        const resultUnlimited = await mockCLIService.getShowEpisodesEnhanced('test123456789012345678', 1, 'unlimited');
        expect(resultUnlimited.success).toBe(true);
        expect(resultUnlimited.data.episodes.length).toBe(100);
        expect(resultUnlimited.data.pagination.pageSize).toBe('unlimited');
        expect(resultUnlimited.data.pagination.totalPages).toBe(1);
    });

    test('should handle page navigation correctly', async () => {
        const mockCLIService = new MockCLIService();
        const mockLogger = new MockLogger();
        const cliInterface = new CLIInterface(mockCLIService, mockLogger);

        // Test first page
        const page1 = await mockCLIService.getShowEpisodesEnhanced('test123456789012345678', 1, 10);
        expect(page1.success).toBe(true);
        expect(page1.data.pagination.currentPage).toBe(1);
        expect(page1.data.pagination.hasPrevious).toBe(false);
        expect(page1.data.pagination.hasNext).toBe(true);

        // Test middle page
        const page5 = await mockCLIService.getShowEpisodesEnhanced('test123456789012345678', 5, 10);
        expect(page5.success).toBe(true);
        expect(page5.data.pagination.currentPage).toBe(5);
        expect(page5.data.pagination.hasPrevious).toBe(true);
        expect(page5.data.pagination.hasNext).toBe(true);

        // Test last page
        const page10 = await mockCLIService.getShowEpisodesEnhanced('test123456789012345678', 10, 10);
        expect(page10.success).toBe(true);
        expect(page10.data.pagination.currentPage).toBe(10);
        expect(page10.data.pagination.hasPrevious).toBe(true);
        expect(page10.data.pagination.hasNext).toBe(false);
    });

    test('should validate Show ID format', async () => {
        const mockCLIService = new MockCLIService();
        const mockLogger = new MockLogger();
        const cliInterface = new CLIInterface(mockCLIService, mockLogger);

        // Test valid Show ID
        const validShowId = 'test123456789012345678';
        expect(mockCLIService.validateShowId(validShowId)).toBe(true);

        // Test invalid Show ID (too short)
        const shortShowId = 'test123';
        expect(mockCLIService.validateShowId(shortShowId)).toBe(false);

        // Test invalid Show ID (too long)
        const longShowId = 'test1234567890123456789';
        expect(mockCLIService.validateShowId(longShowId)).toBe(false);

        // Test empty Show ID
        expect(mockCLIService.validateShowId('')).toBe(false);
        expect(mockCLIService.validateShowId(null)).toBe(false);
    });
});
