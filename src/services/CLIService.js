const ICLIService = require('../interfaces/ICLIService');

/**
 * CLI Service following Single Responsibility Principle
 * Responsible for CLI-specific business logic and data formatting
 */
class CLIService extends ICLIService {
    constructor(showService, configuration, popularShowsService, logger, authenticationService, spotifyApiClient, favoritesService) {
        super();
        this.showService = showService;
        this.configuration = configuration;
        this.popularShowsService = popularShowsService;
        this.logger = logger;
        this.authenticationService = authenticationService;
        this.spotifyApiClient = spotifyApiClient;
        this.favoritesService = favoritesService;
        this.historyService = null; // Will be set via setHistoryService method

        // Episode mapping cache for quick lookups
        this.episodeMappingCache = new Map(); // showId -> episodeMapping
        this.episodeCacheTimestamps = new Map(); // showId -> timestamp
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache duration

        // Performance monitoring
        this.performanceStats = {
            cacheHits: 0,
            cacheMisses: 0,
            totalApiCalls: 0,
            totalFetchTime: 0,
            averageFetchTime: 0
        };
    }
    
    /**
     * Set the history service instance
     * @param {object} historyService - The history service instance
     */
    setHistoryService(historyService) {
        this.historyService = historyService;
        this.logger.info('History service set in CLIService');
    }

    /**
     * Get show details with CLI-friendly formatting
     * @param {string} showId - The Spotify show ID
     * @returns {Promise<object>} Formatted show details
     */
    async getShowDetailsForCLI(showId) {
        try {
            this.logger.info(`CLI: Fetching show details for ${showId}`);

            const showDetails = await this.showService.getShowDetails(showId);
            
            // No longer adding to history automatically

            return {
                success: true,
                data: {
                    id: showDetails.id,
                    name: showDetails.name,
                    publisher: showDetails.publisher,
                    description: this.truncateForCLI(showDetails.description, 200),
                    language: showDetails.language,
                    totalEpisodes: showDetails.totalEpisodes,
                    explicit: showDetails.explicit ? 'Yes' : 'No',
                    spotifyUrl: showDetails.externalUrls?.spotify || 'N/A',
                    imageUrl: showDetails.images?.[0]?.url || 'N/A',
                    copyrights: showDetails.copyrights?.map(c => c.text).join(', ') || 'N/A'
                }
            };
        } catch (error) {
            this.logger.error(`CLI: Failed to get show details: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get show episodes with pagination for CLI
     * @param {string} showId - The Spotify show ID
     * @param {number} page - Page number
     * @param {number} pageSize - Items per page
     * @returns {Promise<object>} Formatted episodes data with pagination info
     */
    async getShowEpisodesForCLI(showId, page = 1, pageSize = 10) {
        try {
            this.logger.info(`CLI: Fetching episodes for ${showId}, page ${page}`);

            const episodesData = await this.showService.getShowEpisodes(showId, page, pageSize);

            return {
                success: true,
                data: {
                    episodes: episodesData.episodes.map(episode => ({
                        id: episode.id,
                        name: episode.name,
                        description: this.truncateForCLI(episode.description, 150),
                        releaseDate: episode.releaseDate,
                        duration: this.formatDuration(episode.durationMs),
                        explicit: episode.explicit ? 'Yes' : 'No',
                        spotifyUrl: episode.spotifyUrl || 'N/A'
                    })),
                    pagination: {
                        currentPage: episodesData.pagination.currentPage,
                        totalPages: episodesData.pagination.totalPages,
                        totalItems: episodesData.pagination.totalItems,
                        hasNext: episodesData.pagination.hasNext,
                        hasPrevious: episodesData.pagination.hasPrevious,
                        pageSize: episodesData.pagination.pageSize
                    }
                }
            };
        } catch (error) {
            this.logger.error(`CLI: Failed to get episodes: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get popular shows list for selection
     * @returns {Promise<object[]>} Array of popular shows
     */
    async getPopularShows() {
        try {
            this.logger.info('CLI: Fetching popular shows');

            const shows = await this.popularShowsService.getPopularShows();

            return {
                success: true,
                data: shows.map(show => ({
                    name: `${show.name} - ${show.publisher}`,
                    value: show.id,
                    short: show.name,
                    description: show.description
                }))
            };
        } catch (error) {
            this.logger.error(`CLI: Failed to get popular shows: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Validate show ID format
     * @param {string} showId - The show ID to validate
     * @returns {boolean} True if valid
     */
    validateShowId(showId) {
        if (!showId || typeof showId !== 'string') {
            return false;
        }

        // Spotify show IDs are typically 22 characters long and alphanumeric
        const spotifyIdPattern = /^[a-zA-Z0-9]{22}$/;
        return spotifyIdPattern.test(showId);
    }

    /**
     * Get application configuration summary
     * @returns {Promise<object>} Configuration summary
     */
    async getConfigurationSummary() {
        try {
            const spotifyConfig = this.configuration.getSpotifyConfig();
            const appConfig = this.configuration.getAppConfig();

            return {
                success: true,
                data: {
                    clientIdConfigured: !!spotifyConfig.clientId,
                    clientSecretConfigured: !!spotifyConfig.clientSecret,
                    defaultShowId: appConfig.defaultShowId,
                    logLevel: appConfig.logLevel,
                    tokenUrl: spotifyConfig.tokenUrl,
                    apiBaseUrl: spotifyConfig.apiBaseUrl,
                    configurationValid: this.configuration.isValid()
                }
            };
        } catch (error) {
            this.logger.error(`CLI: Failed to get configuration: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Run application health checks
     * @returns {Promise<object>} Health check results
     */
    async runHealthChecks() {
        try {
            this.logger.info('CLI: Running health checks');

            const checks = {
                configuration: this.configuration.isValid(),
                environment: {
                    nodeVersion: process.version,
                    platform: process.platform,
                    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB'
                },
                connectivity: false
            };

            // Test basic connectivity by trying to get default show
            try {
                const defaultShowId = this.configuration.getAppConfig().defaultShowId;
                await this.showService.getShowSummary(defaultShowId);
                checks.connectivity = true;
            } catch (error) {
                checks.connectivityError = error.message;
            }

            return {
                success: true,
                data: checks
            };
        } catch (error) {
            this.logger.error(`CLI: Health check failed: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Search shows by name (placeholder implementation)
     * @param {string} query - Search query
     * @returns {Promise<object[]>} Search results
     */
    async searchShows(query) {
        try {
            this.logger.info(`CLI: Searching shows for: ${query}`);

            // For now, search within popular shows
            const popularShows = await this.popularShowsService.searchPopularShows(query);

            return {
                success: true,
                data: popularShows.map(show => ({
                    name: `${show.name} - ${show.publisher}`,
                    value: show.id,
                    short: show.name,
                    description: show.description
                }))
            };
        } catch (error) {
            this.logger.error(`CLI: Search failed: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get show playlist with all episodes for CLI display
     * @param {string} showId - The Spotify show ID
     * @param {number} page - Page number
     * @param {number} pageSize - Items per page
     * @returns {Promise<object>} Formatted playlist data with pagination info
     */
    async getShowPlaylistForCLI(showId, page = 1, pageSize = 10) {
        try {
            this.logger.info(`CLI: Fetching playlist for ${showId}, page ${page}`);

            const allEpisodes = await this.getAllEpisodes(showId);

            // Sort episodes in reverse chronological order (newest first)
            allEpisodes.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));

            return this.formatPlaylistResponse(allEpisodes, page, pageSize);
        } catch (error) {
            this.logger.error(`CLI: Failed to get playlist: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Search episodes within a show's playlist
     * @param {string} showId - The Spotify show ID
     * @param {string} searchQuery - Search term for episode title/description
     * @param {number} page - Page number
     * @param {number} pageSize - Items per page
     * @returns {Promise<object>} Formatted search results with pagination info
     */
    async searchPlaylistEpisodes(showId, searchQuery, page = 1, pageSize = 10) {
        try {
            this.logger.info(`CLI: Searching episodes for ${showId} with query: ${searchQuery}`);

            const allEpisodes = await this.getAllEpisodes(showId);

            // Filter episodes based on search query (case-insensitive)
            const searchTerm = searchQuery.toLowerCase();
            const filteredEpisodes = allEpisodes.filter(episode => {
                const titleMatch = episode.name.toLowerCase().includes(searchTerm);
                const descriptionMatch = episode.description.toLowerCase().includes(searchTerm);
                const dateMatch = episode.releaseDate.includes(searchTerm);
                return titleMatch || descriptionMatch || dateMatch;
            });

            // Sort filtered episodes in reverse chronological order (newest first)
            filteredEpisodes.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));

            const result = this.formatPlaylistResponse(filteredEpisodes, page, pageSize);

            // Add search metadata
            if (result.success) {
                result.data.searchQuery = searchQuery;
                result.data.totalMatches = filteredEpisodes.length;
            }

            return result;
        } catch (error) {
            this.logger.error(`CLI: Failed to search episodes: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Jump to a specific episode number in the playlist
     * @param {string} showId - The Spotify show ID
     * @param {number} episodeNumber - Episode number to jump to (1-based)
     * @param {number} pageSize - Items per page
     * @returns {Promise<object>} Formatted playlist data starting from the episode
     */
    async jumpToEpisode(showId, episodeNumber, pageSize = 10) {
        try {
            this.logger.info(`CLI: Jumping to episode ${episodeNumber} for ${showId}`);

            const allEpisodes = await this.getAllEpisodes(showId);

            // Sort episodes in reverse chronological order (newest first)
            allEpisodes.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));

            // Validate episode number
            if (episodeNumber < 1 || episodeNumber > allEpisodes.length) {
                return {
                    success: false,
                    error: `Episode number ${episodeNumber} is out of range. Valid range: 1-${allEpisodes.length}`
                };
            }

            // Calculate which page contains the episode
            const targetPage = Math.ceil(episodeNumber / pageSize);

            return this.formatPlaylistResponse(allEpisodes, targetPage, pageSize, episodeNumber);
        } catch (error) {
            this.logger.error(`CLI: Failed to jump to episode: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Filter episodes by date range
     * @param {string} showId - The Spotify show ID
     * @param {string} dateFilter - Date filter type ('30days', '90days', '1year', 'custom')
     * @param {string} startDate - Start date for custom filter (YYYY-MM-DD)
     * @param {string} endDate - End date for custom filter (YYYY-MM-DD)
     * @param {number} page - Page number
     * @param {number} pageSize - Items per page
     * @returns {Promise<object>} Formatted filtered episodes with pagination info
     */
    async filterEpisodesByDate(showId, dateFilter, startDate = null, endDate = null, page = 1, pageSize = 10) {
        try {
            this.logger.info(`CLI: Filtering episodes for ${showId} by date: ${dateFilter}`);

            const allEpisodes = await this.getAllEpisodes(showId);

            // Calculate date range based on filter type
            let filterStartDate, filterEndDate;
            const now = new Date();

            switch (dateFilter) {
                case '30days':
                    filterStartDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
                    filterEndDate = now;
                    break;
                case '90days':
                    filterStartDate = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
                    filterEndDate = now;
                    break;
                case '1year':
                    filterStartDate = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));
                    filterEndDate = now;
                    break;
                case 'custom':
                    if (!startDate || !endDate) {
                        return {
                            success: false,
                            error: 'Start date and end date are required for custom date filter'
                        };
                    }
                    filterStartDate = new Date(startDate);
                    filterEndDate = new Date(endDate);
                    break;
                default:
                    return {
                        success: false,
                        error: `Invalid date filter: ${dateFilter}`
                    };
            }

            // Filter episodes by date range
            const filteredEpisodes = allEpisodes.filter(episode => {
                const episodeDate = new Date(episode.releaseDate);
                return episodeDate >= filterStartDate && episodeDate <= filterEndDate;
            });

            // Sort filtered episodes in reverse chronological order (newest first)
            filteredEpisodes.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));

            const result = this.formatPlaylistResponse(filteredEpisodes, page, pageSize);

            // Add filter metadata
            if (result.success) {
                result.data.dateFilter = dateFilter;
                result.data.filterStartDate = filterStartDate.toISOString().split('T')[0];
                result.data.filterEndDate = filterEndDate.toISOString().split('T')[0];
                result.data.totalMatches = filteredEpisodes.length;
            }

            return result;
        } catch (error) {
            this.logger.error(`CLI: Failed to filter episodes by date: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get all episodes for a show using the optimized ShowService method
     * @private
     * @param {string} showId - The Spotify show ID
     * @returns {Promise<Array>} Array of all episodes
     */
    async getAllEpisodes(showId) {
        const startTime = Date.now();
        this.logger.info(`CLI: Starting optimized episode fetch for show ${showId}`);

        try {
            // Use the new getAllShowEpisodes method from ShowService
            const allEpisodesData = await this.showService.getAllShowEpisodes(showId);

            const duration = Date.now() - startTime;
            this.logger.info(`CLI: Optimized fetch completed in ${duration}ms - ${allEpisodesData.fetchedItems}/${allEpisodesData.totalItems} episodes`);

            return allEpisodesData.episodes;

        } catch (error) {
            this.logger.error(`CLI: Optimized episode fetch failed for show ${showId}: ${error.message}`);

            // Attempt fallback to basic pagination if optimized fetch fails
            try {
                this.logger.info(`CLI: Attempting fallback pagination for show ${showId}`);
                return await this.fallbackGetAllEpisodes(showId);
            } catch (fallbackError) {
                this.logger.error(`CLI: Fallback also failed for show ${showId}: ${fallbackError.message}`);
                throw new Error(`Episode fetch failed: ${error.message}. Fallback also failed: ${fallbackError.message}`);
            }
        }
    }



    /**
     * Fallback method for getting all episodes using simple pagination
     * @private
     * @param {string} showId - The Spotify show ID
     * @returns {Promise<Array>} Array of all episodes
     */
    async fallbackGetAllEpisodes(showId) {
        this.logger.info(`CLI: Using fallback pagination method for show ${showId}`);

        try {
            // Get first page to determine total count
            const firstPageData = await this.showService.getShowEpisodes(showId, 1, 50);
            const totalEpisodes = firstPageData.pagination.totalItems;

            let allEpisodes = [...firstPageData.episodes];

            // If we have more episodes, fetch them one page at a time with error handling
            if (totalEpisodes > 50) {
                const totalPages = Math.ceil(totalEpisodes / 50);

                for (let page = 2; page <= totalPages; page++) {
                    try {
                        const pageData = await this.showService.getShowEpisodes(showId, page, 50);
                        if (pageData && pageData.episodes) {
                            allEpisodes = allEpisodes.concat(pageData.episodes);
                        }

                        // Add delay to be respectful to API
                        await this.delay(200);

                    } catch (pageError) {
                        this.logger.warn(`CLI: Failed to fetch page ${page} in fallback mode: ${pageError.message}`);
                        // Continue with other pages - partial data is better than no data
                    }
                }
            }

            this.logger.info(`CLI: Fallback method retrieved ${allEpisodes.length}/${totalEpisodes} episodes`);
            return allEpisodes;

        } catch (error) {
            this.logger.error(`CLI: Fallback method failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Utility delay function for rate limiting
     * @private
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise<void>}
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Update performance statistics
     * @private
     * @param {number} apiCalls - Number of API calls made
     * @param {number} fetchTime - Time taken for fetch operation
     * @param {boolean} cacheHit - Whether this was a cache hit
     */
    updatePerformanceStats(apiCalls, fetchTime, cacheHit = false) {
        if (cacheHit) {
            this.performanceStats.cacheHits++;
        } else {
            this.performanceStats.cacheMisses++;
            this.performanceStats.totalApiCalls += apiCalls;
            this.performanceStats.totalFetchTime += fetchTime;
            this.performanceStats.averageFetchTime =
                this.performanceStats.totalFetchTime / this.performanceStats.cacheMisses;
        }
    }

    /**
     * Get performance statistics
     * @returns {object} Performance statistics
     */
    getPerformanceStats() {
        const totalRequests = this.performanceStats.cacheHits + this.performanceStats.cacheMisses;
        const cacheHitRate = totalRequests > 0 ?
            (this.performanceStats.cacheHits / totalRequests * 100).toFixed(1) : 0;

        return {
            ...this.performanceStats,
            totalRequests,
            cacheHitRate: `${cacheHitRate}%`,
            averageFetchTime: Math.round(this.performanceStats.averageFetchTime)
        };
    }

    /**
     * Log performance summary
     */
    logPerformanceSummary() {
        const stats = this.getPerformanceStats();
        this.logger.info(`CLI Performance Summary - Cache Hit Rate: ${stats.cacheHitRate}, Avg Fetch Time: ${stats.averageFetchTime}ms, Total API Calls: ${stats.totalApiCalls}`);
    }

    /**
     * Get or create episode mapping for a show with performance tracking
     * @param {string} showId - The Spotify show ID
     * @returns {Promise<object>} Episode mapping object
     */
    async getEpisodeMapping(showId) {
        const startTime = Date.now();

        // Check if we have a valid cached mapping
        if (this.episodeMappingCache.has(showId)) {
            const timestamp = this.episodeCacheTimestamps.get(showId);
            const now = Date.now();

            // Return cached mapping if it's still valid
            if (now - timestamp < this.CACHE_DURATION) {
                const cacheAge = Math.round((now - timestamp) / 1000);
                this.logger.info(`CLI: Using cached episode mapping for show ${showId} (age: ${cacheAge}s)`);
                this.updatePerformanceStats(0, 0, true); // Cache hit
                return this.episodeMappingCache.get(showId);
            } else {
                this.logger.info(`CLI: Episode mapping cache expired for show ${showId}, refreshing`);
                this.clearEpisodeMapping(showId);
            }
        }

        // Create new mapping with performance tracking and error handling
        try {
            this.logger.info(`CLI: Creating optimized episode mapping for show ${showId}`);
            const mapping = await this.createEpisodeMapping(showId);

            // Validate mapping before caching
            if (!mapping || Object.keys(mapping).length === 0) {
                this.logger.warn(`CLI: Empty episode mapping created for show ${showId}`);
                return {};
            }

            // Cache the mapping with metadata
            this.episodeMappingCache.set(showId, mapping);
            this.episodeCacheTimestamps.set(showId, Date.now());

            const duration = Date.now() - startTime;
            const episodeCount = Object.keys(mapping).length;

            // Update performance statistics (estimate API calls based on episode count)
            const estimatedApiCalls = Math.ceil(episodeCount / 50) || 1;
            this.updatePerformanceStats(estimatedApiCalls, duration, false);

            this.logger.info(`CLI: Episode mapping created in ${duration}ms for ${episodeCount} episodes`);

            return mapping;

        } catch (error) {
            this.logger.error(`CLI: Failed to create episode mapping for show ${showId}: ${error.message}`);

            // Return empty mapping rather than throwing - allows other functionality to continue
            this.updatePerformanceStats(0, Date.now() - startTime, false);
            return {};
        }
    }

    /**
     * Create optimized episode mapping from all episodes with bulk fetching
     * @private
     * @param {string} showId - The Spotify show ID
     * @returns {Promise<object>} Episode mapping
     */
    async createEpisodeMapping(showId) {
        const mappingStartTime = Date.now();

        // Use optimized bulk fetching to get all episodes
        const allEpisodes = await this.getAllEpisodes(showId);

        if (!allEpisodes || allEpisodes.length === 0) {
            this.logger.warn(`CLI: No episodes found for show ${showId}`);
            return {};
        }

        // Sort episodes in reverse chronological order (newest first)
        // This ensures episode #1 is the newest episode
        allEpisodes.sort((a, b) => new Date(a.releaseDate) - new Date(b.releaseDate));

        const mapping = {};
        let validEpisodes = 0;
        let skippedEpisodes = 0;

        allEpisodes.forEach((episode, index) => {
            // Validate episode data before adding to mapping
            if (!episode.id || !episode.name) {
                skippedEpisodes++;
                this.logger.warn(`CLI: Skipping invalid episode at index ${index} for show ${showId}`);
                return;
            }

            const episodeNumber = index + 1;
            mapping[episodeNumber] = {
                title: episode.name,
                id: episode.id,
                spotifyUrl: episode.spotifyUrl || `https://open.spotify.com/episode/${episode.id}`,
                releaseDate: episode.releaseDate,
                duration: this.formatDuration(episode.durationMs),
                description: episode.description || '',
                explicit: episode.explicit || false
            };
            validEpisodes++;
        });

        const mappingDuration = Date.now() - mappingStartTime;

        this.logger.info(`CLI: Created episode mapping in ${mappingDuration}ms - ${validEpisodes} valid episodes, ${skippedEpisodes} skipped for show ${showId}`);

        // Log mapping statistics for performance monitoring
        if (validEpisodes > 100) {
            this.logger.info(`CLI: Large show mapping created - ${validEpisodes} episodes for show ${showId}`);
        }

        return mapping;
    }

    /**
     * Clear episode mapping cache for a specific show or all shows
     * @param {string} showId - Optional show ID to clear specific cache
     */
    clearEpisodeMapping(showId = null) {
        if (showId) {
            this.episodeMappingCache.delete(showId);
            this.episodeCacheTimestamps.delete(showId);
            this.logger.info(`CLI: Cleared episode mapping cache for show ${showId}`);
        } else {
            this.episodeMappingCache.clear();
            this.episodeCacheTimestamps.clear();
            this.logger.info('CLI: Cleared all episode mapping cache');
        }
    }

    /**
     * Get episode by number using mapping
     * @param {string} showId - The Spotify show ID
     * @param {number} episodeNumber - Episode number to find
     * @returns {Promise<object|null>} Episode data or null if not found
     */
    async getEpisodeByNumber(showId, episodeNumber) {
        const mapping = await this.getEpisodeMapping(showId);
        return mapping[episodeNumber] || null;
    }

    /**
     * Format playlist response with pagination (helper method)
     * @private
     * @param {Array} episodes - Array of episodes
     * @param {number} page - Page number
     * @param {number} pageSize - Items per page
     * @param {number} highlightEpisode - Episode number to highlight (optional)
     * @returns {object} Formatted response
     */
    formatPlaylistResponse(episodes, page, pageSize, highlightEpisode = null) {
        // Calculate pagination for the episodes
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedEpisodes = episodes.slice(startIndex, endIndex);

        // Format episodes for playlist display
        const formattedEpisodes = paginatedEpisodes.map((episode, index) => ({
            episodeNumber: startIndex + index + 1,
            id: episode.id,
            name: this.truncateForCLI(episode.name, 40),
            description: this.truncateForCLI(episode.description, 100),
            releaseDate: episode.releaseDate,
            duration: this.formatDuration(episode.durationMs),
            explicit: episode.explicit ? 'Yes' : 'No',
            spotifyUrl: episode.spotifyUrl || 'N/A',
            isHighlighted: highlightEpisode && (startIndex + index + 1) === highlightEpisode
        }));

        return {
            success: true,
            data: {
                episodes: formattedEpisodes,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(episodes.length / pageSize),
                    totalItems: episodes.length,
                    hasNext: endIndex < episodes.length,
                    hasPrevious: page > 1,
                    pageSize: pageSize
                }
            }
        };
    }

    /**
     * Truncate text for CLI display
     * @private
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated text
     */
    truncateForCLI(text, maxLength = 100) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    /**
     * Get favorites for CLI display
     * @returns {Promise<object>} Favorites data
     */
    async getFavorites() {
        try {
            this.logger.info('CLI: Retrieving favorites');
            
            const favorites = await this.favoritesService.getFavorites();
            
            return {
                success: true,
                data: favorites
            };
        } catch (error) {
            this.logger.error(`CLI: Failed to get favorites: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Add a show to favorites
     * @param {string} showId - The Spotify show ID
     * @param {string} showName - The show name
     * @returns {Promise<object>} Result of the operation
     */
    async addToFavorites(showId, showName) {
        try {
            this.logger.info(`CLI: Adding show ${showId} to favorites`);
            
            const success = await this.favoritesService.addToFavorites(showId, showName);
            
            return {
                success: success,
                message: success ? 'Show added to favorites' : 'Failed to add show to favorites'
            };
        } catch (error) {
            this.logger.error(`CLI: Failed to add show to favorites: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Remove a show from favorites
     * @param {string} showId - The Spotify show ID to remove
     * @returns {Promise<object>} Result of the operation
     */
    async removeFromFavorites(showId) {
        try {
            this.logger.info(`CLI: Removing show ${showId} from favorites`);
            
            const success = await this.favoritesService.removeFromFavorites(showId);
            
            return {
                success: success,
                message: success ? 'Show removed from favorites' : 'Show not found in favorites'
            };
        } catch (error) {
            this.logger.error(`CLI: Failed to remove show from favorites: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Clear all favorites
     * @returns {Promise<object>} Result of the operation
     */
    async clearFavorites() {
        try {
            this.logger.info('CLI: Clearing all favorites');
            
            const success = await this.favoritesService.clearFavorites();
            
            return {
                success: success,
                message: 'Favorites cleared'
            };
        } catch (error) {
            this.logger.error(`CLI: Failed to clear favorites: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Search for shows in Spotify API
     * @param {string} query - Search query
     * @returns {Promise<object>} Search results
     */
    async searchShows(query) {
        try {
            this.logger.info(`CLI: Searching for shows with query: ${query}`);
            
            const results = await this.spotifyApiClient.searchShows(query, 10);
            
            return {
                success: true,
                data: results.shows.items.map(show => ({
                    id: show.id,
                    name: show.name,
                    publisher: show.publisher,
                    description: this.truncateForCLI(show.description, 100),
                    imageUrl: show.images && show.images.length > 0 ? show.images[0].url : null
                }))
            };
        } catch (error) {
            this.logger.error(`CLI: Failed to search shows: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Search episodes by episode number for browsing using Spotify Search API
     * @param {string} showId - The Spotify show ID
     * @param {number} episodeNumber - Episode number to find
     * @param {number} episodeNumber - Episode number to search for
     * @param {number|string} pageSize - Items per page (10, 20, or 'unlimited')
     * @returns {Promise<object>} Formatted episodes data with the target episode
     */
    async searchEpisodeByNumber(showId, episodeNumber, pageSize = 10) {
        try {
            this.logger.info(`CLI: Searching for episode ${episodeNumber} in show ${showId} using episode mapping`);

            // First, try to use episode mapping for instant lookup
            const episodeData = await this.getEpisodeByNumber(showId, episodeNumber);

            if (episodeData) {
                // Found episode in mapping, format for display
                this.logger.info(`CLI: Found episode ${episodeNumber} in mapping`);
                return this.formatMappingSearchResult(episodeData, episodeNumber, pageSize);
            }

            // If not found in mapping, try Spotify Search API
            this.logger.info(`CLI: Episode ${episodeNumber} not found in mapping, trying Spotify Search API`);
            const searchResults = await this.searchEpisodeUsingAPI(showId, episodeNumber);

            if (searchResults.success && searchResults.episodes.length > 0) {
                // Found episodes via API search, format them for display
                return this.formatSearchResults(searchResults.episodes, episodeNumber, pageSize);
            }

            // Final fallback to local search if API search doesn't find results
            this.logger.info(`CLI: API search didn't find episode ${episodeNumber}, falling back to local search`);
            return await this.searchEpisodeByNumberLocal(showId, episodeNumber, pageSize);

        } catch (error) {
            this.logger.error(`CLI: Failed to search episode by number: ${error.message}`);

            // Fallback to local search on API error
            this.logger.info(`CLI: API search failed, falling back to local search`);
            try {
                return await this.searchEpisodeByNumberLocal(showId, episodeNumber, pageSize);
            } catch (fallbackError) {
                return {
                    success: false,
                    error: `Search failed: ${error.message}`
                };
            }
        }
    }

    /**
     * Search episode using Spotify Search API
     * @private
     * @param {string} showId - The Spotify show ID
     * @param {number} episodeNumber - Episode number to search for
     * @returns {Promise<object>} Search results
     */
    async searchEpisodeUsingAPI(showId, episodeNumber) {
        try {
            // Construct search query for episode number
            const searchQuery = `show:${showId} episode:${episodeNumber}`;

            const searchOptions = {
                q: searchQuery,
                type: 'episode',
                market: 'US',
                limit: 50,
                offset: 0
            };

            const apiResults = await this.spotifyApiClient.search(searchOptions);

            if (!apiResults.episodes || !apiResults.episodes.items) {
                return { success: false, episodes: [] };
            }

            // Filter results to find episodes that match the episode number
            const matchingEpisodes = apiResults.episodes.items.filter(episode => {
                // Try to extract episode number from episode name or description
                const episodeText = `${episode.name} ${episode.description}`.toLowerCase();
                const episodeNumberRegex = new RegExp(`\\b(episode\\s*#?${episodeNumber}|ep\\s*#?${episodeNumber}|#${episodeNumber})\\b`, 'i');
                return episodeNumberRegex.test(episodeText);
            });

            return {
                success: true,
                episodes: matchingEpisodes.map(episode => ({
                    id: episode.id,
                    name: episode.name,
                    description: episode.description,
                    releaseDate: episode.release_date,
                    durationMs: episode.duration_ms,
                    explicit: episode.explicit,
                    spotifyUrl: episode.external_urls?.spotify
                }))
            };

        } catch (error) {
            this.logger.error(`CLI: Spotify API search failed: ${error.message}`);
            return { success: false, episodes: [] };
        }
    }

    /**
     * Format mapping search result for display
     * @private
     * @param {object} episodeData - Episode data from mapping
     * @param {number} searchedEpisodeNumber - The episode number that was searched
     * @param {number|string} pageSize - Page size
     * @returns {object} Formatted results
     */
    formatMappingSearchResult(episodeData, searchedEpisodeNumber, pageSize) {
        const formattedEpisode = {
            episodeNumber: searchedEpisodeNumber,
            id: episodeData.id,
            name: episodeData.title,
            description: this.truncateForCLI(episodeData.description, 150),
            releaseDate: episodeData.releaseDate,
            duration: episodeData.duration,
            explicit: episodeData.explicit ? 'Yes' : 'No',
            spotifyUrl: episodeData.spotifyUrl,
            isHighlighted: true
        };

        return {
            success: true,
            data: {
                episodes: [formattedEpisode],
                pagination: {
                    currentPage: 1,
                    totalPages: 1,
                    totalItems: 1,
                    hasNext: false,
                    hasPrevious: false,
                    pageSize: pageSize === 'unlimited' ? 'unlimited' : 1
                },
                searchedEpisodeNumber: searchedEpisodeNumber,
                searchMethod: 'mapping'
            }
        };
    }

    /**
     * Format search results for display
     * @private
     * @param {Array} episodes - Found episodes
     * @param {number} searchedEpisodeNumber - The episode number that was searched
     * @param {number|string} pageSize - Page size
     * @returns {object} Formatted results
     */
    formatSearchResults(episodes, searchedEpisodeNumber, pageSize) {
        // Sort episodes by release date (newest first)
        episodes.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));

        const formattedEpisodes = episodes.map((episode, index) => ({
            episodeNumber: searchedEpisodeNumber, // Use the searched number
            id: episode.id,
            name: episode.name,
            description: this.truncateForCLI(episode.description, 150),
            releaseDate: episode.releaseDate,
            duration: this.formatDuration(episode.durationMs),
            explicit: episode.explicit ? 'Yes' : 'No',
            spotifyUrl: episode.spotifyUrl || 'N/A',
            isHighlighted: true // Highlight all found episodes
        }));

        return {
            success: true,
            data: {
                episodes: formattedEpisodes,
                pagination: {
                    currentPage: 1,
                    totalPages: 1,
                    totalItems: formattedEpisodes.length,
                    hasNext: false,
                    hasPrevious: false,
                    pageSize: pageSize === 'unlimited' ? 'unlimited' : Math.min(pageSize, formattedEpisodes.length)
                },
                searchedEpisodeNumber: searchedEpisodeNumber,
                searchMethod: 'api'
            }
        };
    }

    /**
     * Search episodes by episode number using local data (fallback method)
     * @private
     * @param {string} showId - The Spotify show ID
     * @param {number} episodeNumber - Episode number to search for
     * @param {number|string} pageSize - Items per page (10, 20, or 'unlimited')
     * @returns {Promise<object>} Formatted episodes data with the target episode
     */
    async searchEpisodeByNumberLocal(showId, episodeNumber, pageSize = 10) {
        const allEpisodes = await this.getAllEpisodes(showId);

        // Sort episodes in reverse chronological order (newest first)
        allEpisodes.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));

        // Validate episode number
        if (episodeNumber < 1 || episodeNumber > allEpisodes.length) {
            return {
                success: false,
                error: `Episode #${episodeNumber} not found. This show has ${allEpisodes.length} episodes (valid range: 1-${allEpisodes.length})`
            };
        }

        // Handle unlimited page size - show all episodes with the target highlighted
        if (pageSize === 'unlimited') {
            const formattedEpisodes = allEpisodes.map((episode, index) => ({
                episodeNumber: index + 1,
                id: episode.id,
                name: episode.name,
                description: this.truncateForCLI(episode.description, 150),
                releaseDate: episode.releaseDate,
                duration: this.formatDuration(episode.durationMs),
                explicit: episode.explicit ? 'Yes' : 'No',
                spotifyUrl: episode.spotifyUrl || 'N/A',
                isHighlighted: (index + 1) === episodeNumber
            }));

            return {
                success: true,
                data: {
                    episodes: formattedEpisodes,
                    pagination: {
                        currentPage: 1,
                        totalPages: 1,
                        totalItems: allEpisodes.length,
                        hasNext: false,
                        hasPrevious: false,
                        pageSize: 'unlimited'
                    },
                    searchedEpisodeNumber: episodeNumber
                }
            };
        }

        // Handle regular pagination
        const targetPage = Math.ceil(episodeNumber / pageSize);

        // Get the episodes for that page
        const startIndex = (targetPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedEpisodes = allEpisodes.slice(startIndex, endIndex);

        // Format episodes for display
        const formattedEpisodes = paginatedEpisodes.map((episode, index) => ({
            episodeNumber: startIndex + index + 1,
            id: episode.id,
            name: episode.name,
            description: this.truncateForCLI(episode.description, 150),
            releaseDate: episode.releaseDate,
            duration: this.formatDuration(episode.durationMs),
            explicit: episode.explicit ? 'Yes' : 'No',
            spotifyUrl: episode.spotifyUrl || 'N/A',
            isHighlighted: (startIndex + index + 1) === episodeNumber
        }));

        return {
            success: true,
            data: {
                episodes: formattedEpisodes,
                pagination: {
                    currentPage: targetPage,
                    totalPages: Math.ceil(allEpisodes.length / pageSize),
                    totalItems: allEpisodes.length,
                    hasNext: endIndex < allEpisodes.length,
                    hasPrevious: targetPage > 1,
                    pageSize: pageSize
                },
                searchedEpisodeNumber: episodeNumber
            }
        };
    }

    /**
     * Get episodes with enhanced pagination options
     * @param {string} showId - The Spotify show ID
     * @param {number} page - Page number
     * @param {number|string} pageSize - Items per page (10, 20, or 'unlimited')
     * @returns {Promise<object>} Formatted episodes data with enhanced pagination info
     */
    async getShowEpisodesEnhanced(showId, page = 1, pageSize = 10) {
        try {
            this.logger.info(`CLI: Fetching enhanced episodes for ${showId}, page ${page}, pageSize ${pageSize}`);

            // Handle unlimited page size
            if (pageSize === 'unlimited' || pageSize === 0) {
                const allEpisodes = await this.getAllEpisodes(showId);

                // Sort episodes in reverse chronological order (newest first)
                allEpisodes.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));

                // Format all episodes for display
                const formattedEpisodes = allEpisodes.map((episode, index) => ({
                    episodeNumber: index + 1,
                    id: episode.id,
                    name: episode.name,
                    description: this.truncateForCLI(episode.description, 150),
                    releaseDate: episode.releaseDate,
                    duration: this.formatDuration(episode.durationMs),
                    explicit: episode.explicit ? 'Yes' : 'No',
                    spotifyUrl: episode.spotifyUrl || 'N/A'
                }));

                return {
                    success: true,
                    data: {
                        episodes: formattedEpisodes,
                        pagination: {
                            currentPage: 1,
                            totalPages: 1,
                            totalItems: allEpisodes.length,
                            hasNext: false,
                            hasPrevious: false,
                            pageSize: 'unlimited'
                        }
                    }
                };
            }

            // Handle regular pagination
            const episodesData = await this.showService.getShowEpisodes(showId, page, pageSize);

            return {
                success: true,
                data: {
                    episodes: episodesData.episodes.map((episode, index) => ({
                        episodeNumber: ((page - 1) * pageSize) + index + 1,
                        id: episode.id,
                        name: episode.name,
                        description: this.truncateForCLI(episode.description, 150),
                        releaseDate: episode.releaseDate,
                        duration: this.formatDuration(episode.durationMs),
                        explicit: episode.explicit ? 'Yes' : 'No',
                        spotifyUrl: episode.spotifyUrl || 'N/A'
                    })),
                    pagination: {
                        currentPage: episodesData.pagination.currentPage,
                        totalPages: episodesData.pagination.totalPages,
                        totalItems: episodesData.pagination.totalItems,
                        hasNext: episodesData.pagination.hasNext,
                        hasPrevious: episodesData.pagination.hasPrevious,
                        pageSize: episodesData.pagination.pageSize
                    }
                }
            };
        } catch (error) {
            this.logger.error(`CLI: Failed to get enhanced episodes: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get access token information for display
     * @returns {Promise<object>} Access token information
     */
    async getAccessTokenInfo() {
        try {
            this.logger.info('CLI: Getting access token information');

            // Get the current token (this will refresh if needed)
            const token = await this.authenticationService.getAccessToken();
            const isValid = await this.authenticationService.isTokenValid();

            // Calculate expiry information
            let expiresAt = 'Unknown';
            let timeUntilExpiry = 'Unknown';

            if (this.authenticationService.tokenExpiry) {
                const expiryDate = new Date(this.authenticationService.tokenExpiry);
                expiresAt = expiryDate.toLocaleString();

                const timeLeft = this.authenticationService.tokenExpiry - Date.now();
                if (timeLeft > 0) {
                    const minutes = Math.floor(timeLeft / (1000 * 60));
                    const hours = Math.floor(minutes / 60);
                    const remainingMinutes = minutes % 60;

                    if (hours > 0) {
                        timeUntilExpiry = `${hours}h ${remainingMinutes}m`;
                    } else {
                        timeUntilExpiry = `${remainingMinutes}m`;
                    }
                } else {
                    timeUntilExpiry = 'Expired';
                }
            }

            return {
                success: true,
                data: {
                    token: token,
                    tokenType: 'Bearer',
                    expiresAt: expiresAt,
                    timeUntilExpiry: timeUntilExpiry,
                    isValid: isValid
                }
            };
        } catch (error) {
            this.logger.error(`CLI: Failed to get access token info: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Format duration in milliseconds to MM:SS format
     * @private
     * @param {number} durationMs - Duration in milliseconds
     * @returns {string} Formatted duration string
     */
    formatDuration(durationMs) {
        const totalSeconds = Math.floor(durationMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    /**
     * Add a show to history
     * @param {string} showId - The Spotify show ID
     * @param {string} showName - The show name (optional)
     * @returns {Promise<object>} Success/failure with message
     */
    async addShowToHistory(showId, showName = null) {
        try {
            this.logger.info(`CLI: Adding show ${showId} to history`);
            const success = this.historyService.addToHistory(showId, showName);
            
            if (success) {
                return {
                    success: true,
                    message: 'Show added to history'
                };
            } else {
                return {
                    success: false,
                    error: 'Failed to add show to history'
                };
            }
        } catch (error) {
            this.logger.error(`Failed to add show to history: ${error.message}`);
            return {
                success: false,
                error: 'Failed to add show to history'
            };
        }
    }
    
    /**
     * Get all shows in history
     * @returns {Promise<object>} Success/failure with history data
     */
    async getShowHistory() {
        try {
            this.logger.info('CLI: Retrieving show history');
            const history = this.historyService.getHistory();
            
            return {
                success: true,
                data: history
            };
        } catch (error) {
            this.logger.error(`Failed to get show history: ${error.message}`);
            return {
                success: false,
                error: 'Failed to retrieve show history'
            };
        }
    }

    /**
     * Remove a show from history
     * @param {string} showId - The Spotify show ID to remove
     * @returns {Promise<object>} Success/failure with message
     */
    async removeFromHistory(showId) {
        try {
            this.logger.info(`CLI: Removing show ${showId} from history`);
            const success = this.historyService.removeFromHistory(showId);
            
            if (success) {
                return {
                    success: true,
                    message: 'Show removed from history'
                };
            } else {
                return {
                    success: false,
                    error: 'Show not found in history'
                };
            }
        } catch (error) {
            this.logger.error(`Failed to remove show from history: ${error.message}`);
            return {
                success: false,
                error: 'Failed to remove show from history'
            };
        }
    }

    /**
     * Clear all show history
     * @returns {Promise<object>} Success/failure with message
     */
    async clearShowHistory() {
        try {
            this.logger.info('CLI: Clearing all show history');
            const success = this.historyService.clearHistory();
            
            if (success) {
                return {
                    success: true,
                    message: 'Show history cleared'
                };
            } else {
                return {
                    success: false,
                    error: 'Failed to clear show history'
                };
            }
        } catch (error) {
            this.logger.error(`Failed to clear show history: ${error.message}`);
            return {
                success: false,
                error: 'Failed to clear show history'
            };
        }
    }

    /**
     * Get all shows in history
     * @returns {Promise<object>} Success/failure with history data
     */
    async getShowHistory() {
        try {
            this.logger.info('CLI: Retrieving show history');
            const history = this.historyService.getHistory();
            
            return {
                success: true,
                data: history
            };
        } catch (error) {
            this.logger.error(`Failed to get show history: ${error.message}`);
            return {
                success: false,
                error: 'Failed to retrieve show history'
            };
        }
    }

    /**
     * Remove a show from history
     * @param {string} showId - The Spotify show ID to remove
     * @returns {Promise<object>} Success/failure with message
     */
    async removeFromHistory(showId) {
        try {
            this.logger.info(`CLI: Removing show ${showId} from history`);
            const success = this.historyService.removeFromHistory(showId);
            
            if (success) {
                return {
                    success: true,
                    message: 'Show removed from history'
                };
            } else {
                return {
                    success: false,
                    error: 'Show not found in history'
                };
            }
        } catch (error) {
            this.logger.error(`Failed to remove show from history: ${error.message}`);
            return {
                success: false,
                error: 'Failed to remove show from history'
            };
        }
    }

    /**
     * Clear all show history
     * @returns {Promise<object>} Success/failure with message
     */
    async clearShowHistory() {
        try {
            this.logger.info('CLI: Clearing all show history');
            const success = this.historyService.clearHistory();
            
            if (success) {
                return {
                    success: true,
                    message: 'Show history cleared'
                };
            } else {
                return {
                    success: false,
                    error: 'Failed to clear show history'
                };
            }
        } catch (error) {
            this.logger.error(`Failed to clear show history: ${error.message}`);
            return {
                success: false,
                error: 'Failed to clear show history'
            };
        }
    }
    
    getEpisodeMap(showId) {
        // This is a helper method for testing
        return this.episodeMappingCache.has(showId) ? this.episodeMappingCache.get(showId) : null;
    }
    
    /**
     * Sort show history by different criteria
     * @param {string} sortType - Sort type: 'recent', 'oldest', 'name_asc', 'name_desc', 'id'
     * @returns {object} Object with success flag and sorted history data
     */
    sortShowHistory(sortType) {
        try {
            this.logger.info(`CLI: Sorting history by ${sortType}`);
            
            if (!this.historyService) {
                return {
                    success: false,
                    error: 'History service not available'
                };
            }
            
            const history = this.historyService.getHistory();
            let sortedHistory;
            
            switch (sortType) {
                case 'recent': // Most recently accessed first (default)
                    sortedHistory = [...history].sort((a, b) => 
                        new Date(b.lastAccessed) - new Date(a.lastAccessed));
                    break;
                    
                case 'oldest': // First accessed first
                    sortedHistory = [...history].sort((a, b) => 
                        new Date(a.firstAccessed) - new Date(b.firstAccessed));
                    break;
                    
                case 'name_asc': // Show name (A-Z)
                    sortedHistory = [...history].sort((a, b) => 
                        a.name.localeCompare(b.name));
                    break;
                    
                case 'name_desc': // Show name (Z-A)
                    sortedHistory = [...history].sort((a, b) => 
                        b.name.localeCompare(a.name));
                    break;
                    
                case 'id': // Show ID
                    sortedHistory = [...history].sort((a, b) => 
                        a.id.localeCompare(b.id));
                    break;
                    
                default: // Default to most recent
                    sortedHistory = [...history].sort((a, b) => 
                        new Date(b.lastAccessed) - new Date(a.lastAccessed));
            }
            
            return {
                success: true,
                data: sortedHistory,
                sortType
            };
        } catch (error) {
            this.logger.error(`CLI: Failed to sort history: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Search history by show name or ID
     * @param {string} query - Search query
     * @returns {object} Object with success flag and matched history entries
     */
    searchHistory(query) {
        try {
            this.logger.info(`CLI: Searching history for: ${query}`);
            
            if (!this.historyService) {
                return {
                    success: false,
                    error: 'History service not available'
                };
            }
            
            if (!query) {
                return {
                    success: false,
                    error: 'Search query cannot be empty'
                };
            }
            
            const history = this.historyService.getHistory();
            const searchTerm = query.toLowerCase();
            
            const matches = history.filter(item => 
                item.name.toLowerCase().includes(searchTerm) || 
                item.id.toLowerCase().includes(searchTerm)
            );
            
            return {
                success: true,
                data: matches,
                query,
                totalMatches: matches.length
            };
        } catch (error) {
            this.logger.error(`CLI: Failed to search history: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Browse all episodes of a show with client-side pagination
     * Fetches all episodes first, then paginates them client-side
     * @param {string} showId - The Spotify show ID
     * @param {number} page - Page number (1-based)
     * @param {number} pageSize - Number of episodes per page
     * @returns {Promise<object>} Formatted episodes with pagination info
     */
    async browseAllEpisodes(showId, page = 1, pageSize = 15) {
        try {
            this.logger.info(`CLI: Browsing all episodes for ${showId}, page ${page}`);
            
            // Fetch all episodes at once using unlimited option
            const allEpisodesData = await this.showService.getShowEpisodesEnhanced(showId, 1, 'unlimited');
            const allEpisodes = allEpisodesData.episodes;
            
            // Sort episodes in reverse chronological order (newest first)
            allEpisodes.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
            
            // Add episode numbers in reverse chronological order
            allEpisodes.forEach((episode, index) => {
                episode.episodeNumber = index + 1;
            });
            
            // Paginate the episodes
            const paginatedData = this.paginateEpisodes(allEpisodes, page, pageSize);
            
            return {
                success: true,
                data: {
                    episodes: paginatedData.episodes,
                    pagination: paginatedData.pagination,
                    showId
                }
            };
        } catch (error) {
            this.logger.error(`CLI: Failed to browse all episodes: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Paginate episodes after fetching all of them
     * @param {Array} allEpisodes - Array of all episodes
     * @param {number} page - Page number (1-based)
     * @param {number} pageSize - Number of episodes per page
     * @returns {object} Episodes for the requested page with pagination info
     */
    paginateEpisodes(allEpisodes, page = 1, pageSize = 15) {
        const totalItems = allEpisodes.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
        const validPage = Math.min(Math.max(1, page), totalPages);
        const startIndex = (validPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, totalItems);
        
        // Get episodes for current page
        const paginatedEpisodes = allEpisodes.slice(startIndex, endIndex);
        
        return {
            episodes: paginatedEpisodes,
            pagination: {
                currentPage: validPage,
                totalPages,
                totalItems,
                pageSize,
                hasNext: validPage < totalPages,
                hasPrevious: validPage > 1,
                startItem: totalItems > 0 ? startIndex + 1 : 0,
                endItem: endIndex
            }
        };
    }
    
    /**
     * Calculate which page contains a specific episode number
     * @param {number} episodeNumber - The episode number to find
     * @param {number} pageSize - Number of episodes per page
     * @returns {number} Page number containing the episode
     */
    calculatePageForEpisode(episodeNumber, pageSize) {
        if (episodeNumber < 1) return 1;
        return Math.ceil(episodeNumber / pageSize);
    }
    
    /**
     * Sort show history by different criteria
     * @param {string} sortType - Sort type: 'recent', 'oldest', 'name_asc', 'name_desc', 'id'
     * @returns {object} Object with success flag and sorted history data
     */
    sortShowHistory(sortType) {
        try {
            this.logger.info(`CLI: Sorting history by ${sortType}`);
            
            if (!this.historyService) {
                return {
                    success: false,
                    error: 'History service not available'
                };
            }
            
            const history = this.historyService.getHistory();
            let sortedHistory;
            
            switch (sortType) {
                case 'recent': // Most recently accessed first (default)
                    sortedHistory = [...history].sort((a, b) => 
                        new Date(b.lastAccessed) - new Date(a.lastAccessed));
                    break;
                    
                case 'oldest': // First accessed first
                    sortedHistory = [...history].sort((a, b) => 
                        new Date(a.firstAccessed) - new Date(b.firstAccessed));
                    break;
                    
                case 'name_asc': // Show name (A-Z)
                    sortedHistory = [...history].sort((a, b) => 
                        a.name.localeCompare(b.name));
                    break;
                    
                case 'name_desc': // Show name (Z-A)
                    sortedHistory = [...history].sort((a, b) => 
                        b.name.localeCompare(a.name));
                    break;
                    
                case 'id': // Show ID
                    sortedHistory = [...history].sort((a, b) => 
                        a.id.localeCompare(b.id));
                    break;
                    
                default: // Default to most recent
                    sortedHistory = [...history].sort((a, b) => 
                        new Date(b.lastAccessed) - new Date(a.lastAccessed));
            }
            
            return {
                success: true,
                data: sortedHistory,
                sortType
            };
        } catch (error) {
            this.logger.error(`CLI: Failed to sort history: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Search history by show name or ID
     * @param {string} query - Search query
     * @returns {object} Object with success flag and matched history entries
     */
    searchHistory(query) {
        try {
            this.logger.info(`CLI: Searching history for: ${query}`);
            
            if (!this.historyService) {
                return {
                    success: false,
                    error: 'History service not available'
                };
            }
            
            if (!query) {
                return {
                    success: false,
                    error: 'Search query cannot be empty'
                };
            }
            
            const history = this.historyService.getHistory();
            const searchTerm = query.toLowerCase();
            
            const matches = history.filter(item => 
                item.name.toLowerCase().includes(searchTerm) || 
                item.id.toLowerCase().includes(searchTerm)
            );
            
            return {
                success: true,
                data: matches,
                query,
                totalMatches: matches.length
            };
        } catch (error) {
            this.logger.error(`CLI: Failed to search history: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Browse all episodes of a show with client-side pagination
     * Fetches all episodes first, then paginates them client-side
     * @param {string} showId - The Spotify show ID
     * @param {number} page - Page number (1-based)
     * @param {number} pageSize - Number of episodes per page
     * @returns {Promise<object>} Formatted episodes with pagination info
     */
    async browseAllEpisodes(showId, page = 1, pageSize = 15) {
        try {
            this.logger.info(`CLI: Browsing all episodes for ${showId}, page ${page}`);
            
            // Fetch all episodes at once using unlimited option
            const allEpisodesData = await this.showService.getShowEpisodesEnhanced(showId, 1, 'unlimited');
            const allEpisodes = allEpisodesData.episodes;
            
            // Sort episodes in reverse chronological order (newest first)
            allEpisodes.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
            
            // Add episode numbers in reverse chronological order
            allEpisodes.forEach((episode, index) => {
                episode.episodeNumber = index + 1;
            });
            
            // Paginate the episodes
            const paginatedData = this.paginateEpisodes(allEpisodes, page, pageSize);
            
            return {
                success: true,
                data: {
                    episodes: paginatedData.episodes,
                    pagination: paginatedData.pagination,
                    showId
                }
            };
        } catch (error) {
            this.logger.error(`CLI: Failed to browse all episodes: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Paginate episodes after fetching all of them
     * @param {Array} allEpisodes - Array of all episodes
     * @param {number} page - Page number (1-based)
     * @param {number} pageSize - Number of episodes per page
     * @returns {object} Episodes for the requested page with pagination info
     */
    paginateEpisodes(allEpisodes, page = 1, pageSize = 15) {
        const totalItems = allEpisodes.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
        const validPage = Math.min(Math.max(1, page), totalPages);
        const startIndex = (validPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, totalItems);
        
        // Get episodes for current page
        const paginatedEpisodes = allEpisodes.slice(startIndex, endIndex);
        
        return {
            episodes: paginatedEpisodes,
            pagination: {
                currentPage: validPage,
                totalPages,
                totalItems,
                pageSize,
                hasNext: validPage < totalPages,
                hasPrevious: validPage > 1,
                startItem: totalItems > 0 ? startIndex + 1 : 0,
                endItem: endIndex
            }
        };
    }
}

module.exports = CLIService;
