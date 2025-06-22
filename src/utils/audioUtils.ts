
// Enhanced audio utilities for real-time voice communication

export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private isRecording = false;

  constructor(private onAudioData: (audioData: Float32Array) => void) {}

  async start() {
    try {
      console.log('🎤 AudioRecorder: Starting microphone capture...');
      
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000, // Match expected rate
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log('✅ AudioRecorder: Audio context resumed');
      }
      
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (e) => {
        if (this.isRecording) {
          const inputData = e.inputBuffer.getChannelData(0);
          // Check if audio has meaningful content
          const maxAmp = Math.max(...Array.from(inputData).map(Math.abs));
          if (maxAmp > 0.001) { // Only send non-silent audio
            this.onAudioData(new Float32Array(inputData));
          }
        }
      };
      
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      this.isRecording = true;
      
      console.log('✅ AudioRecorder: Successfully started recording');
    } catch (error) {
      console.error('❌ AudioRecorder: Error starting recording:', error);
      throw error;
    }
  }

  stop() {
    console.log('🛑 AudioRecorder: Stopping recording...');
    this.isRecording = false;
    
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
        console.log('🎤 AudioRecorder: Stopped track:', track.kind);
      });
      this.stream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    console.log('✅ AudioRecorder: Recording stopped successfully');
  }
}

export class AudioQueue {
  private queue: AudioBuffer[] = [];
  private isPlaying = false;
  private currentSource: AudioBufferSourceNode | null = null;

  constructor(private audioContext: AudioContext) {}

  async addToQueue(audioBuffer: AudioBuffer) {
    console.log('🔊 AudioQueue: Adding audio to queue, length:', audioBuffer.length);
    this.queue.push(audioBuffer);
    if (!this.isPlaying) {
      await this.playNext();
    }
  }

  private async playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      console.log('🔇 AudioQueue: Queue empty, stopping playback');
      return;
    }

    this.isPlaying = true;
    const audioBuffer = this.queue.shift()!;

    try {
      this.currentSource = this.audioContext.createBufferSource();
      this.currentSource.buffer = audioBuffer;
      this.currentSource.connect(this.audioContext.destination);
      
      this.currentSource.onended = () => {
        console.log('🔊 AudioQueue: Audio chunk finished, playing next');
        this.currentSource = null;
        this.playNext();
      };
      
      this.currentSource.start(0);
      console.log('▶️ AudioQueue: Started playing audio chunk');
    } catch (error) {
      console.error('❌ AudioQueue: Error playing audio:', error);
      this.currentSource = null;
      this.playNext(); // Continue with next chunk
    }
  }

  clear() {
    console.log('🧹 AudioQueue: Clearing queue');
    this.queue = [];
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }
    this.isPlaying = false;
  }
}

export class AudioEncoder {
  // Convert Float32Array to base64-encoded Int16 PCM for Deepgram
  static encodeAudioForDeepgram(float32Array: Float32Array): string {
    const int16Array = new Int16Array(float32Array.length);
    
    for (let i = 0; i < float32Array.length; i++) {
      // Clamp and convert to 16-bit PCM
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    const uint8Array = new Uint8Array(int16Array.buffer);
    let binary = '';
    const chunkSize = 0x8000;
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode(...Array.from(chunk));
    }
    
    return btoa(binary);
  }

  // Decode audio from WebSocket (base64 PCM16 to AudioBuffer)
  static async decodeAudioFromWebSocket(base64Audio: string, audioContext: AudioContext): Promise<AudioBuffer> {
    try {
      // Decode base64 to binary
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert bytes to 16-bit samples (little-endian)
      const int16Array = new Int16Array(bytes.length / 2);
      for (let i = 0; i < bytes.length; i += 2) {
        int16Array[i / 2] = (bytes[i + 1] << 8) | bytes[i];
      }

      // Create WAV header for proper decoding
      const wavBuffer = AudioEncoder.createWavFromPCM16(int16Array, 24000, 1);
      
      // Decode using Web Audio API
      const audioBuffer = await audioContext.decodeAudioData(wavBuffer);
      return audioBuffer;
    } catch (error) {
      console.error('❌ AudioEncoder: Error decoding audio:', error);
      throw error;
    }
  }

  // Create proper WAV file from PCM16 data
  private static createWavFromPCM16(pcmData: Int16Array, sampleRate: number, numChannels: number): ArrayBuffer {
    const bitsPerSample = 16;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const byteRate = sampleRate * blockAlign;
    const dataSize = pcmData.length * 2;
    const headerSize = 44;
    
    const buffer = new ArrayBuffer(headerSize + dataSize);
    const view = new DataView(buffer);
    
    // WAV Header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, headerSize + dataSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    
    // PCM data
    const pcmView = new Int16Array(buffer, headerSize);
    pcmView.set(pcmData);
    
    return buffer;
  }
}
</lov-write>
