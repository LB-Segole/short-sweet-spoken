
/**
 * Simple logger utility for the application
 */

enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

class Logger {
  private static instance: Logger;
  private isDebugMode: boolean;

  private constructor() {
    this.isDebugMode = process.env.NODE_ENV === 'development';
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  public warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  public error(message: string, error?: any): void {
    this.log(LogLevel.ERROR, message, error);
  }

  public debug(message: string, data?: any): void {
    if (this.isDebugMode) {
      this.log(LogLevel.DEBUG, message, data);
    }
  }

  private log(level: LogLevel, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level}]: ${message}`;

    switch (level) {
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage, data || '');
        break;
      case LogLevel.DEBUG:
        console.debug(formattedMessage, data || '');
        break;
    }

    if (data && this.isDebugMode) {
      console.debug(data);
    }
  }
}

export const logger = Logger.getInstance();
