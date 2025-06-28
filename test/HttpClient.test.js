/**
 * Tests for HTTP Client
 */

const AxiosHttpClient = require('../src/http/AxiosHttpClient');

describe('HTTP Client Tests', () => {
    test('should implement IHttpClient interface', () => {
        const client = new AxiosHttpClient();
        
        expect(typeof client.get).toBe('function');
        expect(typeof client.post).toBe('function');
    });

    test('should handle errors properly', async () => {
        const client = new AxiosHttpClient();
        
        // Test with invalid URL to trigger error
        await expect(async () => {
            await client.get('http://invalid-url-that-does-not-exist.com');
        }).rejects.toThrow();
    });

    test('should create instance with proper configuration', () => {
        const client = new AxiosHttpClient();
        
        expect(client.client).toBeDefined();
        expect(typeof client.handleError).toBe('function');
    });
    
    test('should process response data correctly', async () => {
        const client = new AxiosHttpClient();
        
        // Mock the axios client to return a successful response
        client.client = {
            get: jest.fn().mockResolvedValue({
                data: { message: 'success' },
                status: 200
            }),
            post: jest.fn().mockResolvedValue({
                data: { message: 'created' },
                status: 201
            })
        };
        
        // Test GET request
        const getResponse = await client.get('/test');
        expect(getResponse).toEqual({ message: 'success' });
        expect(client.client.get).toHaveBeenCalledWith('/test', undefined);
        
        // Test POST request
        const body = { name: 'test' };
        const postResponse = await client.post('/create', body);
        expect(postResponse).toEqual({ message: 'created' });
        expect(client.client.post).toHaveBeenCalledWith('/create', body, undefined);
    });
    
    test('should handle timeout errors', async () => {
        const client = new AxiosHttpClient();
        
        // Mock a timeout error
        const timeoutError = new Error('timeout');
        timeoutError.code = 'ECONNABORTED';
        
        client.client = {
            get: jest.fn().mockRejectedValue(timeoutError)
        };
        
        await expect(client.get('/test')).rejects.toThrow(/timeout/i);
    });
    
    test('should handle network errors', async () => {
        const client = new AxiosHttpClient();
        
        // Mock a network error
        const networkError = new Error('Network Error');
        
        client.client = {
            get: jest.fn().mockRejectedValue(networkError)
        };
        
        await expect(client.get('/test')).rejects.toThrow(/network error/i);
    });
});
