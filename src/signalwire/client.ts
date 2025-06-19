
import { SignalWireConfig, CallRequest, CallResponse } from './types';

export class SignalWireClient {
  private config: SignalWireConfig;

  constructor(config: SignalWireConfig) {
    this.config = config;
  }

  async initiateCall(request: CallRequest): Promise<CallResponse> {
    try {
      console.log('📞 Initiating SignalWire call to:', request.phoneNumber);

      const twiml = this.generateTwiML(request.streamUrl);
      
      const response = await fetch(
        `https://${this.config.spaceUrl}/api/laml/2010-04-01/Accounts/${this.config.projectId}/Calls.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`${this.config.projectId}:${this.config.token}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: request.phoneNumber,
            From: this.config.phoneNumber,
            Twiml: twiml,
            StatusCallback: request.webhookUrl,
            StatusCallbackMethod: 'POST'
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ SignalWire call failed:', response.status, errorText);
        return {
          success: false,
          error: `SignalWire API error: ${response.status} - ${errorText}`
        };
      }

      const data = await response.json();
      console.log('✅ SignalWire call initiated:', data.sid);
      
      return {
        success: true,
        callSid: data.sid
      };

    } catch (error) {
      console.error('❌ SignalWire call error:', error);
      return {
        success: false,
        error: `Call initiation failed: ${error}`
      };
    }
  }

  private generateTwiML(streamUrl: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${streamUrl}" />
  </Connect>
</Response>`;
  }

  sendAudioToCall(streamSid: string, audioData: string): void {
    // This would be called from the WebSocket connection
    // The actual implementation is in the stream handler
    console.log('📤 Sending audio to call:', streamSid, audioData.length, 'bytes');
  }
}

// Export the types and client
export { SignalWireConfig, CallRequest, CallResponse } from './types';
