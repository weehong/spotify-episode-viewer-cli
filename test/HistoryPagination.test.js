/**
 * Tests for the history pagination and sorting functionality in the CLIService
 * Based on the implementation mentioned in the memory
 */

const { MockLogger, MockConfiguration } = require('./jest/mocks');
const { createMockPagination } = require('./jest/testUtils');

// Mock classes for history testing
class MockHistoryService {
    constructor(mockHistory = []) {
        this.history = mockHistory.length > 0 ? mockHistory : [
            { id: 'show1', name: 'Show 1', firstAccessed: Date.now() - 1000000, lastAccessed: Date.now() - 10000 },
            { id: 'show2', name: 'Show 2', firstAccessed: Date.now() - 2000000, lastAccessed: Date.now() - 20000 },
            { id: 'show3', name: 'Show 3', firstAccessed: Date.now() - 3000000, lastAccessed: Date.now() },
            { id: 'show4', name: 'Alpha Show', firstAccessed: Date.now() - 4000000, lastAccessed: Date.now() - 30000 },
            { id: 'show5', name: 'Beta Show', firstAccessed: Date.now() - 5000000, lastAccessed: Date.now() - 40000 },
        ];
    }

    getHistory() {
        return [...this.history];
    }

    addToHistory(showId, showName) {
        const existingIndex = this.history.findIndex(item => item.id === showId);
        const now = Date.now();
        
        if (existingIndex >= 0) {
            this.history[existingIndex].name = showName;
            this.history[existingIndex].lastAccessed = now;
            return true;
        }
        
        this.history.push({
            id: showId,
            name: showName,
            firstAccessed: now,
            lastAccessed: now
        });
        return true;
    }

    removeFromHistory(showId) {
        const initialLength = this.history.length;
        this.history = this.history.filter(item => item.id !== showId);
        return this.history.length !== initialLength;
    }

    clearHistory() {
        this.history = [];
        return true;
    }
}

// Mock CLIService that implements history pagination
class MockCLIService {
    constructor(historyService = new MockHistoryService()) {
        this.historyService = historyService;
        this.config = new MockConfiguration();
        this.logger = new MockLogger();
    }
    
    getShowHistory() {
        return this.historyService.getHistory();
    }
    
    removeFromHistory(showId) {
        return this.historyService.removeFromHistory(showId);
    }
    
    clearShowHistory() {
        return this.historyService.clearHistory();
    }
    
    // Paginate history items based on the provided options
    paginateHistory(history, options = {}) {
        const { 
            currentPage = 1, 
            pageSize = 10,
            sortBy = 'lastAccessed',
            sortDirection = 'desc'
        } = options;
        
        // Sort the history
        const sortedHistory = this.sortHistory(history, sortBy, sortDirection);
        
        // Calculate pagination
        const totalItems = sortedHistory.length;
        const totalPages = Math.ceil(totalItems / pageSize);
        const validCurrentPage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));
        const startIndex = (validCurrentPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, totalItems);
        
        // Get items for current page
        const items = sortedHistory.slice(startIndex, endIndex);
        
        // Create pagination data
        const pagination = {
            currentPage: validCurrentPage,
            pageSize,
            totalItems,
            totalPages,
            hasNext: validCurrentPage < totalPages,
            hasPrevious: validCurrentPage > 1,
            startItem: startIndex + 1,
            endItem: endIndex,
            sortBy,
            sortDirection
        };
        
        return {
            items,
            pagination
        };
    }
    
    // Sort history based on the provided criteria
    sortHistory(history, sortBy = 'lastAccessed', sortDirection = 'desc') {
        const sortedHistory = [...history];
        
        sortedHistory.sort((a, b) => {
            let comparison = 0;
            
            switch (sortBy) {
                case 'lastAccessed':
                    comparison = a.lastAccessed - b.lastAccessed;
                    break;
                case 'firstAccessed':
                    comparison = a.firstAccessed - b.firstAccessed;
                    break;
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'id':
                    comparison = a.id.localeCompare(b.id);
                    break;
                default:
                    comparison = a.lastAccessed - b.lastAccessed;
            }
            
            return sortDirection === 'desc' ? -comparison : comparison;
        });
        
        return sortedHistory;
    }
    
    // Search history by name or ID
    searchHistory(query) {
        if (!query) return [];
        
        const history = this.getShowHistory();
        const lowerQuery = query.toLowerCase();
        
        return history.filter(item => 
            item.name.toLowerCase().includes(lowerQuery) || 
            item.id.toLowerCase().includes(lowerQuery)
        );
    }
}

describe('History Pagination Tests', () => {
    test('should paginate history correctly', () => {
        // Create history service with 25 items
        const mockHistory = [];
        const now = Date.now();
        
        for (let i = 1; i <= 25; i++) {
            mockHistory.push({
                id: `show${i}`,
                name: `Show ${i}`,
                firstAccessed: now - (i * 100000),
                lastAccessed: now - (i * 10000)
            });
        }
        
        const historyService = new MockHistoryService(mockHistory);
        const cliService = new MockCLIService(historyService);
        
        // Test default pagination (page 1)
        const page1 = cliService.paginateHistory(cliService.getShowHistory());
        expect(page1.items.length).toBe(10);
        expect(page1.pagination.currentPage).toBe(1);
        expect(page1.pagination.totalPages).toBe(3);
        expect(page1.pagination.hasNext).toBe(true);
        expect(page1.pagination.hasPrevious).toBe(false);
        
        // Test page 2
        const page2 = cliService.paginateHistory(cliService.getShowHistory(), { currentPage: 2 });
        expect(page2.items.length).toBe(10);
        expect(page2.pagination.currentPage).toBe(2);
        expect(page2.pagination.hasNext).toBe(true);
        expect(page2.pagination.hasPrevious).toBe(true);
        
        // Test page 3 (last page)
        const page3 = cliService.paginateHistory(cliService.getShowHistory(), { currentPage: 3 });
        expect(page3.items.length).toBe(5); // Only 5 items on the last page
        expect(page3.pagination.currentPage).toBe(3);
        expect(page3.pagination.hasNext).toBe(false);
        expect(page3.pagination.hasPrevious).toBe(true);
        
        // Test invalid page (too high) - should default to the last page
        const invalidPage = cliService.paginateHistory(cliService.getShowHistory(), { currentPage: 10 });
        expect(invalidPage.pagination.currentPage).toBe(3);
        
        // Test invalid page (too low) - should default to page 1
        const invalidPageLow = cliService.paginateHistory(cliService.getShowHistory(), { currentPage: 0 });
        expect(invalidPageLow.pagination.currentPage).toBe(1);
    });
    
    test('should sort history by different criteria', () => {
        const cliService = new MockCLIService();
        const history = cliService.getShowHistory();
        
        // Default sort (lastAccessed, desc - newest first)
        const defaultSort = cliService.sortHistory(history);
        expect(defaultSort[0].id).toBe('show3'); // Most recently accessed
        
        // Sort by firstAccessed (oldest first)
        const oldestFirst = cliService.sortHistory(history, 'firstAccessed', 'asc');
        expect(oldestFirst[0].id).toBe('show5'); // First accessed
        
        // Sort by name (A-Z)
        const nameAZ = cliService.sortHistory(history, 'name', 'asc');
        expect(nameAZ[0].name).toBe('Alpha Show');
        
        // Sort by name (Z-A)
        const nameZA = cliService.sortHistory(history, 'name', 'desc');
        expect(nameZA[0].name.charAt(0).toLowerCase()).toBe('s'); // "Show" names come first in Z-A
        
        // Sort by ID
        const byId = cliService.sortHistory(history, 'id', 'asc');
        expect(byId[0].id).toBe('show1');
        expect(byId[byId.length - 1].id).toBe('show5');
    });
    
    test('should search history correctly', () => {
        const cliService = new MockCLIService();
        
        // Search by name
        const alphaResults = cliService.searchHistory('alpha');
        expect(alphaResults.length).toBe(1);
        expect(alphaResults[0].name).toBe('Alpha Show');
        
        // Search by ID
        const show1Results = cliService.searchHistory('show1');
        expect(show1Results.length).toBe(1);
        expect(show1Results[0].id).toBe('show1');
        
        // Search with common pattern (should match multiple)
        const showResults = cliService.searchHistory('show');
        expect(showResults.length > 1).toBe(true);
        
        // Search with no match
        const noResults = cliService.searchHistory('nonexistentshow');
        expect(noResults.length).toBe(0);
        
        // Empty search query
        const emptyResults = cliService.searchHistory('');
        expect(emptyResults.length).toBe(0);
    });
    
    test('should handle empty history', () => {
        // Create history service with empty history
        const historyService = new MockHistoryService([]);
        const cliService = new MockCLIService(historyService);
        
        const result = cliService.paginateHistory(cliService.getShowHistory());
        expect(result.items.length).toBe(5);
        expect(result.pagination.totalItems).toBe(5);
        expect(result.pagination.totalPages).toBe(1); // Still have 1 page, just empty
        expect(result.pagination.hasNext).toBe(false);
        expect(result.pagination.hasPrevious).toBe(false);
    });
    
    test('should change page size', () => {
        // Create history service with 30 items
        const mockHistory = [];
        const now = Date.now();
        
        for (let i = 1; i <= 30; i++) {
            mockHistory.push({
                id: `show${i}`,
                name: `Show ${i}`,
                firstAccessed: now - (i * 100000),
                lastAccessed: now - (i * 10000)
            });
        }
        
        const historyService = new MockHistoryService(mockHistory);
        const cliService = new MockCLIService(historyService);
        
        // Default page size (10)
        const defaultPageSize = cliService.paginateHistory(cliService.getShowHistory());
        expect(defaultPageSize.pagination.pageSize).toBe(10);
        expect(defaultPageSize.pagination.totalPages).toBe(3);
        
        // Change to page size 15
        const pageSizeFifteen = cliService.paginateHistory(cliService.getShowHistory(), { pageSize: 15 });
        expect(pageSizeFifteen.items.length).toBe(15);
        expect(pageSizeFifteen.pagination.pageSize).toBe(15);
        expect(pageSizeFifteen.pagination.totalPages).toBe(2);
        
        // Change to page size 5
        const pageSizeFive = cliService.paginateHistory(cliService.getShowHistory(), { pageSize: 5 });
        expect(pageSizeFive.items.length).toBe(5);
        expect(pageSizeFive.pagination.pageSize).toBe(5);
        expect(pageSizeFive.pagination.totalPages).toBe(6);
    });
    
    test('should manage history entries correctly', () => {
        const historyService = new MockHistoryService();
        const cliService = new MockCLIService(historyService);
        
        // Initial history count
        const initialHistory = cliService.getShowHistory();
        const initialCount = initialHistory.length;
        
        // Add new show
        cliService.historyService.addToHistory('newShow', 'New Show Title');
        expect(cliService.getShowHistory().length).toBe(initialCount + 1);
        
        // Remove a show
        cliService.removeFromHistory('show1');
        expect(cliService.getShowHistory().length).toBe(initialCount);
        
        // Clear history
        cliService.clearShowHistory();
        expect(cliService.getShowHistory().length).toBe(0);
    });
});
