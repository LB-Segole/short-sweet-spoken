
export interface SignalWireConfig {
  projectId: string;
  token: string;
  spaceUrl: string;
  phoneNumber: string;
}

export interface MediaFrame {
  event: string;
  sequenceNumber: string;
  media: {
    track: string;
    chunk: string;
    timestamp: string;
    payload: string;
  };
  streamSid: string;
}

export interface CallWebhookData {
  CallSid: string;
  From: string;
  To: string;
  CallStatus: string;
  Direction: string;
}

export interface StreamEvent {
  event: 'connected' | 'start' | 'media' | 'stop';
  protocol?: string;
  version?: string;
  streamSid?: string;
  tracks?: string[];
  mediaFormat?: {
    encoding: string;
    sampleRate: number;
    channels: number;
  };
}
