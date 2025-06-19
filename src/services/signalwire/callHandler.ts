
import { SignalWireConfig, MediaFrame, CallWebhookData, StreamEvent } from './types';

export class SignalWireCallHandler {
  private config: SignalWireConfig;
  private activeStreams = new Map<string, WebSocket>();

  constructor(config: SignalWireConfig) {
    this.config = config;
  }

  generateTwiML(websocketUrl: string, greeting?: string): string {
    const safeGreeting = this.escapeXml(greeting || 'Hello! You are connected to your AI assistant.');
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${safeGreeting}</Say>
  <Connect>
    <Stream url="${websocketUrl}" />
  </Connect>
</Response>`;
  }

  async initiateCall(toNumber: string, webhookUrl: string, streamUrl: string): Promise<string> {
    const twiml = this.generateTwiML(streamUrl);
    
    const response = await fetch(`https://${this.config.spaceUrl}/api/laml/2010-04-01/Accounts/${this.config.projectId}/Calls.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${this.config.projectId}:${this.config.token}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: toNumber,
        From: this.config.phoneNumber,
        Twiml: twiml,
        StatusCallback: webhookUrl,
        StatusCallbackMethod: 'POST'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SignalWire API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    return data.sid;
  }

  handleWebhook(data: CallWebhookData): string {
    console.log('Call webhook received:', data);
    
    // Return empty TwiML response for status updates
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>`;
  }

  sendAudioToCall(streamSid: string, audioData: string): void {
    const stream = this.activeStreams.get(streamSid);
    if (stream && stream.readyState === WebSocket.OPEN) {
      const mediaMessage = {
        event: 'media',
        streamSid,
        media: {
          payload: audioData
        }
      };
      stream.send(JSON.stringify(mediaMessage));
    }
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
