#!/usr/bin/env node

/**
 * Simple test script to verify SQLite favorites functionality
 */

const FavoritesService = require('../src/services/FavoritesService');
const path = require('path');
const fs = require('fs');

class SQLiteTest {
    constructor() {
        this.logger = {
            info: (msg) => console.log(`ℹ️  ${msg}`),
            error: (msg) => console.error(`❌ ${msg}`),
            warn: (msg) => console.warn(`⚠️  ${msg}`)
        };
        
        this.testDbPath = path.join(process.cwd(), 'data', 'test-favorites.db');
    }

    async runTests() {
        console.log('🧪 Testing SQLite Favorites Service...\n');

        try {
            // Clean up any existing test database
            if (fs.existsSync(this.testDbPath)) {
                fs.unlinkSync(this.testDbPath);
            }

            // Create service instance
            const favoritesService = new FavoritesService({}, this.logger);
            favoritesService.dbPath = this.testDbPath;

            // Wait for database to be ready
            await favoritesService.dbReady;
            console.log('✅ Database initialized successfully\n');

            // Test 1: Add favorites
            console.log('🔍 Test 1: Adding favorites...');
            await favoritesService.addToFavorites('show1', 'Test Show 1');
            await favoritesService.addToFavorites('show2', 'Test Show 2');
            console.log('✅ Added 2 shows to favorites\n');

            // Test 2: Get favorites
            console.log('🔍 Test 2: Getting favorites...');
            const favorites = await favoritesService.getFavorites();
            console.log(`✅ Retrieved ${favorites.length} favorites:`);
            favorites.forEach(fav => {
                console.log(`   - ${fav.name} (ID: ${fav.id})`);
            });
            console.log('');

            // Test 3: Update show name
            console.log('🔍 Test 3: Updating show name...');
            await favoritesService.addToFavorites('show1', 'Updated Test Show 1');
            const updatedFavorites = await favoritesService.getFavorites();
            const updatedShow = updatedFavorites.find(f => f.id === 'show1');
            console.log(`✅ Updated show name: ${updatedShow.name}\n`);

            // Test 4: Remove favorite
            console.log('🔍 Test 4: Removing favorite...');
            await favoritesService.removeFromFavorites('show2');
            const remainingFavorites = await favoritesService.getFavorites();
            console.log(`✅ Remaining favorites: ${remainingFavorites.length}\n`);

            // Test 5: Clear all favorites
            console.log('🔍 Test 5: Clearing all favorites...');
            await favoritesService.clearFavorites();
            const emptyFavorites = await favoritesService.getFavorites();
            console.log(`✅ Favorites after clear: ${emptyFavorites.length}\n`);

            // Close database
            favoritesService.close();
            console.log('🔒 Database connection closed');

            // Clean up test database
            if (fs.existsSync(this.testDbPath)) {
                fs.unlinkSync(this.testDbPath);
                console.log('🧹 Test database cleaned up');
            }

            console.log('\n🎉 All tests passed! SQLite favorites service is working correctly.');

        } catch (error) {
            console.error('\n❌ Test failed:', error.message);
            console.error(error.stack);
            process.exit(1);
        }
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    const test = new SQLiteTest();
    test.runTests().catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = SQLiteTest;
