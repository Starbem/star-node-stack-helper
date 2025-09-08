// Core Functions
export {
  loadSecrets,
  testSavedSecrets,
  isRunningOnAWS,
  getAWSRegion,
} from './secrets'
export { ElasticLogger } from './logger'

// Core Logging
export {
  SystemLogger,
  getSystemLogger,
  setSystemLogger,
  logDebug,
  logInfo,
  logWarn,
  logError,
  logPerformance,
  logBusinessEvent,
  logSecurityEvent,
} from './core/system-logger'

// Logger Factory
export {
  LoggerFactory,
  getEnvironmentConfig,
  initializeLogger,
} from './core/logger-factory'

// Pino Logger
export {
  PinoLogger,
  initializePinoLogger,
  getPinoLogger,
  getPinoConfig,
} from './core/pino-logger'

// Middleware
export { transactionLogger, addTransactionId, addRequestId } from './middleware'

// Decorators
export {
  LoggedMethod,
  LoggedApiOperation,
  LoggedSecurityOperation,
  LoggedBusinessOperation,
  AutoLogged,
} from './decorators'

// Utils
export {
  extractRequestData,
  extractResponseData,
  extractBusinessData,
  filterSensitiveFields,
  generateTransactionId,
  generateRequestId,
  isSensitiveField,
  filterSensitiveData,
  maskSensitiveString,
  DEFAULT_SENSITIVE_FIELDS,
} from './utils'

// Types
export type {
  SecretConfig,
  RetryConfig,
  LoadSecretsOptions,
} from './secrets/types'
export type { LoggerConfig, LogLevel, LogTransaction } from './logger/types'
export type {
  TransactionData,
  TransactionLoggerConfig,
  RequestData,
  ResponseData,
  BusinessData,
  SystemLogData,
  LoggingOptions,
  LoggerConfig as NewLoggerConfig,
  EnvironmentConfig,
  LoggerInitializationResult,
} from './types'
