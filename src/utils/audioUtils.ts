export class AudioEncoder {
  static encodeAudioForWebSocket(float32Array: Float32Array): string {
    try {
      // Convert Float32Array to Int16Array (PCM 16-bit) with consistent scaling
      const int16Array = new Int16Array(float32Array.length);
      for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        int16Array[i] = Math.round(s * 32767);
      }

      // Convert to Uint8Array with little-endian byte order
      const uint8Array = new Uint8Array(int16Array.buffer);

      // Convert to base64 efficiently in chunks
      const chunkSize = 0x8000;
      const chunks: string[] = [];
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
        chunks.push(String.fromCharCode(...chunk));
      }
      return btoa(chunks.join(''));
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
      // Use DataView for proper endianness handling
      const dataView = new DataView(pcmData.buffer);
      for (let i = 0; i < pcmData.length; i += 2) {
        int16Data[i / 2] = dataView.getInt16(i, true); // little-endian
      }

      // Create WAV header
      const numChannels = 1;
      const bitsPerSample = 16;
      const blockAlign = (numChannels * bitsPerSample) / 8;
      const byteRate = sampleRate * blockAlign;
      const headerSize = 44;
      const wavBuffer = new ArrayBuffer(headerSize + int16Data.byteLength);
      const view = new DataView(wavBuffer);

      const writeString = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) {
          view.setUint8(offset + i, str.charCodeAt(i));
        }
      };

      // RIFF chunk descriptor
      writeString(0, 'RIFF');
      view.setUint32(4, 36 + int16Data.byteLength, true);
      writeString(8, 'WAVE');
      // fmt sub-chunk
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true); // PCM header length
      view.setUint16(20, 1, true);  // PCM format
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, byteRate, true);
      view.setUint16(32, blockAlign, true);
      view.setUint16(34, bitsPerSample, true);
      // data sub-chunk
      writeString(36, 'data');
      view.setUint32(40, int16Data.byteLength, true);

      // Write PCM data
      const pcmOffset = headerSize;
      new Uint8Array(wavBuffer, pcmOffset).set(new Uint8Array(int16Data.buffer));

      return wavBuffer;
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
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 24000, channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      console.log('✅ Microphone access granted');

      this.audioContext = new AudioContext({ sampleRate: 24000 });
      // Validate context state
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log('✅ Audio context resumed');
      }
      if (this.audioContext.state === 'closed') {
        throw new Error('AudioContext is closed');
      }
      // Validate sample rate
      console.log('📊 Audio context sample rate:', this.audioContext.sampleRate);
      if (this.audioContext.sampleRate !== 24000) {
        console.warn('⚠️ Sample rate mismatch - requested 24kHz, got', this.audioContext.sampleRate);
      }

      this.source = this.audioContext.createMediaStreamSource(this.stream);
      // Use AudioWorklet if available, fallback to ScriptProcessorNode
      if (!('audioWorklet' in this.audioContext)) {
        console.warn('⚠️ Using deprecated ScriptProcessorNode - consider AudioWorklet upgrade');
      }
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (this.isRecording) {
          const inputData = e.inputBuffer.getChannelData(0);
          const maxAmplitude = Math.max(...Array.from(inputData, Math.abs));
          // More sensitive threshold
          if (maxAmplitude > 0.0001) {
            this.onAudioData(new Float32Array(inputData));
          }
        }
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      this.isRecording = true;

      console.log('✅ Audio recording started', { sampleRate: this.audioContext.sampleRate, bufferSize: this.processor.bufferSize });
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
      this.stream.getTracks().forEach(track => { track.stop(); console.log('🛑 Microphone track stopped'); });
      this.stream = null;
    }
    if (this.audioContext) {
      if (this.audioContext.state !== 'closed') {
        this.audioContext.close().catch(err => console.warn('⚠️ AudioContext close warning:', err));
      }
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
        if (!this.isPlaying) await this.playNext();
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
      const audioBuffer = await this.audioContext.decodeAudioData(audioData.slice(0));
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      source.onended = () => {
        console.log('✅ Audio chunk finished playing');
        setTimeout(() => this.playNext(), 10);
      };
      source.start(0);
      console.log('🔊 Audio chunk started', { duration: audioBuffer.duration, sampleRate: audioBuffer.sampleRate });
    } catch (error) {
      console.error('❌ Error playing audio chunk:', error);
      // Continue with next segment even if current fails
      setTimeout(() => this.playNext(), 100);
    }
  }

  clear(): void {
    console.log('🧹 Clearing audio queue', { queueLength: this.queue.length });
    this.queue = [];
    this.isPlaying = false;
  }
}
