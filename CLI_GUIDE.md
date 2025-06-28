# 🖥️ Interactive CLI Guide

## Overview

The Spotify Show Application features a beautiful, interactive command-line interface built following SOLID principles. The CLI provides an intuitive way to explore Spotify shows, browse episodes, and manage the application.

## 🚀 Quick Start

### Launch Interactive Mode

```bash
# Default behavior - launches interactive CLI
npm start

# Explicit CLI mode
npm run cli
node app.js cli

# Alternative
npm run interactive
```

### First Time Setup

1. **Install dependencies**: `npm install`
2. **Configure environment**: Copy `.env.example` to `.env` and add your Spotify credentials
3. **Launch CLI**: `npm start`

## 🎯 Main Menu Options

### 🎵 Show Details for a Specific Show
- **Purpose**: Get comprehensive information about any Spotify show
- **Input**: Spotify Show ID (22 alphanumeric characters)
- **Validation**: Real-time ID format validation
- **Output**: Formatted table with show metadata

**Example Show IDs to try:**
- `11ktWYpzznMCpvGtXsiYxE` - Conan O'Brien Needs a Friend
- `4rOoJ6Egrf8K2IrywzwOMk` - The Joe Rogan Experience
- `2MAi0BvDc6GTFvKFPXnkCL` - This American Life

### 📺 Browse All Show Episodes
- **Purpose**: View all episodes of a show with basic info
- **Input**: Spotify Show ID
- **Output**: Paginated list of episodes with date and duration
- **Features**: 
  - Pagination (10 episodes per page)
  - Episode selection
  - Jump to specific pages
  - Direct Spotify URL access

### 📋 Display Episodes with Combined Format
- **Purpose**: View episodes with combined title and description format
- **Input**: Spotify Show ID
- **Output**: Paginated list of episodes with enhanced display format
- **Features**: 
  - Reverse chronological ordering (newest episode is #1)
  - Title truncated to 40 characters
  - Combined title+description truncated to 100 characters
  - Release date in YYYY-MM-DD format
  - Formatted duration
  - Pagination with 10 episodes per page

### ⚙️ View Application Configuration
- **Purpose**: Check current application settings
- **Information Displayed**:
  - Spotify credentials status
  - Default show ID
  - Log level
  - API endpoints
  - Configuration validity

### 🏥 Run Diagnostics/Health Checks
- **Purpose**: Diagnose connectivity and configuration issues
- **Checks Performed**:
  - Configuration validation
  - Spotify API connectivity
  - System information (Node.js version, platform, memory)
  - Overall health status

- **🎯 Navigation Options**:
  - ⬅️ Previous Page / ➡️ Next Page (when applicable)
  - 🏠 Back to Main Menu

- **💡 Smart Features**:
  - **Input Validation**: Real-time validation for user inputs
  - **Error Handling**: User-friendly messages with recovery options

## 🎨 User Interface Features

### Visual Design
- **Colors**: Cyan headers, green success messages, red errors, yellow warnings
- **Tables**: Beautiful ASCII tables with proper borders and alignment
- **Spinners**: Elegant loading indicators during API calls
- **Icons**: Emojis for visual categorization and appeal

### Navigation
- **Arrow Keys**: Navigate through menu options
- **Enter**: Select an option
- **Type**: Search and input fields
- **Escape**: Some prompts support cancellation

### Error Handling
- **User-Friendly Messages**: Clear, actionable error descriptions
- **Suggestions**: Helpful tips for resolving issues
- **Graceful Recovery**: Errors don't crash the application
- **Context-Aware**: Different messages for different error types

## 🔧 Input Validation

### Show ID Validation
- **Format**: 22 alphanumeric characters
- **Real-time**: Validation occurs as you type
- **Examples**: 
  - ✅ Valid: `11ktWYpzznMCpvGtXsiYxE`
  - ❌ Invalid: `short`, `11ktWYpzznMCpvGtXsiY!`, `too-long-id-123456789`

### Search Input
- **Required**: Non-empty search terms
- **Flexible**: Matches partial words and phrases
- **Case-insensitive**: "joe rogan" matches "The Joe Rogan Experience"

## 🚨 Error Scenarios & Solutions

### Missing Credentials
**Error**: "Missing required configuration: spotify.clientId"
**Solution**: 
1. Copy `.env.example` to `.env`
2. Add your Spotify CLIENT_ID and CLIENT_SECRET
3. Restart the application

### Network Issues
**Error**: "Unable to connect to Spotify API"
**Solutions**:
1. Check your internet connection
2. Verify Spotify API is accessible
3. Run health checks from the main menu

### Invalid Show ID
**Error**: "Invalid Show ID format"
**Solution**: 
1. Use the popular shows menu to find valid IDs
2. Copy Show IDs from Spotify URLs
3. Ensure ID is exactly 22 alphanumeric characters

### Rate Limiting
**Error**: "Rate limit exceeded"
**Solution**: Wait a few seconds and try again

## 🎯 Tips & Best Practices

### Getting Show IDs
1. **From Spotify URLs**: `https://open.spotify.com/show/[SHOW_ID]`
2. **Popular Shows Menu**: Browse curated list
3. **Search Function**: Find shows by name

### Efficient Navigation
1. **Use Popular Shows**: Faster than typing IDs
2. **Search First**: Find shows quickly by name
3. **Health Checks**: Diagnose issues before troubleshooting

### Troubleshooting
1. **Check Configuration**: Use the configuration menu
2. **Run Health Checks**: Identify connectivity issues
3. **Restart Application**: Fresh start often resolves issues

## 🔄 CLI Architecture (Technical)

### SOLID Principles in CLI
- **Single Responsibility**: Each CLI component has one purpose
- **Open/Closed**: Easy to add new menu options
- **Liskov Substitution**: CLI components are substitutable
- **Interface Segregation**: Focused CLI interfaces
- **Dependency Inversion**: CLI depends on abstractions

### Key Components
```
CLIInterface (Presentation)
    ↓
CLIService (Business Logic)
    ↓
ShowService + PopularShowsService (Domain Services)
    ↓
SpotifyApiClient (External API)
```

### Error Handling Flow
```
Error Occurs
    ↓
CLIErrorHandler (Categorizes)
    ↓
User-Friendly Message (Displayed)
    ↓
Helpful Suggestions (Provided)
    ↓
Graceful Recovery (Application Continues)
```

## 📝 Command Reference

### Interactive Mode
```bash
npm start                    # Launch interactive CLI
npm run cli                  # Explicit CLI mode
npm run interactive          # Alternative CLI launch
```

### Direct Commands (Non-Interactive)
```bash
node app.js help                           # Show help
node app.js details <showId>               # Show details
node app.js summary <showId>               # Show summary
node app.js episodes <showId> [page]       # Show episodes
node app.js legacy                         # Original behavior
```

### Development
```bash
npm test                     # Run all tests
npm run quality             # Code quality analysis
```

## 🎉 Conclusion

The interactive CLI transforms the simple Spotify API application into a professional, user-friendly tool that demonstrates SOLID principles in action. The interface is designed to be intuitive for end users while maintaining clean, maintainable code for developers.

**Key Benefits:**
- **User-Friendly**: No need to remember command syntax
- **Visual**: Beautiful, colored output with tables and icons
- **Robust**: Comprehensive error handling and validation
- **Extensible**: Easy to add new features following SOLID principles
- **Professional**: Production-ready interface suitable for end users

The CLI serves as an excellent example of how SOLID principles can be applied to create maintainable, extensible user interfaces that provide exceptional user experience.
