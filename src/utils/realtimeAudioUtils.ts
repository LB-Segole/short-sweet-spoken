
export class RealtimeAudioCapture {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private isCapturing = false;

  constructor(private onAudioData: (audioData: string) => void) {}

  async start(): Promise<void> {
    try {
      console.log('🎤 Starting realtime audio capture...');
      
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.audioContext = new AudioContext({ sampleRate: 24000 });
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (event) => {
        if (this.isCapturing) {
          const inputData = event.inputBuffer.getChannelData(0);
          const base64Audio = this.encodePCM16(inputData);
          
          if (base64Audio) {
            this.onAudioData(base64Audio);
          }
        }
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      this.isCapturing = true;

      console.log('✅ Realtime audio capture started');
    } catch (error) {
      console.error('❌ Error starting realtime audio capture:', error);
      throw error;
    }
  }

  stop(): void {
    console.log('🛑 Stopping realtime audio capture...');
    this.isCapturing = false;
    
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    console.log('✅ Realtime audio capture stopped');
  }

  private encodePCM16(float32Array: Float32Array): string {
    try {
      // Convert Float32Array to Int16Array (PCM16)
      const int16Array = new Int16Array(float32Array.length);
      for (let i = 0; i < float32Array.length; i++) {
        const sample = Math.max(-1, Math.min(1, float32Array[i]));
        int16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      }

      // Convert to base64
      const uint8Array = new Uint8Array(int16Array.buffer);
      let binary = '';
      const chunkSize = 0x8000;
      
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      
      return btoa(binary);
    } catch (error) {
      console.error('❌ PCM16 encoding error:', error);
      return '';
    }
  }
}

export class RealtimeAudioPlayer {
  private audioContext: AudioContext | null = null;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying = false;
  private currentSource: AudioBufferSourceNode | null = null;

  constructor() {
    this.initializeAudioContext();
  }

  private async initializeAudioContext(): Promise<void> {
    try {
      this.audioContext = new AudioContext({ sampleRate: 24000 });
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      console.log('✅ Realtime audio player initialized');
    } catch (error) {
      console.error('❌ Error initializing audio player:', error);
    }
  }

  async playAudioDelta(base64Audio: string): Promise<void> {
    if (!this.audioContext) return;

    try {
      // Decode base64 to PCM16
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert PCM16 to AudioBuffer
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7FFF);
      }

      const audioBuffer = this.audioContext.createBuffer(1, float32Array.length, 24000);
      audioBuffer.copyToChannel(float32Array, 0);

      // Add to queue and play
      this.audioQueue.push(audioBuffer);
      if (!this.isPlaying) {
        await this.playNext();
      }

    } catch (error) {
      console.error('❌ Error playing audio delta:', error);
    }
  }

  private async playNext(): Promise<void> {
    if (!this.audioContext || this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioBuffer = this.audioQueue.shift()!;

    try {
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      source.onended = () => {
        this.currentSource = null;
        setTimeout(() => this.playNext(), 10);
      };

      this.currentSource = source;
      source.start(0);
      
    } catch (error) {
      console.error('❌ Error in audio playback:', error);
      setTimeout(() => this.playNext(), 50);
    }
  }

  stop(): void {
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }
    this.audioQueue = [];
    this.isPlaying = false;
  }

  clear(): void {
    this.stop();
  }
}
