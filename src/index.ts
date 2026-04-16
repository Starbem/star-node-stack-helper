// Secrets
export {
  loadSecrets,
  testSavedSecrets,
  isRunningOnAWS,
  getAWSRegion,
} from './secrets'

// OpenSearch / Elastic Logger (persistence — not for stdout K8s logging)
export { ElasticLogger } from './logger'

// Express middlewares
export {
  transactionLoggerMiddleware,
  addTransactionId,
} from './middlewares/transaction-logger'
export { performanceLoggerMiddleware } from './middlewares/performance-logger'

// Pino Logger (core — for stdout JSON logging in all APIs)
export {
  createPinoLogger,
  createHttpLogger,
  logContext as pinoLogContext,
} from './logger-pino'

export {
  getDatadogCorrelationFields,
  getOtelCorrelationFields,
} from './logger-pino/correlation'

// Fastify integration
export {
  buildFastifyLoggerOptions,
  buildFastifyLoggerOptionsQuiet,
} from './fastify'

// Slack Notifications
export {
  sendSlackMessage,
  sendSlackWebhook,
  createSectionBlock,
  createDividerBlock,
  createButtonElement,
  createActionBlock,
  createSlackAttachment,
  SlackNotifier,
} from './slack'

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
  createNestPinoLoggerService,
  createPinoLogWriter,
} from './nestjs'

// Types
export type {
  SecretConfig,
  RetryConfig,
  LoadSecretsOptions,
} from './secrets/types'

export type { LoggerConfig, LogLevel, LogTransaction } from './logger/types'

export type {
  PinoLoggerConfig,
  CorrelationMode,
  LogEnvironment,
} from './logger-pino/types'

export type {
  SlackConfig,
  SlackMessage,
  SlackResponse,
  SlackNotificationOptions,
  SlackWebhookConfig,
  SlackWebhookMessage,
  SlackBlock,
  SlackText,
  SlackField,
  SlackElement,
  SlackOption,
  SlackAttachment,
  SlackAttachmentField,
} from './slack/types'

export type {
  NestJSLogContext,
  LogWriter,
  PinoLogger,
  LogInterceptorOptions,
  LogGuardOptions,
  LogExceptionFilterOptions,
  TransactionLogMetadata,
  TransactionLogInterceptorOptions,
  AutoTransactionLogInterceptorOptions,
} from './nestjs'
