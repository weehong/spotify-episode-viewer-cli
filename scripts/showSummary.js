/**
 * Script to show summary information about a Spotify show
 */

const SpotifyShowApp = require('../src/SpotifyShowApp');

async function main() {
    const showId = process.argv[2];
    
    if (!showId) {
        console.error('Usage: node scripts/showSummary.js <showId>');
        process.exit(1);
    }
    
    const app = new SpotifyShowApp();
    
    try {
        await app.initialize();
        await app.displayShowSummary(showId);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    } finally {
        await app.shutdown();
    }
}

main();
