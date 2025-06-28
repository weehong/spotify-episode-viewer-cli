/**
 * CLI Interface contract following Interface Segregation Principle
 * Defines the contract for command-line interface operations
 */
class ICLIInterface {
    /**
     * Start the interactive CLI session
     * @returns {Promise<void>}
     */
    async start() {
        throw new Error('Method must be implemented');
    }

    /**
     * Display the main menu and handle user selection
     * @returns {Promise<void>}
     */
    async showMainMenu() {
        throw new Error('Method must be implemented');
    }

    /**
     * Display a welcome message
     * @returns {void}
     */
    showWelcome() {
        throw new Error('Method must be implemented');
    }

    /**
     * Display a goodbye message
     * @returns {void}
     */
    showGoodbye() {
        throw new Error('Method must be implemented');
    }

    /**
     * Handle errors in a user-friendly way
     * @param {Error} error - The error to handle
     * @returns {void}
     */
    handleError(error) {
        throw new Error('Method must be implemented');
    }

    /**
     * Display loading indicator
     * @param {string} message - Loading message
     * @returns {object} Spinner object
     */
    showLoading(message) {
        throw new Error('Method must be implemented');
    }

    /**
     * Stop loading indicator
     * @param {object} spinner - Spinner object
     * @param {string} message - Completion message
     * @returns {void}
     */
    stopLoading(spinner, message) {
        throw new Error('Method must be implemented');
    }
}

module.exports = ICLIInterface;
