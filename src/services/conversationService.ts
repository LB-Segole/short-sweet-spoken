
interface ConversationResponse {
  text: string;
  shouldEndCall: boolean;
}

export const generateConversationResponse = async (
  userInput: string,
): Promise<ConversationResponse> => {
  // Simple rule-based conversation logic
  const input = userInput.toLowerCase().trim();
  
  // End call phrases
  const endCallPhrases = ['goodbye', 'bye', 'end call', 'hang up', 'thank you', 'thanks'];
  if (endCallPhrases.some(phrase => input.includes(phrase))) {
    return {
      text: "Thank you for calling! Have a great day. Goodbye!",
      shouldEndCall: true
    };
  }
  
  // Greeting responses
  if (input.includes('hello') || input.includes('hi')) {
    return {
      text: "Hello! I'm your AI assistant. How can I help you today?",
      shouldEndCall: false
    };
  }
  
  // Help requests
  if (input.includes('help') || input.includes('assist')) {
    return {
      text: "I'm here to help! You can ask me questions or let me know what you need assistance with.",
      shouldEndCall: false
    };
  }
  
  // Default response
  return {
    text: `I understand you said "${userInput}". I'm here to help you with any questions or requests you might have. Could you tell me more about what you need?`,
    shouldEndCall: false
  };
};
