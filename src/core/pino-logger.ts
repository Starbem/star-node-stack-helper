import pino from 'pino'

export interface PinoLoggerConfig {
  level?: string
  service?: string
  environment?: string
  pretty?: boolean
  redact?: string[]
}

export class PinoLogger {
  private logger: pino.Logger
  private config: PinoLoggerConfig

  constructor(config: PinoLoggerConfig = {}) {
    this.config = {
      level: 'info',
      service: 'star-node-stack-helper',
      environment: 'development',
      pretty: false,
      redact: ['password', 'token', 'secret', 'authorization', 'api_key'],
      ...config,
    }

    const pinoConfig: pino.LoggerOptions = {
      level: this.config.level || 'info',
      base: {
        service: this.config.service || 'star-node-stack-helper',
        environment: this.config.environment || 'development',
        pid: process.pid,
      },
      redact: {
        paths: this.config.redact || [],
        censor: '[REDACTED]',
      },
      timestamp: pino.stdTimeFunctions.isoTime,
    }

    if (this.config.pretty && this.config.environment === 'development') {
      this.logger = pino(
        {
          ...pinoConfig,
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          },
        },
        pino.destination(1)
      )
    } else {
      this.logger = pino(pinoConfig)
    }
  }

  /**
   * @name debug
   * @description Debug log
   */
  debug(message: string, context?: Record<string, any>): void {
    this.logger.debug(context, message)
  }

  /**
   * @name info
   * @description Info log
   */
  info(message: string, context?: Record<string, any>): void {
    this.logger.info(context, message)
  }

  /**
   * @name warn
   * @description Warning log
   */
  warn(message: string, context?: Record<string, any>): void {
    this.logger.warn(context, message)
  }

  /**
   * @name error
   * @description Error log
   */
  error(message: string, error?: Error | Record<string, any>): void {
    if (error instanceof Error) {
      this.logger.error(
        {
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
        },
        message
      )
    } else {
      this.logger.error(error, message)
    }
  }

  /**
   * @name fatal
   * @description Fatal log
   */
  fatal(message: string, error?: Error | Record<string, any>): void {
    if (error instanceof Error) {
      this.logger.fatal(
        {
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
        },
        message
      )
    } else {
      this.logger.fatal(error, message)
    }
  }

  /**
   * @name trace
   * @description Trace log
   */
  trace(message: string, context?: Record<string, any>): void {
    this.logger.trace(context, message)
  }

  /**
   * @name performance
   * @description Performance log
   */
  performance(
    operation: string,
    duration: number,
    context?: Record<string, any>
  ): void {
    this.logger.info(
      {
        ...context,
        operation,
        duration,
        type: 'performance',
      },
      `Performance: ${operation} took ${duration}ms`
    )
  }

  /**
   * @name business
   * @description Business event log
   */
  business(event: string, data?: Record<string, any>): void {
    this.logger.info(
      {
        ...data,
        event,
        type: 'business',
      },
      `Business Event: ${event}`
    )
  }

  /**
   * @name security
   * @description Security event log
   */
  security(event: string, data?: Record<string, any>): void {
    this.logger.warn(
      {
        ...data,
        event,
        type: 'security',
      },
      `Security Event: ${event}`
    )
  }

  /**
   * @name transaction
   * @description Transaction log
   */
  transaction(
    transactionId: string,
    operation: string,
    data?: Record<string, any>
  ): void {
    this.logger.info(
      {
        ...data,
        transactionId,
        operation,
        type: 'transaction',
      },
      `Transaction: ${operation} [${transactionId}]`
    )
  }

  /**
   * @name system
   * @description System event log
   */
  system(event: string, data?: Record<string, any>): void {
    this.logger.info(
      {
        ...data,
        event,
        type: 'system',
      },
      `System Event: ${event}`
    )
  }

  /**
   * @name child
   * @description Create child logger with additional context
   */
  child(context: Record<string, any>): PinoLogger {
    const childLogger = new PinoLogger(this.config)
    childLogger.logger = this.logger.child(context)
    return childLogger
  }

  /**
   * @name getPinoLogger
   * @description Get Pino logger instance
   */
  getPinoLogger(): pino.Logger {
    return this.logger
  }

  /**
   * @name isLevelEnabled
   * @description Check if a level is enabled
   */
  isLevelEnabled(level: string): boolean {
    return this.logger.isLevelEnabled(level as pino.Level)
  }

  /**
   * @name setLevel
   * @description Set log level
   */
  setLevel(level: string): void {
    this.logger.level = level
  }

  /**
   * @name getLevel
   * @description Get current level
   */
  getLevel(): string {
    return this.logger.level
  }
}

// Singleton instance for global use
let globalPinoLogger: PinoLogger | null = null

/**
 * @name initializePinoLogger
 * @description Initialize global logger
 */
export function initializePinoLogger(config?: PinoLoggerConfig): PinoLogger {
  globalPinoLogger = new PinoLogger(config)
  return globalPinoLogger
}

/**
 * @name getPinoLogger
 * @description Get global logger
 */
export function getPinoLogger(): PinoLogger {
  if (!globalPinoLogger) {
    globalPinoLogger = new PinoLogger()
  }
  return globalPinoLogger
}

/**
 * @name getPinoConfig
 * @description Convenience function to get environment-based configuration
 */
export function getPinoConfig(
  environment: string = 'development'
): PinoLoggerConfig {
  return {
    level:
      process.env['LOG_LEVEL'] ||
      (environment === 'development' ? 'debug' : 'info'),
    service: process.env['SERVICE_NAME'] || 'star-node-stack-helper',
    environment,
    pretty: environment === 'development',
    redact: [
      'password',
      'token',
      'secret',
      'authorization',
      'api_key',
      'creditCard',
      'ssn',
      'cpf',
    ],
  }
}
