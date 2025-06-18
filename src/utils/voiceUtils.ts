
// Enhanced voice utilities for the complete conversational AI pipeline
export class VoiceConversationPipeline {
  private static instance: VoiceConversationPipeline | null = null;
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private websocket: WebSocket | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;

  static getInstance(): VoiceConversationPipeline {
    if (!VoiceConversationPipeline.instance) {
      VoiceConversationPipeline.instance = new VoiceConversationPipeline();
    }
    return VoiceConversationPipeline.instance;
  }

  async initializeAudio(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 24000 });
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
    }
  }

  async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.audioChunks = [];
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          this.sendAudioChunk(event.data);
        }
      };

      this.mediaRecorder.start(100); // Record in 100ms chunks
      this.isRecording = true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
      this.isRecording = false;
    }
  }

  private async sendAudioChunk(chunk: Blob): Promise<void> {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      const arrayBuffer = await chunk.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      this.websocket.send(JSON.stringify({
        event: 'media',
        media: {
          payload: base64Audio
        }
      }));
    } catch (error) {
      console.error('Failed to send audio chunk:', error);
    }
  }

  connectWebSocket(url: string, onMessage: (data: any) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      this.websocket = new WebSocket(url);

      this.websocket.onopen = () => {
        console.log('Voice WebSocket connected');
        resolve();
      };

      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };

      this.websocket.onclose = () => {
        console.log('Voice WebSocket disconnected');
        this.cleanup();
      };
    });
  }

  sendTextMessage(text: string): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({
        event: 'text_input',
        text: text
      }));
    }
  }

  async playAudioResponse(base64Audio: string): Promise<void> {
    if (!this.audioContext) {
      await this.initializeAudio();
    }

    try {
      // Decode base64 to array buffer
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Decode audio data
      const audioBuffer = await this.audioContext!.decodeAudioData(bytes.buffer);
      
      // Create and play audio source
      const source = this.audioContext!.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext!.destination);
      source.start(0);

      console.log('Playing AI audio response');
    } catch (error) {
      console.error('Failed to play audio response:', error);
    }
  }

  disconnect(): void {
    this.stopRecording();
    if (this.websocket) {
      this.websocket.close();
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.websocket = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
  }

  // Audio format conversion utilities
  static convertToWav(audioBuffer: ArrayBuffer, sampleRate = 24000): Uint8Array {
    const int16Data = new Int16Array(audioBuffer);
    const wavHeader = VoiceConversationPipeline.createWavHeader(int16Data.length * 2, sampleRate);
    
    const wavArray = new Uint8Array(wavHeader.byteLength + int16Data.byteLength);
    wavArray.set(new Uint8Array(wavHeader), 0);
    wavArray.set(new Uint8Array(int16Data.buffer), wavHeader.byteLength);
    
    return wavArray;
  }

  private static createWavHeader(dataLength: number, sampleRate: number): ArrayBuffer {
    const buffer = new ArrayBuffer(44);
    const view = new DataView(buffer);
    
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    const numChannels = 1;
    const bitsPerSample = 16;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const byteRate = sampleRate * blockAlign;

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    return buffer;
  }
}

// Export utilities for audio processing
export const audioUtils = {
  encodeFloat32ToBase64: (float32Array: Float32Array): string => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    const uint8Array = new Uint8Array(int16Array.buffer);
    let binary = '';
    const chunkSize = 0x8000;
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    return btoa(binary);
  },

  decodeBase64ToFloat32: (base64: string): Float32Array => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7FFF);
    }
    
    return float32Array;
  }
};
