/**
 * Script to show episodes of a Spotify show
 */

const SpotifyShowApp = require('../src/SpotifyShowApp');

async function main() {
    const showId = process.argv[2];
    const page = parseInt(process.argv[3]) || 1;
    
    if (!showId) {
        console.error('Usage: node scripts/showEpisodes.js <showId> [page]');
        process.exit(1);
    }
    
    const app = new SpotifyShowApp();
    
    try {
        await app.initialize();
        await app.displayShowEpisodes(showId, page);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    } finally {
        await app.shutdown();
    }
}

main();
