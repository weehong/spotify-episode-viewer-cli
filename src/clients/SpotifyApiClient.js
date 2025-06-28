const ISpotifyApiClient = require('../interfaces/ISpotifyApiClient');

/**
 * Spotify API Client following Single Responsibility and Open/Closed Principles
 * Responsible only for making Spotify API requests
 * Open for extension (new endpoints) but closed for modification
 */
class SpotifyApiClient extends ISpotifyApiClient {
    constructor(httpClient, authenticationService, configuration) {
        super();
        this.httpClient = httpClient;
        this.authService = authenticationService;
        this.config = configuration;
        this.baseUrl = configuration.getSpotifyConfig().apiBaseUrl;
    }

    /**
     * Get show details by ID
     * @param {string} showId - The Spotify show ID
     * @returns {Promise<object>} The show details
     */
    async getShow(showId) {
        if (!showId) {
            throw new Error('Show ID is required');
        }

        const url = `${this.baseUrl}/shows/${showId}`;
        const headers = await this.getAuthHeaders();

        try {
            return await this.httpClient.get(url, { headers });
        } catch (error) {
            throw new Error(`Failed to fetch show ${showId}: ${error.message}`);
        }
    }

    /**
     * Get multiple shows by IDs
     * @param {string[]} showIds - Array of Spotify show IDs (max 50)
     * @returns {Promise<object[]>} Array of show details
     */
    async getShows(showIds) {
        if (!Array.isArray(showIds) || showIds.length === 0) {
            throw new Error('Show IDs array is required and cannot be empty');
        }

        if (showIds.length > 50) {
            throw new Error('Maximum 50 show IDs allowed per request');
        }

        const url = `${this.baseUrl}/shows?ids=${showIds.join(',')}`;
        const headers = await this.getAuthHeaders();

        try {
            const response = await this.httpClient.get(url, { headers });
            return response.shows;
        } catch (error) {
            throw new Error(`Failed to fetch shows: ${error.message}`);
        }
    }

    /**
     * Get show episodes
     * @param {string} showId - The Spotify show ID
     * @param {object} options - Query options (limit, offset, market)
     * @returns {Promise<object>} The episodes data
     */
    async getShowEpisodes(showId, options = {}) {
        if (!showId) {
            throw new Error('Show ID is required');
        }

        const queryParams = this.buildQueryParams(options);
        const url = `${this.baseUrl}/shows/${showId}/episodes${queryParams}`;
        const headers = await this.getAuthHeaders();

        try {
            return await this.httpClient.get(url, { headers });
        } catch (error) {
            throw new Error(`Failed to fetch episodes for show ${showId}: ${error.message}`);
        }
    }

    /**
     * Search for content using Spotify Search API
     * @param {object} options - Search options
     * @param {string} options.q - Search query
     * @param {string} options.type - Type of content to search (episode, show, etc.)
     * @param {string} options.market - Market/country code (default: US)
     * @param {number} options.limit - Number of results (default: 20, max: 50)
     * @param {number} options.offset - Offset for pagination (default: 0)
     * @returns {Promise<object>} Search results
     */
    async search(options = {}) {
        const { q, type, market = 'US', limit = 20, offset = 0 } = options;

        if (!q) {
            throw new Error('Search query (q) is required');
        }

        if (!type) {
            throw new Error('Search type is required (e.g., "episode", "show")');
        }

        const queryParams = this.buildQueryParams({
            q: q, // URLSearchParams will handle encoding
            type,
            market,
            limit: Math.min(limit, 50), // Spotify API max is 50
            offset
        });

        const url = `${this.baseUrl}/search${queryParams}`;
        const headers = await this.getAuthHeaders();

        try {
            return await this.httpClient.get(url, { headers });
        } catch (error) {
            throw new Error(`Search failed: ${error.message}`);
        }
    }

    /**
     * Get authentication headers for API requests
     * @private
     * @returns {Promise<object>} Headers object with authorization
     */
    async getAuthHeaders() {
        const token = await this.authService.getAccessToken();
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }

    /**
     * Search for shows by query
     * @param {string} query - Search query
     * @param {number} limit - Maximum number of results (default: 20)
     * @returns {Promise<object>} Search results
     */
    async searchShows(query, limit = 20) {
        if (!query) {
            throw new Error('Search query is required');
        }

        const url = `${this.baseUrl}/search`;
        const headers = await this.getAuthHeaders();
        
        try {
            return await this.httpClient.get(url, { 
                headers,
                params: {
                    q: query,
                    type: 'show',
                    limit: limit,
                    market: 'US'
                }
            });
        } catch (error) {
            throw new Error(`Failed to search shows: ${error.message}`);
        }
    }

    /**
     * Build query parameters string from options object
     * @private
     * @param {object} options - Query options
     * @returns {string} Query parameters string
     */
    buildQueryParams(options) {
        const params = new URLSearchParams();

        // Add supported query parameters
        if (options.limit !== undefined) {
            params.append('limit', Math.min(Math.max(1, options.limit), 50)); // Clamp between 1-50
        }

        if (options.offset !== undefined) {
            params.append('offset', Math.max(0, options.offset)); // Minimum 0
        }

        if (options.market) {
            params.append('market', options.market);
        }

        // Search-specific parameters
        if (options.q) {
            params.append('q', options.q);
        }

        if (options.type) {
            params.append('type', options.type);
        }

        const queryString = params.toString();
        return queryString ? `?${queryString}` : '';
    }

    /**
     * Search for shows using the Spotify Search API
     * @param {string} query - Search query
     * @param {number} limit - Maximum number of results (default: 10, max: 50)
     * @param {number} offset - Results offset (default: 0)
     * @returns {Promise<object>} Search results
     */
    async searchShows(query, limit = 10, offset = 0) {
        if (!query || query.trim() === '') {
            throw new Error('Search query is required');
        }

        // Ensure limit is within Spotify API bounds
        const validLimit = Math.min(Math.max(1, limit), 50);
        const validOffset = Math.max(0, offset);

        const url = `${this.baseUrl}/search`;
        const headers = await this.getAuthHeaders();
        const params = {
            q: query.trim(),
            type: 'show',
            limit: validLimit,
            offset: validOffset,
            market: this.config.getSpotifyConfig().market || 'US'
        };

        try {
            return await this.httpClient.get(url, { headers, params });
        } catch (error) {
            throw new Error(`Failed to search shows: ${error.message}`);
        }
    }
}

module.exports = SpotifyApiClient;
