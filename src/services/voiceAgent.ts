import { LiveTranscription } from './speechService';
import { generateAIResponse, analyzeCustomerSentiment } from './aiService';
import { supabase } from '@/lib/supabase';

export interface VoiceAgentConfig {
  assistantId?: string;
  campaignId?: string;
  voiceSettings?: {
    voice: string;
    speed: number;
    pitch: number;
  };
}

export class VoiceAgent {
  private liveTranscription: LiveTranscription | null = null;
  private callId: string;
  private config: VoiceAgentConfig;
  private conversationHistory: Array<{ role: string; content: string; timestamp: Date }> = [];
  private isActive: boolean = false;
  private callStartTime: Date;
  private lastActivity: Date;

  constructor(callId: string, config: VoiceAgentConfig = {}) {
    this.callId = callId;
    this.config = config;
    this.callStartTime = new Date();
    this.lastActivity = new Date();
  }

  async startCall(): Promise<void> {
    try {
      this.isActive = true;
      
      // Initialize live transcription
      this.liveTranscription = new LiveTranscription(
        this.handleTranscription.bind(this)
      );
      
      await this.liveTranscription.connect();
      
      // Log call start
      await this.logCallEvent('call_started', {
        assistant_id: this.config.assistantId,
        campaign_id: this.config.campaignId,
        voice_settings: this.config.voiceSettings
      });

      console.log(`Voice agent started for call ${this.callId}`);
      
    } catch (error) {
      console.error('Failed to start voice agent:', error);
      this.isActive = false;
      throw error;
    }
  }

  async endCall(): Promise<void> {
    try {
      this.isActive = false;
      
      if (this.liveTranscription) {
        this.liveTranscription.disconnect();
        this.liveTranscription = null;
      }

      // Calculate call duration
      const duration = Math.floor((new Date().getTime() - this.callStartTime.getTime()) / 1000);
      
      // Generate call summary
      const summary = await this.generateCallSummary();
      
      // Update call record
      await supabase
        .from('calls')
        .update({
          status: 'completed',
          duration,
          summary,
          ended_at: new Date().toISOString()
        })
        .eq('id', this.callId);

      // Log call end
      await this.logCallEvent('call_ended', {
        duration,
        summary,
        total_messages: this.conversationHistory.length
      });

      console.log(`Voice agent ended for call ${this.callId}. Duration: ${duration}s`);
      
    } catch (error) {
      console.error('Error ending voice agent call:', error);
    }
  }

  private async handleTranscription(transcript: string, confidence: number): Promise<void> {
    if (!this.isActive || !transcript.trim()) {
      return;
    }

    try {
      this.lastActivity = new Date();
      
      // Log customer message
      await this.logMessage('customer', transcript, confidence);
      
      // Add to conversation history
      this.conversationHistory.push({
        role: 'user',
        content: transcript,
        timestamp: new Date()
      });

      // Analyze customer sentiment
      const sentiment = await analyzeCustomerSentiment(transcript);
      
      // Generate AI response
      const aiResponse = await generateAIResponse(transcript, {
        callId: this.callId,
        confidence,
        previousMessages: this.conversationHistory.slice(-5) // Last 5 messages for context
      });

      // Log AI response
      await this.logMessage('agent', aiResponse.text, aiResponse.confidence);
      
      // Add AI response to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content: aiResponse.text,
        timestamp: new Date()
      });

      // Handle call flow based on AI decision
      await this.handleCallFlow(aiResponse, sentiment);
      
    } catch (error) {
      console.error('Error handling transcription:', error);
      
      // Fallback response
      await this.logMessage('agent', 'I apologize, I\'m having technical difficulties. Let me connect you with a human representative.', 0.5);
    }
  }

  private async handleCallFlow(aiResponse: any, sentiment: any): Promise<void> {
    // Update call analytics
    await this.updateCallAnalytics(aiResponse, sentiment);
    
    // Check for call termination conditions
    if (aiResponse.shouldEndCall) {
      await this.scheduleCallEnd('ai_decision');
    } else if (aiResponse.shouldTransfer) {
      await this.scheduleTransfer();
    } else if (this.shouldTimeoutCall()) {
      await this.scheduleCallEnd('timeout');
    }
  }

  private async scheduleCallEnd(reason: string): Promise<void> {
    await this.logCallEvent('call_end_scheduled', { reason });
    
    // In a real implementation, this would trigger the call termination
    // through your telephony provider's API
    setTimeout(() => {
      this.endCall();
    }, 2000); // Give 2 seconds for final message to play
  }

  private async scheduleTransfer(): Promise<void> {
    await this.logCallEvent('transfer_scheduled', {
      reason: 'ai_requested_transfer',
      conversation_length: this.conversationHistory.length
    });
    
    // In a real implementation, this would initiate the transfer
    // through your telephony provider's API
  }

  private shouldTimeoutCall(): boolean {
    const maxCallDuration = 10 * 60 * 1000; // 10 minutes
    const maxInactivity = 30 * 1000; // 30 seconds
    
    const callDuration = new Date().getTime() - this.callStartTime.getTime();
    const inactivityDuration = new Date().getTime() - this.lastActivity.getTime();
    
    return callDuration > maxCallDuration || inactivityDuration > maxInactivity;
  }

  private async logMessage(speaker: string, message: string, confidence: number): Promise<void> {
    try {
      await supabase.from('call_logs').insert({
        call_id: this.callId,
        speaker,
        message,
        confidence,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error logging message:', error);
    }
  }

  private async logCallEvent(eventType: string, eventData: any): Promise<void> {
    try {
      await supabase.from('webhook_logs').insert({
        call_id: this.callId,
        event_type: eventType,
        event_data: eventData,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error logging call event:', error);
    }
  }

  private async updateCallAnalytics(aiResponse: any, sentiment: any): Promise<void> {
    try {
      const analytics = {
        total_exchanges: this.conversationHistory.length / 2,
        avg_confidence: this.calculateAverageConfidence(),
        dominant_sentiment: sentiment.sentiment,
        last_intent: aiResponse.intent,
        call_duration: Math.floor((new Date().getTime() - this.callStartTime.getTime()) / 1000)
      };

      await supabase
        .from('calls')
        .update({ 
          analytics: analytics,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.callId);
        
    } catch (error) {
      console.error('Error updating call analytics:', error);
    }
  }

  private calculateAverageConfidence(): number {
    const confidenceScores = this.conversationHistory
      .filter(msg => msg.role === 'user')
      .map((_, index) => {
        // In a real implementation, you'd store confidence with each message
        return 0.8; // Placeholder
      });
    
    return confidenceScores.length > 0 
      ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length
      : 0;
  }

  private async generateCallSummary(): Promise<string> {
    try {
      const customerMessages = this.conversationHistory
        .filter(msg => msg.role === 'user')
        .map(msg => msg.content)
        .join(' ');
      
      const agentMessages = this.conversationHistory
        .filter(msg => msg.role === 'assistant')
        .map(msg => msg.content)
        .join(' ');

      // Simple summary generation - in production, you might use OpenAI for this
      const summary = `Call Duration: ${Math.floor((new Date().getTime() - this.callStartTime.getTime()) / 1000)}s. ` +
        `Total Exchanges: ${Math.floor(this.conversationHistory.length / 2)}. ` +
        `Customer seemed ${this.getDominantSentiment()}. ` +
        `Key topics discussed: ${this.extractKeyTopics(customerMessages + ' ' + agentMessages)}`;

      return summary;
      
    } catch (error) {
      console.error('Error generating call summary:', error);
      return 'Call completed - summary generation failed';
    }
  }

  private getDominantSentiment(): string {
    // Placeholder - in production, you'd analyze all sentiment data
    return 'neutral';
  }

  private extractKeyTopics(text: string): string {
    // Simple keyword extraction - in production, you might use NLP
    const keywords = ['business', 'service', 'help', 'price', 'consultation', 'marketing'];
    const foundKeywords = keywords.filter(keyword => 
      text.toLowerCase().includes(keyword)
    );
    
    return foundKeywords.length > 0 ? foundKeywords.join(', ') : 'general inquiry';
  }

  // Public methods for external control
  public async pauseTranscription(): Promise<void> {
    if (this.liveTranscription) {
      this.liveTranscription.disconnect();
    }
  }

  public async resumeTranscription(): Promise<void> {
    if (!this.liveTranscription && this.isActive) {
      this.liveTranscription = new LiveTranscription(
        this.handleTranscription.bind(this)
      );
      await this.liveTranscription.connect();
    }
  }

  public getCallStatus(): {
    isActive: boolean;
    duration: number;
    messageCount: number;
    lastActivity: Date;
  } {
    return {
      isActive: this.isActive,
      duration: Math.floor((new Date().getTime() - this.callStartTime.getTime()) / 1000),
      messageCount: this.conversationHistory.length,
      lastActivity: this.lastActivity
    };
  }

  public async injectMessage(message: string, speaker: 'agent' | 'customer' = 'agent'): Promise<void> {
    await this.logMessage(speaker, message, 1.0);
    this.conversationHistory.push({
      role: speaker === 'agent' ? 'assistant' : 'user',
      content: message,
      timestamp: new Date()
    });
  }
}

// Factory function to create and manage voice agents
export class VoiceAgentManager {
  private static agents: Map<string, VoiceAgent> = new Map();

  static async createAgent(callId: string, config: VoiceAgentConfig): Promise<VoiceAgent> {
    if (this.agents.has(callId)) {
      throw new Error(`Voice agent already exists for call ${callId}`);
    }

    const agent = new VoiceAgent(callId, config);
    this.agents.set(callId, agent);
    
    await agent.startCall();
    return agent;
  }

  static getAgent(callId: string): VoiceAgent | undefined {
    return this.agents.get(callId);
  }

  static async endAgent(callId: string): Promise<void> {
    const agent = this.agents.get(callId);
    if (agent) {
      await agent.endCall();
      this.agents.delete(callId);
    }
  }

  static getAllActiveAgents(): VoiceAgent[] {
    return Array.from(this.agents.values()).filter(agent => 
      agent.getCallStatus().isActive
    );
  }

  static async endAllAgents(): Promise<void> {
    const promises = Array.from(this.agents.keys()).map(callId => 
      this.endAgent(callId)
    );
    await Promise.all(promises);
  }
}

export { VoiceAgent };