import { ElasticLogger } from '../logger'
import { SystemLogData } from '../types/system'

export class SystemLogger {
  private elasticLogger: ElasticLogger

  constructor(elasticLogger: ElasticLogger) {
    this.elasticLogger = elasticLogger
  }

  /**
   * @name debug
   * @description Debug log
   */
  async debug(
    message: string,
    context?: Record<string, any>,
    transactionId?: string
  ): Promise<void> {
    const logData: SystemLogData = {
      level: 'debug',
      message,
      ...(context && { context }),
      ...(transactionId && { transactionId }),
    }

    this.logToOpenSearch(logData)
  }

  /**
   * @name info
   * @description Info log
   */
  async info(
    message: string,
    context?: Record<string, any>,
    transactionId?: string
  ): Promise<void> {
    const logData: SystemLogData = {
      level: 'info',
      message,
      ...(context && { context }),
      ...(transactionId && { transactionId }),
    }

    this.logToOpenSearch(logData)
  }

  /**
   * @name warn
   * @description Warning log
   */
  async warn(
    message: string,
    context?: Record<string, any>,
    transactionId?: string
  ): Promise<void> {
    const logData: SystemLogData = {
      level: 'warn',
      message,
      ...(context && { context }),
      ...(transactionId && { transactionId }),
    }

    this.logToOpenSearch(logData)
  }

  /**
   * @name error
   * @description Error log
   */
  async error(
    message: string,
    error?: Error,
    context?: Record<string, any>,
    transactionId?: string
  ): Promise<void> {
    const logData: SystemLogData = {
      level: 'error',
      message,
      ...(context && { context }),
      ...(transactionId && { transactionId }),
      ...(error && {
        error: {
          message: error.message,
          ...((error as any).code && { code: (error as any).code }),
          ...(error.stack && { stack: error.stack }),
        },
      }),
    }

    this.logToOpenSearch(logData)
  }

  /**
   * @name performance
   * @description Performance log
   */
  async performance(
    operation: string,
    duration: number,
    context?: Record<string, any>,
    transactionId?: string
  ): Promise<void> {
    const logData: SystemLogData = {
      level: 'info',
      message: `Performance: ${operation} completed in ${duration}ms`,
      context: {
        ...context,
        operation,
        duration,
        unit: 'ms',
      },
      ...(transactionId && { transactionId }),
    }

    this.logToOpenSearch(logData)
  }

  /**
   * @name businessEvent
   * @description Business event log
   */
  async businessEvent(
    event: string,
    data: Record<string, any>,
    transactionId?: string
  ): Promise<void> {
    const logData: SystemLogData = {
      level: 'info',
      message: `Business Event: ${event}`,
      context: {
        eventType: 'business',
        event,
        ...data,
      },
      ...(transactionId && { transactionId }),
    }

    this.logToOpenSearch(logData)
  }

  /**
   * @name securityEvent
   * @description Security event log
   */
  async securityEvent(
    event: string,
    data: Record<string, any>,
    transactionId?: string
  ): Promise<void> {
    const logData: SystemLogData = {
      level: 'warn',
      message: `Security Event: ${event}`,
      context: {
        eventType: 'security',
        event,
        ...data,
      },
      ...(transactionId && { transactionId }),
    }

    this.logToOpenSearch(logData)
  }

  /**
   * @name logToOpenSearch
   * @description Private method to send logs to OpenSearch
   */
  private async logToOpenSearch(logData: SystemLogData): Promise<void> {
    try {
      await this.elasticLogger.log(logData.level, logData.message, {
        ...logData.context,
        transactionId: logData.transactionId,
        operation: logData.operation,
        error: logData.error,
        metadata: logData.metadata,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('❌ Erro ao enviar log para OpenSearch:', {
        originalMessage: logData.message,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * @name getSystemLogs
   * @description Method to search system logs
   */
  async getSystemLogs(
    searchTerms: string | string[],
    transactionId?: string
  ): Promise<any[]> {
    try {
      const terms = Array.isArray(searchTerms) ? searchTerms : [searchTerms]
      const searchQuery = transactionId ? [...terms, transactionId] : terms

      return await this.elasticLogger.getSystemLogs(searchQuery)
    } catch (error) {
      console.error('❌ Erro ao buscar logs sistêmicos:', {
        searchTerms,
        transactionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return []
    }
  }

  /**
   * @name getTransactionLogs
   * @description Method to search transaction logs by operations
   */
  async getTransactionLogs(
    operations?: string[],
    transactionId?: string
  ): Promise<any[]> {
    try {
      return await this.elasticLogger.getLogsTransactions(operations || [])
    } catch (error) {
      console.error('❌ Erro ao buscar logs de transação:', {
        operations,
        transactionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return []
    }
  }
}

let systemLoggerInstance: SystemLogger | null = null

/**
 * @name getSystemLogger
 * @description Get system logger instance
 */
export const getSystemLogger = (): SystemLogger => {
  if (!systemLoggerInstance) {
    throw new Error(
      'SystemLogger not initialized. Call LoggerFactory.initialize() first.'
    )
  }
  return systemLoggerInstance
}

export const setSystemLogger = (logger: SystemLogger): void => {
  systemLoggerInstance = logger
}

/**
 * @name logDebug
 * @description Convenience functions for direct use
 * @param message
 * @param context
 * @param transactionId
 * @returns
 */
export const logDebug = (
  message: string,
  context?: Record<string, any>,
  transactionId?: string
) => getSystemLogger().debug(message, context, transactionId)

/**
 * @name logInfo
 * @description Convenience functions for direct use
 * @param message
 * @param context
 * @param transactionId
 * @returns
 */
export const logInfo = (
  message: string,
  context?: Record<string, any>,
  transactionId?: string
) => getSystemLogger().info(message, context, transactionId)

/**
 * @name logWarn
 * @description Convenience functions for direct use
 * @param message
 * @param context
 * @param transactionId
 * @returns
 */
export const logWarn = (
  message: string,
  context?: Record<string, any>,
  transactionId?: string
) => getSystemLogger().warn(message, context, transactionId)

/**
 * @name logError
 * @description Convenience functions for direct use
 * @param message
 * @param error
 * @param context
 * @param transactionId
 * @returns
 */
export const logError = (
  message: string,
  error?: Error,
  context?: Record<string, any>,
  transactionId?: string
) => getSystemLogger().error(message, error, context, transactionId)

/**
 * @name logPerformance
 * @description Convenience functions for direct use
 * @param operation
 * @param duration
 * @param context
 * @param transactionId
 * @returns
 */
export const logPerformance = (
  operation: string,
  duration: number,
  context?: Record<string, any>,
  transactionId?: string
) => getSystemLogger().performance(operation, duration, context, transactionId)

/**
 * @name logBusinessEvent
 * @description Convenience functions for direct use
 * @param event
 * @param data
 * @param transactionId
 * @returns
 */
export const logBusinessEvent = (
  event: string,
  data: Record<string, any>,
  transactionId?: string
) => getSystemLogger().businessEvent(event, data, transactionId)

/**
 * @name logSecurityEvent
 * @description Convenience functions for direct use
 * @param event
 * @param data
 * @param transactionId
 * @returns
 */
export const logSecurityEvent = (
  event: string,
  data: Record<string, any>,
  transactionId?: string
) => getSystemLogger().securityEvent(event, data, transactionId)
