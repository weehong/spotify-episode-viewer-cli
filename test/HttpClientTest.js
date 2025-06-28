/**
 * Tests for HTTP Client
 */

const AxiosHttpClient = require('../src/http/AxiosHttpClient');

module.exports = function(runner) {
    runner.test('AxiosHttpClient - should extend IHttpClient interface', () => {
        const client = new AxiosHttpClient();
        
        runner.assert(typeof client.get === 'function', 'Should have get method');
        runner.assert(typeof client.post === 'function', 'Should have post method');
    });

    runner.test('AxiosHttpClient - should handle errors properly', async () => {
        const client = new AxiosHttpClient();
        
        // Test with invalid URL to trigger error
        await runner.assertThrows(async () => {
            await client.get('http://invalid-url-that-does-not-exist.com');
        }, 'Should throw error for invalid URL');
    });

    runner.test('AxiosHttpClient - should create instance', () => {
        const client = new AxiosHttpClient();
        
        runner.assert(client.client, 'Should have axios client instance');
        runner.assert(typeof client.handleError === 'function', 'Should have error handler');
    });
};
