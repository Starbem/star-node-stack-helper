/**
 * @name SystemLogData
 * @description Interface for system logs
 */
export interface SystemLogData {
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  context?: Record<string, any>
  transactionId?: string
  operation?: string
  error?: {
    message: string
    code?: string
    stack?: string
  }
  metadata?: Record<string, any>
}

/**
 * @name LoggingOptions
 * @description Interface for logging options
 */
export interface LoggingOptions {
  operation?: string
  logRequest?: boolean
  logResponse?: boolean
  logPerformance?: boolean
  logBusinessEvent?: boolean
  businessEventName?: string
  sensitiveFields?: string[]
}

/**
 * @name NewLoggerConfig
 * @description Interface for new logger config
 */
export interface NewLoggerConfig {
  authType?: 'aws' | 'basic'
  // OpenSearch config
  opensearch: {
    node: string
    username?: string
    password?: string
    region?: string
  }
  // Service config
  service: {
    name: string
    environment: string
    index?: string
  }
  // Logging config
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error'
    enableTransactionLogs?: boolean
    enableSystemLogs?: boolean
    sensitiveFields?: string[]
  }
}

/**
 * @name EnvironmentConfig
 * @description Interface for environment config
 */
export interface EnvironmentConfig {
  opensearch: {
    node: string
    username?: string
    password?: string
    region?: string
  }
  service: {
    name: string
    environment: string
    index?: string
  }
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error'
    enableTransactionLogs?: boolean
    enableSystemLogs?: boolean
    sensitiveFields?: string[]
  }
}

/**
 * @name LoggerInitializationResult
 * @description Interface for logger initialization result
 */
export interface LoggerInitializationResult {
  elasticLogger: any
  systemLogger: any
  pinoLogger: any
  success: boolean
  error?: string
}
