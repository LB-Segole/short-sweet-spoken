/**
 * Enhanced logger utility for the application with structured logging
 */

enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

interface LogContext {
  component?: string;
  function?: string;
  callId?: string;
  assistantId?: string;
  userId?: string;
  [key: string]: any;
}

class Logger {
  private static instance: Logger;
  private isDebugMode: boolean;
  private context: LogContext = {};

  private constructor() {
    this.isDebugMode = process.env.NODE_ENV === 'development' || 
                      import.meta.env?.DEV === true ||
                      globalThis?.location?.hostname === 'localhost';
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

  public voiceWebSocket(message: string, data?: any): void {
    this.log(LogLevel.INFO, `🎙️ Voice WebSocket: ${message}`, data, { component: 'VoiceWebSocket' });
  }

  public edgeFunction(functionName: string, message: string, data?: any): void {
    this.log(LogLevel.INFO, `🔧 ${functionName}: ${message}`, data, { component: 'EdgeFunction', function: functionName });
  }

  public apiCall(endpoint: string, message: string, data?: any): void {
    this.log(LogLevel.INFO, `🌐 API ${endpoint}: ${message}`, data, { component: 'API' });
  }

  private log(level: LogLevel, message: string, data?: any, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    const mergedContext = { ...this.context, ...context };
    
    // Format message for console
    const contextStr = Object.keys(mergedContext).length > 0 
      ? `[${Object.entries(mergedContext).map(([k, v]) => `${k}:${v}`).join(',')}]`
      : '';
    
    const formattedMessage = `[${timestamp}] [${level}]${contextStr}: ${message}`;

    switch (level) {
      case LogLevel.INFO:
        console.info(formattedMessage, data || '');
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, data || '');
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage, data || '');
        if (data && typeof data === 'object' && data.stack) {
          console.error('Stack trace:', data.stack);
        }
        break;
      case LogLevel.DEBUG:
        console.debug(formattedMessage, data || '');
        break;
    }

    // In production, you might want to send logs to a service
    if (!this.isDebugMode && level === LogLevel.ERROR) {
      this.sendToLogService({ timestamp, level, message, context: mergedContext, ...(data && { data }) });
    }
  }

  private sendToLogService(logEntry: any): void {
    // Placeholder for external logging service
    // Could send to Sentry, LogRocket, or custom endpoint
    try {
      // Example: fetch('/api/logs', { method: 'POST', body: JSON.stringify(logEntry) })
      console.debug('Would send to log service:', logEntry);
    } catch (error) {
      // Silently fail to avoid logging loops
    }
  }

  // Convenience methods for common logging patterns
  public logCallInitiation(phoneNumber: string, assistantId: string): void {
    this.info('Call initiation started', { phoneNumber, assistantId }, { component: 'CallInterface' });
  }

  public logCallSuccess(callId: string, phoneNumber: string): void {
    this.info('Call initiated successfully', { callId, phoneNumber }, { component: 'CallInterface' });
  }

  public logCallFailure(phoneNumber: string, error: string): void {
    this.error('Call initiation failed', { phoneNumber, error }, { component: 'CallInterface' });
  }

  public logWebSocketEvent(event: string, data?: any): void {
    this.voiceWebSocket(`${event}`, data);
  }

  public logAudioProcessing(action: string, data?: any): void {
    this.debug(`Audio processing: ${action}`, data, { component: 'AudioProcessing' });
  }
}

export const logger = Logger.getInstance();

// Export convenience functions
export const logVoiceWebSocket = (message: string, data?: any) => logger.voiceWebSocket(message, data);
export const logEdgeFunction = (functionName: string, message: string, data?: any) => logger.edgeFunction(functionName, message, data);
export const logApiCall = (endpoint: string, message: string, data?: any) => logger.apiCall(endpoint, message, data);
