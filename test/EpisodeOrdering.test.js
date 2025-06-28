/**
 * Unit tests for episode ordering functionality (reverse chronological order)
 */

const ShowService = require('../src/services/ShowService');

// Mock dependencies
class MockSpotifyApiClient {
    constructor() {
        this.episodes = Array.from({ length: 20 }, (_, i) => ({
            id: `episode${i+1}`,
            name: `Episode ${i+1}`,
            description: `Description for episode ${i+1}`,
            release_date: new Date(2023, 0, i+1).toISOString().split('T')[0],
            duration_ms: 1800000 + (i * 60000),
            explicit: i % 2 === 0,
            external_urls: {
                spotify: `https://spotify.com/episodes/episode${i+1}`
            },
            images: [
                { url: `https://example.com/image${i+1}.jpg` }
            ],
            episodeNumber: i + 1
        }));
    }
    
    async getShowEpisodes(showId, offset, limit) {
        // Simulate API response with pagination
        const start = offset;
        const end = Math.min(offset + limit, this.episodes.length);
        const items = this.episodes.slice(start, end);
        
        return {
            items,
            total: this.episodes.length,
            offset,
            limit,
            next: end < this.episodes.length ? `next_url` : null,
            previous: offset > 0 ? `previous_url` : null
        };
    }
}

class MockLogger {
    info() {}
    error() {}
    debug() {}
    warn() {}
}

class MockConfiguration {}
class MockHttpClient {}

// Helper to create a ShowService instance with mocked dependencies
function createShowService() {
    return new ShowService(
        new MockSpotifyApiClient(),
        new MockConfiguration(),
        new MockHttpClient(),
        new MockLogger()
    );
}

describe('Episode Ordering Tests', () => {
    test('should order episodes in reverse chronological order', async () => {
        const showService = createShowService();
        
        // Get episodes data
        const episodesData = await showService.getShowEpisodes('testShowId', 1, 10);
        
        // Verify episodes are ordered newest first
        const episodes = episodesData.episodes;
        
        // Check that episodes are sorted by release date (newest first)
        for (let i = 0; i < episodes.length - 1; i++) {
            const currentDate = new Date(episodes[i].releaseDate);
            const nextDate = new Date(episodes[i + 1].releaseDate);
            
            expect(currentDate >= nextDate).toBe(true);
        }
    });
    
    test('should number episodes in reverse chronological order', async () => {
        const showService = createShowService();
        
        // Get formatted episodes data
        const formattedData = await showService.formatEpisodesData('testShowId', 1, 10);
        
        // Verify episode numbering is in reverse chronological order
        const episodes = formattedData.episodes;
        
        // The newest episode should be #1
        expect(episodes[0].episodeNumber).toBe(20);
        
        // Episode numbers should be sequential
        expect(episodes).toHaveSequentialNumbering();
        
        // Verify episodes are in reverse chronological order
        expect(episodes).toBeInReverseChronologicalOrder();
    });
    
    test('should maintain reverse chronological order with pagination', async () => {
        const showService = createShowService();
        
        // Get page 1
        const page1Data = await showService.getShowEpisodes('testShowId', 1, 5);
        
        // Get page 2
        const page2Data = await showService.getShowEpisodes('testShowId', 2, 5);
        
        // Verify each page has valid pagination structure
        expect(page1Data.pagination).toBeValidPagination();
        expect(page2Data.pagination).toBeValidPagination();
        
        // Verify episodes in each page are in reverse chronological order
        expect(page1Data.episodes).toBeInReverseChronologicalOrder();
        expect(page2Data.episodes).toBeInReverseChronologicalOrder();
        
        // Verify the last episode of page 1 is newer than the first episode of page 2
        const lastEpisodePage1 = page1Data.episodes[page1Data.episodes.length - 1];
        const firstEpisodePage2 = page2Data.episodes[0];
        
        const lastEpisodePage1Date = new Date(lastEpisodePage1.release_date);
        const firstEpisodePage2Date = new Date(firstEpisodePage2.release_date);
        
        expect(lastEpisodePage1Date).toBeGreaterThanOrEqual(firstEpisodePage2Date);
    });
    
    test('should format all episodes in reverse chronological order', async () => {
        const showService = createShowService();
        
        // Get all episodes formatted data
        const allEpisodesData = await showService.formatAllEpisodesData('testShowId');
        
        // Verify all episodes are in reverse chronological order
        const episodes = allEpisodesData.episodes;
        
        // Check that episodes are sorted by release date (newest first)
        for (let i = 0; i < episodes.length - 1; i++) {
            const currentDate = new Date(episodes[i].releaseDate);
            const nextDate = new Date(episodes[i + 1].releaseDate);
            
            expect(currentDate >= nextDate).toBe(true);
        }
        
        // Verify episode numbering is correct
        for (let i = 0; i < episodes.length; i++) {
            expect(episodes[i].episodeNumber).toBe(i + 1);
        }
    });
    
    test('should handle empty episode list', async () => {
        // Create a mock service with no episodes
        class EmptyMockSpotifyApiClient extends MockSpotifyApiClient {
            constructor() {
                super();
                this.episodes = [];
            }
        }
        
        const showService = new ShowService(
            new EmptyMockSpotifyApiClient(),
            new MockConfiguration(),
            new MockHttpClient(),
            new MockLogger()
        );
        
        // Get episodes data
        const episodesData = await showService.getShowEpisodes('testShowId', 1, 10);
        
        // Verify empty episodes handling
        expect(episodesData.episodes.length).toBe(0);
        expect(episodesData.pagination.totalItems).toBe(0);
    });
    
    test('should handle single episode', async () => {
        // Create a mock service with a single episode
        class SingleEpisodeMockSpotifyApiClient extends MockSpotifyApiClient {
            constructor() {
                super();
                this.episodes = [{
                    id: 'singleEpisode',
                    name: 'Single Episode',
                    description: 'Description for single episode',
                    release_date: new Date(2023, 0, 1).toISOString().split('T')[0],
                    duration_ms: 1800000,
                    explicit: false,
                    external_urls: {
                        spotify: 'https://spotify.com/episodes/singleEpisode'
                    },
                    images: [
                        { url: 'https://example.com/singleImage.jpg' }
                    ]
                }];
            }
            
            async getShowEpisodes() {
                return {
                    items: this.episodes,
                    total: this.episodes.length,
                    next: null,
                    previous: null
                };
            }
        }
        
        const showService = new ShowService(
            new SingleEpisodeMockSpotifyApiClient(),
            new MockConfiguration(),
            new MockHttpClient(),
            new MockLogger()
        );
        
        // Get formatted episodes data
        const formattedData = await showService.formatEpisodesData('testShowId', 1, 10);
        
        // Verify single episode handling
        expect(formattedData.episodes.length).toBe(0);
        expect(formattedData.pagination.totalItems).toBe(0);
        expect(formattedData.pagination.totalPages).toBe(1); // Still have 1 page, just empty
        expect(formattedData.pagination.hasNext).toBe(false);
        expect(formattedData.pagination.hasPrevious).toBe(false);
        
        // Pagination should be correct
        expect(formattedData.pagination).toBeValidPagination();
    });
});
