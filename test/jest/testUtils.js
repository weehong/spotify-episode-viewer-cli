/**
 * Test utilities for Jest tests
 */

/**
 * Verifies that an array of episodes is sorted in reverse chronological order by release date
 * @param {Array} episodes - Array of episode objects with releaseDate property
 * @returns {boolean} - True if sorted correctly, false otherwise
 */
function verifyEpisodesInReverseChronologicalOrder(episodes) {
  if (!Array.isArray(episodes) || episodes.length < 2) {
    return true;
  }
  
  for (let i = 0; i < episodes.length - 1; i++) {
    const currentDate = new Date(episodes[i].releaseDate);
    const nextDate = new Date(episodes[i + 1].releaseDate);
    if (currentDate < nextDate) {
      return false;
    }
  }
  
  return true;
}

/**
 * Verifies episode numbering is sequential and starts with 1
 * @param {Array} episodes - Array of episode objects with episodeNumber property
 * @returns {boolean} - True if numbered correctly, false otherwise
 */
function verifyEpisodeNumbering(episodes) {
  if (!Array.isArray(episodes) || episodes.length === 0) {
    return true;
  }
  
  // First episode should be #1
  if (episodes[0].episodeNumber !== 1) {
    return false;
  }
  
  // Episode numbers should be sequential
  for (let i = 0; i < episodes.length; i++) {
    if (episodes[i].episodeNumber !== i + 1) {
      return false;
    }
  }
  
  return true;
}

/**
 * Creates a mock pagination data structure
 * @param {Object} options - Pagination options
 * @returns {Object} - Pagination data structure
 */
function createMockPagination(options = {}) {
  const {
    currentPage = 1,
    pageSize = 15,
    totalItems = 100
  } = options;
  
  const totalPages = Math.ceil(totalItems / pageSize);
  
  return {
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    hasNext: currentPage < totalPages,
    hasPrevious: currentPage > 1,
    startItem: (currentPage - 1) * pageSize + 1,
    endItem: Math.min(currentPage * pageSize, totalItems)
  };
}

// Custom Jest matchers for our specific testing needs
const customMatchers = {
  toBeInReverseChronologicalOrder(received) {
    const pass = verifyEpisodesInReverseChronologicalOrder(received);
    return {
      pass,
      message: () => 
        pass
          ? 'Expected episodes not to be in reverse chronological order'
          : 'Expected episodes to be in reverse chronological order'
    };
  },
  
  toHaveSequentialNumbering(received) {
    const pass = verifyEpisodeNumbering(received);
    return {
      pass,
      message: () => 
        pass
          ? 'Expected episodes not to have sequential numbering starting with 1'
          : 'Expected episodes to have sequential numbering starting with 1'
    };
  },
  
  toBeValidPagination(received) {
    const isValid = received && 
      typeof received === 'object' &&
      typeof received.currentPage === 'number' &&
      typeof received.pageSize === 'number' &&
      typeof received.totalItems === 'number' &&
      typeof received.totalPages === 'number' &&
      typeof received.hasNext === 'boolean' &&
      typeof received.hasPrevious === 'boolean';
      
    return {
      pass: isValid,
      message: () => 
        isValid
          ? 'Expected object not to be a valid pagination structure'
          : 'Expected object to be a valid pagination structure'
    };
  }
};

module.exports = {
  verifyEpisodesInReverseChronologicalOrder,
  verifyEpisodeNumbering,
  createMockPagination,
  customMatchers
};
