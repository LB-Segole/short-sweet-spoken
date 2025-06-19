
export interface DeepgramConfig {
  apiKey: string;
}

export interface STTConfig {
  model: string;
  language: string;
  smartFormat: boolean;
  interimResults: boolean;
  endpointing: number;
}

export interface TTSConfig {
  model: string;
  encoding: string;
  sampleRate: number;
}

export interface TranscriptResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  timestamp: number;
}

export interface AudioChunk {
  data: Uint8Array;
  timestamp: number;
}
