/**
 * Tests for Show Service
 */

const ShowService = require('../src/services/ShowService');

// Mock Spotify API Client
class MockSpotifyApiClient {
    constructor(mockData = {}) {
        this.mockData = mockData;
    }

    async getShow(showId) {
        if (this.mockData.shouldThrow) {
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
        if (this.mockData.shouldThrow) {
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

module.exports = function (runner) {
    runner.test('ShowService - should format show details correctly', async () => {
        const mockClient = new MockSpotifyApiClient();
        const service = new ShowService(mockClient);

        const details = await service.getShowDetails('test123');

        runner.assertEqual(details.id, 'test123');
        runner.assertEqual(details.name, 'Test Show');
        runner.assertEqual(details.publisher, 'Test Publisher');
        runner.assertEqual(details.totalEpisodes, 100);
        runner.assert(Array.isArray(details.images), 'Should have images array');
        runner.assert(details.externalUrls, 'Should have external URLs');
    });

    runner.test('ShowService - should format show summary correctly', async () => {
        const mockClient = new MockSpotifyApiClient();
        const service = new ShowService(mockClient);

        const summary = await service.getShowSummary('test123');

        runner.assertEqual(summary.id, 'test123');
        runner.assertEqual(summary.name, 'Test Show');
        runner.assertEqual(summary.publisher, 'Test Publisher');
        runner.assertEqual(summary.totalEpisodes, 100);
        runner.assert(summary.thumbnailUrl, 'Should have thumbnail URL');
        runner.assert(summary.spotifyUrl, 'Should have Spotify URL');
    });

    runner.test('ShowService - should format episodes correctly in reverse chronological order', async () => {
        const mockClient = new MockSpotifyApiClient();
        const service = new ShowService(mockClient);

        const episodesData = await service.getShowEpisodes('test123', 1, 10);

        runner.assert(Array.isArray(episodesData.episodes), 'Should have episodes array');
        runner.assert(episodesData.pagination, 'Should have pagination info');
        runner.assertEqual(episodesData.pagination.currentPage, 1);
        runner.assertEqual(episodesData.pagination.pageSize, 10);
        runner.assertEqual(episodesData.episodes.length, 3, 'Should have 3 episodes');

        // Verify episodes are sorted by release date (newest first)
        runner.assertEqual(episodesData.episodes[0].id, 'episode2', 'First episode should be the newest (episode2)');
        runner.assertEqual(episodesData.episodes[1].id, 'episode3', 'Second episode should be the second newest (episode3)');
        runner.assertEqual(episodesData.episodes[2].id, 'episode1', 'Third episode should be the oldest (episode1)');
        
        // Verify release dates are in correct order
        const releaseDates = episodesData.episodes.map(ep => ep.releaseDate);
        runner.assertEqual(releaseDates[0], '2023-01-15', 'First episode should have newest date');
        runner.assertEqual(releaseDates[1], '2023-01-08', 'Second episode should have middle date');
        runner.assertEqual(releaseDates[2], '2023-01-01', 'Third episode should have oldest date');
    });

    runner.test('ShowService - should handle API errors', async () => {
        const mockClient = new MockSpotifyApiClient({ shouldThrow: true });
        const service = new ShowService(mockClient);

        await runner.assertThrows(async () => {
            await service.getShowDetails('test123');
        }, 'Should throw error when API fails');
    });

    runner.test('ShowService - should truncate long descriptions', async () => {
        const mockClient = new MockSpotifyApiClient();
        const service = new ShowService(mockClient);

        // Test the private method through public interface
        const longDescription = 'A'.repeat(250);
        const truncated = service.truncateDescription(longDescription, 200);

        runner.assert(truncated.length <= 200, 'Should truncate to max length');
        runner.assert(truncated.endsWith('...'), 'Should end with ellipsis');
    });

    runner.test('ShowService - should get all episodes without pagination in reverse chronological order', async () => {
        const mockClient = new MockSpotifyApiClient();
        const showService = new ShowService(mockClient);

        const result = await showService.getAllShowEpisodes('test-show-123');

        runner.assert(result.episodes, 'Should return episodes array');
        runner.assert(Array.isArray(result.episodes), 'Episodes should be an array');
        runner.assert(typeof result.totalItems === 'number', 'Should have total items count');
        runner.assert(typeof result.fetchedItems === 'number', 'Should have fetched items count');
        runner.assert(typeof result.isComplete === 'boolean', 'Should have completion status');

        // Verify episode structure and order
        if (result.episodes.length > 0) {
            const episode = result.episodes[0];
            runner.assert(episode.id, 'Episode should have ID');
            runner.assert(episode.name, 'Episode should have name');
            runner.assert(episode.releaseDate, 'Episode should have release date');
            
            // If we have multiple episodes, verify they're sorted by date (newest first)
            if (result.episodes.length > 1) {
                const firstDate = new Date(result.episodes[0].releaseDate);
                const secondDate = new Date(result.episodes[1].releaseDate);
                runner.assert(firstDate >= secondDate, 'Episodes should be sorted by date (newest first)');
            }
        }
    });

    runner.test('ShowService - should handle errors in getAllShowEpisodes', async () => {
        const errorApiClient = new MockSpotifyApiClient({ shouldThrow: true });
        const showService = new ShowService(errorApiClient);

        try {
            await showService.getAllShowEpisodes('test-show-123');
            runner.assert(false, 'Should have thrown an error');
        } catch (error) {
            runner.assert(error.message.includes('Unable to retrieve all show episodes'), 'Should wrap error message');
        }
    });
};
