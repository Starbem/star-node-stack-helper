// Functions
export {
  loadSecrets,
  testSavedSecrets,
  isRunningOnAWS,
  getAWSRegion,
} from './secrets'
export { ElasticLogger } from './logger'

// Types
export type {
  SecretConfig,
  RetryConfig,
  LoadSecretsOptions,
} from './secrets/types'
export type { LoggerConfig, LogLevel, LogTransaction } from './logger/types'
