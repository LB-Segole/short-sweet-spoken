
export class AudioEncoder {
  static encodeAudioForWebSocket(float32Array: Float32Array): string {
    try {
      // Convert Float32Array to Int16Array (PCM 16-bit)
      const int16Array = new Int16Array(float32Array.length);
      for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      
      // Convert to Uint8Array with little-endian byte order
      const uint8Array = new Uint8Array(int16Array.buffer);
      
      // Convert to base64 in chunks to avoid memory issues
      let binary = '';
      const chunkSize = 0x8000;
      
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
        binary += String.fromCharCode(...chunk);
      }
      
      return btoa(binary);
    } catch (error) {
      console.error('❌ Audio encoding error:', error);
      return '';
    }
  }

  static decodeAudioFromWebSocket(base64Audio: string): Uint8Array {
    try {
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } catch (error) {
      console.error('❌ Audio decoding error:', error);
      return new Uint8Array(0);
    }
  }

  static createWavFromPCM(pcmData: Uint8Array, sampleRate: number = 24000): ArrayBuffer {
    try {
      const int16Data = new Int16Array(pcmData.length / 2);
      
      // Convert bytes to 16-bit samples (little-endian)
      for (let i = 0; i < pcmData.length; i += 2) {
        int16Data[i / 2] = (pcmData[i + 1] << 8) | pcmData[i];
      }
      
      // Create WAV header
      const wavHeader = new ArrayBuffer(44);
      const view = new DataView(wavHeader);
      
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };

      // WAV header parameters
      const numChannels = 1;
      const bitsPerSample = 16;
      const blockAlign = (numChannels * bitsPerSample) / 8;
      const byteRate = sampleRate * blockAlign;

      // Write WAV header
      writeString(0, 'RIFF');
      view.setUint32(4, 36 + int16Data.byteLength, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true); // PCM format chunk size
      view.setUint16(20, 1, true);  // PCM format
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, byteRate, true);
      view.setUint16(32, blockAlign, true);
      view.setUint16(34, bitsPerSample, true);
      writeString(38, 'data');
      view.setUint32(42, int16Data.byteLength, true);
      
      // Combine header and data
      const wavFile = new ArrayBuffer(44 + int16Data.byteLength);
      const wavView = new Uint8Array(wavFile);
      wavView.set(new Uint8Array(wavHeader), 0);
      wavView.set(new Uint8Array(int16Data.buffer), 44);
      
      return wavFile;
    } catch (error) {
      console.error('❌ WAV creation error:', error);
      return new ArrayBuffer(0);
    }
  }
}

export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private isRecording = false;

  constructor(private onAudioData: (audioData: Float32Array) => void) {}

  async start(): Promise<void> {
    try {
      console.log('🎤 Starting audio recording...');
      
      // Request microphone with optimal settings for voice
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      console.log('✅ Microphone access granted');
      
      this.audioContext = new AudioContext({
        sampleRate: 24000,
      });
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log('✅ Audio context resumed');
      }
      
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (e) => {
        if (this.isRecording) {
          const inputData = e.inputBuffer.getChannelData(0);
          
          // Basic noise gate - only process if amplitude is above threshold
          const maxAmplitude = Math.max(...Array.from(inputData).map(Math.abs));
          if (maxAmplitude > 0.001) {
            this.onAudioData(new Float32Array(inputData));
          }
        }
      };
      
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      this.isRecording = true;
      
      console.log('✅ Audio recording started successfully', {
        sampleRate: this.audioContext.sampleRate,
        bufferSize: this.processor.bufferSize
      });
    } catch (error) {
      console.error('❌ Error starting audio recording:', error);
      this.cleanup();
      throw error;
    }
  }

  stop(): void {
    console.log('🛑 Stopping audio recording...');
    this.isRecording = false;
    this.cleanup();
    console.log('✅ Audio recording stopped');
  }

  private cleanup(): void {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 Microphone track stopped');
      });
      this.stream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  getState(): string {
    return this.isRecording ? 'recording' : 'stopped';
  }
}

export class AudioQueue {
  private queue: ArrayBuffer[] = [];
  private isPlaying = false;
  private audioContext: AudioContext;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  async addToQueue(audioData: Uint8Array): Promise<void> {
    try {
      console.log('🔊 Adding audio to queue', { dataLength: audioData.length });
      const wavData = AudioEncoder.createWavFromPCM(audioData);
      
      if (wavData.byteLength > 0) {
        this.queue.push(wavData);
        console.log('✅ Audio added to queue', { queueLength: this.queue.length });
        
        if (!this.isPlaying) {
          await this.playNext();
        }
      } else {
        console.warn('⚠️ Empty WAV data, skipping queue addition');
      }
    } catch (error) {
      console.error('❌ Error adding audio to queue:', error);
    }
  }

  private async playNext(): Promise<void> {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      console.log('🔇 Audio queue empty, playback stopped');
      return;
    }

    this.isPlaying = true;
    const audioData = this.queue.shift()!;

    try {
      console.log('🔊 Playing audio chunk', { dataLength: audioData.byteLength });
      
      const audioBuffer = await this.audioContext.decodeAudioData(audioData);
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      source.onended = () => {
        console.log('✅ Audio chunk finished playing');
        this.playNext();
      };
      
      source.start(0);
      console.log('🔊 Audio chunk started playing', { 
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate 
      });
    } catch (error) {
      console.error('❌ Error playing audio chunk:', error);
      this.playNext(); // Continue with next segment even if current fails
    }
  }

  clear(): void {
    console.log('🧹 Clearing audio queue', { queueLength: this.queue.length });
    this.queue = [];
    this.isPlaying = false;
  }
}
