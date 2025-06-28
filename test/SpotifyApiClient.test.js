/**
 * Jest tests for SpotifyApiClient
 * Testing the integration with Spotify API
 */

const SpotifyApiClient = require('../src/clients/SpotifyApiClient');

// Mock HTTP client for API requests
class MockHttpClient {
  constructor() {
    this.post = jest.fn();
    this.get = jest.fn();
  }
}

// Mock configuration
class MockConfiguration {
  constructor() {
    this.getSpotifyConfig = jest.fn().mockReturnValue({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      tokenUrl: 'https://accounts.spotify.com/api/token',
      apiBaseUrl: 'https://api.spotify.com/v1'
    });
  }
  
  get(key) {
    const config = {
      'spotify.clientId': 'test-client-id',
      'spotify.clientSecret': 'test-client-secret',
      'spotify.tokenUrl': 'https://accounts.spotify.com/api/token',
      'spotify.apiBaseUrl': 'https://api.spotify.com/v1'
    };
    return config[key];
  }
}

describe('SpotifyApiClient Tests', () => {
  let spotifyApiClient;
  let mockHttpClient;
  let mockConfiguration;
  let mockLogger;
  
  beforeEach(() => {
    // Create fresh mocks for each test
    mockHttpClient = new MockHttpClient();
    mockConfiguration = new MockConfiguration();
    mockLogger = createMockLogger();
    
    spotifyApiClient = new SpotifyApiClient(mockHttpClient, mockConfiguration, mockLogger);
    
    // Reset all mocks
    jest.clearAllMocks();
  });
  
  describe('Authentication', () => {
    test('should authenticate and get access token', async () => {
      // Mock the HTTP response for token request
      mockHttpClient.post.mockResolvedValueOnce({
        data: {
          access_token: 'mock-access-token',
          expires_in: 3600,
          token_type: 'Bearer'
        }
      });
      
      // Authenticate
      await spotifyApiClient.authenticate();
      
      // Verify HTTP client was called with correct parameters
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://accounts.spotify.com/api/token',
        expect.stringContaining('grant_type=client_credentials'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded'
          })
        })
      );
      
      // Verify token was stored
      expect(spotifyApiClient.accessToken).toBe('mock-access-token');
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Authentication successful'));
    });
    
    test('should handle authentication failure', async () => {
      // Mock authentication failure
      mockHttpClient.post.mockRejectedValueOnce(new Error('Auth failed'));
      
      // Attempt to authenticate, expect it to throw
      await expect(spotifyApiClient.authenticate()).rejects.toThrow();
      
      // Verify error was logged
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Authentication failed'));
    });
    
    test('should refresh token when expired', async () => {
      // Mock initial authentication
      mockHttpClient.post.mockResolvedValueOnce({
        data: {
          access_token: 'mock-access-token',
          expires_in: 1, // Token expires almost immediately
          token_type: 'Bearer'
        }
      });
      
      // Mock refresh token response
      mockHttpClient.post.mockResolvedValueOnce({
        data: {
          access_token: 'new-access-token',
          expires_in: 3600,
          token_type: 'Bearer'
        }
      });
      
      // Authenticate first time
      await spotifyApiClient.authenticate();
      
      // Wait for token to expire
      await new Promise(r => setTimeout(r, 1500));
      
      // Mock a successful API call response
      mockHttpClient.get.mockResolvedValueOnce({
        data: { name: 'Test Show' }
      });
      
      // Make API call that should trigger token refresh
      await spotifyApiClient.getShow('test-show-id');
      
      // Verify token refresh was called and the new token was stored
      expect(mockHttpClient.post).toHaveBeenCalledTimes(2);
      expect(spotifyApiClient.accessToken).toBe('new-access-token');
    });
  });
  
  describe('Show API', () => {
    beforeEach(async () => {
      // Mock successful authentication for each test
      mockHttpClient.post.mockResolvedValueOnce({
        data: {
          access_token: 'mock-access-token',
          expires_in: 3600,
          token_type: 'Bearer'
        }
      });
      
      await spotifyApiClient.authenticate();
    });
    
    test('should get show details', async () => {
      // Mock show response
      const mockShow = {
        id: 'test-show-id',
        name: 'Test Show',
        description: 'Test show description',
        publisher: 'Test Publisher',
        total_episodes: 42,
        images: [
          { url: 'https://example.com/image1.jpg' }
        ],
        external_urls: {
          spotify: 'https://open.spotify.com/show/test-show-id'
        }
      };
      
      mockHttpClient.get.mockResolvedValueOnce({
        data: mockShow
      });
      
      // Get show details
      const result = await spotifyApiClient.getShow('test-show-id');
      
      // Verify HTTP client was called correctly
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'https://api.spotify.com/v1/shows/test-show-id',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-access-token'
          })
        })
      );
      
      // Verify result
      expect(result).toEqual(mockShow);
    });
    
    test('should get show episodes with pagination', async () => {
      // Mock episodes response
      const mockEpisodesResponse = {
        items: [
          {
            id: 'episode-1',
            name: 'Episode 1',
            description: 'Episode 1 description',
            release_date: '2023-01-01',
            duration_ms: 1800000
          },
          {
            id: 'episode-2',
            name: 'Episode 2',
            description: 'Episode 2 description',
            release_date: '2023-01-02',
            duration_ms: 1900000
          }
        ],
        total: 42,
        limit: 2,
        offset: 0,
        next: 'https://api.spotify.com/v1/shows/test-show-id/episodes?offset=2&limit=2'
      };
      
      mockHttpClient.get.mockResolvedValueOnce({
        data: mockEpisodesResponse
      });
      
      // Get show episodes
      const result = await spotifyApiClient.getShowEpisodes('test-show-id', 0, 2);
      
      // Verify HTTP client was called correctly
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'https://api.spotify.com/v1/shows/test-show-id/episodes?offset=0&limit=2',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-access-token'
          })
        })
      );
      
      // Verify result
      expect(result).toEqual(mockEpisodesResponse);
    });
    
    test('should search for shows', async () => {
      // Mock search response
      const mockSearchResponse = {
        shows: {
          items: [
            {
              id: 'show-1',
              name: 'Test Show 1',
              publisher: 'Publisher 1'
            },
            {
              id: 'show-2',
              name: 'Test Show 2',
              publisher: 'Publisher 2'
            }
          ],
          total: 2
        }
      };
      
      mockHttpClient.get.mockResolvedValueOnce({
        data: mockSearchResponse
      });
      
      // Search for shows
      const result = await spotifyApiClient.searchShows('test query');
      
      // Verify HTTP client was called correctly with encoded query
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/search?q=test%20query&type=show&limit=10'),
        expect.any(Object)
      );
      
      // Verify result
      expect(result).toEqual(mockSearchResponse.shows.items);
    });
  });
  
  describe('Error handling', () => {
    beforeEach(async () => {
      // Mock successful authentication for each test
      mockHttpClient.post.mockResolvedValueOnce({
        data: {
          access_token: 'mock-access-token',
          expires_in: 3600,
          token_type: 'Bearer'
        }
      });
      
      await spotifyApiClient.authenticate();
    });
    
    test('should handle API errors', async () => {
      // Mock API error
      mockHttpClient.get.mockRejectedValueOnce({
        response: {
          status: 404,
          data: {
            error: {
              message: 'Show not found'
            }
          }
        }
      });
      
      // Attempt to get show, expect it to throw
      await expect(spotifyApiClient.getShow('non-existent-id')).rejects.toThrow('Show not found');
      
      // Verify error was logged
      expect(mockLogger.error).toHaveBeenCalled();
    });
    
    test('should handle rate limiting', async () => {
      // Mock rate limit response
      mockHttpClient.get.mockRejectedValueOnce({
        response: {
          status: 429,
          data: {
            error: {
              message: 'API rate limit exceeded'
            }
          },
          headers: {
            'retry-after': '2'
          }
        }
      });
      
      // Mock successful response after retry
      mockHttpClient.get.mockResolvedValueOnce({
        data: { name: 'Test Show' }
      });
      
      // Call method with retry
      const result = await spotifyApiClient.getShow('test-show-id', true);
      
      // Verify result was eventually successful
      expect(result).toEqual({ name: 'Test Show' });
      
      // Verify get was called twice (initial + retry)
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('Advanced features', () => {
    beforeEach(async () => {
      // Mock successful authentication for each test
      mockHttpClient.post.mockResolvedValueOnce({
        data: {
          access_token: 'mock-access-token',
          expires_in: 3600,
          token_type: 'Bearer'
        }
      });
      
      await spotifyApiClient.authenticate();
    });
    
    test('should get multiple episodes in batches', async () => {
      // Mock first batch response
      mockHttpClient.get.mockResolvedValueOnce({
        data: {
          items: [{ id: 'episode-1' }, { id: 'episode-2' }],
          total: 5,
          limit: 2,
          offset: 0,
          next: 'https://api.spotify.com/v1/shows/test-show-id/episodes?offset=2&limit=2'
        }
      });
      
      // Mock second batch response
      mockHttpClient.get.mockResolvedValueOnce({
        data: {
          items: [{ id: 'episode-3' }, { id: 'episode-4' }],
          total: 5,
          limit: 2,
          offset: 2,
          next: 'https://api.spotify.com/v1/shows/test-show-id/episodes?offset=4&limit=2'
        }
      });
      
      // Mock third batch response
      mockHttpClient.get.mockResolvedValueOnce({
        data: {
          items: [{ id: 'episode-5' }],
          total: 5,
          limit: 2,
          offset: 4,
          next: null
        }
      });
      
      // Get all episodes
      const allEpisodes = await spotifyApiClient.getAllShowEpisodes('test-show-id');
      
      // Verify multiple calls were made to the API
      expect(mockHttpClient.get).toHaveBeenCalledTimes(3);
      
      // Verify all episodes were retrieved and combined
      expect(allEpisodes.length).toBe(5);
      expect(allEpisodes.map(ep => ep.id)).toEqual([
        'episode-1', 'episode-2', 'episode-3', 'episode-4', 'episode-5'
      ]);
    });
  });
});
