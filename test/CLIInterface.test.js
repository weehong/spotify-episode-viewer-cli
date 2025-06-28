/**
 * Jest tests for CLIInterface
 * Testing the CLI user interface and its integration with services
 */

const CLIInterface = require('../src/cli/CLIInterface');
const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');

// Mock dependencies
jest.mock('inquirer');
jest.mock('chalk', () => ({
  red: jest.fn(text => `RED:${text}`),
  green: jest.fn(text => `GREEN:${text}`),
  blue: jest.fn(text => `BLUE:${text}`),
  yellow: jest.fn(text => `YELLOW:${text}`),
  cyan: jest.fn(text => `CYAN:${text}`),
  bold: jest.fn(text => `BOLD:${text}`),
  gray: jest.fn(text => `GRAY:${text}`),
  bgGreen: {
    black: jest.fn(text => `BG_GREEN:${text}`)
  },
  cyan: {
    bold: jest.fn(text => `CYAN_BOLD:${text}`)
  }
}));

// Mock CLIService
class MockCLIService {
  constructor() {
    this.getShowDetailsForCLI = jest.fn();
    this.validateShowId = jest.fn();
    this.searchShows = jest.fn();
    this.getFavorites = jest.fn();
    this.addToFavorites = jest.fn();
    this.removeFromFavorites = jest.fn();
    this.clearFavorites = jest.fn();
    this.getPopularShows = jest.fn();
    this.getShowEpisodes = jest.fn();
    this.getAccessToken = jest.fn();
    this.healthCheck = jest.fn();
    this.getAppConfig = jest.fn();
    this.shortenSpotifyURL = jest.fn();
  }
}

// Mock Logger
class MockLogger {
  constructor() {
    this.info = jest.fn();
    this.error = jest.fn();
    this.debug = jest.fn();
    this.warn = jest.fn();
  }
}

describe('CLIInterface Tests', () => {
  let cliInterface;
  let mockCLIService;
  let mockLogger;
  let consoleSpy;

  beforeEach(() => {
    // Create fresh mocks for each test
    mockCLIService = new MockCLIService();
    mockLogger = new MockLogger();
    cliInterface = new CLIInterface(mockCLIService, mockLogger);
    
    // Spy on console.log
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Main menu navigation', () => {
    test('should exit CLI when exit option is selected', async () => {
      // Mock inquirer prompt to return 'exit' action
      inquirer.prompt.mockResolvedValueOnce({ action: 'exit' });
      
      await cliInterface.showMainMenu();
      
      // CLI should no longer be running
      expect(cliInterface.isRunning).toBe(false);
    });
    
    test('should show welcome message on start', async () => {
      // Mock the showMainMenu to avoid entering the loop
      cliInterface.showMainMenu = jest.fn().mockImplementation(() => {
        cliInterface.isRunning = false;
      });
      
      await cliInterface.start();
      
      // Verify welcome message was shown
      expect(consoleSpy).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Starting CLI interface');
    });
  });

  describe('Show details feature', () => {
    test('should fetch and display show details for a valid ID', async () => {
      // Set up mock data
      const mockShowData = {
        name: 'Test Podcast',
        publisher: 'Test Publisher',
        description: 'This is a test podcast description',
        totalEpisodes: 42,
        url: 'https://open.spotify.com/show/test123'
      };
      
      // Mock user entering a show ID
      inquirer.prompt
        .mockResolvedValueOnce({ idSource: 'new' })
        .mockResolvedValueOnce({ showId: 'test123' });
      
      // Mock validateShowId to return true
      mockCLIService.validateShowId.mockReturnValue(true);
      
      // Mock getShowDetailsForCLI to return success with mock data
      mockCLIService.getShowDetailsForCLI.mockResolvedValue({ 
        success: true, 
        data: mockShowData 
      });
      
      // Create a spy for the display method
      cliInterface.displayShowDetails = jest.fn();
      
      await cliInterface.handleShowDetails();
      
      // Verify service was called with correct ID
      expect(mockCLIService.getShowDetailsForCLI).toHaveBeenCalledWith('test123');
      
      // Verify display method was called with the data
      expect(cliInterface.displayShowDetails).toHaveBeenCalledWith(mockShowData);
    });
    
    test('should handle error when show details fetch fails', async () => {
      // Mock user entering a show ID
      inquirer.prompt
        .mockResolvedValueOnce({ idSource: 'new' })
        .mockResolvedValueOnce({ showId: 'invalid123' });
      
      // Mock validateShowId to return true
      mockCLIService.validateShowId.mockReturnValue(true);
      
      // Mock getShowDetailsForCLI to return error
      mockCLIService.getShowDetailsForCLI.mockResolvedValue({ 
        success: false, 
        error: 'Show not found' 
      });
      
      await cliInterface.handleShowDetails();
      
      // Verify error message was displayed
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Show not found'));
    });
  });

  describe('Search shows feature', () => {
    test('should search for shows and return selected show ID', async () => {
      // Mock search results
      const mockSearchResults = [
        { id: 'show1', name: 'Podcast 1', publisher: 'Publisher 1' },
        { id: 'show2', name: 'Podcast 2', publisher: 'Publisher 2' }
      ];
      
      // Mock user entering search query and selecting a show
      inquirer.prompt
        .mockResolvedValueOnce({ query: 'test search' })
        .mockResolvedValueOnce({ selectedShow: 'show1' })
        .mockResolvedValueOnce({ addToFavorites: false });
      
      // Mock searchShows to return success with mock results
      mockCLIService.searchShows.mockResolvedValue({ 
        success: true, 
        data: mockSearchResults 
      });
      
      // Call the method
      const result = await cliInterface.handleSearchShows();
      
      // Verify service was called with correct query
      expect(mockCLIService.searchShows).toHaveBeenCalledWith('test search');
      
      // Verify the selected show ID was returned
      expect(result).toBe('show1');
    });
    
    test('should add show to favorites when requested', async () => {
      // Mock search results
      const mockSearchResults = [
        { id: 'show1', name: 'Podcast 1', publisher: 'Publisher 1' },
        { id: 'show2', name: 'Podcast 2', publisher: 'Publisher 2' }
      ];
      
      // Mock user interactions
      inquirer.prompt
        .mockResolvedValueOnce({ query: 'test search' })
        .mockResolvedValueOnce({ selectedShow: 'show1' })
        .mockResolvedValueOnce({ addToFavorites: true });
      
      // Mock service responses
      mockCLIService.searchShows.mockResolvedValue({ 
        success: true, 
        data: mockSearchResults 
      });
      
      mockCLIService.addToFavorites.mockResolvedValue({
        success: true,
        message: 'Show added to favorites'
      });
      
      // Call the method
      await cliInterface.handleSearchShows();
      
      // Verify addToFavorites was called
      expect(mockCLIService.addToFavorites).toHaveBeenCalledWith('show1', 'Podcast 1');
      
      // Verify success message was shown
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Show added to favorites'));
    });
  });

  describe('Favorites management', () => {
    test('should display favorites list when available', async () => {
      // Mock favorites data
      const mockFavorites = [
        { id: 'fav1', name: 'Favorite Podcast 1' },
        { id: 'fav2', name: 'Favorite Podcast 2' }
      ];
      
      // Mock getFavorites to return success with mock data
      mockCLIService.getFavorites.mockResolvedValue({
        success: true,
        data: mockFavorites
      });
      
      // Mock user selecting "back to main menu"
      inquirer.prompt.mockResolvedValueOnce({ action: 'back' });
      
      // Create a spy for the display method
      cliInterface.displayFavorites = jest.fn();
      
      // Call the method
      await cliInterface.handleManageFavorites();
      
      // Verify display method was called with favorites data
      expect(cliInterface.displayFavorites).toHaveBeenCalledWith(mockFavorites);
    });
    
    test('should handle empty favorites list', async () => {
      // Mock empty favorites
      mockCLIService.getFavorites.mockResolvedValue({
        success: true,
        data: []
      });
      
      // Mock user declining to add favorite
      inquirer.prompt.mockResolvedValueOnce({ addFavorite: false });
      
      // Call the method
      await cliInterface.handleManageFavorites();
      
      // Verify appropriate message was shown
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('no favorite shows'));
    });
  });
  
  describe('Error handling', () => {
    test('should handle errors gracefully', async () => {
      // Force an error in CLI service
      mockCLIService.getShowDetailsForCLI.mockRejectedValue(new Error('Test error'));
      
      // Mock user entering show ID
      inquirer.prompt
        .mockResolvedValueOnce({ idSource: 'new' })
        .mockResolvedValueOnce({ showId: 'test123' });
      
      // Mock validateShowId to return true
      mockCLIService.validateShowId.mockReturnValue(true);
      
      // Call the method, expect it not to throw
      await expect(cliInterface.handleShowDetails()).resolves.not.toThrow();
      
      // Error should be logged
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
