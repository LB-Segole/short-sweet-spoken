
interface ConversationResponse {
  text: string;
  shouldEndCall: boolean;
  emotion?: 'neutral' | 'happy' | 'concerned' | 'helpful';
}

export const generateConversationResponse = async (
  userInput: string,
  agentPersonality: string = 'professional'
): Promise<ConversationResponse> => {
  
  // Simple conversation logic for now
  // In a real implementation, this would call an AI service like OpenAI
  
  const lowerInput = userInput.toLowerCase();
  
  // Check for end call phrases
  const endCallPhrases = ['goodbye', 'bye', 'end call', 'hang up', 'thanks bye'];
  const shouldEndCall = endCallPhrases.some(phrase => lowerInput.includes(phrase));
  
  if (shouldEndCall) {
    return {
      text: "Thank you for calling! Have a great day. Goodbye!",
      shouldEndCall: true,
      emotion: 'happy'
    };
  }
  
  // Generate response based on input
  let responseText = "I understand you said: " + userInput + ". How can I assist you further?";
  
  if (lowerInput.includes('help')) {
    responseText = "I'm here to help! What specific assistance do you need today?";
  } else if (lowerInput.includes('problem') || lowerInput.includes('issue')) {
    responseText = "I'm sorry to hear you're experiencing an issue. Can you tell me more about the problem?";
  } else if (lowerInput.includes('thank')) {
    responseText = "You're very welcome! Is there anything else I can help you with?";
  }
  
  return {
    text: responseText,
    shouldEndCall: false,
    emotion: 'helpful'
  };
};
