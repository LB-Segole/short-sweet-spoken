# Voice Agent Server for Railway

This is a WebSocket server that handles real-time voice conversations using Deepgram for speech-to-text and text-to-speech, and OpenAI for AI responses.

## Features

- 🔗 Real-time WebSocket connections
- 🎤 Speech-to-Text using Deepgram
- 🔊 Text-to-Speech using Deepgram
- 🤖 AI responses using OpenAI
- 💬 Conversation history management
- 🔄 Automatic reconnection
- 📊 Health check endpoint

## Prerequisites

- Node.js 18+ 
- Railway account
- Deepgram API key
- OpenAI API key

## Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file based on `env.example`:
   ```bash
   cp env.example .env
   ```
   
   Fill in your API keys:
   ```env
   PORT=3001
   DEEPGRAM_API_KEY=your_deepgram_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **Start the server:**
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```

4. **Test the connection:**
   - Health check: `http://localhost:3001/health`
   - WebSocket: `ws://localhost:3001`

## Railway Deployment

### Method 1: Railway CLI

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway:**
   ```bash
   railway login
   ```

3. **Initialize project:**
   ```bash
   railway init
   ```

4. **Set environment variables:**
   ```bash
   railway variables set DEEPGRAM_API_KEY=your_deepgram_api_key
   railway variables set OPENAI_API_KEY=your_openai_api_key
   ```

5. **Deploy:**
   ```bash
   railway up
   ```

### Method 2: Railway Dashboard

1. **Create new project:**
   - Go to [Railway Dashboard](https://railway.app/dashboard)
   - Click "New Project"
   - Choose "Deploy from GitHub repo"

2. **Connect your repository:**
   - Select your GitHub repository
   - Railway will auto-detect the Node.js project

3. **Set environment variables:**
   - Go to your project settings
   - Add the following variables:
     - `DEEPGRAM_API_KEY`
     - `OPENAI_API_KEY`

4. **Deploy:**
   - Railway will automatically deploy when you push to your main branch

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (Railway sets this automatically) | No |
| `DEEPGRAM_API_KEY` | Deepgram API key for STT/TTS | Yes |
| `OPENAI_API_KEY` | OpenAI API key for AI responses | Yes |
| `LOG_LEVEL` | Logging level (info, debug, error) | No |

## WebSocket Protocol

### Client to Server Messages

#### Start Session
```json
{
  "event": "start",
  "assistantId": "demo",
  "userId": "user123",
  "message": "Starting voice session",
  "timestamp": 1234567890
}
```

#### Send Audio
```json
{
  "event": "media",
  "media": {
    "payload": "base64_encoded_audio_data"
  },
  "timestamp": 1234567890
}
```

#### Send Text Input
```json
{
  "event": "text_input",
  "text": "Hello, how are you?",
  "timestamp": 1234567890
}
```

#### Test Message
```json
{
  "event": "test",
  "message": "Test message",
  "timestamp": 1234567890
}
```

### Server to Client Messages

#### Connection Ready
```json
{
  "type": "connection_ready",
  "connectionId": "abc123",
  "status": "WebSocket connection established",
  "timestamp": 1234567890
}
```

#### Acknowledgment
```json
{
  "type": "ack",
  "message": "Session started successfully",
  "timestamp": 1234567890
}
```

#### Transcript
```json
{
  "type": "transcript",
  "text": "Hello world",
  "isFinal": true,
  "speechFinal": true,
  "timestamp": 1234567890
}
```

#### AI Response
```json
{
  "type": "ai_response",
  "text": "Hello! How can I help you today?",
  "timestamp": 1234567890
}
```

#### Audio Response
```json
{
  "type": "audio_response",
  "audio": "base64_encoded_audio_data",
  "timestamp": 1234567890
}
```

## Testing

1. **Use the test page:**
   - Open `test-railway.html` in your browser
   - Enter your Railway WebSocket URL
   - Test the connection and messaging

2. **Health check:**
   ```bash
   curl https://your-railway-app.railway.app/health
   ```

3. **WebSocket test with wscat:**
   ```bash
   npm install -g wscat
   wscat -c wss://your-railway-app.railway.app
   ```

## Troubleshooting

### Common Issues

1. **Connection fails with code 1006:**
   - Check if your Railway URL is correct
   - Verify environment variables are set
   - Check Railway logs for errors

2. **Audio not working:**
   - Ensure Deepgram API key is valid
   - Check browser microphone permissions
   - Verify audio format (should be base64 encoded)

3. **AI responses not working:**
   - Verify OpenAI API key is valid
   - Check OpenAI API quota/limits
   - Review server logs for API errors

### Logs

View Railway logs:
```bash
railway logs
```

Or check the Railway dashboard for real-time logs.

## Client Integration

Update your React app to use the Railway WebSocket URL:

```javascript
// In your environment variables
REACT_APP_RAILWAY_WS_URL=wss://your-railway-app.railway.app

// In your WebSocket hook
const RAILWAY_WS_URL = process.env.REACT_APP_RAILWAY_WS_URL;
```

## Security Notes

- Keep your API keys secure
- Use HTTPS/WSS in production
- Consider rate limiting for production use
- Monitor API usage and costs

## Support

For issues:
1. Check Railway logs
2. Verify environment variables
3. Test with the provided test page
4. Check API key validity and quotas 