const axios = require('axios');
const IHttpClient = require('../interfaces/IHttpClient');

/**
 * Axios implementation of HTTP Client following Dependency Inversion Principle
 * Concrete implementation that can be easily substituted
 */
class AxiosHttpClient extends IHttpClient {
    constructor() {
        super();
        this.client = axios.create();
    }

    /**
     * Make a GET request
     * @param {string} url - The URL to request
     * @param {object} options - Request options (headers, etc.)
     * @returns {Promise<object>} The response data
     */
    async get(url, options = {}) {
        try {
            const response = await this.client.get(url, options);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Make a POST request
     * @param {string} url - The URL to request
     * @param {*} data - The data to send
     * @param {object} options - Request options (headers, etc.)
     * @returns {Promise<object>} The response data
     */
    async post(url, data, options = {}) {
        try {
            const response = await this.client.post(url, data, options);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Handle HTTP errors consistently
     * @private
     * @param {Error} error - The error to handle
     */
    handleError(error) {
        if (error.response) {
            // Server responded with error status
            const httpError = new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
            httpError.status = error.response.status;
            httpError.data = error.response.data;
            throw httpError;
        } else if (error.request) {
            // Request was made but no response received
            throw new Error('Network error: No response received');
        } else {
            // Something else happened
            throw new Error(`Request error: ${error.message}`);
        }
    }
}

module.exports = AxiosHttpClient;
