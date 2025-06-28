/**
 * HTTP Client interface following Interface Segregation Principle
 * Defines the contract for HTTP operations
 */
class IHttpClient {
    /**
     * Make a GET request
     * @param {string} url - The URL to request
     * @param {object} options - Request options (headers, etc.)
     * @returns {Promise<object>} The response data
     */
    async get(url, options = {}) {
        throw new Error('Method must be implemented');
    }

    /**
     * Make a POST request
     * @param {string} url - The URL to request
     * @param {*} data - The data to send
     * @param {object} options - Request options (headers, etc.)
     * @returns {Promise<object>} The response data
     */
    async post(url, data, options = {}) {
        throw new Error('Method must be implemented');
    }
}

module.exports = IHttpClient;
