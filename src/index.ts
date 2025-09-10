// Functions
export {
  loadSecrets,
  testSavedSecrets,
  isRunningOnAWS,
  getAWSRegion,
} from './secrets'

export { ElasticLogger } from './logger'

// Middlewares
export {
  transactionLoggerMiddleware,
  addTransactionId,
} from './middlewares/transaction-logger'
export { performanceLoggerMiddleware } from './middlewares/performance-logger'

// Logger Pino
export {
  createPinoLogger,
  createHttpLogger,
  logContext as pinoLogContext,
} from './logger-pino'

// Types
export type {
  SecretConfig,
  RetryConfig,
  LoadSecretsOptions,
} from './secrets/types'

export type { LoggerConfig, LogLevel, LogTransaction } from './logger/types'

export type { PinoLoggerConfig } from './logger-pino/types'
