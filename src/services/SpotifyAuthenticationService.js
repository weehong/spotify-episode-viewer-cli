const qs = require('querystring');
const IAuthenticationService = require('../interfaces/IAuthenticationService');

/**
 * Spotify Authentication Service following Single Responsibility Principle
 * Responsible only for handling Spotify OAuth authentication
 */
class SpotifyAuthenticationService extends IAuthenticationService {
    constructor(httpClient, configuration) {
        super();
        this.httpClient = httpClient;
        this.config = configuration;
        this.accessToken = null;
        this.tokenExpiry = null;
    }

    /**
     * Get an access token using client credentials flow
     * @returns {Promise<string>} The access token
     */
    async getAccessToken() {
        if (this.accessToken && await this.isTokenValid()) {
            return this.accessToken;
        }

        return await this.requestNewToken();
    }

    /**
     * Check if the current token is valid (not expired)
     * @returns {Promise<boolean>} True if token is valid
     */
    async isTokenValid() {
        if (!this.accessToken || !this.tokenExpiry) {
            return false;
        }

        // Add 5 minute buffer before expiry
        const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
        return Date.now() < (this.tokenExpiry - bufferTime);
    }

    /**
     * Refresh the access token (same as getting new token for client credentials)
     * @returns {Promise<string>} The new access token
     */
    async refreshToken() {
        return await this.requestNewToken();
    }

    /**
     * Request a new access token from Spotify
     * @private
     * @returns {Promise<string>} The new access token
     */
    async requestNewToken() {
        const spotifyConfig = this.config.getSpotifyConfig();
        
        const body = qs.stringify({
            grant_type: 'client_credentials',
        });

        const credentials = Buffer.from(
            `${spotifyConfig.clientId}:${spotifyConfig.clientSecret}`
        ).toString('base64');

        const options = {
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        };

        try {
            const response = await this.httpClient.post(spotifyConfig.tokenUrl, body, options);
            
            this.accessToken = response.access_token;
            // Calculate expiry time (expires_in is in seconds)
            this.tokenExpiry = Date.now() + (response.expires_in * 1000);
            
            return this.accessToken;
        } catch (error) {
            throw new Error(`Authentication failed: ${error.message}`);
        }
    }

    /**
     * Clear the stored token (useful for testing or logout)
     */
    clearToken() {
        this.accessToken = null;
        this.tokenExpiry = null;
    }
}

module.exports = SpotifyAuthenticationService;
