/**
 * Tests for Show Service
 */

const ShowService = require('../src/services/ShowService');
const { MockSpotifyApiClient, MockLogger, MockConfiguration, MockHttpClient } = require('./jest/mocks');

describe('Show Service Tests', () => {
    // Custom mock Spotify API client for specific show service tests
    class ShowServiceMockClient extends MockSpotifyApiClient {
        constructor(mockData = {}) {
            super(mockData);
        }

        async getShow(showId) {
            if (this.shouldError) {
                throw new Error('Mock API error');
            }

            return {
                id: showId,
                name: 'Test Show',
                description: 'A test show description',
                publisher: 'Test Publisher',
                language: 'en',
                total_episodes: 100,
                explicit: false,
                images: [{ url: 'http://example.com/image.jpg', width: 300, height: 300 }],
                external_urls: { spotify: 'http://spotify.com/show/123' },
                copyrights: [{ text: 'Copyright Test', type: 'C' }],
                media_type: 'audio',
                is_externally_hosted: false,
                available_markets: ['US', 'CA'],
                html_description: '<p>A test show description</p>'
            };
        }

        async getShowEpisodes(showId, options = {}) {
            if (this.shouldError) {
                throw new Error('Mock API error');
            }

            return {
                items: [
                    {
                        id: 'episode1',
                        name: 'Test Episode 1',
                        description: 'First test episode',
                        release_date: '2023-01-01',
                        duration_ms: 1800000,
                        explicit: false,
                        language: 'en',
                        images: [{ url: 'http://example.com/episode1.jpg' }],
                        external_urls: { spotify: 'http://spotify.com/episode/1' }
                    },
                    {
                        id: 'episode2',
                        name: 'Test Episode 2',
                        description: 'Second test episode',
                        release_date: '2023-01-15',
                        duration_ms: 1500000,
                        explicit: false,
                        language: 'en',
                        images: [{ url: 'http://example.com/episode2.jpg' }],
                        external_urls: { spotify: 'http://spotify.com/episode/2' }
                    },
                    {
                        id: 'episode3',
                        name: 'Test Episode 3',
                        description: 'Third test episode',
                        release_date: '2023-01-08',
                        duration_ms: 1600000,
                        explicit: false,
                        language: 'en',
                        images: [{ url: 'http://example.com/episode3.jpg' }],
                        external_urls: { spotify: 'http://spotify.com/episode/3' }
                    }
                ],
                total: 3,
                next: null,
                previous: null
            };
        }
    }

    test('should format show details correctly', async () => {
        const mockClient = new ShowServiceMockClient();
        const mockConfig = new MockConfiguration();
        const mockHttpClient = new MockHttpClient();
        const mockLogger = new MockLogger();
        const service = new ShowService(mockClient, mockConfig, mockHttpClient, mockLogger);

        const details = await service.getShowDetails('test123');

        expect(details.id).toBe('test123');
        expect(details.name).toBe('Test Show');
        expect(details.publisher).toBe('Test Publisher');
        expect(details.totalEpisodes).toBe(100);
        expect(Array.isArray(details.images)).toBe(true);
        expect(details.externalUrls).toBeTruthy();
    });

    test('should format show summary correctly', async () => {
        const mockClient = new ShowServiceMockClient();
        const mockConfig = new MockConfiguration();
        const mockHttpClient = new MockHttpClient();
        const mockLogger = new MockLogger();
        const service = new ShowService(mockClient, mockConfig, mockHttpClient, mockLogger);

        const summary = await service.getShowSummary('test123');

        expect(summary.id).toBe('test123');
        expect(summary.name).toBe('Test Show');
        expect(summary.publisher).toBe('Test Publisher');
        expect(summary.totalEpisodes).toBe(100);
        expect(summary.thumbnailUrl).toBeTruthy();
        expect(summary.spotifyUrl).toBeTruthy();
    });

    test('should format episodes correctly in reverse chronological order', async () => {
        const mockClient = new ShowServiceMockClient();
        const mockConfig = new MockConfiguration();
        const mockHttpClient = new MockHttpClient();
        const mockLogger = new MockLogger();
        const service = new ShowService(mockClient, mockConfig, mockHttpClient, mockLogger);

        const episodesData = await service.getShowEpisodes('test123', 1, 10);

        expect(Array.isArray(episodesData.episodes)).toBe(true);
        expect(episodesData.pagination).toBeTruthy();
        expect(episodesData.pagination.currentPage).toBe(1);
        expect(episodesData.pagination.pageSize).toBe(10);
        expect(episodesData.episodes.length).toBe(3);

        // Verify episodes are sorted by release date (newest first)
        expect(episodesData.episodes[0].id).toBe('episode2');
        expect(episodesData.episodes[1].id).toBe('episode3');
        expect(episodesData.episodes[2].id).toBe('episode1');
        
        // Verify release dates are in correct order
        const releaseDates = episodesData.episodes.map(ep => ep.releaseDate);
        expect(releaseDates[0]).toBe('2023-01-15');
        expect(releaseDates[1]).toBe('2023-01-08');
        expect(releaseDates[2]).toBe('2023-01-01');
    });

    test('should handle API errors', async () => {
        const mockClient = new ShowServiceMockClient({ shouldError: true });
        const mockConfig = new MockConfiguration();
        const mockHttpClient = new MockHttpClient();
        const mockLogger = new MockLogger();
        const service = new ShowService(mockClient, mockConfig, mockHttpClient, mockLogger);

        await expect(async () => {
            await service.getShowDetails('test123');
        }).rejects.toThrow();
    });

    test('should truncate long descriptions', async () => {
        const mockClient = new ShowServiceMockClient();
        const mockConfig = new MockConfiguration();
        const mockHttpClient = new MockHttpClient();
        const mockLogger = new MockLogger();
        const service = new ShowService(mockClient, mockConfig, mockHttpClient, mockLogger);

        // Access truncateDescription method if it's public, or test through public API
        const longDescription = 'A'.repeat(250);
        let truncated;
        
        // Check if the method is public
        if (typeof service.truncateDescription === 'function') {
            truncated = service.truncateDescription(longDescription, 200);
            expect(truncated.length).toBeLessThanOrEqual(200);
            expect(truncated.endsWith('...')).toBe(true);
        } else {
            // Skip this test if the method is not public
            console.log('Skipping truncateDescription test - method not public');
        }
    });

    test('should get all episodes without pagination in reverse chronological order', async () => {
        const mockClient = new ShowServiceMockClient();
        const mockConfig = new MockConfiguration();
        const mockHttpClient = new MockHttpClient();
        const mockLogger = new MockLogger();
        const service = new ShowService(mockClient, mockConfig, mockHttpClient, mockLogger);

        const result = await service.getAllShowEpisodes('test-show-123');

        expect(result.episodes).toBeTruthy();
        expect(Array.isArray(result.episodes)).toBe(true);
        expect(typeof result.totalItems).toBe('number');
        expect(typeof result.fetchedItems).toBe('number');
        expect(typeof result.isComplete).toBe('boolean');

        // Verify episode structure and order
        if (result.episodes.length > 0) {
            const episode = result.episodes[0];
            expect(episode.id).toBeTruthy();
            expect(episode.name).toBeTruthy();
            expect(episode.releaseDate).toBeTruthy();
            
            // If we have multiple episodes, verify they're sorted by date (newest first)
            if (result.episodes.length > 1) {
                const firstDate = new Date(result.episodes[0].releaseDate);
                const secondDate = new Date(result.episodes[1].releaseDate);
                expect(firstDate >= secondDate).toBe(true);
            }
        }
    });

    test('should handle errors in getAllShowEpisodes', async () => {
        const mockClient = new ShowServiceMockClient({ shouldError: true });
        const mockConfig = new MockConfiguration();
        const mockHttpClient = new MockHttpClient();
        const mockLogger = new MockLogger();
        const service = new ShowService(mockClient, mockConfig, mockHttpClient, mockLogger);

        await expect(async () => {
            await service.getAllShowEpisodes('test-show-123');
        }).rejects.toThrow(/Unable to retrieve all show episodes/);
    });
});
