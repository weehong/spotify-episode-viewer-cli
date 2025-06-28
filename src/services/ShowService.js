const IShowService = require('../interfaces/IShowService');

/**
 * Show Service following Single Responsibility Principle
 * Responsible for business logic related to show operations
 * Transforms raw API data into business-friendly formats
 */
class ShowService extends IShowService {
    constructor(spotifyApiClient, logger = null) {
        super();
        this.apiClient = spotifyApiClient;
        this.logger = logger;
    }

    /**
     * Get formatted show details
     * @param {string} showId - The Spotify show ID
     * @returns {Promise<object>} Formatted show details
     */
    async getShowDetails(showId) {
        try {
            this.log('info', `Fetching details for show: ${showId}`);

            const rawShow = await this.apiClient.getShow(showId);
            return this.formatShowDetails(rawShow);
        } catch (error) {
            this.log('error', `Failed to get show details: ${error.message}`);
            throw new Error(`Unable to retrieve show details: ${error.message}`);
        }
    }

    /**
     * Get show summary with key information
     * @param {string} showId - The Spotify show ID
     * @returns {Promise<object>} Show summary
     */
    async getShowSummary(showId) {
        try {
            this.log('info', `Fetching summary for show: ${showId}`);

            const rawShow = await this.apiClient.getShow(showId);
            return this.formatShowSummary(rawShow);
        } catch (error) {
            this.log('error', `Failed to get show summary: ${error.message}`);
            throw new Error(`Unable to retrieve show summary: ${error.message}`);
        }
    }

    /**
     * Get all show episodes without pagination
     * @param {string} showId - The Spotify show ID
     * @returns {Promise<object>} All episodes data
     */
    async getAllShowEpisodes(showId) {
        try {
            this.log('info', `Fetching all episodes for show: ${showId}`);

            // Get first page to determine total count
            const firstPage = await this.apiClient.getShowEpisodes(showId, {
                limit: 50,
                offset: 0
            });

            const totalEpisodes = firstPage.total;
            let allEpisodes = [...(firstPage.items || [])];

            // If there are more episodes, fetch them in batches
            if (totalEpisodes > 50) {
                const remainingEpisodes = totalEpisodes - 50;
                const additionalPages = Math.ceil(remainingEpisodes / 50);

                this.log('info', `Fetching ${additionalPages} additional pages for ${remainingEpisodes} remaining episodes`);

                // Fetch remaining pages concurrently in batches
                const batchSize = 5; // Max 5 concurrent requests
                for (let i = 0; i < additionalPages; i += batchSize) {
                    const batch = [];
                    const batchEnd = Math.min(i + batchSize, additionalPages);

                    for (let j = i; j < batchEnd; j++) {
                        const offset = (j + 1) * 50; // +1 because we already have first page
                        batch.push(
                            this.apiClient.getShowEpisodes(showId, {
                                limit: 50,
                                offset: offset
                            }).catch(error => {
                                this.log('warn', `Failed to fetch page at offset ${offset}: ${error.message}`);
                                return { items: [] }; // Return empty page on error
                            })
                        );
                    }

                    // Execute batch concurrently
                    const batchResults = await Promise.all(batch);

                    // Combine results
                    for (const pageData of batchResults) {
                        if (pageData && pageData.items) {
                            allEpisodes = allEpisodes.concat(pageData.items);
                        }
                    }

                    // Add small delay between batches to be respectful to API
                    if (i + batchSize < additionalPages) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                }
            }

            this.log('info', `Successfully fetched ${allEpisodes.length}/${totalEpisodes} episodes for show ${showId}`);

            return this.formatAllEpisodesData(allEpisodes, totalEpisodes);
        } catch (error) {
            this.log('error', `Failed to get all show episodes: ${error.message}`);
            throw new Error(`Unable to retrieve all show episodes: ${error.message}`);
        }
    }

    /**
     * Get show episodes with pagination (legacy method for backward compatibility)
     * @param {string} showId - The Spotify show ID
     * @param {number} page - Page number (1-based)
     * @param {number} pageSize - Number of episodes per page
     * @returns {Promise<object>} Paginated episodes data
     */
    async getShowEpisodes(showId, page = 1, pageSize = 20) {
        try {
            this.log('info', `Fetching episodes for show: ${showId}, page: ${page}`);

            const offset = (page - 1) * pageSize;
            const rawEpisodes = await this.apiClient.getShowEpisodes(showId, {
                limit: pageSize,
                offset: offset
            });

            return this.formatEpisodesData(rawEpisodes, page, pageSize);
        } catch (error) {
            this.log('error', `Failed to get show episodes: ${error.message}`);
            throw new Error(`Unable to retrieve show episodes: ${error.message}`);
        }
    }

    /**
     * Format raw show data into business-friendly format
     * @private
     * @param {object} rawShow - Raw show data from API
     * @returns {object} Formatted show details
     */
    formatShowDetails(rawShow) {
        return {
            id: rawShow.id,
            name: rawShow.name,
            description: rawShow.description,
            publisher: rawShow.publisher,
            language: rawShow.language,
            totalEpisodes: rawShow.total_episodes,
            explicit: rawShow.explicit,
            images: rawShow.images?.map(img => ({
                url: img.url,
                width: img.width,
                height: img.height
            })) || [],
            externalUrls: rawShow.external_urls,
            copyrights: rawShow.copyrights?.map(c => ({
                text: c.text,
                type: c.type
            })) || [],
            mediaType: rawShow.media_type,
            isExternallyHosted: rawShow.is_externally_hosted,
            availableMarkets: rawShow.available_markets || [],
            htmlDescription: rawShow.html_description
        };
    }

    /**
     * Format raw show data into summary format
     * @private
     * @param {object} rawShow - Raw show data from API
     * @returns {object} Formatted show summary
     */
    formatShowSummary(rawShow) {
        return {
            id: rawShow.id,
            name: rawShow.name,
            publisher: rawShow.publisher,
            totalEpisodes: rawShow.total_episodes,
            language: rawShow.language,
            explicit: rawShow.explicit,
            description: this.truncateDescription(rawShow.description, 200),
            thumbnailUrl: rawShow.images?.[0]?.url || null,
            spotifyUrl: rawShow.external_urls?.spotify || null
        };
    }

    /**
     * Format all episodes data without pagination
     * @private
     * @param {Array} allEpisodes - Array of all episode items
     * @param {number} totalEpisodes - Total number of episodes
     * @returns {object} Formatted all episodes data
     */
    formatAllEpisodesData(allEpisodes, totalEpisodes) {
        // Make sure allEpisodes is an array
        const episodesArray = Array.isArray(allEpisodes) ? allEpisodes : [];
        
        // Sort episodes by release date (newest first) for reverse chronological order
        const sortedEpisodes = [...episodesArray].sort((a, b) => {
            // Handle potential null or invalid dates
            const dateA = a && a.release_date ? new Date(a.release_date) : new Date(0);
            const dateB = b && b.release_date ? new Date(b.release_date) : new Date(0);
            return dateB - dateA;
        });
        
        return {
            episodes: sortedEpisodes.map((episode, index) => {
                // Ensure episode is not null
                if (!episode) return null;
                
                // Add episode number (1-based) in reverse chronological order
                return {
                    id: episode.id,
                    name: episode.name,
                    description: this.truncateDescription(episode.description, 300),
                    releaseDate: episode.release_date,
                    durationMs: episode.duration_ms,
                    explicit: episode.explicit,
                    language: episode.language,
                    thumbnailUrl: episode.images?.[0]?.url || null,
                    spotifyUrl: episode.external_urls?.spotify || null,
                    // Add episode number (newest episode is #1)
                    episodeNumber: index + 1
                };
            }).filter(episode => episode !== null),
            totalItems: totalEpisodes,
            fetchedItems: episodesArray.length,
            isComplete: episodesArray.length === totalEpisodes
        };
    }

    /**
     * Format episodes data with pagination info
     * @private
     * @param {object} rawEpisodes - Raw episodes data from API
     * @param {number} page - Current page number
     * @param {number} pageSize - Page size
     * @returns {object} Formatted episodes data
     */
    formatEpisodesData(rawEpisodes, page, pageSize) {
        // Make sure items is an array
        const episodesArray = rawEpisodes && Array.isArray(rawEpisodes.items) ? rawEpisodes.items : [];
        
        // Sort episodes by release date (newest first) for reverse chronological order
        const sortedEpisodes = [...episodesArray].sort((a, b) => {
            // Handle potential null or invalid dates
            const dateA = a && a.release_date ? new Date(a.release_date) : new Date(0);
            const dateB = b && b.release_date ? new Date(b.release_date) : new Date(0);
            return dateB - dateA;
        });
        
        return {
            episodes: sortedEpisodes.map((episode, index) => {
                // Ensure episode is not null
                if (!episode) return null;
                
                // Add episode number (1-based) in reverse chronological order
                // For paginated results, we need to factor in the page number and page size
                const episodeNumber = ((page - 1) * pageSize) + index + 1;
                
                return {
                    id: episode.id,
                    name: episode.name,
                    description: this.truncateDescription(episode.description, 300),
                    releaseDate: episode.release_date,
                    durationMs: episode.duration_ms,
                    explicit: episode.explicit,
                    language: episode.language,
                    thumbnailUrl: episode.images?.[0]?.url || null,
                    spotifyUrl: episode.external_urls?.spotify || null,
                    // Add episode number (newest episode is #1)
                    episodeNumber: episodeNumber
                };
            }).filter(episode => episode !== null),
            pagination: {
                currentPage: page,
                pageSize: pageSize,
                totalItems: rawEpisodes.total,
                totalPages: Math.ceil(rawEpisodes.total / pageSize),
                hasNext: rawEpisodes.next !== null,
                hasPrevious: rawEpisodes.previous !== null
            }
        };
    }

    /**
     * Truncate description to specified length
     * @private
     * @param {string} description - The description to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated description
     */
    truncateDescription(description, maxLength) {
        if (!description || description.length <= maxLength) {
            return description;
        }
        return description.substring(0, maxLength - 3) + '...';
    }

    /**
     * Log messages if logger is available
     * @private
     * @param {string} level - Log level
     * @param {string} message - Log message
     */
    log(level, message) {
        if (this.logger && typeof this.logger[level] === 'function') {
            this.logger[level](message);
        }
    }
}

module.exports = ShowService;
