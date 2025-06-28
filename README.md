# 🎵 Spotify Show Explorer

A powerful command-line application for exploring Spotify podcasts and shows. Browse episodes, search shows, and manage your podcast discovery experience with an intuitive interactive interface.

## ✨ What This App Does

- **🔍 Explore Spotify Shows**: Get detailed information about any podcast or show
- **📺 Browse Episodes**: View complete episode catalogs with smart pagination
- **⭐ Popular Shows**: Quick access to curated popular podcasts
- **🎯 Interactive CLI**: Beautiful, user-friendly command-line interface
- **🚀 Fast Performance**: Optimized with caching and bulk operations
- **🔗 Direct Integration**: Open episodes directly in Spotify

## 🎬 Demo

![Spotify Show Explorer Demo](screenshot/demo.gif)

*Interactive CLI interface showing show browsing and episode exploration*

## 🚀 Quick Start

### Prerequisites

- **Node.js 14.0.0 or higher** ([Download here](https://nodejs.org/))
- **Spotify Developer Account** (free - [Sign up here](https://developer.spotify.com/))

### Installation

1. **Clone and install**:
   ```bash
   git clone <repository-url>
   cd spotify-episode-viewer-cli
   npm install
   ```

2. **Get Spotify API credentials**:
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/applications)
   - Create a new app or use existing one
   - Copy your **Client ID** and **Client Secret**

3. **Configure the app**:
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env and add your credentials:
   # CLIENT_ID=your_spotify_client_id_here
   # CLIENT_SECRET=your_spotify_client_secret_here
   ```

4. **Start the app**:
   ```bash
   npm start
   ```

That's it! The interactive CLI will launch automatically.

## 🎯 Features

### 🖥️ Interactive CLI Mode
Launch the beautiful interactive interface:
```bash
npm start
```

**Main Menu Options:**
- **🎵 Show Details** - Get comprehensive show information
- **📺 Browse Episodes** - View all episodes with pagination
- **⭐ Popular Shows** - Explore curated popular podcasts
- **🔍 Search Shows** - Find shows by name or keyword
- **⚙️ Configuration** - View current settings
- **🏥 Health Check** - Diagnose connection issues

### 🎨 Beautiful Interface
- **Colorful output** with syntax highlighting
- **Smart tables** for organized data display
- **Loading spinners** during API calls
- **Input validation** with helpful error messages
- **Cross-platform** support (Windows, macOS, Linux)

### ⚡ Performance Features
- **Smart caching** for faster episode lookups
- **Bulk operations** for improved speed
- **Concurrent processing** with rate limiting
- **Offline capabilities** with cached data

## 📖 Usage Examples

### Interactive Mode (Recommended)
```bash
# Launch the interactive CLI
npm start

# Follow the menu prompts to:
# 1. Browse popular shows
# 2. Search for specific shows
# 3. View episode details
# 4. Open episodes in Spotify
```

### Command Line Mode
```bash
# Show help
node src/app.js help

# Get details for a specific show
node src/app.js details 11ktWYpzznMCpvGtXsiYxE

# Browse episodes
node src/app.js episodes 11ktWYpzznMCpvGtXsiYxE

# Show summary
node src/app.js summary 11ktWYpzznMCpvGtXsiYxE
```

### Example Show IDs to Try
- `11ktWYpzznMCpvGtXsiYxE` - Conan O'Brien Needs a Friend
- `4rOoJ6Egrf8K2IrywzwOMk` - The Joe Rogan Experience  
- `2MAi0BvDc6GTFvKFPXnkCL` - This American Life
- `2hmkzUtix0qTqvtpPcMzEL` - Radiolab

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `CLIENT_ID` | Your Spotify Client ID | ✅ Yes | - |
| `CLIENT_SECRET` | Your Spotify Client Secret | ✅ Yes | - |
| `DEFAULT_SHOW_ID` | Default show to display | No | `11ktWYpzznMCpvGtXsiYxE` |
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | No | `info` |

### Getting Spotify Credentials

1. Visit [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/applications)
2. Click "Create an App"
3. Fill in app name and description
4. Copy the **Client ID** and **Client Secret**
5. Add them to your `.env` file

## 🔧 Troubleshooting

### Common Issues

**❌ "Missing required configuration"**
- Make sure you've created a `.env` file with your Spotify credentials
- Check that `CLIENT_ID` and `CLIENT_SECRET` are set correctly

**❌ "Unable to connect to Spotify API"**
- Check your internet connection
- Verify your Spotify credentials are correct
- Try running the health check: select "🏥 Run Diagnostics" from the main menu

**❌ "Invalid Show ID format"**
- Show IDs should be exactly 22 alphanumeric characters
- Copy IDs from Spotify URLs: `https://open.spotify.com/show/[SHOW_ID]`
- Use the Popular Shows menu to find valid IDs

**❌ "Rate limit exceeded"**
- Wait a few seconds and try again
- The app automatically handles rate limiting

### Getting Help

1. **Run diagnostics**: Use the "🏥 Run Diagnostics" option in the main menu
2. **Check configuration**: Use the "⚙️ View Configuration" option
3. **View logs**: Set `LOG_LEVEL=debug` in your `.env` file for detailed logging

## 🧪 Development

### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Available Scripts
```bash
npm start              # Launch interactive CLI
npm run cli            # Explicit CLI mode
npm test               # Run test suite
npm run quality        # Code quality checks
npm run migrate:favorites  # Migrate favorites to SQLite
```

### Project Structure
```
src/
├── cli/              # Interactive CLI interface
├── services/         # Business logic services
├── clients/          # Spotify API client
├── config/           # Configuration management
├── errors/           # Error handling
└── interfaces/       # TypeScript-style interfaces
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes following the existing code style
4. Add tests for new functionality
5. Run tests: `npm test`
6. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🎯 Key Benefits

- **🚀 Fast Setup**: Get running in under 5 minutes
- **🎨 Beautiful Interface**: Professional CLI with colors and formatting
- **⚡ High Performance**: Optimized for speed with smart caching
- **🔒 Reliable**: Comprehensive error handling and recovery
- **🔧 Extensible**: Clean architecture following SOLID principles
- **📱 Cross-Platform**: Works on Windows, macOS, and Linux
- **🧪 Well-Tested**: 129+ tests ensuring reliability

---

**Ready to explore Spotify shows?** Run `npm start` and dive in! 🎧
