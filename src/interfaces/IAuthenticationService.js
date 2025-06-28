/**
 * Authentication Service interface following Interface Segregation Principle
 * Defines the contract for authentication operations
 */
class IAuthenticationService {
    /**
     * Get an access token
     * @returns {Promise<string>} The access token
     */
    async getAccessToken() {
        throw new Error('Method must be implemented');
    }

    /**
     * Check if the current token is valid
     * @returns {Promise<boolean>} True if token is valid
     */
    async isTokenValid() {
        throw new Error('Method must be implemented');
    }

    /**
     * Refresh the access token
     * @returns {Promise<string>} The new access token
     */
    async refreshToken() {
        throw new Error('Method must be implemented');
    }
}

module.exports = IAuthenticationService;
