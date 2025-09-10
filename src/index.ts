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

// NestJS Integration
export {
  Log,
  LogPerformance,
  LogError,
  LogCritical,
  LogInterceptor,
  LogGuard,
  LogExceptionFilter,
  TransactionLog,
  TransactionLogInterceptor,
  AutoTransactionLogInterceptor,
} from './nestjs'

// Types
export type {
  SecretConfig,
  RetryConfig,
  LoadSecretsOptions,
} from './secrets/types'

export type { LoggerConfig, LogLevel, LogTransaction } from './logger/types'

export type { PinoLoggerConfig } from './logger-pino/types'

export type {
  NestJSLogContext,
  PinoLogger,
  LogInterceptorOptions,
  LogGuardOptions,
  LogExceptionFilterOptions,
  TransactionLogMetadata,
  TransactionLogInterceptorOptions,
  AutoTransactionLogInterceptorOptions,
} from './nestjs'
