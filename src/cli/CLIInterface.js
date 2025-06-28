const inquirer = require('inquirer');
const chalk = require('chalk');
const Table = require('cli-table3');
const ora = require('ora');
const ICLIInterface = require('../interfaces/ICLIInterface');

/**
 * CLI Interface following Single Responsibility Principle
 * Responsible only for user interaction and presentation logic
 */
class CLIInterface extends ICLIInterface {
    constructor(cliService, logger) {
        super();
        this.cliService = cliService;
        this.logger = logger;
        this.isRunning = false;
    }

    /**
     * Start the interactive CLI session
     * @returns {Promise<void>}
     */
    async start() {
        this.isRunning = true;
        this.showWelcome();

        try {
            while (this.isRunning) {
                await this.showMainMenu();
            }
        } catch (error) {
            this.handleError(error);
        } finally {
            this.showGoodbye();

            // Cleanup: Close database connection
            try {
                if (this.cliService && this.cliService.favoritesService) {
                    await this.cliService.favoritesService.close();
                }
            } catch (cleanupError) {
                // Silently handle cleanup errors to avoid showing logs after exit
            }
        }
    }

    /**
     * Display the main menu and handle user selection
     * @returns {Promise<void>}
     */
    async showMainMenu() {
        console.log('\n' + chalk.cyan('═'.repeat(60)));
        console.log(chalk.cyan.bold('                    MAIN MENU'));
        console.log(chalk.cyan('═'.repeat(60)));

        const choices = [
            {
                name: '📺 Browse all show episodes',
                value: 'browse_episodes'
            },
            {
                name: '⭐ Manage favorites',
                value: 'manage_favorites'
            },
            {
                name: '⚙️ View application configuration',
                value: 'view_config'
            },
            {
                name: '🏥 Run diagnostics/health checks',
                value: 'health_check'
            },
            {
                name: '🔑 Show access token',
                value: 'show_access_token'
            },
            {
                name: '❌ Exit',
                value: 'exit'
            }
        ];

        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'What would you like to do?',
                choices: choices,
                pageSize: 10
            }
        ]);

        await this.handleMenuAction(action);
    }

    /**
     * Handle menu action selection
     * @private
     * @param {string} action - Selected action
     * @returns {Promise<void>}
     */
    async handleMenuAction(action) {
        try {
            switch (action) {
                case 'browse_episodes':
                    await this.handleBrowseEpisodes();
                    break;
                case 'manage_favorites':
                    await this.handleManageFavorites();
                    break;
                case 'view_config':
                    await this.handleViewConfig();
                    break;
                case 'health_check':
                    await this.handleHealthCheck();
                    break;
                case 'show_access_token':
                    await this.handleShowAccessToken();
                    break;
                case 'exit':
                    this.isRunning = false;
                    break;
                default:
                    console.log(chalk.red('Unknown action selected'));
            }
        } catch (error) {
            this.handleError(error);
        }

        if (this.isRunning) {
            await this.promptContinue();
        }
    }

    /**
     * Handle searching for shows
     * @private
     * @returns {Promise<string|null>} Selected show ID or null if canceled/failed
     */
    async handleSearchShows() {
        const { searchQuery } = await inquirer.prompt([
            {
                type: 'input',
                name: 'searchQuery',
                message: 'Enter search term for show name:',
                validate: (input) => {
                    if (!input.trim()) {
                        return 'Search term is required';
                    }
                    return true;
                }
            }
        ]);

        const spinner = this.showLoading('Searching for shows...');
        const result = await this.cliService.searchShows(searchQuery.trim());
        this.stopLoading(spinner);

        if (!result.success) {
            console.log(chalk.red(`❌ Error: ${result.error}`));
            return null;
        }

        if (result.data.length === 0) {
            console.log(chalk.yellow('No shows found matching your search term.'));
            return null;
        }

        console.log(chalk.green(`\n✅ Found ${result.data.length} shows matching "${searchQuery}"`));

        // Display search results and let user select a show
        const { selectedShow } = await inquirer.prompt([
            {
                type: 'list',
                name: 'selectedShow',
                message: 'Select a show:',
                choices: [
                    ...result.data.map(show => ({
                        name: `${show.name} - ${show.publisher || 'Unknown Publisher'}`,
                        value: show.id
                    })),
                    { name: '↩️ Cancel search', value: 'cancel' }
                ],
                pageSize: 10
            }
        ]);

        if (selectedShow === 'cancel') {
            return null;
        }

        // Ask if the user wants to add the selected show to favorites
        const selectedShowData = result.data.find(show => show.id === selectedShow);
        const { addToFavorites } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'addToFavorites',
                message: `Would you like to add "${selectedShowData.name}" to your favorites?`,
                default: true
            }
        ]);

        if (addToFavorites) {
            const favoriteResult = await this.cliService.addToFavorites(selectedShow, selectedShowData.name);
            if (favoriteResult.success) {
                console.log(chalk.green(`✅ ${favoriteResult.message}`));
            } else {
                console.log(chalk.red(`❌ Error: ${favoriteResult.error}`));
            }
        }

        return selectedShow;

    }

    /**
     * Handle favorites management
     * @private
     * @returns {Promise<void>}
     */
    async handleManageFavorites() {
        console.log('\n' + chalk.cyan('═'.repeat(60)));
        console.log(chalk.cyan.bold('                FAVORITES MANAGEMENT'));
        console.log(chalk.cyan('═'.repeat(60)));

        const favoritesResult = await this.cliService.getFavorites();

        if (!favoritesResult.success) {
            console.log(chalk.red(`❌ Error: ${favoritesResult.error}`));
            return;
        }

        if (favoritesResult.data.length === 0) {
            console.log(chalk.yellow('\nYou have no favorite shows yet.'));

            // Ask if user wants to add a favorite
            const { addFavorite } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'addFavorite',
                    message: 'Would you like to add a favorite show now?',
                    default: true
                }
            ]);

            if (addFavorite) {
                await this.handleAddFavorite();
            }

            return;
        }

        // Display favorites and management options
        this.displayFavorites(favoritesResult.data);

        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'What would you like to do?',
                choices: [
                    { name: '➕ Add a new favorite show', value: 'add' },
                    { name: '🔍 View show details', value: 'view' },
                    { name: '🗑️ Remove a show from favorites', value: 'remove' },
                    { name: '🧹 Clear all favorites', value: 'clear' },
                    { name: '↩️ Back to main menu', value: 'back' }
                ]
            }
        ]);

        switch (action) {
            case 'add':
                await this.handleAddFavorite();
                break;
            case 'view':
                await this.handleViewFavorite(favoritesResult.data);
                break;
            case 'remove':
                await this.handleRemoveFromFavorites(favoritesResult.data);
                break;
            case 'clear':
                await this.handleClearFavorites();
                break;
            case 'back':
                return;
        }
    }

    /**
     * Display favorites in a formatted table
     * @private
     * @param {Array} favorites - List of favorite shows
     */
    displayFavorites(favorites) {
        console.log('\n');

        const table = new Table({
            head: [chalk.cyan('Show Name'), chalk.cyan('Show ID')],
            colWidths: [40, 30],
            wordWrap: true
        });

        favorites.forEach(show => {
            table.push([show.name, show.id]);
        });

        console.log(table.toString());
        console.log(`\nTotal favorites: ${chalk.cyan(favorites.length)}\n`);
    }

    /**
     * Handle adding a new favorite show
     * @private
     * @returns {Promise<void>}
     */
    async handleAddFavorite() {
        // Search for shows to add to favorites
        const showId = await this.handleSearchShows();
        if (!showId) {
            // User canceled or search failed, go back to favorites management
            await this.handleManageFavorites();
        } else {
            // Show was successfully selected and potentially added to favorites
            // Return to favorites management to show updated list
            await this.handleManageFavorites();
        }
    }

    /**
     * Handle viewing a favorite show's details
     * @private
     * @param {Array} favorites - List of favorite shows
     * @returns {Promise<void>}
     */
    async handleViewFavorite(favorites) {
        const { selectedShow } = await inquirer.prompt([
            {
                type: 'list',
                name: 'selectedShow',
                message: 'Select a show to view:',
                choices: [
                    ...favorites.map(show => ({
                        name: show.name,
                        value: show.id
                    })),
                    { name: '↩️ Back to favorites menu', value: 'back' }
                ],
                pageSize: 10
            }
        ]);

        if (selectedShow === 'back') {
            await this.handleManageFavorites();
            return;
        }

        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'Select an action:',
                choices: [
                    { name: '📺 Browse episodes for this show', value: 'browse' },
                    { name: '↩️ Back to favorites menu', value: 'back' }
                ]
            }
        ]);

        if (action === 'browse') {
            await this.handleBrowseEpisodes(selectedShow);
        } else {
            await this.handleManageFavorites();
        }
    }

    /**
     * Handle removing a show from favorites
     * @private
     * @param {Array} favorites - List of favorite shows
     * @returns {Promise<void>}
     */
    async handleRemoveFromFavorites(favorites) {
        const { selectedShow } = await inquirer.prompt([
            {
                type: 'list',
                name: 'selectedShow',
                message: 'Select a show to remove from favorites:',
                choices: [
                    ...favorites.map(show => ({
                        name: show.name,
                        value: show.id
                    })),
                    { name: '↩️ Back to favorites menu', value: 'back' }
                ],
                pageSize: 10
            }
        ]);

        if (selectedShow === 'back') {
            await this.handleManageFavorites();
            return;
        }

        const selectedShowData = favorites.find(show => show.id === selectedShow);
        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: `Are you sure you want to remove "${selectedShowData.name}" from your favorites?`,
                default: false
            }
        ]);

        if (confirm) {
            const result = await this.cliService.removeFromFavorites(selectedShow);

            if (result.success) {
                console.log(chalk.green(`✅ ${result.message}`));
            } else {
                console.log(chalk.red(`❌ Error: ${result.error}`));
            }
        }

        // Go back to favorites management
        await this.handleManageFavorites();
    }

    /**
     * Handle clearing all favorites
     * @private
     * @returns {Promise<void>}
     */
    async handleClearFavorites() {
        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: 'Are you sure you want to clear all your favorites? This action cannot be undone.',
                default: false
            }
        ]);

        if (confirm) {
            const result = await this.cliService.clearFavorites();

            if (result.success) {
                console.log(chalk.green(`✅ ${result.message}`));
            } else {
                console.log(chalk.red(`❌ Error: ${result.error}`));
            }
        }

        // Go back to favorites management
        await this.handleManageFavorites();
    }

    /**
     * Handle searching for shows
     * @private
     * @returns {Promise<string|null>} - The selected show ID or null if canceled/failed
     */
    async handleSearchShows() {
        const { searchQuery } = await inquirer.prompt([
            {
                type: 'input',
                name: 'searchQuery',
                message: 'Enter search term for shows:',
                validate: input => input.trim().length > 0 || 'Please enter a search term'
            }
        ]);

        const spinner = this.showLoading('Searching for shows...');

        try {
            const result = await this.cliService.searchShows(searchQuery.trim());
            this.stopLoading(spinner);

            if (!result.success) {
                console.log(chalk.red(`❌ Error: ${result.error}`));
                return null;
            }

            if (result.data.length === 0) {
                console.log(chalk.yellow('No shows found matching your search term.'));
                return null;
            }

            console.log(chalk.green(`\n✅ Found ${result.data.length} shows matching "${searchQuery}"`));

            // Display shows and let user select one
            const { selectedShow } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'selectedShow',
                    message: 'Select a show:',
                    choices: [
                        ...result.data.map(show => ({
                            name: `${show.name} (${show.publisher})`,
                            value: show.id
                        })),
                        { name: '↩️ Cancel', value: 'cancel' }
                    ],
                    pageSize: 10
                }
            ]);

            if (selectedShow === 'cancel') {
                return null;
            }

            // Ask if the user wants to add the selected show to favorites
            const selectedShowData = result.data.find(show => show.id === selectedShow);
            const { addToFavorites } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'addToFavorites',
                    message: `Would you like to add "${selectedShowData.name}" to your favorites?`,
                    default: true
                }
            ]);

            if (addToFavorites) {
                const favoriteResult = await this.cliService.addToFavorites(selectedShow, selectedShowData.name);
                if (favoriteResult.success) {
                    console.log(chalk.green(`✅ ${favoriteResult.message}`));
                } else {
                    console.log(chalk.red(`❌ Error: ${favoriteResult.error}`));
                }
            }

            return selectedShow;

        } catch (error) {
            this.stopLoading(spinner);
            console.log(chalk.red(`❌ Error searching shows: ${error.message}`));
            return null;
        }
    }

    /**
     * Handle browse episodes request
     * @private
     * @returns {Promise<void>}
     */
    async handleBrowseEpisodes() {
        // First, ask if the user wants to enter a new ID, search for shows, or select from favorites
        const { idSource } = await inquirer.prompt([
            {
                type: 'list',
                name: 'idSource',
                message: 'How would you like to select a Spotify Show ID?',
                choices: [
                    { name: '🆕 Enter a new Spotify Show ID', value: 'new' },
                    { name: '🔍 Search for a show', value: 'search' },
                    { name: '⭐ Select from Favorites List', value: 'favorites' },
                ],
            }
        ]);

        let showId;

        if (idSource === 'new') {
            // User wants to enter a new ID
            const response = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'showId',
                    message: 'Enter Spotify Show ID:',
                    validate: (input) => {
                        if (!input.trim()) {
                            return 'Show ID is required';
                        }
                        if (!this.cliService.validateShowId(input.trim())) {
                            return 'Invalid Show ID format (should be 22 alphanumeric characters)';
                        }
                        return true;
                    }
                }
            ]);
            showId = response.showId.trim();
        } else if (idSource === 'search') {
            // User wants to search for shows
            showId = await this.handleSearchShows();
            if (!showId) {
                // User canceled or search failed
                return;
            }
        } else if (idSource === 'favorites') {
            // User wants to select from favorites
            const favoritesResult = await this.cliService.getFavorites();

            if (!favoritesResult.success) {
                console.log(chalk.red(`❌ Error: ${favoritesResult.error}`));
                return;
            }

            if (favoritesResult.data.length === 0) {
                console.log(chalk.yellow('No favorites found. Please enter a new Show ID or search for shows.'));
                // Fall back to manual entry
                const response = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'showId',
                        message: 'Enter Spotify Show ID:',
                        validate: (input) => {
                            if (!input.trim()) {
                                return 'Show ID is required';
                            }
                            if (!this.cliService.validateShowId(input.trim())) {
                                return 'Invalid Show ID format (should be 22 alphanumeric characters)';
                            }
                            return true;
                        }
                    }
                ]);
                showId = response.showId.trim();
            } else {
                // Select a show from favorites
                const { selectedShow } = await inquirer.prompt([
                    {
                        type: 'list',
                        name: 'selectedShow',
                        message: 'Select a show from favorites:',
                        choices: [
                            ...favoritesResult.data.map(show => ({
                                name: `${show.name} (${show.id})`,
                                value: show.id
                            })),
                            { name: '↩️ Back to main menu', value: 'back' }
                        ],
                        pageSize: 10
                    }
                ]);

                if (selectedShow === 'back') {
                    return;
                }

                showId = selectedShow;
            }
        }

        await this.browseAllEpisodes(showId);
    }

    /**
     * Browse all episodes with pagination after fetching all records
     * @private
     * @param {string} showId - Show ID
     * @param {number} page - Current page (default: 1)
     * @param {number} pageSize - Episodes per page (default: 15)
     * @returns {Promise<void>}
     */
    async browseAllEpisodes(showId, page = 1, pageSize = 15) {
        try {
            const spinner = this.showLoading('Fetching all episodes from Spotify API...');

            // Fetch ALL episodes from Spotify API first
            const result = await this.cliService.getShowEpisodesEnhanced(showId, 1, 'unlimited');

            // If successful, try to update the show name in history
            if (result.success && result.data.showDetails) {
                // Add to history with show name through the CLIService
                await this.cliService.updateShowHistory(showId, result.data.showDetails.name);
            }

            this.stopLoading(spinner);

            if (!result.success) {
                console.log(chalk.red(`❌ Error: ${result.error}`));
                return;
            }

            const allEpisodes = result.data.episodes;

            if (allEpisodes.length === 0) {
                console.log(chalk.yellow('No episodes found for this show.'));
                return;
            }

            // Implement client-side pagination
            const totalEpisodes = allEpisodes.length;
            const totalPages = Math.ceil(totalEpisodes / pageSize);
            const startIndex = (page - 1) * pageSize;
            const endIndex = Math.min(startIndex + pageSize, totalEpisodes);
            const episodesForPage = allEpisodes.slice(startIndex, endIndex);

            // Create pagination data structure
            const paginatedData = {
                episodes: episodesForPage,
                pagination: {
                    currentPage: page,
                    totalPages: totalPages,
                    totalItems: totalEpisodes,
                    hasNext: page < totalPages,
                    hasPrevious: page > 1,
                    pageSize: pageSize,
                    startIndex: startIndex + 1,
                    endIndex: endIndex
                }
            };

            // Display paginated episodes
            this.displayAllEpisodes(paginatedData, showId);

            // Show pagination navigation menu
            await this.showPaginatedEpisodesMenu(showId, allEpisodes, page, pageSize);

        } catch (error) {
            console.log(chalk.red(`❌ Error browsing episodes: ${error.message}`));
        }
    }

    /**
     * Browse episodes with enhanced pagination (legacy method for backward compatibility)
     * @private
     * @param {string} showId - Show ID
     * @param {number} page - Current page
     * @param {number|string} pageSize - Page size (10, 20, or 'unlimited')
     * @param {object} context - Additional context (search, etc.)
     * @returns {Promise<void>}
     */
    async browseEpisodes(showId, page, pageSize = 10, context = {}) {
        let result;
        let spinner;

        // Handle different browse modes
        if (context.mode === 'search_episode') {
            spinner = this.showLoading(`Searching for episode #${context.episodeNumber} using Spotify API...`);
            result = await this.cliService.searchEpisodeByNumber(showId, context.episodeNumber, pageSize);
        } else {
            const pageText = pageSize === 'unlimited' ? 'all episodes' : `page ${page}`;
            spinner = this.showLoading(`Fetching episodes (${pageText})...`);
            result = await this.cliService.getShowEpisodesEnhanced(showId, page, pageSize);
        }

        this.stopLoading(spinner);

        if (!result.success) {
            console.log(chalk.red(`❌ Error: ${result.error}`));
            return;
        }

        if (result.data.episodes.length === 0) {
            console.log(chalk.yellow('No episodes found for this show.'));
            return;
        }

        this.displayEpisodes(result.data, context);

        // Enhanced navigation controls
        await this.showBrowseNavigation(showId, page, pageSize, result.data, context);
    }

    /**
     * Show enhanced browse navigation
     * @private
     * @param {string} showId - Show ID
     * @param {number} page - Current page
     * @param {number|string} pageSize - Page size
     * @param {object} episodesData - Episodes data
     * @param {object} context - Current context
     * @returns {Promise<void>}
     */
    async showBrowseNavigation(showId, page, pageSize, episodesData, context) {
        const choices = [];

        // Pagination controls (only if not unlimited)
        if (pageSize !== 'unlimited') {
            if (episodesData.pagination.hasPrevious) {
                choices.push({ name: '⬅️ Previous Page', value: 'prev' });
            }

            if (episodesData.pagination.hasNext) {
                choices.push({ name: '➡️ Next Page', value: 'next' });
            }
        }

        // Enhanced navigation options
        choices.push({ name: '🔢 Search by episode number', value: 'search_episode' });
        choices.push({ name: '🎧 Episode actions (Open/Copy URL)', value: 'episode_actions' });

        if (pageSize !== 'unlimited') {
            choices.push({ name: '📍 Jump to specific page', value: 'jump_page' });
        }

        // Context-specific options
        if (context.mode) {
            choices.push({ name: '📺 Back to Normal Browse', value: 'back_to_browse' });
        }

        choices.push({ name: '🏠 Back to Main Menu', value: 'back' });

        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'What would you like to do?',
                choices: choices,
                pageSize: 10
            }
        ]);

        switch (action) {
            case 'prev':
                await this.browseEpisodes(showId, page - 1, pageSize);
                break;
            case 'next':
                await this.browseEpisodes(showId, page + 1, pageSize);
                break;
            case 'search_episode':
                await this.handleSearchEpisodeNumber(showId, pageSize);
                break;
            case 'episode_actions':
                await this.handleEpisodeActions(showId, episodesData.episodes, page, pageSize, context);
                break;

            case 'jump_page':
                await this.handleJumpToPage(showId, pageSize, episodesData.pagination.totalPages);
                break;
            case 'back_to_browse':
                await this.browseEpisodes(showId, 1, pageSize);
                break;
            case 'back':
                break;
        }
    }

    /**
     * Handle search by episode number
     * @private
     * @param {string} showId - Show ID
     * @param {number|string} pageSize - Current page size
     * @returns {Promise<void>}
     */
    async handleSearchEpisodeNumber(showId, pageSize) {
        const { episodeNumber } = await inquirer.prompt([
            {
                type: 'input',
                name: 'episodeNumber',
                message: 'Enter episode number to search for:',
                validate: (input) => {
                    const num = parseInt(input);
                    if (isNaN(num) || num < 1) {
                        return 'Please enter a valid episode number (1 or greater)';
                    }
                    return true;
                }
            }
        ]);

        await this.browseEpisodes(showId, 1, pageSize, {
            mode: 'search_episode',
            episodeNumber: parseInt(episodeNumber)
        });
    }

    /**
     * Handle episode actions (Open in Spotify, Copy URL)
     * @private
     * @param {string} showId - Show ID
     * @param {Array} episodes - Current episodes
     * @param {number} page - Current page
     * @param {number|string} pageSize - Page size
     * @param {object} context - Current context
     * @returns {Promise<void>}
     */
    async handleEpisodeActions(showId, episodes, page, pageSize, context) {
        if (episodes.length === 0) {
            console.log(chalk.yellow('No episodes available for actions.'));
            return;
        }

        // Create episode choices
        const episodeChoices = episodes.map(episode => ({
            name: `#${episode.episodeNumber} - ${episode.name}`,
            value: episode
        }));

        episodeChoices.push({ name: '↩️  Back to browse menu', value: 'back' });

        const { selectedEpisode } = await inquirer.prompt([
            {
                type: 'list',
                name: 'selectedEpisode',
                message: 'Select an episode for actions:',
                choices: episodeChoices,
                pageSize: 10
            }
        ]);

        if (selectedEpisode === 'back') {
            await this.browseEpisodes(showId, page, pageSize, context);
            return;
        }

        // Show action options for the selected episode
        await this.showEpisodeActionMenu(selectedEpisode, showId, page, pageSize, context);
    }

    /**
     * Show episode action menu
     * @private
     * @param {object} episode - Selected episode
     * @param {string} showId - Show ID
     * @param {number} page - Current page
     * @param {number|string} pageSize - Page size
     * @param {object} context - Current context
     * @returns {Promise<void>}
     */
    async showEpisodeActionMenu(episode, showId, page, pageSize, context) {
        console.log(chalk.blue(`\n🎧 Episode Actions for: ${episode.name}`));
        console.log(chalk.gray(`Episode #${episode.episodeNumber} - ${episode.duration}`));

        const actionChoices = [];

        // Add Spotify URL actions if available
        if (episode.spotifyUrl && episode.spotifyUrl !== 'N/A') {
            actionChoices.push(
                { name: '🎧 Open in Spotify', value: 'open_spotify' },
                { name: '🔗 Copy Spotify URL', value: 'copy_url' }
            );
        } else {
            actionChoices.push(
                { name: '⚠️  Spotify URL not available', value: 'no_url', disabled: true }
            );
        }

        actionChoices.push(
            { name: '⭐ Add show to favorites', value: 'add_to_favorites' },
            { name: '📋 Copy episode details', value: 'copy_details' },
            { name: '↩️ Back to episode selection', value: 'back_to_episodes' },
            { name: '🏠 Back to browse menu', value: 'back_to_browse' }
        );

        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'What would you like to do?',
                choices: actionChoices
            }
        ]);

        switch (action) {
            case 'open_spotify':
                await this.handleOpenSpotify(episode, showId, page, pageSize, context);
                break;
            case 'copy_url':
                await this.handleCopySpotifyUrl(episode, showId, page, pageSize, context);
                break;
            case 'add_to_favorites':
                await this.handleAddShowToFavorites(showId, episode, page, pageSize, context);
                break;
            case 'copy_details':
                await this.handleCopyEpisodeDetails(episode, showId, page, pageSize, context);
                break;
            case 'back_to_episodes':
                await this.handleEpisodeActions(showId, [episode], page, pageSize, context);
                break;
            case 'back_to_browse':
                await this.browseEpisodes(showId, page, pageSize, context);
                break;
        }
    }

    /**
     * Handle opening episode in Spotify
     * @private
     * @param {object} episode - Episode to open
     * @param {string} showId - Show ID
     * @param {number} page - Current page
     * @param {number|string} pageSize - Page size
     * @param {object} context - Current context
     * @returns {Promise<void>}
     */
    async handleOpenSpotify(episode, showId, page, pageSize, context) {
        const spinner = this.showLoading('Opening episode in Spotify...');
        const success = await this.openSpotifyUrl(episode.spotifyUrl);
        this.stopLoading(spinner);

        if (success) {
            console.log(chalk.green(`✅ Opened "${episode.name}" in Spotify!`));
        } else {
            console.log(chalk.red('❌ Failed to open Spotify. Please try copying the URL instead.'));
            console.log(chalk.blue(`🔗 Spotify URL: ${episode.spotifyUrl}`));
        }

        // Return to episode action menu
        await this.showEpisodeActionMenu(episode, showId, page, pageSize, context);
    }

    /**
     * Handle copying Spotify URL
     * @private
     * @param {object} episode - Episode
     * @param {string} showId - Show ID
     * @param {number} page - Current page
     * @param {number|string} pageSize - Page size
     * @param {object} context - Current context
     * @returns {Promise<void>}
     */
    async handleCopySpotifyUrl(episode, showId, page, pageSize, context) {
        const success = await this.copySpotifyUrl(episode.spotifyUrl);

        if (success) {
            console.log(chalk.green('✅ Spotify URL copied to clipboard!'));
        } else {
            console.log(chalk.yellow('⚠️  Clipboard not available. Here\'s the URL to copy manually:'));
            console.log(chalk.blue('─'.repeat(60)));
            console.log(chalk.cyan(episode.spotifyUrl));
            console.log(chalk.blue('─'.repeat(60)));
        }

        // Return to episode action menu
        await this.showEpisodeActionMenu(episode, showId, page, pageSize, context);
    }

    /**
     * Handle copying episode details
     * @private
     * @param {object} episode - Episode to copy details for
     * @param {string} showId - Show ID
     * @param {number} page - Current page
     * @param {number|string} pageSize - Page size
     * @param {object} context - Current context
     * @returns {Promise<void>}
     */
    async handleCopyEpisodeDetails(episode, showId, page, pageSize, context) {
        const details = `Episode: ${episode.name}\nRelease Date: ${episode.releaseDate}\nDuration: ${episode.duration}\nDescription: ${episode.description}`;

        try {
            await clipboardy.write(details);
            console.log(chalk.green('✅ Episode details copied to clipboard!'));
        } catch (error) {
            console.log(chalk.red(`❌ Failed to copy details: ${error.message}`));
            console.log(chalk.blue('📋 Episode details:'));
            console.log(details);
        }

        // Return to episode action menu
        await this.showEpisodeActionMenu(episode, showId, page, pageSize, context);
    }

    /**
     * Handle adding the current show to favorites
     * @private
     * @param {string} showId - Show ID to add to favorites
     * @param {object} episode - Current episode (for context)
     * @param {number} page - Current page
     * @param {number|string} pageSize - Page size
     * @param {object} context - Current context
     * @returns {Promise<void>}
     */
    async handleAddShowToFavorites(showId, episode, page, pageSize, context) {
        const spinner = this.showLoading('Adding show to favorites...');
        try {
            // First get the show details to get the name
            const showDetailsResult = await this.cliService.getShowDetails(showId);
            this.stopLoading(spinner);

            if (!showDetailsResult.success) {
                console.log(chalk.red(`❌ Error: ${showDetailsResult.error}`));
                await this.showEpisodeActionMenu(episode, showId, page, pageSize, context);
                return;
            }

            const showName = showDetailsResult.data.name;

            // Add to favorites
            const result = await this.cliService.addToFavorites(showId, showName);

            if (result.success) {
                console.log(chalk.green(`✅ Added "${showName}" to favorites!`));
            } else {
                console.log(chalk.yellow(`ℹ️ ${result.message}`));
            }
        } catch (error) {
            this.stopLoading(spinner);
            console.log(chalk.red(`❌ Error adding to favorites: ${error.message}`));
        }

        // Return to episode action menu
        await this.showEpisodeActionMenu(episode, showId, page, pageSize, context);
    }

    /**
     * Handle change page size
     * @private
     * @param {string} showId - Show ID
     * @returns {Promise<void>}
     */
    async handleChangePageSize(showId) {
        const { pageSize } = await inquirer.prompt([
            {
                type: 'list',
                name: 'pageSize',
                message: 'Select new page size:',
                choices: [
                    { name: '📄 10 episodes per page', value: 10 },
                    { name: '📄 20 episodes per page', value: 20 },
                    { name: '📄 Show all episodes (unlimited)', value: 'unlimited' }
                ]
            }
        ]);

        await this.browseEpisodes(showId, 1, pageSize);
    }

    /**
     * Handle jump to specific page
     * @private
     * @param {string} showId - Show ID
     * @param {number} pageSize - Current page size
     * @param {number} totalPages - Total number of pages
     * @returns {Promise<void>}
     */
    async handleJumpToPage(showId, pageSize, totalPages) {
        const { pageNumber } = await inquirer.prompt([
            {
                type: 'input',
                name: 'pageNumber',
                message: `Enter page number (1-${totalPages}):`,
                validate: (input) => {
                    const num = parseInt(input);
                    if (isNaN(num) || num < 1 || num > totalPages) {
                        return `Please enter a valid page number between 1 and ${totalPages}`;
                    }
                    return true;
                }
            }
        ]);

        await this.browseEpisodes(showId, parseInt(pageNumber), pageSize);
    }

    /**
     * Display all episodes in a formatted table
     * @private
     * @param {Array} episodes - All episodes to display
     * @param {string} showId - Show ID for context
     */
    displayAllEpisodes(paginatedData, showId) {
        const { episodes, pagination } = paginatedData;

        console.log(chalk.blue('\n📺 ALL SHOW EPISODES (PAGINATED)'));
        console.log(chalk.blue('═'.repeat(60)));
        console.log(chalk.gray(`Page ${pagination.currentPage} of ${pagination.totalPages} | Episodes ${pagination.startIndex}-${pagination.endIndex} of ${pagination.totalItems}`));
        console.log(chalk.gray(`Showing ${episodes.length} episodes per page`));

        if (episodes.length === 0) {
            console.log(chalk.yellow('No episodes found on this page.'));
            return;
        }

        // Create table for episodes
        const table = new Table({
            head: [
                chalk.cyan('#'),
                chalk.cyan('Title'),
                chalk.cyan('Date'),
                chalk.cyan('Duration'),
            ],
            colWidths: [6, 42, 12, 10],
            wordWrap: true,
            chars: {
                'top': '═', 'top-mid': '╤', 'top-left': '╔', 'top-right': '╗',
                'bottom': '═', 'bottom-mid': '╧', 'bottom-left': '╚', 'bottom-right': '╝',
                'left': '║', 'left-mid': '╟', 'mid': '─', 'mid-mid': '┼',
                'right': '║', 'right-mid': '╢', 'middle': '│'
            }
        });

        // Add episodes to table with global episode numbers
        episodes.forEach((episode, index) => {
            const globalEpisodeNumber = pagination.startIndex + index;
            // Combine title and description
            const title = episode.name + '\n\n' + chalk.gray(episode.description);

            table.push([
                chalk.white.bold(globalEpisodeNumber.toString()),
                episode.isHighlighted ? chalk.yellow(title) : title,
                episode.releaseDate,
                episode.duration,
            ]);
        });

        console.log(table.toString());

        // Show pagination summary
        console.log(chalk.blue(`\n📄 Page Navigation: ${pagination.currentPage}/${pagination.totalPages}`));
        if (pagination.hasNext || pagination.hasPrevious) {
            const navInfo = [];
            if (pagination.hasPrevious) navInfo.push('⬅️ Previous available');
            if (pagination.hasNext) navInfo.push('➡️ Next available');
            console.log(chalk.gray(navInfo.join(' | ')));
        }
        console.log(chalk.blue('\n🎧 Episode Actions:'));
        console.log(chalk.gray('Use the menu below to navigate pages and interact with episodes'));
    }

    /**
     * Display episodes in a formatted table
     * @private
     * @param {object} episodesData - Episodes data with pagination
     * @param {object} context - Display context
     */
    displayEpisodes(episodesData, context = {}) {
        const { episodes, pagination } = episodesData;

        // Dynamic header based on context
        let header = '📺 EPISODES';
        let subHeader;

        if (context.mode === 'search_episode') {
            let searchMethod = 'Local Search';
            if (episodesData.searchMethod === 'api') {
                searchMethod = 'Spotify API';
            } else if (episodesData.searchMethod === 'mapping') {
                searchMethod = 'Episode Mapping';
            }
            header = `� EPISODE SEARCH RESULT: #${episodesData.searchedEpisodeNumber}`;
            subHeader = `Found episode #${episodesData.searchedEpisodeNumber} via ${searchMethod} - Page ${pagination.currentPage} of ${pagination.totalPages} (${pagination.totalItems} total episodes)`;
        } else if (pagination.pageSize === 'unlimited') {
            subHeader = `Showing all ${pagination.totalItems} episodes`;
        } else {
            subHeader = `Page ${pagination.currentPage} of ${pagination.totalPages} (${pagination.totalItems} total episodes) - ${pagination.pageSize} per page`;
        }

        console.log('\n' + chalk.green.bold(header));
        console.log(chalk.green('═'.repeat(70)));
        console.log(chalk.gray(subHeader));

        const table = new Table({
            head: [
                chalk.cyan('#'),
                chalk.cyan('Episode Title'),
                chalk.cyan('Release Date'),
                chalk.cyan('Duration')
            ],
            colWidths: [4, 35, 15, 12],
            wordWrap: true
        });

        episodes.forEach(episode => {
            const episodeNumberDisplay = episode.isHighlighted
                ? chalk.yellow.bold(`${episode.episodeNumber}*`)
                : chalk.white.bold(episode.episodeNumber.toString());

            const titleDisplay = episode.isHighlighted
                ? chalk.yellow.bold(episode.name)
                : chalk.white.bold(episode.name);

            table.push([
                episodeNumberDisplay,
                `${titleDisplay}\n${chalk.gray(episode.description)}`,
                episode.releaseDate,
                episode.duration
            ]);
        });

        console.log(table.toString());

        // Show highlighted episode info
        const highlightedEpisode = episodes.find(ep => ep.isHighlighted);
        if (highlightedEpisode) {
            console.log(chalk.yellow(`\n⭐ Found: Episode #${highlightedEpisode.episodeNumber}`));
        }

        // Show episode actions if episodes are available
        if (episodes.length > 0) {
            console.log(chalk.blue('\n🎧 Episode Actions:'));
            console.log(chalk.gray('Select an episode number to open in Spotify or copy its URL'));
        }
    }

    /**
     * Display show details in a formatted table
     * @private
     * @param {object} showData - Show details data
     */
    // Removed the displayShowDetails method

    /**
     * Display a welcome message
     * @returns {void}
     */
    showWelcome() {
        console.clear();
        console.log(chalk.green.bold('🎵 Welcome to Spotify Show Explorer! 🎵'));
        console.log(chalk.green('Interactive CLI built with SOLID principles\n'));
    }

    /**
     * Display a goodbye message
     * @returns {void}
     */
    showGoodbye() {
        console.log('\n' + chalk.green.bold('👋 Thank you for using Spotify Show Explorer!'));
        console.log(chalk.green('Built with ❤️  following SOLID principles\n'));
    }

    /**
     * Handle errors in a user-friendly way
     * @param {Error} error - The error to handle
     * @returns {void}
     */
    handleError(error) {
        this.logger.error(`CLI Error: ${error.message}`);
        console.log('\n' + chalk.red.bold('❌ An error occurred:'));
        console.log(chalk.red(error.message));
        console.log(chalk.gray('Please try again or contact support if the problem persists.\n'));
    }

    /**
     * Display loading indicator
     * @param {string} message - Loading message
     * @returns {object} Spinner object
     */
    showLoading(message) {
        return ora({
            text: message,
            color: 'cyan',
            spinner: 'dots'
        }).start();
    }

    /**
     * Stop loading indicator
     * @param {object} spinner - Spinner object
     * @param {string} message - Completion message
     * @returns {void}
     */
    stopLoading(spinner, message = null) {
        if (message) {
            spinner.succeed(message);
        } else {
            spinner.stop();
        }
    }

    /**
     * Handle view configuration request
     * @private
     * @returns {Promise<void>}
     */
    async handleViewConfig() {
        const spinner = this.showLoading('Loading configuration...');
        const result = await this.cliService.getConfigurationSummary();
        this.stopLoading(spinner);

        if (!result.success) {
            console.log(chalk.red(`❌ Error: ${result.error}`));
            return;
        }

        this.displayConfiguration(result.data);
    }

    /**
     * Handle health check request
     * @private
     * @returns {Promise<void>}
     */
    async handleHealthCheck() {
        const spinner = this.showLoading('Running health checks...');
        const result = await this.cliService.runHealthChecks();
        this.stopLoading(spinner);

        if (!result.success) {
            console.log(chalk.red(`❌ Error: ${result.error}`));
            return;
        }

        this.displayHealthCheck(result.data);
    }

    /**
     * Handle show access token request
     * @private
     * @returns {Promise<void>}
     */
    async handleShowAccessToken() {
        const spinner = this.showLoading('Fetching access token...');
        const result = await this.cliService.getAccessToken();
        this.stopLoading(spinner);

        if (result.success) {
            console.log(chalk.green('\n✅ Access token retrieved successfully'));
            this.showTokenManually(result.data.accessToken);
        } else {
            console.log(chalk.red(`\n❌ Error: ${result.error}`));
        }
    }

    /**
     * Handle removing a show from history
     * @private
     * @returns {Promise<void>}
     */
    async handleRemoveFromHistory() {
        // Get the history first
        const historyResult = await this.cliService.getShowHistory();

        if (!historyResult.success) {
            console.log(chalk.red(`❌ Error: ${historyResult.error}`));
            return;
        }

        if (historyResult.data.length === 0) {
            console.log(chalk.yellow('No show history found.'));
            return;
        }

        // Show list of shows to remove
        const { showToRemove } = await inquirer.prompt([
            {
                type: 'list',
                name: 'showToRemove',
                message: 'Select a show to remove from history:',
                choices: [
                    ...historyResult.data.map(show => ({
                        name: `${show.name} (${show.id})`,
                        value: show.id
                    })),
                    { name: '↩️ Cancel', value: 'cancel' }
                ],
                pageSize: 10
            }
        ]);

        if (showToRemove === 'cancel') {
            return;
        }

        // Confirm removal
        const { confirmRemove } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirmRemove',
                message: 'Are you sure you want to remove this show from history?',
                default: false
            }
        ]);

        if (confirmRemove) {
            const spinner = this.showLoading('Removing show from history...');
            const result = await this.cliService.removeShowFromHistory(showToRemove);
            this.stopLoading(spinner);

            if (result.success) {
                console.log(chalk.green(`✅ ${result.message}`));
            } else {
                console.log(chalk.red(`❌ Error: ${result.error}`));
            }
        }

        // Return to history management
        await this.handleShowDetails();
    }

    /**
     * Handle removing a specific show from history
     * @private
     * @returns {Promise<void>}
     */
    async handleRemoveFromHistory() {
        const spinner = this.showLoading('Retrieving show history...');
        const historyResult = await this.cliService.getShowHistory();
        this.stopLoading(spinner);

        if (!historyResult.success) {
            console.log(chalk.red(`❌ Error: ${historyResult.error}`));
            return;
        }

        if (historyResult.data.length === 0) {
            console.log(chalk.yellow('\nNo show history found. Nothing to remove.'));
            await this.promptContinue();
            return;
        }

        // Create choices from history items
        const choices = historyResult.data.map((item, index) => ({
            name: `${item.name} (${item.id})`,
            value: item.id
        }));

        // Add cancel option
        choices.push({ name: '↩️ Cancel', value: 'cancel' });

        const { showId } = await inquirer.prompt([
            {
                type: 'list',
                name: 'showId',
                message: 'Select a show to remove from history:',
                choices: choices,
                pageSize: 15
            }
        ]);

        if (showId === 'cancel') {
            return;
        }

        // Confirm removal
        const { confirmRemove } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirmRemove',
                message: 'Are you sure you want to remove this show from history?',
                default: false
            }
        ]);

        if (confirmRemove) {
            const removeSpinner = this.showLoading('Removing show from history...');
            const result = await this.cliService.removeFromHistory(showId);
            this.stopLoading(removeSpinner);

            if (result.success) {
                console.log(chalk.green(`✅ ${result.message}`));
            } else {
                console.log(chalk.red(`❌ Error: ${result.error}`));
            }
        }

        // Return to history view
        await this.handleViewHistory();
    }

    /**
     * Handle clearing all show history
     * @private
     * @returns {Promise<void>}
     */
    async handleClearHistory() {
        // Confirm clearing all history
        const { confirmClear } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirmClear',
                message: 'Are you sure you want to clear all show history? This cannot be undone.',
                default: false
            }
        ]);

        if (confirmClear) {
            const spinner = this.showLoading('Clearing show history...');
            const result = await this.cliService.clearShowHistory();
            this.stopLoading(spinner);

            if (result.success) {
                console.log(chalk.green(`✅ ${result.message}`));
            } else {
                console.log(chalk.red(`❌ Error: ${result.error}`));
            }
        }

        // Return to main menu
        return;
    }

    /**
     * Handle viewing complete show history with pagination
     * @private
     * @returns {Promise<void>}
     */
    async handleViewHistory() {
        const spinner = this.showLoading('Retrieving show history...');
        const historyResult = await this.cliService.getShowHistory();
        this.stopLoading(spinner);

        if (!historyResult.success) {
            console.log(chalk.red(`\u274c Error: ${historyResult.error}`));
            return;
        }

        if (historyResult.data.length === 0) {
            console.log(chalk.yellow('No show history found. Try browsing some shows first.'));
            return;
        }

        // Sort history by default (most recently accessed first)
        let sortedHistory = [...historyResult.data].sort((a, b) => b.lastAccessed - a.lastAccessed);
        let currentSortMethod = 'recent';
        let currentPage = 1;
        let pageSize = 10;

        await this.showPaginatedHistoryMenu(sortedHistory, currentPage, pageSize, currentSortMethod);
    }

    /**
     * Show paginated history menu with navigation controls
     * @private
     * @param {Array} history - Array of history items
     * @param {number} currentPage - Current page number
     * @param {number} pageSize - Items per page
     * @param {string} sortMethod - Current sort method
     * @returns {Promise<void>}
     */
    async showPaginatedHistoryMenu(history, currentPage, pageSize, sortMethod) {
        // Calculate pagination info
        const totalItems = history.length;
        const totalPages = Math.ceil(totalItems / pageSize);

        // Ensure current page is valid
        if (currentPage < 1) currentPage = 1;
        if (currentPage > totalPages) currentPage = totalPages;

        // Display the history with pagination
        this.displayShowHistory(history, currentPage, pageSize, totalPages, sortMethod);

        // Build menu choices based on pagination state
        const choices = [
            { name: '\ud83d\udccb Select a show from history', value: 'select' },
            { name: '\ud83d\udd0d Search history', value: 'search' }
        ];

        // Add pagination controls if needed
        if (totalPages > 1) {
            if (currentPage > 1) {
                choices.push({ name: '\u2b05\ufe0f Previous page', value: 'prev_page' });
            }
            if (currentPage < totalPages) {
                choices.push({ name: '\u27a1\ufe0f Next page', value: 'next_page' });
            }
            choices.push({ name: '\ud83d\udd22 Jump to page', value: 'jump_page' });
            choices.push({ name: '\ud83d\udcc4 Change page size', value: 'change_page_size' });
        }

        // Add remaining options
        choices.push(
            { name: '\ud83d\uddd1\ufe0f Remove a show from history', value: 'remove' },
            { name: '\ud83d\udd04 Change sort order', value: 'sort' },
            { name: '\ud83e\uddf9 Clear all history', value: 'clear' },
            { name: '\u21a9\ufe0f Back to main menu', value: 'back' }
        );

        // Show options for history management
        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'History management options:',
                choices: choices,
                pageSize: Math.min(15, choices.length)
            }
        ]);

        switch (action) {
            case 'select':
                await this.handleSelectFromHistory(history, currentPage, pageSize);
                break;
            case 'search':
                await this.handleSearchHistory(history);
                break;
            case 'prev_page':
                await this.showPaginatedHistoryMenu(history, currentPage - 1, pageSize, sortMethod);
                break;
            case 'next_page':
                await this.showPaginatedHistoryMenu(history, currentPage + 1, pageSize, sortMethod);
                break;
            case 'jump_page':
                await this.handleJumpToHistoryPage(history, totalPages, pageSize, sortMethod);
                break;
            case 'change_page_size':
                await this.handleChangeHistoryPageSize(history, currentPage, pageSize, sortMethod);
                break;
            case 'remove':
                await this.handleRemoveFromHistory();
                break;
            case 'sort':
                await this.handleSortHistory(history);
                break;
            case 'clear':
                await this.handleClearHistory();
                break;
            case 'back':
            default:
                return;
        }
    }

    /**
     * Handle searching through history
     * @private
     * @param {Array} history - Array of history items
     * @returns {Promise<void>}
     */
    async handleSearchHistory(history) {
        if (!history || history.length === 0) {
            console.log(chalk.yellow('No history to search.'));
            return;
        }

        const { searchTerm } = await inquirer.prompt([
            {
                type: 'input',
                name: 'searchTerm',
                message: 'Enter search term (show name or ID):',
                validate: (input) => {
                    if (!input.trim()) {
                        return 'Please enter a search term';
                    }
                    return true;
                }
            }
        ]);

        // Perform case-insensitive search on show names and IDs
        const searchResults = history.filter(item => {
            const term = searchTerm.toLowerCase().trim();
            const name = (item.name || '').toLowerCase();
            const id = item.id.toLowerCase();
            return name.includes(term) || id.includes(term);
        });

        if (searchResults.length === 0) {
            console.log(chalk.yellow(`\nNo matches found for "${searchTerm}".`));
            await this.promptContinue();
            await this.handleViewHistory();
            return;
        }

        console.log(chalk.green(`\n\u2705 Found ${searchResults.length} match${searchResults.length === 1 ? '' : 'es'} for "${searchTerm}":`));

        // Display search results
        this.displayShowHistory(searchResults, 1, searchResults.length, 1, 'search');

        // Allow user to select from search results
        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'What would you like to do with these results?',
                choices: [
                    { name: '\ud83d\udccb Select a show from results', value: 'select' },
                    { name: '\ud83d\udd0d New search', value: 'new_search' },
                    { name: '\u21a9\ufe0f Back to history view', value: 'back' }
                ]
            }
        ]);

        switch (action) {
            case 'select':
                await this.handleSelectFromSearchResults(searchResults);
                break;
            case 'new_search':
                await this.handleSearchHistory(history);
                break;
            case 'back':
            default:
                await this.handleViewHistory();
                break;
        }
    }

    /**
     * Handle selecting a show from search results
     * @private
     * @param {Array} searchResults - Array of search result items
     * @returns {Promise<void>}
     */
    async handleSelectFromSearchResults(searchResults) {
        if (!searchResults || searchResults.length === 0) {
            console.log(chalk.yellow('No search results to select from.'));
            return;
        }

        // Show list of shows to select from search results
        const { selectedShow } = await inquirer.prompt([
            {
                type: 'list',
                name: 'selectedShow',
                message: 'Select a show:',
                choices: [
                    ...searchResults.map(show => ({
                        name: `${show.name || 'Unknown Show'} (${show.id})`,
                        value: show.id
                    })),
                    { name: '↩️ Cancel', value: 'cancel' }
                ],
                pageSize: 10
            }
        ]);

        if (selectedShow === 'cancel') {
            await this.handleViewHistory();
            return;
        }

        // Show actions for the selected show
        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'What would you like to do with this show?',
                choices: [
                    { name: '\ud83d\udcfa Browse episodes', value: 'episodes' },
                    { name: '\u21a9\ufe0f Back', value: 'back' }
                ]
            }
        ]);

        switch (action) {
            case 'episodes':
                await this.browseAllEpisodes(selectedShow);
                break;
            case 'back':
            default:
                await this.handleViewHistory();
                return;
        }
    }

    /**
     * Handle sorting history by different criteria
     * @private
     * @param {Array} history - Array of history items
     * @returns {Promise<void>}
     */
    async handleSortHistory(history) {
        if (!history || history.length === 0) {
            console.log(chalk.yellow('No history to sort.'));
            return;
        }

        const { sortBy } = await inquirer.prompt([
            {
                type: 'list',
                name: 'sortBy',
                message: 'Sort history by:',
                choices: [
                    { name: '📅 Most recently accessed (newest first)', value: 'recent' },
                    { name: '📅 First accessed (oldest first)', value: 'oldest' },
                    { name: '🔤 Show name (A-Z)', value: 'name_asc' },
                    { name: '🔤 Show name (Z-A)', value: 'name_desc' },
                    { name: '🔢 Show ID', value: 'id' }
                ]
            }
        ]);

        let sortedHistory;

        switch (sortBy) {
            case 'recent':
                sortedHistory = [...history].sort((a, b) => b.lastAccessed - a.lastAccessed);
                break;
            case 'oldest':
                sortedHistory = [...history].sort((a, b) => a.firstAccessed - b.firstAccessed);
                break;
            case 'name_asc':
                sortedHistory = [...history].sort((a, b) => {
                    const nameA = (a.name || 'Unknown').toLowerCase();
                    const nameB = (b.name || 'Unknown').toLowerCase();
                    return nameA.localeCompare(nameB);
                });
                break;
            case 'name_desc':
                sortedHistory = [...history].sort((a, b) => {
                    const nameA = (a.name || 'Unknown').toLowerCase();
                    const nameB = (b.name || 'Unknown').toLowerCase();
                    return nameB.localeCompare(nameA);
                });
                break;
            case 'id':
                sortedHistory = [...history].sort((a, b) => a.id.localeCompare(b.id));
                break;
            default:
                sortedHistory = [...history];
        }

        // Return to paginated history menu with the sorted history
        await this.showPaginatedHistoryMenu(sortedHistory, 1, 10, sortBy);
    }

    /**
     * Handle jumping to a specific page in history
     * @private
     * @param {Array} history - Array of history items
     * @param {number} totalPages - Total number of pages
     * @param {number} pageSize - Items per page
     * @param {string} sortMethod - Current sort method
     * @returns {Promise<void>}
     */
    async handleJumpToHistoryPage(history, totalPages, pageSize, sortMethod) {
        const { pageNumber } = await inquirer.prompt([
            {
                type: 'input',
                name: 'pageNumber',
                message: `Enter page number (1-${totalPages}):`,
                validate: (input) => {
                    const page = parseInt(input);
                    if (isNaN(page) || page < 1 || page > totalPages) {
                        return `Please enter a valid page number between 1 and ${totalPages}`;
                    }
                    return true;
                }
            }
        ]);

        await this.showPaginatedHistoryMenu(history, parseInt(pageNumber), pageSize, sortMethod);
    }

    /**
     * Handle changing the page size for history pagination
     * @private
     * @param {Array} history - Array of history items
     * @param {number} currentPage - Current page number
     * @param {number} currentPageSize - Current items per page
     * @param {string} sortMethod - Current sort method
     * @returns {Promise<void>}
     */
    async handleChangeHistoryPageSize(history, currentPage, currentPageSize, sortMethod) {
        const { newPageSize } = await inquirer.prompt([
            {
                type: 'list',
                name: 'newPageSize',
                message: 'Select number of shows per page:',
                choices: [
                    { name: '5 shows per page', value: 5 },
                    { name: '10 shows per page', value: 10 },
                    { name: '15 shows per page', value: 15 },
                    { name: '20 shows per page', value: 20 },
                    { name: '25 shows per page', value: 25 }
                ],
                default: currentPageSize
            }
        ]);

        // Calculate new page number to maintain position
        const firstItemIndex = (currentPage - 1) * currentPageSize;
        const newPage = Math.floor(firstItemIndex / newPageSize) + 1;

        await this.showPaginatedHistoryMenu(history, newPage, newPageSize, sortMethod);
    }

    /**
     * Display show history with pagination information
     * @private
     * @param {Array} history - Array of history items
     * @param {number} currentPage - Current page number
     * @param {number} pageSize - Items per page
     * @param {number} totalPages - Total number of pages
     * @param {string} sortMethod - Current sort method
     */
    displayShowHistory(history, currentPage = 1, pageSize = history.length, totalPages = 1, sortMethod = 'recent') {
        if (!history || history.length === 0) {
            console.log(chalk.yellow('\nNo show history to display.'));
            return;
        }

        // Calculate pagination
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, history.length);
        const currentItems = history.slice(startIndex, endIndex);

        // Create table header based on sort method
        let sortIndicator = '';
        switch (sortMethod) {
            case 'recent':
                sortIndicator = ' (↓ newest first)';
                break;
            case 'oldest':
                sortIndicator = ' (↑ oldest first)';
                break;
            case 'name_asc':
                sortIndicator = ' (↑ A-Z)';
                break;
            case 'name_desc':
                sortIndicator = ' (↓ Z-A)';
                break;
            case 'id':
                sortIndicator = ' (↑ by ID)';
                break;
        }

        // Create table for history display
        const Table = require('cli-table3');
        const table = new Table({
            head: [
                chalk.cyan('#'),
                chalk.cyan('Show Name'),
                chalk.cyan('Show ID'),
                chalk.cyan(`First Accessed${sortMethod === 'oldest' ? sortIndicator : ''}`),
                chalk.cyan(`Last Accessed${sortMethod === 'recent' ? sortIndicator : ''}`)
            ],
            colWidths: [5, 30, 25, 20, 20],
            style: { head: [], border: [] }
        });

        // Format dates for display
        const formatDate = (dateString) => {
            const date = new Date(dateString);
            return date.toLocaleString();
        };

        // Add rows to table
        currentItems.forEach((item, index) => {
            const itemNumber = startIndex + index + 1;
            table.push([
                itemNumber.toString(),
                item.name || 'Unknown',
                item.id,
                formatDate(item.firstAccessed),
                formatDate(item.lastAccessed)
            ]);
        });

        // Display table with pagination info
        console.log('\n' + table.toString());
        console.log(chalk.blue(`\nPage ${currentPage} of ${totalPages} (${history.length} total shows, showing ${startIndex + 1}-${endIndex})`));
    }

    /**
     * Handle selecting a show from history
     * @private
     * @param {Array} history - Array of history items
     * @param {number} currentPage - Current page number
     * @param {number} pageSize - Items per page
     * @returns {Promise<void>}
     */
    async handleSelectFromHistory(history, currentPage, pageSize) {
        if (!history || history.length === 0) {
            console.log(chalk.yellow('No show history found.'));
            return;
        }

        // Calculate pagination for current view
        const totalItems = history.length;
        const totalPages = Math.ceil(totalItems / pageSize);
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, totalItems);
        const currentPageItems = history.slice(startIndex, endIndex);

        // Show list of shows to select from current page
        const { selectedShow } = await inquirer.prompt([
            {
                type: 'list',
                name: 'selectedShow',
                message: `Select a show (page ${currentPage}/${totalPages}):`,
                choices: [
                    ...currentPageItems.map(show => ({
                        name: `${show.name || 'Unknown Show'} (${show.id})`,
                        value: show.id
                    })),
                    { name: '↩️ Back to history view', value: 'cancel' }
                ],
                pageSize: Math.min(15, currentPageItems.length + 1)
            }
        ]);

        if (selectedShow === 'cancel') {
            await this.showPaginatedHistoryMenu(history, currentPage, pageSize, 'recent');
            return;
        }

        // Show actions for the selected show
        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'What would you like to do with this show?',
                choices: [
                    { name: '\ud83d\udcfa Browse episodes', value: 'episodes' },
                    { name: '\u21a9\ufe0f Back', value: 'back' }
                ]
            }
        ]);

        switch (action) {
            case 'episodes':
                await this.browseAllEpisodes(selectedShow);
                break;
            case 'back':
            default:
                return;
        }
    }

    /**
     * Display show history in a formatted table with pagination
     * @private
     * @param {Array} history - Array of history items
     * @param {number} page - Current page (default: 1)
     * @param {number} pageSize - Items per page (default: 10)
     */
    displayShowHistory(history, page = 1, pageSize = 10) {
        const Table = require('cli-table3');

        // Calculate pagination
        const totalItems = history.length;
        const totalPages = Math.ceil(totalItems / pageSize);
        const startIndex = (page - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, totalItems);
        const itemsForPage = history.slice(startIndex, endIndex);

        // Create a new table with appropriate styling
        const table = new Table({
            head: [
                chalk.cyan('Show Name'),
                chalk.cyan('Show ID'),
                chalk.cyan('First Accessed'),
                chalk.cyan('Last Accessed')
            ],
            colWidths: [40, 25, 20, 20],
            wordWrap: true,
            wrapOnWordBoundary: true
        });

        // Format dates for display
        const formatDate = (timestamp) => {
            const date = new Date(timestamp);
            return date.toLocaleString();
        };

        // Add history items to table
        itemsForPage.forEach(item => {
            table.push([
                chalk.white(item.name || 'Unknown Show'),
                chalk.yellow(item.id),
                chalk.gray(formatDate(item.firstAccessed)),
                chalk.gray(formatDate(item.lastAccessed))
            ]);
        });

        console.log(chalk.bold('\n📜 Show History:'));

        // Show pagination info if multiple pages
        if (totalPages > 1) {
            console.log(chalk.blue(`Page ${page}/${totalPages} | Shows ${startIndex + 1}-${endIndex} of ${totalItems} total`));
        }

        console.log(table.toString());
        console.log(`Total: ${chalk.yellow(totalItems)} shows in history\n`);

        // Show navigation hints if applicable
        if (totalPages > 1) {
            let navHints = [];
            if (page > 1) navHints.push(chalk.gray('⬅️ Previous page available'));
            if (page < totalPages) navHints.push(chalk.gray('➡️ Next page available'));
            console.log(navHints.join(' | ') + '\n');
        }
    }

    /**
     * Display configuration in a formatted table
     * @private
     * @param {object} configData - Configuration data
     */
    displayConfiguration(configData) {
        console.log('\n' + chalk.blue.bold('⚙️  APPLICATION CONFIGURATION'));
        console.log(chalk.blue('═'.repeat(50)));

        const table = new Table({
            chars: {
                'top': '═', 'top-mid': '╤', 'top-left': '╔', 'top-right': '╗',
                'bottom': '═', 'bottom-mid': '╧', 'bottom-left': '╚', 'bottom-right': '╝',
                'left': '║', 'left-mid': '╟', 'mid': '─', 'mid-mid': '┼',
                'right': '║', 'right-mid': '╢', 'middle': '│'
            },
            colWidths: [25, 35],
            wordWrap: true
        });

        table.push(
            [chalk.cyan('Client ID Configured'), configData.clientIdConfigured ? chalk.green('✓ Yes') : chalk.red('✗ No')],
            [chalk.cyan('Client Secret Configured'), configData.clientSecretConfigured ? chalk.green('✓ Yes') : chalk.red('✗ No')],
            [chalk.cyan('Default Show ID'), configData.defaultShowId],
            [chalk.cyan('Log Level'), configData.logLevel],
            [chalk.cyan('Token URL'), configData.tokenUrl],
            [chalk.cyan('API Base URL'), configData.apiBaseUrl],
            [chalk.cyan('Configuration Valid'), configData.configurationValid ? chalk.green('✓ Valid') : chalk.red('✗ Invalid')]
        );

        console.log(table.toString());
    }

    /**
     * Display access token information
     * @private
     * @param {object} tokenData - Access token data
     */
    async displayAccessToken(tokenData) {
        console.log('\n' + chalk.green.bold('🔑 ACCESS TOKEN INFORMATION'));
        console.log(chalk.green('═'.repeat(60)));

        const table = new Table({
            chars: {
                'top': '═', 'top-mid': '╤', 'top-left': '╔', 'top-right': '╗',
                'bottom': '═', 'bottom-mid': '╧', 'bottom-left': '╚', 'bottom-right': '╝',
                'left': '║', 'left-mid': '╟', 'mid': '─', 'mid-mid': '┼',
                'right': '║', 'right-mid': '╢', 'middle': '│'
            },
            colWidths: [25, 45],
            wordWrap: true
        });

        // Mask the token for security (show first 10 and last 4 characters)
        const maskedToken = tokenData.token
            ? `${tokenData.token.substring(0, 10)}...${tokenData.token.substring(tokenData.token.length - 4)}`
            : 'Not available';

        table.push(
            [chalk.cyan('Token (Masked)'), maskedToken],
            [chalk.cyan('Token Type'), tokenData.tokenType || 'Bearer'],
            [chalk.cyan('Expires At'), tokenData.expiresAt || 'Unknown'],
            [chalk.cyan('Time Until Expiry'), tokenData.timeUntilExpiry || 'Unknown'],
            [chalk.cyan('Is Valid'), tokenData.isValid ? chalk.green('✓ Yes') : chalk.red('✗ No')]
        );

        console.log(table.toString());

        if (tokenData.isValid) {
            console.log(chalk.green('\n✅ Token is valid and ready for API calls'));
        } else {
            console.log(chalk.yellow('\n⚠️  Token may be expired or invalid'));
        }

        // Add copy token option
        console.log(chalk.blue('\n📋 Copy Options:'));
        const copyChoice = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'What would you like to do?',
                choices: [
                    { name: '📋 Copy full access token to clipboard', value: 'copy_token' },
                    { name: '↩️  Return to main menu', value: 'return' }
                ]
            }
        ]);

        if (copyChoice.action === 'copy_token') {
            await this.copyTokenToClipboard(tokenData.token);
        }
    }

    /**
     * Copy access token to clipboard
     * @private
     * @param {string} token - The access token to copy
     */
    async copyTokenToClipboard(token) {
        try {
            // Try to use the built-in clipboard functionality
            const { spawn } = require('child_process');
            const os = require('os');

            let clipboardCommand;
            let clipboardArgs;

            // Determine the appropriate clipboard command based on OS
            if (os.platform() === 'win32') {
                // Windows - use clip command
                clipboardCommand = 'clip';
                clipboardArgs = [];
            } else if (os.platform() === 'darwin') {
                // macOS - use pbcopy
                clipboardCommand = 'pbcopy';
                clipboardArgs = [];
            } else {
                // Linux - try xclip first, then xsel
                clipboardCommand = 'xclip';
                clipboardArgs = ['-selection', 'clipboard'];
            }

            const clipProcess = spawn(clipboardCommand, clipboardArgs, { stdio: 'pipe' });

            clipProcess.stdin.write(token);
            clipProcess.stdin.end();

            clipProcess.on('close', (code) => {
                if (code === 0) {
                    console.log(chalk.green('\n✅ Access token copied to clipboard successfully!'));
                    console.log(chalk.yellow('⚠️  Keep your token secure and don\'t share it publicly.'));
                } else {
                    console.log(chalk.red('\n❌ Failed to copy token to clipboard.'));
                    this.showTokenManually(token);
                }
            });

            clipProcess.on('error', (error) => {
                console.log(chalk.yellow('\n⚠️  Clipboard not available. Showing token for manual copy:'));
                this.showTokenManually(token);
            });

        } catch (error) {
            console.log(chalk.yellow('\n⚠️  Clipboard not available. Showing token for manual copy:'));
            this.showTokenManually(token);
        }
    }

    /**
     * Show token for manual copying when clipboard is not available
     * @private
     * @param {string} token - The access token to display
     */
    showTokenManually(token) {
        console.log(chalk.blue('\n📋 Full Access Token (select and copy):'));
        console.log(chalk.white('─'.repeat(80)));
        console.log(chalk.cyan(token));
        console.log(chalk.white('─'.repeat(80)));
        console.log(chalk.yellow('⚠️  Keep your token secure and don\'t share it publicly.'));
    }

    /**
     * Open Spotify URL in default browser
     * @private
     * @param {string} spotifyUrl - The Spotify URL to open
     * @returns {Promise<boolean>} Success status
     */
    async openSpotifyUrl(spotifyUrl) {
        try {
            const { spawn } = require('child_process');
            const os = require('os');

            let command;
            let args;

            // Determine the appropriate command based on OS
            if (os.platform() === 'win32') {
                // Windows - use start command
                command = 'cmd';
                args = ['/c', 'start', spotifyUrl];
            } else if (os.platform() === 'darwin') {
                // macOS - use open command
                command = 'open';
                args = [spotifyUrl];
            } else {
                // Linux - try xdg-open
                command = 'xdg-open';
                args = [spotifyUrl];
            }

            const process = spawn(command, args, {
                stdio: 'ignore',
                detached: true
            });

            process.unref(); // Allow the parent process to exit independently

            return new Promise((resolve) => {
                process.on('close', (code) => {
                    resolve(code === 0);
                });

                process.on('error', () => {
                    resolve(false);
                });

                // Resolve after a short timeout to avoid hanging
                setTimeout(() => resolve(true), 1000);
            });

        } catch (error) {
            this.logger?.error(`Failed to open Spotify URL: ${error.message}`);
            return false;
        }
    }

    /**
     * Copy Spotify URL to clipboard
     * @private
     * @param {string} spotifyUrl - The Spotify URL to copy
     * @returns {Promise<boolean>} Success status
     */
    async copySpotifyUrl(spotifyUrl) {
        try {
            const { spawn } = require('child_process');
            const os = require('os');

            let clipboardCommand;
            let clipboardArgs;

            // Determine the appropriate clipboard command based on OS
            if (os.platform() === 'win32') {
                clipboardCommand = 'clip';
                clipboardArgs = [];
            } else if (os.platform() === 'darwin') {
                clipboardCommand = 'pbcopy';
                clipboardArgs = [];
            } else {
                clipboardCommand = 'xclip';
                clipboardArgs = ['-selection', 'clipboard'];
            }

            const clipProcess = spawn(clipboardCommand, clipboardArgs, { stdio: 'pipe' });

            clipProcess.stdin.write(spotifyUrl);
            clipProcess.stdin.end();

            return new Promise((resolve) => {
                clipProcess.on('close', (code) => {
                    resolve(code === 0);
                });

                clipProcess.on('error', () => {
                    resolve(false);
                });
            });

        } catch (error) {
            return false;
        }
    }

    /**
     * Display health check results
     * @private
     * @param {object} healthData - Health check data
     */
    displayHealthCheck(healthData) {
        console.log('\n' + chalk.blue.bold('🏥 HEALTH CHECK RESULTS'));
        console.log(chalk.blue('═'.repeat(50)));

        const table = new Table({
            chars: {
                'top': '═', 'top-mid': '╤', 'top-left': '╔', 'top-right': '╗',
                'bottom': '═', 'bottom-mid': '╧', 'bottom-left': '╚', 'bottom-right': '╝',
                'left': '║', 'left-mid': '╟', 'mid': '─', 'mid-mid': '┼',
                'right': '║', 'right-mid': '╢', 'middle': '│'
            },
            colWidths: [25, 35],
            wordWrap: true
        });

        table.push(
            [chalk.cyan('Configuration'), healthData.configuration ? chalk.green('✓ OK') : chalk.red('✗ Failed')],
            [chalk.cyan('Connectivity'), healthData.connectivity ? chalk.green('✓ OK') : chalk.red('✗ Failed')],
            [chalk.cyan('Node.js Version'), healthData.environment.nodeVersion],
            [chalk.cyan('Platform'), healthData.environment.platform],
            [chalk.cyan('Memory Usage'), healthData.environment.memory]
        );

        if (healthData.connectivityError) {
            table.push([chalk.cyan('Connectivity Error'), chalk.red(healthData.connectivityError)]);
        }

        console.log(table.toString());

        // Overall status
        const allHealthy = healthData.configuration && healthData.connectivity;
        console.log('\n' + chalk.bold('Overall Status: ') +
            (allHealthy ? chalk.green('✓ Healthy') : chalk.red('✗ Issues Detected')));
    }

    /**
     * Prompt user to continue
     * @private
     * @returns {Promise<void>}
     */
    async promptContinue() {
        await inquirer.prompt([
            {
                type: 'input',
                name: 'continue',
                message: chalk.gray('Press Enter to continue...'),
            }
        ]);
    }

    /**
     * Show token for manual copying when clipboard is not available
     * @private
     * @param {string} token - The access token to display
     */
    showTokenManually(token) {
        console.log(chalk.blue('\n📋 Full Access Token (select and copy):'));
        console.log(chalk.white('─'.repeat(80)));
        console.log(chalk.cyan(token));
        console.log(chalk.white('─'.repeat(80)));
        console.log(chalk.yellow('⚠️  Keep your token secure and don\'t share it publicly.'));
    }

    /**
     * Show paginated episodes navigation menu
     * @private
     * @param {string} showId - Show ID
     * @param {Array} allEpisodes - All episodes (for context)
     * @param {number} currentPage - Current page number
     * @param {number} pageSize - Episodes per page
     * @returns {Promise<void>}
     */
    async showPaginatedEpisodesMenu(showId, allEpisodes, currentPage, pageSize) {
        const totalPages = Math.ceil(allEpisodes.length / pageSize);
        const choices = [];

        // Pagination controls
        if (currentPage > 1) {
            choices.push({ name: '⬅️ Previous Page', value: 'prev' });
        }
        if (currentPage < totalPages) {
            choices.push({ name: '➡️ Next Page', value: 'next' });
        }

        // Page jumping
        if (totalPages > 1) {
            choices.push({ name: '📄 Jump to Page', value: 'jump_page' });
        }

        // Episode actions
        choices.push({ name: '🔢 Search by episode number', value: 'search_episode' });
        choices.push({ name: '🎧 Episode actions (Open/Copy URL)', value: 'episode_actions' });

        // Navigation
        choices.push({ name: '🏠 Back to Main Menu', value: 'back' });

        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: `What would you like to do? (Page ${currentPage}/${totalPages})`,
                choices: choices,
                pageSize: 12
            }
        ]);

        switch (action) {
            case 'prev':
                await this.browseAllEpisodes(showId, currentPage - 1, pageSize);
                break;
            case 'next':
                await this.browseAllEpisodes(showId, currentPage + 1, pageSize);
                break;
            case 'jump_page':
                await this.handleJumpToPage(showId, totalPages, pageSize);
                break;
            case 'search_episode':
                await this.handleSearchEpisodeNumber(showId, pageSize);
                break;
            case 'episode_actions':
                // Get current page episodes for actions
                const startIndex = (currentPage - 1) * pageSize;
                const endIndex = Math.min(startIndex + pageSize, allEpisodes.length);
                const currentPageEpisodes = allEpisodes.slice(startIndex, endIndex);
                await this.handleEpisodeActions(showId, currentPageEpisodes, currentPage, pageSize, {});
                break;

            case 'back':
                break;
        }
    }

    /**
     * Handle jump to specific page
     * @private
     * @param {string} showId - Show ID
     * @param {number} totalPages - Total number of pages
     * @param {number} pageSize - Current page size
     * @returns {Promise<void>}
     */
    async handleJumpToPage(showId, totalPages, pageSize) {
        const { pageNumber } = await inquirer.prompt([
            {
                type: 'input',
                name: 'pageNumber',
                message: `Enter page number (1-${totalPages}):`,
                validate: (input) => {
                    const num = parseInt(input);
                    if (isNaN(num) || num < 1 || num > totalPages) {
                        return `Please enter a valid page number between 1 and ${totalPages}`;
                    }
                    return true;
                }
            }
        ]);

        await this.browseAllEpisodes(showId, parseInt(pageNumber), pageSize);
    }

    /**
     * Handle changing page size
     * @private
     * @param {string} showId - Show ID
     * @param {number} currentPage - Current page
     * @returns {Promise<void>}
     */
    async handleChangePageSize(showId, currentPage) {
        const { newPageSize } = await inquirer.prompt([
            {
                type: 'list',
                name: 'newPageSize',
                message: 'Select episodes per page:',
                choices: [
                    { name: '10 episodes per page', value: 10 },
                    { name: '15 episodes per page (default)', value: 15 },
                    { name: '20 episodes per page', value: 20 },
                    { name: '25 episodes per page', value: 25 },
                    { name: '50 episodes per page', value: 50 }
                ]
            }
        ]);

        // Calculate which page the user should be on with the new page size
        // to maintain context of where they were
        const currentFirstEpisode = (currentPage - 1) * 15; // Assuming default was 15
        const newPage = Math.floor(currentFirstEpisode / newPageSize) + 1;

        await this.browseAllEpisodes(showId, newPage, newPageSize);
    }
}

module.exports = CLIInterface;
