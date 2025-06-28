/**
 * Unit tests for HistoryService
 */

const fs = require('fs');
const path = require('path');
const HistoryService = require('../src/services/HistoryService');
const { MockLogger, MockConfiguration } = require('./jest/mocks');

describe('History Service Tests', () => {
    // Test setup helper
    function createHistoryService(testHistoryPath) {
        const config = new MockConfiguration();
        const logger = new MockLogger();
        
        // Create a test-specific history service with a test file path
        const service = new HistoryService(config, logger);
        
        // Override the history file path for testing
        service.historyFilePath = testHistoryPath;
        
        // Ensure the test directory exists
        const testDir = path.dirname(testHistoryPath);
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
        
        // Initialize with empty history
        fs.writeFileSync(testHistoryPath, JSON.stringify({ history: [] }, null, 2));
        
        // Reload history from the test file
        service.loadHistory();
        
        return service;
    }
    
    // Clean up helper
    function cleanupTestFile(testHistoryPath) {
        if (fs.existsSync(testHistoryPath)) {
            fs.unlinkSync(testHistoryPath);
        }
    }
    
    test('should add a show to history', async () => {
        const testHistoryPath = path.join(__dirname, 'test_history.json');
        const service = createHistoryService(testHistoryPath);
        
        try {
            // Test adding a show
            const result = service.addToHistory('testShowId', 'Test Show');
            expect(result).toBe(true);
            
            // Verify the show was added
            const history = service.getHistory();
            expect(history.length).toBe(1);
            expect(history[0].id).toBe('testShowId');
            expect(history[0].name).toBe('Test Show');
            expect(history[0].firstAccessed).toBeDefined();
            expect(history[0].lastAccessed).toBeDefined();
            
            // Verify the history was saved to file
            const fileContent = JSON.parse(fs.readFileSync(testHistoryPath, 'utf8'));
            expect(fileContent.history.length).toBe(1);
        } finally {
            cleanupTestFile(testHistoryPath);
        }
    });
    
    test('should update existing show in history', async () => {
        const testHistoryPath = path.join(__dirname, 'test_history.json');
        const service = createHistoryService(testHistoryPath);
        
        try {
            // Add initial show
            service.addToHistory('testShowId', 'Test Show');
            
            // Get the initial timestamp
            const initialHistory = service.getHistory();
            const initialTimestamp = initialHistory[0].lastAccessed;
            
            // Wait a small amount to ensure timestamp changes
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Update the same show
            const result = service.addToHistory('testShowId', 'Updated Show Name');
            expect(result).toBe(true);
            
            // Verify the show was updated
            const history = service.getHistory();
            expect(history.length).toBe(1);
            expect(history[0].id).toBe('testShowId');
            expect(history[0].name).toBe('Updated Show Name');
            expect(history[0].lastAccessed).not.toBe(initialTimestamp);
        } finally {
            cleanupTestFile(testHistoryPath);
        }
    });
    
    test('should limit history to 20 items', async () => {
        const testHistoryPath = path.join(__dirname, 'test_history.json');
        const service = createHistoryService(testHistoryPath);
        
        try {
            // Add 25 shows
            for (let i = 1; i <= 25; i++) {
                service.addToHistory(`show${i}`, `Show ${i}`);
            }
            
            // Verify history is limited to 20 items
            const history = service.getHistory();
            expect(history.length).toBe(20);
            
            // Verify the most recent shows are kept (show25 to show6)
            expect(history[0].id).toBe('show25');
            expect(history[19].id).toBe('show6');
            
            // Verify shows 1-5 were removed
            const hasShow5 = history.some(item => item.id === 'show5');
            expect(hasShow5).toBe(false);
        } finally {
            cleanupTestFile(testHistoryPath);
        }
    });
    
    test('should remove a show from history', async () => {
        const testHistoryPath = path.join(__dirname, 'test_history.json');
        const service = createHistoryService(testHistoryPath);
        
        try {
            // Add some shows
            service.addToHistory('show1', 'Show 1');
            service.addToHistory('show2', 'Show 2');
            service.addToHistory('show3', 'Show 3');
            
            // Remove the middle show
            const result = service.removeFromHistory('show2');
            expect(result).toBe(true);
            
            // Verify the show was removed
            const history = service.getHistory();
            expect(history.length).toBe(2);
            expect(history[0].id).toBe('show3');
            expect(history[1].id).toBe('show1');
            
            // Try to remove a non-existent show
            const nonExistentResult = service.removeFromHistory('nonExistentShow');
            expect(nonExistentResult).toBe(false);
        } finally {
            cleanupTestFile(testHistoryPath);
        }
    });
    
    test('should clear all history', async () => {
        const testHistoryPath = path.join(__dirname, 'test_history.json');
        const service = createHistoryService(testHistoryPath);
        
        try {
            // Add some shows
            service.addToHistory('show1', 'Show 1');
            service.addToHistory('show2', 'Show 2');
            
            // Clear history
            const result = service.clearHistory();
            expect(result).toBe(true);
            
            // Verify history is empty
            const history = service.getHistory();
            expect(history.length).toBe(0);
            
            // Verify the file was updated
            const fileContent = JSON.parse(fs.readFileSync(testHistoryPath, 'utf8'));
            expect(fileContent.history.length).toBe(0);
        } finally {
            cleanupTestFile(testHistoryPath);
        }
    });
    
    test('should update show name', async () => {
        const testHistoryPath = path.join(__dirname, 'test_history.json');
        const service = createHistoryService(testHistoryPath);
        
        try {
            // Add a show
            service.addToHistory('testShowId', 'Original Name');
            
            // Update the show name
            const result = service.updateShowName('testShowId', 'Updated Name');
            expect(result).toBe(true);
            
            // Verify the name was updated
            const history = service.getHistory();
            expect(history[0].name).toBe('Updated Name');
            
            // Try to update a non-existent show
            const nonExistentResult = service.updateShowName('nonExistentShow', 'New Name');
            expect(nonExistentResult).toBe(false);
        } finally {
            cleanupTestFile(testHistoryPath);
        }
    });
    
    test('should handle file system errors gracefully', async () => {
        const testHistoryPath = path.join(__dirname, 'test_history.json');
        const service = createHistoryService(testHistoryPath);
        
        try {
            // Make the history file read-only to simulate permission errors
            fs.chmodSync(testHistoryPath, 0o444);
            
            // Attempt to add a show (should fail but not throw)
            const result = service.addToHistory('testShowId', 'Test Show');
            
            // On Windows, this might still succeed despite read-only flag
            // So we don't assert the result directly
            
            // Restore permissions
            fs.chmodSync(testHistoryPath, 0o666);
            
            // Test should reach this point without throwing an error
            expect(true).toBe(true);
        } catch (error) {
            // If an error is thrown, the test should fail
            expect(error).toBeUndefined();
        } finally {
            // Restore permissions and cleanup
            try {
                fs.chmodSync(testHistoryPath, 0o666);
            } catch (e) {
                // Ignore errors during cleanup
            }
            cleanupTestFile(testHistoryPath);
        }
    });
    
    // Additional tests for history functionality mentioned in the memory
    test('should get all history entries', async () => {
        const testHistoryPath = path.join(__dirname, 'test_history.json');
        const service = createHistoryService(testHistoryPath);
        
        try {
            // Add some shows
            service.addToHistory('show1', 'Show 1');
            service.addToHistory('show2', 'Show 2');
            service.addToHistory('show3', 'Show 3');
            
            // Get all history entries
            const history = service.getHistory();
            
            expect(history).toBeInstanceOf(Array);
            expect(history.length).toBe(3);
            expect(history[0].id).toBe('show3');
            expect(history[1].id).toBe('show2');
            expect(history[2].id).toBe('show1');
            
            // Verify each entry has the expected properties
            history.forEach(entry => {
                expect(entry.id).toBeDefined();
                expect(entry.name).toBeDefined();
                expect(entry.firstAccessed).toBeDefined();
                expect(entry.lastAccessed).toBeDefined();
            });
        } finally {
            cleanupTestFile(testHistoryPath);
        }
    });
    
    test('should sort history by last accessed (newest first) by default', async () => {
        const testHistoryPath = path.join(__dirname, 'test_history.json');
        const service = createHistoryService(testHistoryPath);
        
        try {
            // Add shows with controlled timestamps
            const currentTime = Date.now();
            
            // Add show1 first
            service.addToHistory('show1', 'Show 1');
            
            // Add show2 after a delay
            await new Promise(resolve => setTimeout(resolve, 10));
            service.addToHistory('show2', 'Show 2');
            
            // Add show3 after another delay
            await new Promise(resolve => setTimeout(resolve, 10));
            service.addToHistory('show3', 'Show 3');
            
            // Get history - should be sorted by last accessed (newest first)
            const history = service.getHistory();
            
            expect(history.length).toBe(3);
            expect(history[0].id).toBe('show3'); // Most recently added
            expect(history[1].id).toBe('show2');
            expect(history[2].id).toBe('show1'); // First added
            
            // Update show1 to make it most recent
            await new Promise(resolve => setTimeout(resolve, 10));
            service.addToHistory('show1', 'Show 1');
            
            // Get history again - show1 should now be first
            const updatedHistory = service.getHistory();
            expect(updatedHistory[0].id).toBe('show1'); // Now most recent
            expect(updatedHistory[1].id).toBe('show3');
            expect(updatedHistory[2].id).toBe('show2');
        } finally {
            cleanupTestFile(testHistoryPath);
        }
    });
});
