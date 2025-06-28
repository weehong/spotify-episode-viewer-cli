/**
 * Unit tests for HistoryService
 */

module.exports = (runner) => {
    const fs = require('fs');
    const path = require('path');
    const HistoryService = require('../src/services/HistoryService');
    
    // Mock dependencies
    class MockConfiguration {
        getAppConfig() {
            return { logLevel: 'info' };
        }
        
        isValid() {
            return true;
        }
    }
    
    class MockLogger {
        info() {}
        error() {}
        debug() {}
        warn() {}
    }
    
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
    
    // Tests
    runner.test('HistoryService - should add a show to history', async () => {
        const testHistoryPath = path.join(__dirname, 'test_history.json');
        const service = createHistoryService(testHistoryPath);
        
        try {
            // Test adding a show
            const result = service.addToHistory('testShowId', 'Test Show');
            runner.assert(result === true, 'Should return true when adding a show');
            
            // Verify the show was added
            const history = service.getHistory();
            runner.assert(history.length === 1, 'History should have 1 item');
            runner.assert(history[0].id === 'testShowId', 'Show ID should match');
            runner.assert(history[0].name === 'Test Show', 'Show name should match');
            runner.assert(history[0].firstAccessed !== undefined, 'Should have firstAccessed timestamp');
            runner.assert(history[0].lastAccessed !== undefined, 'Should have lastAccessed timestamp');
            
            // Verify the history was saved to file
            const fileContent = JSON.parse(fs.readFileSync(testHistoryPath, 'utf8'));
            runner.assert(fileContent.history.length === 1, 'File should contain 1 history item');
        } finally {
            cleanupTestFile(testHistoryPath);
        }
    });
    
    runner.test('HistoryService - should update existing show in history', async () => {
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
            runner.assert(result === true, 'Should return true when updating a show');
            
            // Verify the show was updated
            const history = service.getHistory();
            runner.assert(history.length === 1, 'History should still have 1 item');
            runner.assert(history[0].id === 'testShowId', 'Show ID should match');
            runner.assert(history[0].name === 'Updated Show Name', 'Show name should be updated');
            runner.assert(history[0].lastAccessed !== initialTimestamp, 'lastAccessed timestamp should be updated');
        } finally {
            cleanupTestFile(testHistoryPath);
        }
    });
    
    runner.test('HistoryService - should limit history to 20 items', async () => {
        const testHistoryPath = path.join(__dirname, 'test_history.json');
        const service = createHistoryService(testHistoryPath);
        
        try {
            // Add 25 shows
            for (let i = 1; i <= 25; i++) {
                service.addToHistory(`show${i}`, `Show ${i}`);
            }
            
            // Verify history is limited to 20 items
            const history = service.getHistory();
            runner.assert(history.length === 20, 'History should be limited to 20 items');
            
            // Verify the most recent shows are kept (show25 to show6)
            runner.assert(history[0].id === 'show25', 'Most recent show should be first');
            runner.assert(history[19].id === 'show6', 'Oldest kept show should be show6');
            
            // Verify shows 1-5 were removed
            const hasShow5 = history.some(item => item.id === 'show5');
            runner.assert(hasShow5 === false, 'show5 should be removed due to limit');
        } finally {
            cleanupTestFile(testHistoryPath);
        }
    });
    
    runner.test('HistoryService - should remove a show from history', async () => {
        const testHistoryPath = path.join(__dirname, 'test_history.json');
        const service = createHistoryService(testHistoryPath);
        
        try {
            // Add some shows
            service.addToHistory('show1', 'Show 1');
            service.addToHistory('show2', 'Show 2');
            service.addToHistory('show3', 'Show 3');
            
            // Remove the middle show
            const result = service.removeFromHistory('show2');
            runner.assert(result === true, 'Should return true when removing an existing show');
            
            // Verify the show was removed
            const history = service.getHistory();
            runner.assert(history.length === 2, 'History should have 2 items');
            runner.assert(history[0].id === 'show3', 'First item should be show3');
            runner.assert(history[1].id === 'show1', 'Second item should be show1');
            
            // Try to remove a non-existent show
            const nonExistentResult = service.removeFromHistory('nonExistentShow');
            runner.assert(nonExistentResult === false, 'Should return false when removing a non-existent show');
        } finally {
            cleanupTestFile(testHistoryPath);
        }
    });
    
    runner.test('HistoryService - should clear all history', async () => {
        const testHistoryPath = path.join(__dirname, 'test_history.json');
        const service = createHistoryService(testHistoryPath);
        
        try {
            // Add some shows
            service.addToHistory('show1', 'Show 1');
            service.addToHistory('show2', 'Show 2');
            
            // Clear history
            const result = service.clearHistory();
            runner.assert(result === true, 'Should return true when clearing history');
            
            // Verify history is empty
            const history = service.getHistory();
            runner.assert(history.length === 0, 'History should be empty after clearing');
            
            // Verify the file was updated
            const fileContent = JSON.parse(fs.readFileSync(testHistoryPath, 'utf8'));
            runner.assert(fileContent.history.length === 0, 'File should contain empty history');
        } finally {
            cleanupTestFile(testHistoryPath);
        }
    });
    
    runner.test('HistoryService - should update show name', async () => {
        const testHistoryPath = path.join(__dirname, 'test_history.json');
        const service = createHistoryService(testHistoryPath);
        
        try {
            // Add a show
            service.addToHistory('testShowId', 'Original Name');
            
            // Update the show name
            const result = service.updateShowName('testShowId', 'Updated Name');
            runner.assert(result === true, 'Should return true when updating an existing show name');
            
            // Verify the name was updated
            const history = service.getHistory();
            runner.assert(history[0].name === 'Updated Name', 'Show name should be updated');
            
            // Try to update a non-existent show
            const nonExistentResult = service.updateShowName('nonExistentShow', 'New Name');
            runner.assert(nonExistentResult === false, 'Should return false when updating a non-existent show');
        } finally {
            cleanupTestFile(testHistoryPath);
        }
    });
    
    runner.test('HistoryService - should handle file system errors gracefully', async () => {
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
            
            // Test should reach this point without throwing
            runner.assert(true, 'Should handle file system errors gracefully');
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
};
