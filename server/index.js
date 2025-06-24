import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Enhanced configuration for ChatGPT-like voice experience
const CONFIG = {
  // Audio settings for better quality
  SAMPLE_RATE: 24000,
  CHANNELS: 1,
  ENCODING: 'linear16',
  
  // Conversation settings
  MAX_CONVERSATION_HISTORY: 20,
  RESPONSE_TIMEOUT: 30000,
  SILENCE_THRESHOLD: 1000, // ms of silence before processing
  
  // Voice settings
  DEFAULT_VOICE: 'aura-asteria-en',
  VOICE_SPEED: 1.0,
  
  // AI settings
  DEFAULT_MODEL: 'gpt-4o-mini',
  MAX_TOKENS: 200,
  TEMPERATURE: 0.7,
  
  // Connection settings
  PING_INTERVAL: 20000,
  CONNECTION_TIMEOUT: 60000
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    connections: wss.clients.size,
    deepgramKeyPresent: !!process.env.DEEPGRAM_API_KEY,
    openaiKeyPresent: !!process.env.OPENAI_API_KEY
  });
});

// Enhanced conversation management
class ConversationManager {
  constructor() {
    this.conversations = new Map();
    this.assistants = new Map();
  }

  createConversation(sessionId, assistantId) {
    const conversation = {
      sessionId,
      assistantId,
      messages: [],
      isActive: false,
      lastActivity: Date.now(),
      audioBuffer: [],
      isProcessing: false,
      interruptionCount: 0
    };
    
    this.conversations.set(sessionId, conversation);
    console.log(`🎯 Created conversation for session: ${sessionId}`);
    return conversation;
  }

  addMessage(sessionId, role, content) {
    const conversation = this.conversations.get(sessionId);
    if (!conversation) return;

    conversation.messages.push({
      role,
      content,
      timestamp: Date.now()
    });

    // Keep conversation history manageable
    if (conversation.messages.length > CONFIG.MAX_CONVERSATION_HISTORY) {
      conversation.messages = conversation.messages.slice(-CONFIG.MAX_CONVERSATION_HISTORY);
    }

    conversation.lastActivity = Date.now();
  }

  getConversation(sessionId) {
    return this.conversations.get(sessionId);
  }

  endConversation(sessionId) {
    this.conversations.delete(sessionId);
    console.log(`🔚 Ended conversation for session: ${sessionId}`);
  }
}

const conversationManager = new ConversationManager();

// Enhanced AI response generation
async function generateAIResponse(transcript, conversation, assistant) {
  try {
    const systemPrompt = assistant?.system_prompt || 
      "You are a helpful, conversational AI assistant. Be natural, friendly, and concise. Respond as if you're having a real conversation. Keep responses under 2-3 sentences for voice interaction.";

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversation.messages.slice(-10) // Last 10 messages for context
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: assistant?.model || CONFIG.DEFAULT_MODEL,
        messages: messages,
        max_tokens: assistant?.max_tokens || CONFIG.MAX_TOKENS,
        temperature: assistant?.temperature || CONFIG.TEMPERATURE,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || 
           "I understand. Could you tell me more about that?";
  } catch (error) {
    console.error('❌ AI response generation error:', error);
    return "I'm having trouble processing that right now. Could you try again?";
  }
}

// Enhanced TTS with better voice quality
async function textToSpeech(text, voice = CONFIG.DEFAULT_VOICE) {
  try {
    const ttsUrl = `wss://api.deepgram.com/v1/speak?model=${voice}&encoding=${CONFIG.ENCODING}&sample_rate=${CONFIG.SAMPLE_RATE}&container=none`;
    
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(ttsUrl, ['token', process.env.DEEPGRAM_API_KEY]);
      const audioChunks = [];

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'Clear' }));
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'Speak',
            text: text
          }));
          setTimeout(() => {
            ws.send(JSON.stringify({ type: 'Flush' }));
          }, 100);
        }, 100);
      };

      ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          audioChunks.push(new Uint8Array(event.data));
        }
      };

      ws.onclose = () => {
        if (audioChunks.length > 0) {
          const combinedAudio = new Uint8Array(
            audioChunks.reduce((acc, chunk) => acc + chunk.length, 0)
          );
          let offset = 0;
          audioChunks.forEach(chunk => {
            combinedAudio.set(chunk, offset);
            offset += chunk.length;
          });
          resolve(combinedAudio);
        } else {
          reject(new Error('No audio data received'));
        }
      };

      ws.onerror = reject;
    });
  } catch (error) {
    console.error('❌ TTS error:', error);
    throw error;
  }
}

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  const sessionId = crypto.randomUUID();
  const connectionId = crypto.randomUUID();
  let assistantId = 'demo';
  let userId = 'demo-user';
  let isConnectionAlive = true;
  let pingInterval = null;
  let lastPongTime = Date.now();

  console.log(`🔌 New WebSocket connection: ${connectionId}`);

  const log = (msg, data) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${connectionId}] ${msg}`, data ? JSON.stringify(data) : '');
  };

  const sendToClient = (message) => {
    if (!isConnectionAlive || ws.readyState !== WebSocket.OPEN) return false;
    
    try {
      const messageStr = JSON.stringify(message);
      ws.send(messageStr);
      log('📤 Sent to client:', { type: message.type, size: messageStr.length });
      return true;
    } catch (error) {
      log('❌ Error sending to client:', error);
      return false;
    }
  };

  // Load assistant configuration
  const loadAssistant = async (id) => {
    try {
      // For now, use default assistant - you can extend this to load from database
      const assistant = {
        id: id,
        name: 'Voice Assistant',
        system_prompt: "You are a helpful, conversational AI assistant. Be natural, friendly, and concise. Respond as if you're having a real conversation. Keep responses under 2-3 sentences for voice interaction.",
        first_message: "Hello! I'm here to help. What can I assist you with today?",
        voice_id: CONFIG.DEFAULT_VOICE,
        model: CONFIG.DEFAULT_MODEL,
        temperature: CONFIG.TEMPERATURE,
        max_tokens: CONFIG.MAX_TOKENS
      };

      conversationManager.assistants.set(sessionId, assistant);
      log('✅ Assistant loaded:', assistant.name);
      return assistant;
    } catch (error) {
      log('❌ Error loading assistant:', error);
      return null;
    }
  };

  // Start ping-pong keepalive
  const startPingPong = () => {
    pingInterval = setInterval(() => {
      if (!isConnectionAlive || ws.readyState !== WebSocket.OPEN) {
        if (pingInterval) {
          clearInterval(pingInterval);
          pingInterval = null;
        }
        return;
      }

      const now = Date.now();
      if (now - lastPongTime > CONFIG.CONNECTION_TIMEOUT) {
        log('⚠️ Connection timeout, closing');
        isConnectionAlive = false;
        ws.close(1008, 'Keepalive timeout');
        return;
      }

      ws.send(JSON.stringify({
        type: 'ping',
        timestamp: now
      }));
    }, CONFIG.PING_INTERVAL);
  };

  // Process user input and generate response
  const processUserInput = async (transcript) => {
    const conversation = conversationManager.getConversation(sessionId);
    const assistant = conversationManager.assistants.get(sessionId);
    
    if (!conversation || !assistant) return;

    conversation.isProcessing = true;
    log('🤖 Processing user input:', transcript.substring(0, 100));

    try {
      // Add user message to conversation
      conversationManager.addMessage(sessionId, 'user', transcript);

      // Generate AI response
      const aiResponse = await generateAIResponse(transcript, conversation, assistant);
      
      // Add assistant response to conversation
      conversationManager.addMessage(sessionId, 'assistant', aiResponse);

      // Send text response
      sendToClient({
        type: 'ai_response',
        text: aiResponse,
        timestamp: Date.now()
      });

      // Convert to speech
      const audioData = await textToSpeech(aiResponse, assistant.voice_id);
      const base64Audio = Buffer.from(audioData).toString('base64');

      // Send audio response
      sendToClient({
        type: 'audio_response',
        audio: base64Audio,
        timestamp: Date.now()
      });

      log('✅ Response generated and sent');
    } catch (error) {
      log('❌ Error processing user input:', error);
      sendToClient({
        type: 'error',
        error: 'Failed to process your request',
        timestamp: Date.now()
      });
    } finally {
      conversation.isProcessing = false;
    }
  };

  // WebSocket event handlers
  ws.on('message', async (data) => {
    if (!isConnectionAlive) return;

    try {
      lastPongTime = Date.now();
      const message = JSON.parse(data.toString());
      log('📨 Received from client:', { type: message.type || message.event });

      switch (message.type || message.event) {
        case 'ping':
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: Date.now()
          }));
          break;

        case 'pong':
          log('💓 Received pong');
          break;

        case 'start':
          log('🚀 Starting voice session');
          assistantId = message.assistantId || assistantId;
          userId = message.userId || userId;

          // Create conversation
          conversationManager.createConversation(sessionId, assistantId);
          
          // Load assistant
          const assistant = await loadAssistant(assistantId);
          
          // Send welcome message
          sendToClient({
            type: 'connection_established',
            sessionId,
            assistant: {
              name: assistant?.name || 'Voice Assistant',
              first_message: assistant?.first_message
            },
            timestamp: Date.now()
          });

          // Send first message if available
          if (assistant?.first_message) {
            setTimeout(async () => {
              const audioData = await textToSpeech(assistant.first_message, assistant.voice_id);
              const base64Audio = Buffer.from(audioData).toString('base64');
              
              sendToClient({
                type: 'audio_response',
                audio: base64Audio,
                timestamp: Date.now()
              });
            }, 500);
          }

          sendToClient({
            type: 'ready',
            status: 'Ready for voice input',
            timestamp: Date.now()
          });
          break;

        case 'transcript':
          if (message.text && message.text.trim()) {
            await processUserInput(message.text.trim());
          }
          break;

        case 'text_input':
          if (message.text && message.text.trim()) {
            await processUserInput(message.text.trim());
          }
          break;

        case 'test':
          sendToClient({
            type: 'test_response',
            message: 'Voice assistant is working correctly!',
            timestamp: Date.now()
          });
          break;

        default:
          log('❓ Unknown message type:', message.type || message.event);
      }
    } catch (error) {
      log('❌ Error processing message:', error);
    }
  });

  ws.on('close', (code, reason) => {
    log('🔌 Connection closed:', { code, reason: reason.toString() });
    isConnectionAlive = false;
    
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
    
    conversationManager.endConversation(sessionId);
  });

  ws.on('error', (error) => {
    log('❌ WebSocket error:', error);
  });

  // Initialize connection
  sendToClient({
    type: 'connection_ready',
    sessionId,
    status: 'Connected and ready',
    timestamp: Date.now()
  });

  startPingPong();
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🎙️ Voice Assistant Server running on port ${PORT}`);
  console.log(`🔗 WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`⚙️ Configuration:`, {
    sampleRate: CONFIG.SAMPLE_RATE,
    voice: CONFIG.DEFAULT_VOICE,
    model: CONFIG.DEFAULT_MODEL,
    maxTokens: CONFIG.MAX_TOKENS
  });
}); 