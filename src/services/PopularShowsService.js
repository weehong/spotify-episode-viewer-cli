const IPopularShowsService = require('../interfaces/IPopularShowsService');

/**
 * Popular Shows Service following Single Responsibility Principle
 * Responsible for managing popular show data and providing search functionality
 */
class PopularShowsService extends IPopularShowsService {
    constructor(logger) {
        super();
        this.logger = logger;
        this.popularShows = this.initializePopularShows();
    }

    /**
     * Initialize popular shows data
     * @private
     * @returns {object[]} Array of popular shows
     */
    initializePopularShows() {
        return [
            {
                id: '4rOoJ6Egrf8K2IrywzwOMk',
                name: 'The Joe Rogan Experience',
                publisher: 'Joe Rogan',
                description: 'The official podcast of comedian Joe Rogan.',
                category: 'Comedy',
                language: 'en'
            },
            {
                id: '69Kj0VeNIgtjPaRdMVMSnc',
                name: 'Serial',
                publisher: 'Serial Productions & The New York Times',
                description: 'Serial is a podcast from the creators of This American Life.',
                category: 'True Crime',
                language: 'en'
            },
            {
                id: '2MAi0BvDc6GTFvKFPXnkCL',
                name: 'This American Life',
                publisher: 'This American Life',
                description: 'This American Life is a weekly public radio show.',
                category: 'Society & Culture',
                language: 'en'
            },
            {
                id: '2hmkzUtix0qTqvtpPcMzEL',
                name: 'Radiolab',
                publisher: 'WNYC Studios',
                description: 'Radiolab is a show about curiosity.',
                category: 'Science',
                language: 'en'
            },
            {
                id: '1VXcH8QHkjRcTCEd88U3ti',
                name: 'TED Talks Daily',
                publisher: 'TED',
                description: 'Every weekday, TED Talks Daily brings you the latest talks.',
                category: 'Education',
                language: 'en'
            },
            {
                id: '11ktWYpzznMCpvGtXsiYxE',
                name: 'Conan O\'Brien Needs a Friend',
                publisher: 'Team Coco & Earwolf',
                description: 'Conan O\'Brien has been a comedian and talk show host.',
                category: 'Comedy',
                language: 'en'
            },
            {
                id: '4kYCRYJ3yK5DQbP5tbfZby',
                name: 'Stuff You Should Know',
                publisher: 'iHeartPodcasts',
                description: 'If you\'ve ever wanted to know about champagne, satanism, the Stonewall Uprising.',
                category: 'Education',
                language: 'en'
            },
            {
                id: '5CfCWKI5pZ28U0uOzXkDHe',
                name: 'My Favorite Murder',
                publisher: 'Exactly Right',
                description: 'Karen Kilgariff and Georgia Hardstark hit the road.',
                category: 'True Crime',
                language: 'en'
            },
            {
                id: '0ofXAdFIQQRsCnQtqyDNTg',
                name: 'Planet Money',
                publisher: 'NPR',
                description: 'The economy explained. Imagine you could call up a friend.',
                category: 'Business',
                language: 'en'
            },
            {
                id: '5as3aKmN2k11yfDDDSrvaZ',
                name: 'Freakonomics Radio',
                publisher: 'Freakonomics Radio + Stitcher',
                description: 'Discover the hidden side of everything.',
                category: 'Business',
                language: 'en'
            },
            {
                id: '2G7jzlnlgJdNaAqrXdyqhh',
                name: 'The Daily',
                publisher: 'The New York Times',
                description: 'This is what the news should sound like.',
                category: 'News',
                language: 'en'
            },
            {
                id: '4T3sr6EYtEEPC50vyNTvTz',
                name: 'Crime Junkie',
                publisher: 'audiochuck',
                description: 'If you can never get enough true crime.',
                category: 'True Crime',
                language: 'en'
            }
        ];
    }

    /**
     * Get list of popular shows
     * @returns {Promise<object[]>} Array of popular shows with metadata
     */
    async getPopularShows() {
        this.logger.debug('Fetching popular shows list');
        return [...this.popularShows];
    }

    /**
     * Get popular show by ID
     * @param {string} showId - The show ID
     * @returns {Promise<object|null>} Show data or null if not found
     */
    async getPopularShowById(showId) {
        this.logger.debug(`Looking up popular show by ID: ${showId}`);
        const show = this.popularShows.find(show => show.id === showId);
        return show || null;
    }

    /**
     * Search popular shows by name
     * @param {string} query - Search query
     * @returns {Promise<object[]>} Matching shows
     */
    async searchPopularShows(query) {
        if (!query || typeof query !== 'string') {
            return [];
        }

        this.logger.debug(`Searching popular shows for: ${query}`);
        
        const searchTerm = query.toLowerCase().trim();
        
        return this.popularShows.filter(show => 
            show.name.toLowerCase().includes(searchTerm) ||
            show.publisher.toLowerCase().includes(searchTerm) ||
            show.description.toLowerCase().includes(searchTerm) ||
            show.category.toLowerCase().includes(searchTerm)
        );
    }

    /**
     * Get shows by category
     * @param {string} category - Category name
     * @returns {Promise<object[]>} Shows in category
     */
    async getShowsByCategory(category) {
        if (!category || typeof category !== 'string') {
            return [];
        }

        this.logger.debug(`Fetching shows in category: ${category}`);
        
        const categoryLower = category.toLowerCase();
        
        return this.popularShows.filter(show => 
            show.category.toLowerCase() === categoryLower
        );
    }

    /**
     * Get available categories
     * @returns {Promise<string[]>} Array of category names
     */
    async getCategories() {
        this.logger.debug('Fetching available categories');
        
        const categories = [...new Set(this.popularShows.map(show => show.category))];
        return categories.sort();
    }

    /**
     * Get shows grouped by category
     * @returns {Promise<object>} Shows grouped by category
     */
    async getShowsGroupedByCategory() {
        this.logger.debug('Fetching shows grouped by category');
        
        const grouped = {};
        
        for (const show of this.popularShows) {
            if (!grouped[show.category]) {
                grouped[show.category] = [];
            }
            grouped[show.category].push(show);
        }
        
        return grouped;
    }

    /**
     * Get random popular shows
     * @param {number} count - Number of shows to return
     * @returns {Promise<object[]>} Random shows
     */
    async getRandomShows(count = 5) {
        this.logger.debug(`Fetching ${count} random shows`);
        
        const shuffled = [...this.popularShows].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(count, this.popularShows.length));
    }

    /**
     * Add a new popular show (for future extensibility)
     * @param {object} show - Show data
     * @returns {Promise<boolean>} Success status
     */
    async addPopularShow(show) {
        if (!show || !show.id || !show.name || !show.publisher) {
            throw new Error('Invalid show data: id, name, and publisher are required');
        }

        // Check if show already exists
        const existing = await this.getPopularShowById(show.id);
        if (existing) {
            throw new Error(`Show with ID ${show.id} already exists`);
        }

        this.logger.info(`Adding new popular show: ${show.name}`);
        
        const newShow = {
            id: show.id,
            name: show.name,
            publisher: show.publisher,
            description: show.description || '',
            category: show.category || 'Other',
            language: show.language || 'en'
        };

        this.popularShows.push(newShow);
        return true;
    }

    /**
     * Remove a popular show (for future extensibility)
     * @param {string} showId - Show ID to remove
     * @returns {Promise<boolean>} Success status
     */
    async removePopularShow(showId) {
        const index = this.popularShows.findIndex(show => show.id === showId);
        
        if (index === -1) {
            return false;
        }

        this.logger.info(`Removing popular show: ${this.popularShows[index].name}`);
        this.popularShows.splice(index, 1);
        return true;
    }
}

module.exports = PopularShowsService;
