/**
 * Common mock implementations for tests
 */

class MockLogger {
  info() {}
  error() {}
  debug() {}
  warn() {}
}

class MockConfiguration {
  constructor(config = {}) {
    this.spotifyConfig = {
      clientId: 'test_client_id',
      clientSecret: 'test_client_secret',
      tokenUrl: 'https://accounts.spotify.com/api/token',
      apiBaseUrl: 'https://api.spotify.com/v1',
      ...config.spotifyConfig
    };
    
    this.appConfig = {
      defaultShowId: 'test123',
      logLevel: 'info',
      ...config.appConfig
    };
    
    this.valid = config.valid !== undefined ? config.valid : true;
  }

  getSpotifyConfig() {
    return this.spotifyConfig;
  }

  getAppConfig() {
    return this.appConfig;
  }

  isValid() {
    return this.valid;
  }
}

class MockHttpClient {
  constructor(responseData = {}, shouldError = false) {
    this.responseData = responseData;
    this.shouldError = shouldError;
    this.requestHistory = [];
  }
  
  async get(url, options) {
    this.requestHistory.push({ method: 'GET', url, options });
    
    if (this.shouldError) {
      throw new Error('Mock HTTP error');
    }
    
    return { 
      data: this.responseData,
      status: 200
    };
  }
  
  async post(url, data, options) {
    this.requestHistory.push({ method: 'POST', url, data, options });
    
    if (this.shouldError) {
      throw new Error('Mock HTTP error');
    }
    
    return { 
      data: this.responseData,
      status: 200
    };
  }
}

class MockSpotifyApiClient {
  constructor(config = {}) {
    this.episodes = config.episodes || [];
    this.showDetails = config.showDetails || {
      id: 'test123',
      name: 'Test Show',
      publisher: 'Test Publisher',
      description: 'Test Show Description',
      language: 'en',
      total_episodes: 100
    };
    this.searchResults = config.searchResults || { episodes: { items: [] } };
    this.shouldError = config.shouldError || false;
  }
  
  async getShowEpisodes(showId, offset, limit) {
    if (this.shouldError) {
      throw new Error('Mock API error');
    }
    
    const start = offset || 0;
    const pageSize = limit || 10;
    const end = Math.min(start + pageSize, this.episodes.length);
    const items = this.episodes.slice(start, end);
    
    return {
      items,
      total: this.episodes.length,
      offset: start,
      limit: pageSize,
      next: end < this.episodes.length ? `next_url` : null,
      previous: start > 0 ? `previous_url` : null
    };
  }
  
  async getShowDetails(showId) {
    if (this.shouldError) {
      throw new Error('Mock API error');
    }
    
    return {
      ...this.showDetails,
      id: showId
    };
  }
  
  async search(options) {
    if (this.shouldError) {
      throw new Error('Mock API error');
    }
    
    return this.searchResults;
  }
}

/**
 * Creates a set of mock episodes for testing
 * @param {number} count - Number of episodes to create
 * @param {object} options - Options for customizing the episodes
 * @returns {Array} Array of mock episodes
 */
function createMockEpisodes(count = 20, options = {}) {
  const reverseOrder = options.reverseOrder !== false;
  
  return Array.from({ length: count }, (_, i) => {
    const index = reverseOrder ? count - i : i + 1;
    const date = new Date(2023, 0, index);
    
    return {
      id: `episode${index}`,
      name: `Episode ${index}`,
      description: `Description for episode ${index}`,
      release_date: date.toISOString().split('T')[0],
      duration_ms: 1800000 + (i * 60000),
      explicit: i % 2 === 0,
      external_urls: {
        spotify: `https://spotify.com/episodes/episode${index}`
      },
      images: [
        { url: `https://example.com/image${index}.jpg` }
      ]
    };
  });
}

module.exports = {
  MockLogger,
  MockConfiguration,
  MockHttpClient,
  MockSpotifyApiClient,
  createMockEpisodes
};
