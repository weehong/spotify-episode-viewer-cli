/**
 * Unit tests for episode ordering functionality (reverse chronological order)
 */

module.exports = (runner) => {
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
                ]
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
    
    // Tests
    runner.test('Episode Ordering - should order episodes in reverse chronological order', async () => {
        const showService = createShowService();
        
        // Get episodes data
        const episodesData = await showService.getShowEpisodes('testShowId', 1, 10);
        
        // Verify episodes are ordered newest first
        const episodes = episodesData.episodes;
        
        // Check that episodes are sorted by release date (newest first)
        for (let i = 0; i < episodes.length - 1; i++) {
            const currentDate = new Date(episodes[i].releaseDate);
            const nextDate = new Date(episodes[i + 1].releaseDate);
            
            runner.assert(currentDate >= nextDate, 
                `Episode ${i+1} (${currentDate}) should be newer than or equal to episode ${i+2} (${nextDate})`);
        }
    });
    
    runner.test('Episode Ordering - should number episodes in reverse chronological order', async () => {
        const showService = createShowService();
        
        // Get formatted episodes data
        const formattedData = await showService.formatEpisodesData('testShowId', 1, 10);
        
        // Verify episode numbering is in reverse chronological order
        const episodes = formattedData.episodes;
        
        // The newest episode should be #1
        runner.assert(episodes[0].episodeNumber === 1, 'Newest episode should be #1');
        
        // Episode numbers should be sequential
        for (let i = 0; i < episodes.length - 1; i++) {
            runner.assert(episodes[i].episodeNumber === i + 1, 
                `Episode at index ${i} should have number ${i+1}`);
        }
    });
    
    runner.test('Episode Ordering - should maintain reverse chronological order with pagination', async () => {
        const showService = createShowService();
        
        // Get page 1
        const page1Data = await showService.getShowEpisodes('testShowId', 1, 5);
        
        // Get page 2
        const page2Data = await showService.getShowEpisodes('testShowId', 2, 5);
        
        // Verify the last episode of page 1 is newer than the first episode of page 2
        const lastEpisodePage1 = page1Data.episodes[page1Data.episodes.length - 1];
        const firstEpisodePage2 = page2Data.episodes[0];
        
        const lastEpisodePage1Date = new Date(lastEpisodePage1.releaseDate);
        const firstEpisodePage2Date = new Date(firstEpisodePage2.releaseDate);
        
        runner.assert(lastEpisodePage1Date >= firstEpisodePage2Date, 
            'Last episode of page 1 should be newer than first episode of page 2');
    });
    
    runner.test('Episode Ordering - should format all episodes in reverse chronological order', async () => {
        const showService = createShowService();
        
        // Get all episodes formatted data
        const allEpisodesData = await showService.formatAllEpisodesData('testShowId');
        
        // Verify all episodes are in reverse chronological order
        const episodes = allEpisodesData.episodes;
        
        // Check that episodes are sorted by release date (newest first)
        for (let i = 0; i < episodes.length - 1; i++) {
            const currentDate = new Date(episodes[i].releaseDate);
            const nextDate = new Date(episodes[i + 1].releaseDate);
            
            runner.assert(currentDate >= nextDate, 
                `Episode ${i+1} (${currentDate}) should be newer than or equal to episode ${i+2} (${nextDate})`);
        }
        
        // Verify episode numbering is correct
        for (let i = 0; i < episodes.length; i++) {
            runner.assert(episodes[i].episodeNumber === i + 1, 
                `Episode at index ${i} should have number ${i+1}`);
        }
    });
    
    runner.test('Episode Ordering - should handle empty episode list', async () => {
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
        runner.assert(episodesData.episodes.length === 0, 'Should return empty episodes array');
        runner.assert(episodesData.pagination.totalItems === 0, 'Total items should be 0');
    });
    
    runner.test('Episode Ordering - should handle single episode', async () => {
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
        }
        
        const showService = new ShowService(
            new SingleEpisodeMockSpotifyApiClient(),
            new MockConfiguration(),
            new MockHttpClient(),
            new MockLogger()
        );
        
        // Get formatted episodes data
        const formattedData = await showService.formatEpisodesData('testShowId', 1, 10);
        
        // Verify single episode numbering
        runner.assert(formattedData.episodes.length === 1, 'Should return 1 episode');
        runner.assert(formattedData.episodes[0].episodeNumber === 1, 'Single episode should be #1');
    });
};
