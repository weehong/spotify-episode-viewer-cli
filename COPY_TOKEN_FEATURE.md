# 📋 Copy Access Token Feature

## Overview
The Spotify Show Explorer CLI now includes a convenient "Copy Token" button that allows users to easily copy their full access token to the clipboard for use in external applications or API testing tools.

## How It Works

### 1. Access Token Display
When you select "🔑 Show access token" from the main menu, you'll see:

```
🔑 ACCESS TOKEN INFORMATION
═══════════════════════════════════════════════════════════

┌─────────────────────────┬─────────────────────────────────────────────┐
│ Token (Masked)          │ BQC8KwABC...xyz9                           │
│ Token Type              │ Bearer                                      │
│ Expires At              │ 12/24/2025, 5:15:30 AM                     │
│ Time Until Expiry       │ 58m                                         │
│ Is Valid                │ ✓ Yes                                       │
└─────────────────────────┴─────────────────────────────────────────────┘

✅ Token is valid and ready for API calls
```

### 2. Copy Options Menu
After displaying the token information, you'll see:

```
📋 Copy Options:
? What would you like to do? (Use arrow keys)
❯ 📋 Copy full access token to clipboard
  ↩️  Return to main menu
```

### 3. Cross-Platform Clipboard Support

#### Windows
- Uses the built-in `clip` command
- Automatically copies the full token to clipboard

#### macOS
- Uses the built-in `pbcopy` command
- Automatically copies the full token to clipboard

#### Linux
- Uses `xclip` command (with fallback to manual display)
- Automatically copies the full token to clipboard

### 4. Fallback for Manual Copy
If clipboard functionality is not available, the system will display:

```
⚠️  Clipboard not available. Showing token for manual copy:

📋 Full Access Token (select and copy):
────────────────────────────────────────────────────────────────────────────────
BQC8KwABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890abcdefghijklmnopqrstuvwxyz9
────────────────────────────────────────────────────────────────────────────────
⚠️  Keep your token secure and don't share it publicly.

? Press Enter when you have copied the token...
```

## Security Features

### 1. Token Masking in Display
- Only shows first 10 and last 4 characters in the main display
- Full token is only revealed when explicitly copying

### 2. Security Warnings
- Displays security warnings when copying tokens
- Reminds users to keep tokens secure
- Warns against sharing tokens publicly

### 3. Secure Handling
- Token is only temporarily exposed during copy operation
- No token logging or persistent storage
- Immediate cleanup after copy operation

## Usage Examples

### For API Testing (Postman, Insomnia, etc.)
1. Run the CLI: `node src/app.js cli`
2. Select "🔑 Show access token"
3. Choose "📋 Copy full access token to clipboard"
4. Paste directly into your API testing tool's Authorization header

### For cURL Commands
1. Copy the token using the CLI
2. Use in cURL commands:
```bash
curl -H "Authorization: Bearer <PASTE_TOKEN_HERE>" \
     https://api.spotify.com/v1/me
```

### For Development/Debugging
1. Copy the token for use in development tools
2. Verify token validity and expiration
3. Use for manual API testing

## Technical Implementation

### Cross-Platform Clipboard Commands
```javascript
// Windows
clipboardCommand = 'clip';

// macOS
clipboardCommand = 'pbcopy';

// Linux
clipboardCommand = 'xclip';
clipboardArgs = ['-selection', 'clipboard'];
```

### Error Handling
- Graceful fallback when clipboard is unavailable
- Clear error messages and alternative options
- No application crashes due to clipboard issues

### Security Considerations
- Token masking in UI display
- Explicit user action required for copying
- Security warnings and best practices
- No persistent token storage

## Benefits

1. **Convenience**: One-click token copying
2. **Security**: Masked display with explicit copy action
3. **Cross-Platform**: Works on Windows, macOS, and Linux
4. **Fallback**: Manual copy option when clipboard unavailable
5. **User-Friendly**: Clear instructions and feedback
6. **Integration**: Easy integration with external tools

This feature makes it much easier to use Spotify access tokens with external API testing tools, development environments, and debugging scenarios while maintaining security best practices.