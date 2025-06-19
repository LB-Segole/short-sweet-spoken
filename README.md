
# DeepGram + SignalWire Voice AI Agent

A complete real-time AI calling agent built with React, TypeScript, DeepGram (STT/TTS), and SignalWire for phone calls.

## Features

- **Agent Management**: Create and configure custom AI voice agents with personalities and conversation settings
- **Real-time Voice**: DeepGram STT (Speech-to-Text) and TTS (Text-to-Speech) integration
- **Phone Calls**: SignalWire integration for actual PSTN/SIP calls
- **Live Transcription**: Real-time transcript display during calls
- **No OpenAI Dependency**: Fully powered by DeepGram for both speech recognition and synthesis

## Project Structure

```
src/
├── agents/                 # Agent management system
│   ├── AgentManager.tsx    # Main agent list and management UI
│   ├── AgentForm.tsx       # Create/edit agent form
│   └── useAgentStorage.ts  # Local storage for agents
├── deepgram/              # DeepGram clients
│   ├── stt.ts             # Speech-to-Text WebSocket client
│   └── tts.ts             # Text-to-Speech WebSocket client
├── signalwire/            # SignalWire integration
│   ├── client.ts          # SignalWire API client
│   └── types.ts           # SignalWire type definitions
├── hooks/
│   └── useCallOrchestrator.ts  # Main orchestration hook
├── components/
│   ├── CallInterface.tsx   # Call control interface
│   └── VoiceAgentApp.tsx   # Main app component
├── services/
│   └── conversationService.ts  # Rule-based conversation logic (no OpenAI)
└── types/
    └── agent.ts           # Agent type definitions
```

## Environment Variables

Create a `.env` file in your project root:

```env
# DeepGram Configuration
VITE_DEEPGRAM_API_KEY=your_deepgram_api_key_here

# SignalWire Configuration  
VITE_SIGNALWIRE_PROJECT_ID=your_signalwire_project_id
VITE_SIGNALWIRE_TOKEN=your_signalwire_token
VITE_SIGNALWIRE_SPACE_URL=your_space.signalwire.com
VITE_SIGNALWIRE_PHONE_NUMBER=+1234567890
```

## Setup Instructions

### 1. Get DeepGram API Key
1. Go to [DeepGram Console](https://console.deepgram.com/)
2. Create an account or sign in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key to `VITE_DEEPGRAM_API_KEY`

### 2. Get SignalWire Credentials
1. Go to [SignalWire Dashboard](https://signalwire.com/)
2. Create an account or sign in
3. Create a new project
4. Get your Project ID, Token, and Space URL from the project dashboard
5. Purchase a phone number for your project
6. Configure the credentials in your `.env` file

### 3. Install and Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### 4. Create Your First Agent

1. Open the application in your browser
2. Click "Create Agent"
3. Fill in the agent details:
   - **Name**: Give your agent a name (e.g., "Sales Assistant")
   - **System Prompt**: Define the agent's behavior and personality
   - **First Message**: The greeting when calls connect
   - **Voice Settings**: Choose DeepGram TTS model and settings

### 5. Test a Call

1. Select an agent from the list
2. Click "Start Call"
3. Enter a phone number to call
4. Click "Start Call" to initiate the real phone call
5. The interface will show live transcription and call status

## Key Components

### Agent Management
- **AgentManager**: Main UI for creating, editing, and selecting agents
- **AgentForm**: Form for configuring agent personality, voice, and behavior
- **useAgentStorage**: Handles local storage persistence of agents

### Voice Processing
- **DeepgramSTTClient**: Real-time speech-to-text with reconnection handling
- **DeepgramTTSClient**: Real-time text-to-speech with audio streaming
- **useCallOrchestrator**: Coordinates STT, TTS, and call flows

### Call Integration
- **SignalWireClient**: Handles actual phone call initiation via API
- **CallInterface**: UI for managing active calls with live feedback

## Call Flow

1. **Agent Selection**: User selects configured agent
2. **Call Initiation**: SignalWire initiates PSTN call to target number  
3. **Stream Setup**: WebSocket connection established for media streaming
4. **Audio Processing**:
   - Incoming audio → DeepGram STT → Text transcript
   - Text transcript + Agent prompt → Conversation processing → Response text
   - Response text → DeepGram TTS → Audio chunks → Back to call
5. **Real-time UI**: Live transcript and call status displayed

## Conversation Logic

The system uses rule-based conversation processing (no OpenAI needed):
- Pattern matching for common intents (greetings, pricing, technical questions)
- Sentiment analysis based on keyword detection
- Configurable response templates per agent
- Automatic call transfer/ending based on conversation flow

## Testing & Verification

### Prerequisites
- Valid phone numbers for testing
- DeepGram and SignalWire accounts with sufficient credits
- Stable internet connection for WebSocket streaming

### Test Steps
1. Create a test agent with simple greeting
2. Use your own phone number for initial testing
3. Monitor browser console for WebSocket connection logs
4. Verify bidirectional audio (you can hear agent, agent can hear you)
5. Check live transcript updates during conversation

### Troubleshooting
- **No audio**: Check SignalWire WebSocket connection and media streaming
- **No transcription**: Verify DeepGram STT WebSocket and API key
- **No TTS response**: Check DeepGram TTS connection and model configuration
- **Call fails**: Verify SignalWire credentials and phone number format

## Deployment Notes

For production deployment:
1. Set up proper backend WebSocket handling for SignalWire streams
2. Implement call logging and analytics
3. Add proper error handling and retry logic
4. Consider adding authentication for agent management
5. Implement rate limiting and usage monitoring

## License

MIT License - See LICENSE file for details.
