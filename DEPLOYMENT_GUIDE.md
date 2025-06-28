# Deployment Guide - Spotify Show Application

This guide covers deploying the refactored Spotify Show Application following SOLID principles to various environments.

## 🚀 Quick Start Deployment

### Prerequisites
- Node.js 14.0.0 or higher
- npm or yarn package manager
- Spotify Developer Account
- Environment where you can set environment variables

### Basic Deployment Steps

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd spotify-show-app
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Spotify credentials
   ```

3. **Test the Application**
   ```bash
   npm test
   npm run quality
   npm start
   ```

## 🌐 Environment-Specific Deployments

### Local Development

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your credentials

# Run in development mode
npm run dev

# Run tests
npm test

# Check code quality
npm run quality
```

### Production Server (Linux/Ubuntu)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone application
git clone <repository-url> /opt/spotify-show-app
cd /opt/spotify-show-app

# Install dependencies (production only)
npm ci --only=production

# Set up environment variables
sudo nano /etc/environment
# Add:
# CLIENT_ID=your_spotify_client_id
# CLIENT_SECRET=your_spotify_client_secret
# LOG_LEVEL=info

# Create systemd service
sudo nano /etc/systemd/system/spotify-show-app.service
```

**Systemd Service File:**
```ini
[Unit]
Description=Spotify Show Application
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/spotify-show-app
ExecStart=/usr/bin/node app.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/etc/environment

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl enable spotify-show-app
sudo systemctl start spotify-show-app
sudo systemctl status spotify-show-app
```

### Docker Deployment

**Dockerfile:**
```dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port (if needed for future web interface)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check passed')" || exit 1

# Start application
CMD ["node", "app.js"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  spotify-show-app:
    build: .
    environment:
      - CLIENT_ID=${CLIENT_ID}
      - CLIENT_SECRET=${CLIENT_SECRET}
      - LOG_LEVEL=info
      - NODE_ENV=production
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    networks:
      - spotify-network

networks:
  spotify-network:
    driver: bridge
```

**Deploy with Docker:**
```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### AWS Lambda Deployment

**lambda-handler.js:**
```javascript
const SpotifyShowApp = require('./src/SpotifyShowApp');

exports.handler = async (event, context) => {
    const app = new SpotifyShowApp();
    
    try {
        await app.initialize();
        
        const showId = event.showId || process.env.DEFAULT_SHOW_ID;
        const action = event.action || 'details';
        
        let result;
        switch (action) {
            case 'details':
                result = await app.getShowDetailsData(showId);
                break;
            case 'summary':
                result = await app.getShowSummaryData(showId);
                break;
            case 'episodes':
                result = await app.getShowEpisodesData(showId, event.page || 1);
                break;
            default:
                throw new Error(`Unknown action: ${action}`);
        }
        
        return {
            statusCode: 200,
            body: JSON.stringify(result)
        };
        
    } catch (error) {
        console.error('Lambda error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    } finally {
        await app.shutdown();
    }
};
```

**Deploy to AWS Lambda:**
```bash
# Install AWS CLI and configure credentials
npm install -g aws-cli
aws configure

# Package application
zip -r spotify-show-app.zip . -x "node_modules/*" "test/*" ".git/*"

# Create Lambda function
aws lambda create-function \
  --function-name spotify-show-app \
  --runtime nodejs18.x \
  --role arn:aws:iam::YOUR_ACCOUNT:role/lambda-execution-role \
  --handler lambda-handler.handler \
  --zip-file fileb://spotify-show-app.zip \
  --environment Variables='{CLIENT_ID=your_id,CLIENT_SECRET=your_secret}'
```

### Heroku Deployment

**Procfile:**
```
web: node app.js
```

**Deploy to Heroku:**
```bash
# Install Heroku CLI
npm install -g heroku

# Login and create app
heroku login
heroku create your-spotify-show-app

# Set environment variables
heroku config:set CLIENT_ID=your_spotify_client_id
heroku config:set CLIENT_SECRET=your_spotify_client_secret
heroku config:set LOG_LEVEL=info

# Deploy
git add .
git commit -m "Deploy to Heroku"
git push heroku main

# View logs
heroku logs --tail
```

## 🔧 Configuration Management

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CLIENT_ID` | Yes | - | Spotify Client ID |
| `CLIENT_SECRET` | Yes | - | Spotify Client Secret |
| `DEFAULT_SHOW_ID` | No | `11ktWYpzznMCpvGtXsiYxE` | Default show to display |
| `LOG_LEVEL` | No | `info` | Logging level |
| `TOKEN_URL` | No | Spotify default | Token endpoint |
| `API_BASE_URL` | No | Spotify default | API base URL |
| `NODE_ENV` | No | `development` | Environment mode |

### Security Best Practices

1. **Never commit secrets to version control**
2. **Use environment-specific configuration files**
3. **Rotate API credentials regularly**
4. **Use least-privilege access principles**
5. **Enable logging for security monitoring**

## 📊 Monitoring and Logging

### Application Logs

The application uses structured logging:

```javascript
// Log levels available
logger.debug('Detailed debugging information');
logger.info('General application flow');
logger.warn('Warning conditions');
logger.error('Error conditions');
```

### Health Checks

**Basic Health Check:**
```javascript
// Add to SpotifyShowApp.js
async healthCheck() {
    try {
        await this.initialize();
        const config = this.configuration;
        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: require('./package.json').version,
            config: config.isValid()
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        };
    }
}
```

### Performance Monitoring

**Add performance metrics:**
```javascript
// In your deployment, add:
const startTime = Date.now();

// After operation
const duration = Date.now() - startTime;
logger.info(`Operation completed in ${duration}ms`);
```

## 🔄 CI/CD Pipeline

### GitHub Actions Example

**.github/workflows/deploy.yml:**
```yaml
name: Deploy Spotify Show App

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
    - run: npm ci
    - run: npm test
    - run: npm run quality

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v3
    - name: Deploy to production
      run: |
        # Add your deployment commands here
        echo "Deploying to production..."
```

## 🚨 Troubleshooting

### Common Issues

1. **Authentication Errors**
   ```bash
   # Check credentials
   echo $CLIENT_ID
   echo $CLIENT_SECRET
   
   # Test authentication
   node -e "
   const config = require('./src/config/Configuration');
   const c = new config();
   console.log('Config valid:', c.isValid());
   "
   ```

2. **Network Issues**
   ```bash
   # Test connectivity
   curl -I https://api.spotify.com/v1/
   
   # Check DNS resolution
   nslookup api.spotify.com
   ```

3. **Memory Issues**
   ```bash
   # Monitor memory usage
   node --max-old-space-size=512 app.js
   
   # Check for memory leaks
   node --inspect app.js
   ```

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug node app.js

# Enable Node.js debugging
node --inspect-brk app.js
```

## 📈 Scaling Considerations

### Horizontal Scaling
- Use load balancers for multiple instances
- Implement connection pooling
- Cache frequently requested data

### Vertical Scaling
- Monitor memory usage
- Optimize for CPU-bound operations
- Use clustering for multi-core systems

### Performance Optimization
- Implement response caching
- Use connection keep-alive
- Batch API requests when possible

## 🔐 Security Checklist

- [ ] Environment variables secured
- [ ] No secrets in code repository
- [ ] HTTPS enabled for production
- [ ] Input validation implemented
- [ ] Error messages don't leak sensitive data
- [ ] Logging configured appropriately
- [ ] Dependencies regularly updated
- [ ] Security headers configured

## 📞 Support

For deployment issues:
1. Check the troubleshooting section
2. Review application logs
3. Verify environment configuration
4. Test with minimal configuration
5. Contact support with specific error messages

---

This deployment guide ensures your SOLID-compliant Spotify Show Application can be deployed reliably across various environments while maintaining security and performance best practices.
