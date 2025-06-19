
export interface SignalWireConfig {
  projectId: string;
  token: string;
  spaceUrl: string;
  phoneNumber: string;
}

export interface CallRequest {
  phoneNumber: string;
  agentId: string;
  webhookUrl: string;
  streamUrl: string;
}

export interface CallResponse {
  success: boolean;
  callSid?: string;
  error?: string;
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
  media?: {
    track: string;
    chunk: string;
    timestamp: string;
    payload: string;
  };
}

export interface MediaFrame {
  event: string;
  streamSid: string;
  media: {
    payload: string;
  };
}
