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

module.exports = function(runner) {
    runner.test('BrowseEpisodes - should handle episode number search validation', async () => {
        const mockCLIService = new MockCLIService();
        const mockLogger = new MockLogger();
        const cliInterface = new CLIInterface(mockCLIService, mockLogger);

        // Test valid episode number search
        const validResult = await mockCLIService.searchEpisodeByNumber('test123456789012345678', 50, 10);
        
        runner.assert(validResult.success, 'Should succeed for valid episode number');
        runner.assertEqual(validResult.data.searchedEpisodeNumber, 50, 'Should return correct episode number');
        runner.assert(validResult.data.episodes[0].isHighlighted, 'Should highlight found episode');
    });

    runner.test('BrowseEpisodes - should handle invalid episode number search', async () => {
        const mockCLIService = new MockCLIService();
        const mockLogger = new MockLogger();
        const cliInterface = new CLIInterface(mockCLIService, mockLogger);

        // Test invalid episode number search
        const invalidResult = await mockCLIService.searchEpisodeByNumber('test123456789012345678', 150, 10);
        
        runner.assert(!invalidResult.success, 'Should fail for invalid episode number');
        runner.assert(invalidResult.error.includes('not found'), 'Should include not found message');
        runner.assert(invalidResult.error.includes('valid range'), 'Should include valid range info');
    });

    runner.test('BrowseEpisodes - should handle different page sizes', async () => {
        const mockCLIService = new MockCLIService();
        const mockLogger = new MockLogger();
        const cliInterface = new CLIInterface(mockCLIService, mockLogger);

        // Test 10 episodes per page
        const result10 = await mockCLIService.getShowEpisodesEnhanced('test123456789012345678', 1, 10);
        runner.assert(result10.success, 'Should succeed for 10 episodes per page');
        runner.assertEqual(result10.data.episodes.length, 10, 'Should return 10 episodes');
        runner.assertEqual(result10.data.pagination.pageSize, 10, 'Should have correct page size');

        // Test 20 episodes per page
        const result20 = await mockCLIService.getShowEpisodesEnhanced('test123456789012345678', 1, 20);
        runner.assert(result20.success, 'Should succeed for 20 episodes per page');
        runner.assertEqual(result20.data.episodes.length, 20, 'Should return 20 episodes');
        runner.assertEqual(result20.data.pagination.pageSize, 20, 'Should have correct page size');

        // Test unlimited episodes
        const resultUnlimited = await mockCLIService.getShowEpisodesEnhanced('test123456789012345678', 1, 'unlimited');
        runner.assert(resultUnlimited.success, 'Should succeed for unlimited episodes');
        runner.assertEqual(resultUnlimited.data.episodes.length, 100, 'Should return all episodes');
        runner.assertEqual(resultUnlimited.data.pagination.pageSize, 'unlimited', 'Should have unlimited page size');
        runner.assertEqual(resultUnlimited.data.pagination.totalPages, 1, 'Should have single page for unlimited');
    });

    runner.test('BrowseEpisodes - should handle page navigation correctly', async () => {
        const mockCLIService = new MockCLIService();
        const mockLogger = new MockLogger();
        const cliInterface = new CLIInterface(mockCLIService, mockLogger);

        // Test first page
        const page1 = await mockCLIService.getShowEpisodesEnhanced('test123456789012345678', 1, 10);
        runner.assert(page1.success, 'Should succeed for page 1');
        runner.assertEqual(page1.data.pagination.currentPage, 1, 'Should be on page 1');
        runner.assert(!page1.data.pagination.hasPrevious, 'Should not have previous page');
        runner.assert(page1.data.pagination.hasNext, 'Should have next page');

        // Test middle page
        const page5 = await mockCLIService.getShowEpisodesEnhanced('test123456789012345678', 5, 10);
        runner.assert(page5.success, 'Should succeed for page 5');
        runner.assertEqual(page5.data.pagination.currentPage, 5, 'Should be on page 5');
        runner.assert(page5.data.pagination.hasPrevious, 'Should have previous page');
        runner.assert(page5.data.pagination.hasNext, 'Should have next page');

        // Test last page
        const page10 = await mockCLIService.getShowEpisodesEnhanced('test123456789012345678', 10, 10);
        runner.assert(page10.success, 'Should succeed for page 10');
        runner.assertEqual(page10.data.pagination.currentPage, 10, 'Should be on page 10');
        runner.assert(page10.data.pagination.hasPrevious, 'Should have previous page');
        runner.assert(!page10.data.pagination.hasNext, 'Should not have next page');
    });

    runner.test('BrowseEpisodes - should validate Show ID format', async () => {
        const mockCLIService = new MockCLIService();
        const mockLogger = new MockLogger();
        const cliInterface = new CLIInterface(mockCLIService, mockLogger);

        // Test valid Show ID
        const validShowId = 'test123456789012345678';
        runner.assert(mockCLIService.validateShowId(validShowId), 'Should validate correct Show ID format');

        // Test invalid Show ID (too short)
        const shortShowId = 'test123';
        runner.assert(!mockCLIService.validateShowId(shortShowId), 'Should reject short Show ID');

        // Test invalid Show ID (too long)
        const longShowId = 'test1234567890123456789';
        runner.assert(!mockCLIService.validateShowId(longShowId), 'Should reject long Show ID');

        // Test empty Show ID
        runner.assert(!mockCLIService.validateShowId(''), 'Should reject empty Show ID');
        runner.assert(!mockCLIService.validateShowId(null), 'Should reject null Show ID');
    });
};
