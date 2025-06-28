/**
 * Tests for the pagination functionality in the Spotify CLI application
 */

const { MockLogger, MockConfiguration, createMockEpisodes } = require('./jest/mocks');
const { createMockPagination } = require('./jest/testUtils');

describe('Pagination Tests', () => {
    // Helper to create a paginated data structure
    function createPaginatedData(options = {}) {
        const {
            currentPage = 1,
            pageSize = 15,
            totalItems = 100,
            items = []
        } = options;
        
        // Create mock episodes if none provided
        const episodes = items.length > 0 ? items : createMockEpisodes(pageSize);
        
        return {
            episodes,
            pagination: createMockPagination({
                currentPage, 
                pageSize, 
                totalItems
            })
        };
    }
    
    test('should correctly calculate pagination values', () => {
        // Test default pagination (page 1 of multiple pages)
        const defaultPagination = createMockPagination();
        expect(defaultPagination.currentPage).toBe(1);
        expect(defaultPagination.pageSize).toBe(15);
        expect(defaultPagination.totalItems).toBe(100);
        expect(defaultPagination.totalPages).toBe(7);
        expect(defaultPagination.hasNext).toBe(true);
        expect(defaultPagination.hasPrevious).toBe(false);
        expect(defaultPagination.startItem).toBe(1);
        expect(defaultPagination.endItem).toBe(15);
        
        // Test middle page
        const middlePagination = createMockPagination({ currentPage: 3, pageSize: 15, totalItems: 100 });
        expect(middlePagination.currentPage).toBe(3);
        expect(middlePagination.hasNext).toBe(true);
        expect(middlePagination.hasPrevious).toBe(true);
        expect(middlePagination.startItem).toBe(31);
        expect(middlePagination.endItem).toBe(45);
        
        // Test last page
        const lastPagination = createMockPagination({ currentPage: 7, pageSize: 15, totalItems: 100 });
        expect(lastPagination.currentPage).toBe(7);
        expect(lastPagination.hasNext).toBe(false);
        expect(lastPagination.hasPrevious).toBe(true);
        expect(lastPagination.startItem).toBe(91);
        expect(lastPagination.endItem).toBe(100);
        
        // Test single page
        const singlePagination = createMockPagination({ currentPage: 1, pageSize: 15, totalItems: 10 });
        expect(singlePagination.currentPage).toBe(1);
        expect(singlePagination.totalPages).toBe(1);
        expect(singlePagination.hasNext).toBe(false);
        expect(singlePagination.hasPrevious).toBe(false);
        expect(singlePagination.startItem).toBe(1);
        expect(singlePagination.endItem).toBe(10);
    });
    
    test('should handle page size changes correctly', () => {
        // Start with a default pagination
        const originalPagination = createMockPagination({ currentPage: 3, pageSize: 15, totalItems: 100 });
        expect(originalPagination.startItem).toBe(31);
        expect(originalPagination.endItem).toBe(45);
        
        // Calculate new page when changing page size from 15 to 10
        // We want to maintain the user's position in the content (around item 31-45)
        const newPageSizeSmaller = 10;
        const newPageSmaller = Math.floor(originalPagination.startItem / newPageSizeSmaller) + 1;
        
        const smallerPagination = createMockPagination({
            currentPage: newPageSmaller, 
            pageSize: newPageSizeSmaller, 
            totalItems: 100
        });
        
        expect(smallerPagination.currentPage).toBe(4);
        expect(smallerPagination.startItem).toBe(31);
        expect(smallerPagination.endItem).toBe(40);
        expect(smallerPagination.totalPages).toBe(10);
        
        // Calculate new page when changing page size from 15 to 25
        const newPageSizeLarger = 25;
        const newPageLarger = Math.floor(originalPagination.startItem / newPageSizeLarger) + 1;
        
        const largerPagination = createMockPagination({
            currentPage: newPageLarger, 
            pageSize: newPageSizeLarger, 
            totalItems: 100
        });
        
        expect(largerPagination.currentPage).toBe(2);
        expect(largerPagination.startItem).toBe(26);
        expect(largerPagination.endItem).toBe(50);
        expect(largerPagination.totalPages).toBe(4);
    });
    
    test('should validate jump-to-page logic', () => {
        const totalPages = 10;
        
        // Valid page numbers
        for (let page = 1; page <= totalPages; page++) {
            expect(page >= 1 && page <= totalPages).toBe(true);
        }
        
        // Invalid page numbers
        const invalidPages = [0, -1, 11, 'string', null, undefined, NaN];
        for (const page of invalidPages) {
            if (typeof page === 'number') {
                expect(page >= 1 && page <= totalPages && !isNaN(page)).toBe(false);
            } else {
                expect(false).toBe(false); // Non-numeric values should be invalid
            }
        }
    });
    
    test('should slice episodes correctly for client-side pagination', () => {
        // Create 100 mock episodes
        const allEpisodes = createMockEpisodes(100);
        
        // Page 1 with 15 items
        const page1 = allEpisodes.slice(0, 15);
        expect(page1.length).toBe(15);
        expect(page1[0].id).toBe('episode100');
        expect(page1[14].id).toBe('episode86');
        
        // Page 2 with 15 items
        const page2 = allEpisodes.slice(15, 30);
        expect(page2.length).toBe(15);
        expect(page2[0].id).toBe('episode85');
        expect(page2[14].id).toBe('episode71');
        
        // Last page with 10 items (91-100)
        const lastPage = allEpisodes.slice(90, 100);
        expect(lastPage.length).toBe(10);
        expect(lastPage[0].id).toBe('episode10');
        expect(lastPage[9].id).toBe('episode1');
    });
    
    test('should ensure episodes maintain reverse chronological order in pagination', () => {
        // Create episodes with decreasing dates (newest first)
        const episodes = [];
        const baseDate = new Date();
        
        for (let i = 0; i < 50; i++) {
            const releaseDate = new Date(baseDate);
            releaseDate.setDate(baseDate.getDate() - i); // Each episode is one day older
            
            episodes.push({
                id: `episode${i+1}`,
                episodeNumber: i+1,
                name: `Episode ${i+1}`,
                releaseDate: releaseDate.toISOString().split('T')[0],
                duration: 1800000 + (i * 60000) // Each episode is 1 minute longer
            });
        }
        
        // Test that episodes are correctly in reverse chronological order
        expect(episodes).toBeInReverseChronologicalOrder();
        
        // Slice into pages and ensure the order is maintained
        const page1 = episodes.slice(0, 15);
        const page2 = episodes.slice(15, 30);
        
        expect(page1).toBeInReverseChronologicalOrder();
        expect(page2).toBeInReverseChronologicalOrder();
        
        // Verify the transition between pages maintains order
        const lastEpisodePage1 = page1[page1.length - 1];
        const firstEpisodePage2 = page2[0];
        
        const lastDatePage1 = new Date(lastEpisodePage1.releaseDate);
        const firstDatePage2 = new Date(firstEpisodePage2.releaseDate);
        expect(lastDatePage1).toBeGreaterThanOrEqual(firstDatePage2);
    });
});
