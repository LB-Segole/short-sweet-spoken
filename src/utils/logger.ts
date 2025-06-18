
/**
 * Enhanced logger utility for the application with structured logging
 * Optimized for voice-AI pipeline debugging and real-time audio operations
 */

enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
  TRACE = 'TRACE', // Added for detailed audio debugging
}

interface LogContext {
  component?: string;
  function?: string;
  callId?: string;
  assistantId?: string;
  userId?: string;
  sessionId?: string; // Added for WebSocket session tracking
  audioSessionId?: string; // Added for audio pipeline tracking
  sampleRate?: number; // Added for audio diagnostics
  bufferSize?: number; // Added for audio diagnostics
  [key: string]: any;
}

interface AudioMetrics {
  sampleRate: number;
  bufferSize: number;
  duration?: number;
  encodingTime?: number;
  decodingTime?: number;
  base64Size?: number;
  chunkCount?: number;
}

class Logger {
  private static instance: Logger;
  private isDebugMode: boolean;
  private context: LogContext = {};
  private logBuffer: any[] = []; // Buffer for batch logging
  private flushInterval: number | null = null;

  private constructor() {
    this.isDebugMode = process.env.NODE_ENV === 'development' || 
                      import.meta.env?.DEV === true ||
                      globalThis?.location?.hostname === 'localhost';
    
    // Initialize batch logging for performance
    this.initializeBatchLogging();
  }

  private initializeBatchLogging(): void {
    // Flush logs every 1 second in production, immediately in development
    const flushIntervalMs = this.isDebugMode ? 0 : 1000;
    
    if (flushIntervalMs > 0) {
      this.flushInterval = window.setInterval(() => {
        this.flushLogs();
      }, flushIntervalMs);
    }
  }

  private flushLogs(): void {
    if (this.logBuffer.length === 0) return;
    
    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];
    
    // In production, send batched logs to service
    if (!this.isDebugMode) {
      this.sendBatchToLogService(logsToFlush);
    }
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public setContext(context: LogContext): Logger {
    this.context = { ...this.context, ...context };
    return this;
  }

  public clearContext(): Logger {
    this.context = {};
    return this;
  }

  public info(message: string, data?: any, context?: LogContext): void {
    this.log(LogLevel.INFO, message, data, context);
  }

  public warn(message: string, data?: any, context?: LogContext): void {
    this.log(LogLevel.WARN, message, data, context);
  }

  public error(message: string, error?: any, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, error, context);
  }

  public debug(message: string, data?: any, context?: LogContext): void {
    if (this.isDebugMode) {
      this.log(LogLevel.DEBUG, message, data, context);
    }
  }

  public trace(message: string, data?: any, context?: LogContext): void {
    if (this.isDebugMode) {
      this.log(LogLevel.TRACE, message, data, context);
    }
  }

  // FIXED: Enhanced WebSocket logging with connection state tracking
  public voiceWebSocket(message: string, data?: any, sessionId?: string): void {
    const enhancedContext = { 
      component: 'VoiceWebSocket',
      ...(sessionId && { sessionId })
    };
    this.log(LogLevel.INFO, `🎙️ Voice WebSocket: ${message}`, data, enhancedContext);
  }

  public edgeFunction(functionName: string, message: string, data?: any): void {
    this.log(LogLevel.INFO, `🔧 ${functionName}: ${message}`, data, { component: 'EdgeFunction', function: functionName });
  }

  public apiCall(endpoint: string, message: string, data?: any): void {
    this.log(LogLevel.INFO, `🌐 API ${endpoint}: ${message}`, data, { component: 'API' });
  }

  // NEW: Audio-specific logging methods for pipeline debugging
  public audioEncoding(action: string, metrics: Partial<AudioMetrics>, audioSessionId?: string): void {
    const context = { 
      component: 'AudioEncoding',
      ...(audioSessionId && { audioSessionId }),
      ...(metrics.sampleRate && { sampleRate: metrics.sampleRate }),
      ...(metrics.bufferSize && { bufferSize: metrics.bufferSize })
    };
    
    this.log(LogLevel.DEBUG, `🎵 Audio Encoding: ${action}`, metrics, context);
  }

  public audioDecoding(action: string, metrics: Partial<AudioMetrics>, audioSessionId?: string): void {
    const context = { 
      component: 'AudioDecoding',
      ...(audioSessionId && { audioSessionId }),
      ...(metrics.sampleRate && { sampleRate: metrics.sampleRate })
    };
    
    this.log(LogLevel.DEBUG, `🔊 Audio Decoding: ${action}`, metrics, context);
  }

  public audioWebSocket(action: string, data?: any, sessionId?: string, audioSessionId?: string): void {
    const context = { 
      component: 'AudioWebSocket',
      ...(sessionId && { sessionId }),
      ...(audioSessionId && { audioSessionId })
    };
    
    this.log(LogLevel.INFO, `🎧 Audio WebSocket: ${action}`, data, context);
  }

  public audioPerformance(metric: string, value: number, unit: string, audioSessionId?: string): void {
    const context = { 
      component: 'AudioPerformance',
      ...(audioSessionId && { audioSessionId })
    };
    
    this.log(LogLevel.TRACE, `⚡ Audio Performance: ${metric}`, { value, unit }, context);
  }

  // FIXED: Enhanced call logging with better error context
  public logCallInitiation(phoneNumber: string, assistantId: string, callId?: string): void {
    const context = { 
      component: 'CallInterface',
      ...(callId && { callId })
    };
    this.info('Call initiation started', { phoneNumber, assistantId }, context);
  }

  public logCallSuccess(callId: string, phoneNumber: string, sessionId?: string): void {
    const context = { 
      component: 'CallInterface',
      callId,
      ...(sessionId && { sessionId })
    };
    this.info('Call initiated successfully', { phoneNumber }, context);
  }

  public logCallFailure(phoneNumber: string, error: string | Error, callId?: string): void {
    const context = { 
      component: 'CallInterface',
      ...(callId && { callId })
    };
    
    const errorData = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : { error };
    
    this.error('Call initiation failed', { phoneNumber, ...errorData }, context);
  }

  // FIXED: Enhanced WebSocket event logging with session tracking
  public logWebSocketEvent(event: string, data?: any, sessionId?: string): void {
    this.voiceWebSocket(`${event}`, data, sessionId);
  }

  // FIXED: More detailed audio processing logs
  public logAudioProcessing(action: string, data?: any, audioSessionId?: string): void {
    const context = { 
      component: 'AudioProcessing',
      ...(audioSessionId && { audioSessionId })
    };
    this.debug(`Audio processing: ${action}`, data, context);
  }

  // NEW: SignalWire specific logging
  public signalWireAPI(action: string, data?: any, callId?: string): void {
    const context = { 
      component: 'SignalWire',
      ...(callId && { callId })
    };
    this.log(LogLevel.INFO, `📞 SignalWire: ${action}`, data, context);
  }

  // NEW: OpenAI API specific logging
  public openAIAPI(service: 'whisper' | 'tts', action: string, data?: any, audioSessionId?: string): void {
    const context = { 
      component: `OpenAI-${service}`,
      ...(audioSessionId && { audioSessionId })
    };
    this.log(LogLevel.INFO, `🤖 OpenAI ${service.toUpperCase()}: ${action}`, data, context);
  }

  // FIXED: Improved log formatting with better error handling
  private log(level: LogLevel, message: string, data?: any, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    const mergedContext = { ...this.context, ...context };
    
    // Format message for console with better structure
    const contextStr = Object.keys(mergedContext).length > 0 
      ? `[${Object.entries(mergedContext)
          .filter(([, v]) => v !== undefined && v !== null)
          .map(([k, v]) => `${k}:${v}`)
          .join(',')}]`
      : '';
    
    const formattedMessage = `[${timestamp}] [${level}]${contextStr}: ${message}`;

    // FIXED: Better error handling and stack trace formatting
    const logEntry = {
      timestamp,
      level,
      message,
      context: mergedContext,
      ...(data && { data: this.sanitizeLogData(data) })
    };

    // Immediate console output
    switch (level) {
      case LogLevel.INFO:
        console.info(formattedMessage, data || '');
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, data || '');
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage, data || '');
        if (data && typeof data === 'object') {
          if (data.stack) {
            console.error('Stack trace:', data.stack);
          }
          if (data instanceof Error) {
            console.error('Error details:', {
              name: data.name,
              message: data.message,
              stack: data.stack
            });
          }
        }
        break;
      case LogLevel.DEBUG:
        console.debug(formattedMessage, data || '');
        break;
      case LogLevel.TRACE:
        console.trace(formattedMessage, data || '');
        break;
    }

    // Buffer for batch processing in production
    if (!this.isDebugMode || level === LogLevel.ERROR) {
      this.logBuffer.push(logEntry);
      
      // Immediate flush for errors
      if (level === LogLevel.ERROR) {
        this.flushLogs();
      }
    }
  }

  // NEW: Sanitize sensitive data from logs
  private sanitizeLogData(data: any): any {
    if (!data) return data;
    
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'authorization', 'cookie'];
    
    if (typeof data === 'object') {
      const sanitized = { ...data };
      
      for (const key of Object.keys(sanitized)) {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          sanitized[key] = '[REDACTED]';
        }
      }
      
      return sanitized;
    }
    
    return data;
  }

  // FIXED: Enhanced log service integration
  private sendBatchToLogService(logEntries: any[]): void {
    // Enhanced external logging service integration
    try {
      // Example: Send to multiple services based on log level
      const errors = logEntries.filter(entry => entry.level === LogLevel.ERROR);
      const others = logEntries.filter(entry => entry.level !== LogLevel.ERROR);
      
      if (errors.length > 0) {
        // Send errors to error tracking service (e.g., Sentry)
        // fetch('/api/errors', { method: 'POST', body: JSON.stringify(errors) });
        console.debug('Would send errors to error service:', errors.length);
      }
      
      if (others.length > 0) {
        // Send other logs to general logging service
        // fetch('/api/logs', { method: 'POST', body: JSON.stringify(others) });
        console.debug('Would send logs to log service:', others.length);
      }
    } catch (error) {
      // Silently fail to avoid logging loops
      console.debug('Log service error:', error);
    }
  }

  // NEW: Cleanup method for proper resource management
  public cleanup(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    
    // Final flush
    this.flushLogs();
  }
}

export const logger = Logger.getInstance();

// Export enhanced convenience functions
export const logVoiceWebSocket = (message: string, data?: any, sessionId?: string) => 
  logger.voiceWebSocket(message, data, sessionId);

export const logEdgeFunction = (functionName: string, message: string, data?: any) => 
  logger.edgeFunction(functionName, message, data);

export const logApiCall = (endpoint: string, message: string, data?: any) => 
  logger.apiCall(endpoint, message, data);

// NEW: Audio-specific convenience exports
export const logAudioEncoding = (action: string, metrics: Partial<AudioMetrics>, audioSessionId?: string) =>
  logger.audioEncoding(action, metrics, audioSessionId);

export const logAudioDecoding = (action: string, metrics: Partial<AudioMetrics>, audioSessionId?: string) =>
  logger.audioDecoding(action, metrics, audioSessionId);

export const logAudioWebSocket = (action: string, data?: any, sessionId?: string, audioSessionId?: string) =>
  logger.audioWebSocket(action, data, sessionId, audioSessionId);

export const logAudioPerformance = (metric: string, value: number, unit: string, audioSessionId?: string) =>
  logger.audioPerformance(metric, value, unit, audioSessionId);

export const logSignalWire = (action: string, data?: any, callId?: string) =>
  logger.signalWireAPI(action, data, callId);

export const logOpenAI = (service: 'whisper' | 'tts', action: string, data?: any, audioSessionId?: string) =>
  logger.openAIAPI(service, action, data, audioSessionId);

// NEW: Performance monitoring utilities
export const createAudioSessionId = (): string => 
  `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const measureAudioOperation = async <T>(
  operation: () => Promise<T>,
  operationName: string,
  audioSessionId?: string
): Promise<T> => {
  const startTime = performance.now();
  const sessionId = audioSessionId || createAudioSessionId();
  
  logger.audioPerformance('operation_start', startTime, 'ms', sessionId);
  
  try {
    const result = await operation();
    const duration = performance.now() - startTime;
    
    logger.audioPerformance(`${operationName}_duration`, duration, 'ms', sessionId);
    logger.audioPerformance('operation_success', 1, 'count', sessionId);
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    
    logger.audioPerformance(`${operationName}_duration`, duration, 'ms', sessionId);
    logger.audioPerformance('operation_error', 1, 'count', sessionId);
    logger.error(`Audio operation failed: ${operationName}`, error, { audioSessionId: sessionId });
    
    throw error;
  }
};

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    logger.cleanup();
  });
}
