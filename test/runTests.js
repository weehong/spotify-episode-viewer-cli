/**
 * Simple test runner for the refactored Spotify application
 * This is a basic test framework - in production you'd use Jest, Mocha, etc.
 */

const fs = require('fs');
const path = require('path');

class TestRunner {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    /**
     * Add a test case
     * @param {string} name - Test name
     * @param {Function} testFn - Test function
     */
    test(name, testFn) {
        this.tests.push({ name, testFn });
    }

    /**
     * Run all tests
     */
    async runAll() {
        console.log('🧪 Running tests...\n');

        for (const test of this.tests) {
            try {
                await test.testFn();
                this.passed++;
                console.log(`✅ ${test.name}`);
            } catch (error) {
                this.failed++;
                console.log(`❌ ${test.name}`);
                console.log(`   Error: ${error.message}\n`);
            }
        }

        this.printSummary();
    }

    /**
     * Print test summary
     */
    printSummary() {
        const total = this.passed + this.failed;
        console.log(`\n📊 Test Summary:`);
        console.log(`   Total: ${total}`);
        console.log(`   Passed: ${this.passed}`);
        console.log(`   Failed: ${this.failed}`);

        if (this.failed > 0) {
            console.log('\n❌ Some tests failed');
            process.exit(1);
        } else {
            console.log('\n✅ All tests passed!');
        }
    }

    /**
     * Assert that a condition is true
     * @param {boolean} condition - Condition to check
     * @param {string} message - Error message if assertion fails
     */
    assert(condition, message = 'Assertion failed') {
        if (!condition) {
            throw new Error(message);
        }
    }

    /**
     * Assert that two values are equal
     * @param {*} actual - Actual value
     * @param {*} expected - Expected value
     * @param {string} message - Error message if assertion fails
     */
    assertEqual(actual, expected, message = `Expected ${expected}, got ${actual}`) {
        if (actual !== expected) {
            throw new Error(message);
        }
    }

    /**
     * Assert that a function throws an error
     * @param {Function} fn - Function that should throw
     * @param {string} message - Error message if assertion fails
     */
    async assertThrows(fn, message = 'Expected function to throw') {
        try {
            await fn();
            throw new Error(message);
        } catch (error) {
            // Expected to throw
        }
    }
}

// Create test runner instance
const runner = new TestRunner();

// Import test files
const testFiles = [
    './ConfigurationTest.js',
    './DIContainerTest.js',
    './HttpClientTest.js',
    './ShowServiceTest.js',
    './ErrorHandlingTest.js',
    './IntegrationTest.js',
    './CLIServiceTest.js',
    './PopularShowsServiceTest.js',
    './CLIErrorTest.js',
    './BrowseEpisodesTest.js',
    './SpotifyApiClientTest.js',
    './EpisodeNavigationTest.js',
    './HistoryServiceTest.js',
    './CLIServiceHistoryTest.js',
    './EpisodePaginationTest.js',
    './EpisodeOrderingTest.js'
];

// Load and run tests
async function main() {
    // Load test files
    for (const testFile of testFiles) {
        const testPath = path.join(__dirname, testFile);
        if (fs.existsSync(testPath)) {
            require(testPath)(runner);
        } else {
            console.log(`⚠️  Test file not found: ${testFile}`);
        }
    }

    // Run all tests
    await runner.runAll();
}

main().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
});
